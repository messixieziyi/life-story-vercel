/**
 * 命运分析服务
 * 使用 LLM 分析星盘数据，生成性格、天赋、避坑指南
 */

/**
 * 带重试的 API 调用函数
 */
async function fetchWithRetry(apiUrl, options, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, options)
      
      if (response.ok) {
        return response
      }
      
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || ''
      
      if ((errorMessage.includes('overloaded') || errorMessage.includes('try again')) && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw new Error(errorMessage || `API 错误: ${response.status}`)
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      
      if (error.message && !error.message.includes('API 错误')) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
}

/**
 * 格式化星盘数据为文本描述
 */
function formatChartData(chartData) {
  const { planets, aspects } = chartData
  if (!planets) return ''

  const lines = []
  
  // 行星位置
  lines.push('## 行星位置')
  for (const [code, planet] of Object.entries(planets)) {
    if (planet.signName && planet.degree !== undefined) {
      const planetName = planet.name || `行星${code}`
      lines.push(`- ${planetName}：${planet.signName} ${planet.degree.toFixed(1)}°（${planet.house}宫）`)
    }
  }
  
  // 主要相位
  if (aspects && aspects.length > 0) {
    lines.push('\n## 主要相位')
    for (const aspect of aspects) {
      lines.push(`- ${aspect.planet1Name} ${aspect.name} ${aspect.planet2Name}（误差 ${aspect.orb.toFixed(1)}°）`)
    }
  }
  
  return lines.join('\n')
}

/**
 * 分析命运
 * @param {Object} chartData - 星盘数据
 * @param {Array} lifeRecords - 人生记录（可选）
 * @returns {Promise<string>} Markdown 格式的分析结果
 */
export async function analyzeFate(chartData, lifeRecords = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return '## 命运分析\n\n请配置 Gemini API Key 以使用此功能。'
  }

  try {
    // 格式化星盘数据
    const chartText = formatChartData(chartData)
    
    // 格式化人生记录（如果有）
    let recordsText = ''
    if (lifeRecords && lifeRecords.length > 0) {
      const recentRecords = lifeRecords.slice(0, 20) // 取最近20条
      recordsText = '\n\n## 人生记录摘要\n\n'
      recordsText += recentRecords.map((record, idx) => {
        const date = record.date?.toDate?.() || new Date(record.date) || new Date()
        const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
        return `${idx + 1}. ${dateStr} - ${record.title}${record.description ? '：' + record.description : ''}`
      }).join('\n')
    }

    const prompt = `你是一位资深的占星师，拥有20年的占星分析经验。请基于以下星盘数据，结合用户的人生记录（如果有），进行深度分析。

${chartText}${recordsText}

请以 Markdown 格式输出分析结果，必须包含以下三个板块：

## 核心性格

分析用户的核心性格特质、行为模式、内在驱动力。结合上升星座、太阳星座、月亮星座以及主要相位，描述用户的性格画像。要求：
- 深入分析，不要泛泛而谈
- 结合具体行星位置和相位
- 语言要专业但易懂
- 300-500字

## 天赋领域

分析用户在哪些领域具有天赋和潜能。结合：
- 行星落入的宫位（如10宫代表事业、5宫代表创作等）
- 行星的星座特质
- 主要相位的影响
- 人生记录中体现的倾向（如果有）
要求：
- 指出2-4个具体领域
- 每个领域说明原因和表现
- 200-400字

## 避坑指南

基于星盘的挑战相位和困难配置，给出人生建议和避坑指南。包括：
- 需要注意的性格盲点
- 容易陷入的困境
- 建议的成长方向
- 如何利用星盘能量
要求：
- 具体可操作
- 不要过于负面，要平衡
- 200-400字

**重要要求：**
1. 输出必须是纯 Markdown 格式
2. 不要添加额外的说明文字
3. 三个板块必须都有内容
4. 语言要专业、深入、有洞察力
5. 结合人生记录时要自然融入，不要生硬列举`

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
    
    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // 清理可能的代码块标记
    let result = text.trim()
    if (result.startsWith('```')) {
      result = result.replace(/```markdown\n?/g, '').replace(/```\n?/g, '').trim()
    }
    
    return result || '## 命运分析\n\n分析结果生成失败，请稍后重试。'
  } catch (error) {
    console.error('命运分析失败:', error)
    return `## 命运分析\n\n分析失败：${error.message || '未知错误'}\n\n请检查网络连接和 API 配置。`
  }
}
