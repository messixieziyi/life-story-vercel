/**
 * AI 服务：用于自动生成标签和类别
 */

/**
 * 使用 Gemini API 自动生成事件标签和类别
 * @param {Object} eventData - 事件数据 { title, description, date, importance, emotions }
 * @returns {Promise<{tags: string[], category: string}>}
 */
export async function generateTagsAndCategory(eventData) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    // 如果没有配置 API Key，返回默认值
    return {
      tags: [],
      category: '其他',
    }
  }

  try {
    const { title, description = '', date, importance, emotions = [] } = eventData
    
    const dateStr = date instanceof Date 
      ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
      : '未知日期'
    
    const emotionsStr = emotions.length > 0 ? emotions.join('、') : '未记录'
    
    const prompt = `请分析以下人生事件，并生成：
1. 3-5个简洁的中文标签（用逗号分隔）
2. 一个类别名称（如：工作、学习、健康、饮食、社交、旅行、家庭、娱乐、运动、其他等）

事件信息：
- 标题：${title}
- 描述：${description || '无'}
- 日期：${dateStr}
- 重要性：${importance === 'major' ? '大事' : importance === 'minor' ? '小事' : '普通'}
- 情绪：${emotionsStr}

请以JSON格式返回，格式如下：
{
  "tags": ["标签1", "标签2", "标签3"],
  "category": "类别名称"
}

只返回JSON，不要其他文字。`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      }
    )

    if (!response.ok) {
      throw new Error(`API 错误: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // 尝试解析 JSON（可能包含 markdown 代码块）
    let jsonText = text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    
    const result = JSON.parse(jsonText)
    
    return {
      tags: Array.isArray(result.tags) ? result.tags : [],
      category: result.category || '其他',
    }
  } catch (error) {
    console.error('生成标签失败:', error)
    // 返回默认值
    return {
      tags: [],
      category: '其他',
    }
  }
}
