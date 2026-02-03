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
 * @param {string} analysisType - 分析类型：'past' | 'future7days' | 'monthly' | 'yearly'
 * @returns {Promise<Object>} 结构化的分析结果
 */
export async function analyzeFate(chartData, lifeRecords = [], analysisType = 'future7days') {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return {
      error: '请配置 Gemini API Key 以使用此功能。'
    }
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

    // 计算当前日期
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDate = now.getDate()
    
    // 根据分析类型生成不同的提示词
    let typePrompt = ''
    let guidanceLabel = '未来指引'
    let dateRange = ''
    
    switch (analysisType) {
      case 'past':
        typePrompt = `请基于当前日期（${currentYear}年${currentMonth}月${currentDate}日），回顾过去的重要星象周期和人生记录，分析过去对现在的影响。重点分析：
- 过去的重要星象周期（如土星回归、木星周期等）
- 人生记录中体现的成长轨迹
- 过去经历如何塑造了现在的你
- 从过去可以学到什么经验教训`
        guidanceLabel = '过去回顾'
        dateRange = '过去的重要时期'
        break
      case 'future7days':
        const nextWeek = new Date(now)
        nextWeek.setDate(now.getDate() + 7)
        typePrompt = `请基于当前日期（${currentYear}年${currentMonth}月${currentDate}日）和未来7天的星象变化，生成"未来7天"的运势分析。重点分析：
- 未来7天内的主要星象变化
- 行进行星对个人星盘的影响
- 需要注意的关键时间节点
- 未来7天的能量趋势和机会`
        guidanceLabel = '未来指引'
        dateRange = '未来7天'
        break
      case 'monthly':
        const monthStart = new Date(currentYear, currentMonth - 1, 1)
        const monthEnd = new Date(currentYear, currentMonth, 0)
        typePrompt = `请基于当前日期（${currentYear}年${currentMonth}月${currentDate}日），分析本月（${currentMonth}月）的整体运势。重点分析：
- 本月的主要星象周期
- 本月各宫位的能量变化
- 本月的重要时间节点
- 本月的整体能量趋势和主题`
        guidanceLabel = '本月指引'
        dateRange = `本月（${currentMonth}月）`
        break
      case 'yearly':
        typePrompt = `请基于当前日期（${currentYear}年${currentMonth}月${currentDate}日），分析本年度（${currentYear}年）的整体运势和展望。重点分析：
- 本年度的重要星象周期（如木星周期、土星周期等）
- 本年度各宫位的能量主题
- 本年度的重要时间节点和转折点
- 本年度的整体能量趋势、机遇和挑战`
        guidanceLabel = '年度指引'
        dateRange = `本年度（${currentYear}年）`
        break
      default:
        typePrompt = `请基于当前日期（${currentYear}年${currentMonth}月${currentDate}日）和未来7天的星象变化，生成"未来7天"的运势分析。`
        guidanceLabel = '未来指引'
        dateRange = '未来7天'
    }
    
    const prompt = `你是一位资深的占星师，拥有20年的占星分析经验。请基于以下星盘数据，结合用户的人生记录（如果有），进行深度分析。

${chartText}${recordsText}

${typePrompt}

**重要要求：**
1. 必须输出严格的JSON格式，不要有任何额外的文字说明
2. JSON结构如下：
{
  "futureGuidance": {
    "paragraph1": "第一段文字（300-500字，描述${dateRange}的整体能量和主要星象影响）",
    "paragraph2": "第二段文字（200-300字，给出具体建议和注意事项）"
  },
  "spiritualityIndex": 78,
  "career": {
    "title": "事业",
    "content": "事业方面的详细分析（300-400字，结合相关宫位和星象）"
  },
  "emotion": {
    "title": "情感",
    "content": "情感与人际关系方面的详细分析（300-400字，结合相关宫位和星象）"
  },
  "energy": {
    "title": "能量",
    "content": "身心健康和能量状态方面的详细分析（300-400字，结合相关宫位和星象）"
  },
  "keyNodes": [
    {
      "date": "${analysisType === 'past' ? '2025-01-15' : analysisType === 'monthly' ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-15` : analysisType === 'yearly' ? `${currentYear}-06-15` : '2026-02-03'}",
      "description": "关键星象节点的描述"
    }
  ]
}

3. 关键节点（keyNodes）需要生成3-5个：
   - 如果是"回顾过去"：日期应该是过去的重要日期
   - 如果是"未来7天"：日期应该是未来7天内的具体日期
   - 如果是"本月运势"：日期应该是本月内的具体日期
   - 如果是"年度展望"：日期应该是本年度的重要日期
4. 灵性指数（spiritualityIndex）应该是0-100之间的整数，基于星盘中的灵性相关配置（如第十二宫、海王星、双鱼座等）
5. 所有文字内容要专业、深入、有洞察力，结合具体的行星位置、宫位和相位
6. 语言要符合占星术语，但也要易懂
7. 日期格式必须是 YYYY-MM-DD
8. 根据分析类型调整内容的重点和深度`

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
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    
    // 尝试解析JSON
    try {
      const result = JSON.parse(cleanedText)
      
      // 验证必要字段
      if (!result.futureGuidance || !result.career || !result.emotion || !result.energy || !result.keyNodes) {
        throw new Error('返回的JSON结构不完整')
      }
      
      return result
    } catch (parseError) {
      console.error('解析JSON失败:', parseError)
      console.error('原始文本:', cleanedText)
      
      // 如果解析失败，返回一个默认结构
      return {
        futureGuidance: {
          paragraph1: '分析结果解析失败，请稍后重试。',
          paragraph2: ''
        },
        spiritualityIndex: 50,
        career: {
          title: '事业',
          content: '分析结果解析失败。'
        },
        emotion: {
          title: '情感',
          content: '分析结果解析失败。'
        },
        energy: {
          title: '能量',
          content: '分析结果解析失败。'
        },
        keyNodes: []
      }
    }
  } catch (error) {
    console.error('命运分析失败:', error)
    return {
      error: `分析失败：${error.message || '未知错误'}`
    }
  }
}
