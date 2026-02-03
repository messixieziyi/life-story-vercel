/**
 * AI 分析服务：从语音文字中提取结构化信息
 */

/**
 * 带重试的 API 调用函数
 * @param {string} apiUrl - API URL
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Response>}
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
      
      // 如果是过载错误且还有重试机会，则重试
      if ((errorMessage.includes('overloaded') || errorMessage.includes('try again')) && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000) // 指数退避，最多10秒
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // 如果不是可重试的错误，直接抛出
      throw new Error(errorMessage || `API 错误: ${response.status}`)
    } catch (error) {
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw error
      }
      
      // 如果是网络错误，也重试
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
 * 从语音文字中提取事件信息
 * @param {string} text - 语音转文字的内容
 * @returns {Promise<Object>} 提取的事件信息
 */
export async function analyzeSpeechText(text) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    // 如果没有配置 API Key，返回基本结构
    // 尝试从文本中提取标题（第一句话或前30字）
    const textTrimmed = text.trim()
    let title = textTrimmed.substring(0, 30) || '新事件'
    const firstSentence = textTrimmed.split(/[。！？\n]/)[0]
    if (firstSentence && firstSentence.length > 5 && firstSentence.length < 30) {
      title = firstSentence.trim()
    }
    
    return {
      title: title,
      description: textTrimmed,
      date: new Date(),
      type: 'event',
      importance: 'normal',
      emotions: [],
      emotionNote: '',
      location: null,
      participants: [],
      category: '其他',
      tags: [],
    }
  }

  try {
    // 获取当前日期，用于上下文
    const today = new Date()
    const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
    const todayISO = today.toISOString().split('T')[0]
    
    const prompt = `你是一个智能事件分析助手。请仔细分析用户用语音记录的人生事件段落，提取所有结构化信息。

用户说的话：
${text}

当前日期：${todayStr}（ISO格式：${todayISO}）

示例：如果用户说"昨天和好朋友一起去了公园我们看日出心情特别开心感觉很满足"
- title应该是："和好朋友看日出"（简短摘要）
- description应该是："昨天和好朋友一起去了公园，我们看日出，心情特别开心，感觉很满足"（完整描述）
- date应该是：昨天的日期（${todayISO}的前一天）
- emotions应该是：["happy", "satisfied"]
- participants应该是：["好朋友"]
- location应该是："公园"

请仔细分析这段话，提取以下信息并以JSON格式返回：
{
  "title": "事件的简短标题（10-20字，只提取核心事件，如'今天吃了辣椒炒肉'、'大学毕业'、'和好朋友看日出'、'完成了第一个项目'）。重要：title必须是简短摘要，不能是完整文本！",
  "description": "事件的详细描述（完整保留用户说的所有内容，可以适当整理语言但不要丢失信息，应该比title更详细，包含所有细节）。重要：description应该包含完整的用户描述，不能和title相同！",
  "date": "事件发生的日期（ISO格式：YYYY-MM-DD）。仔细分析用户提到的日期：'今天'/'今日'→${todayISO}；'昨天'/'昨日'→前一天；'前天'→前两天；'上周'/'上星期'→7天前；'上个月'→约30天前；'去年'→约365天前；具体日期如'3月15日'→转换为对应日期；如果没提到日期，使用${todayISO}",
  "type": "事件类型，必须是以下之一：'achievement'（成就，如完成项目、获奖、学会技能等）、'wish'（愿望，如想要做什么、希望实现什么等）、'event'（普通事件，如日常活动、心情记录等）",
  "importance": "重要性级别，必须是：'major'（大事，如毕业、工作、结婚、搬家等人生重要节点）、'minor'（小事，如吃饭、心情、日常琐事）、'normal'（普通事件）",
  "emotions": ["情绪1", "情绪2"]（从以下选项中选择，可以多选：happy, excited, grateful, peaceful, satisfied, proud, hopeful, loved, content, neutral, calm, focused, sad, angry, anxious, stressed, tired, frustrated, lonely, worried, disappointed, confused, bored, annoyed。根据用户描述的情感状态选择，如果没有明确提到情绪，可以留空数组）,
  "emotionNote": "情绪详细描述（可选，用中文描述用户的情感状态，如果用户有详细描述情绪，请保留）",
  "location": "地点名称（如果用户提到地点，如'在公司'、'在家里'、'在XX大学'等，提取地点名称；否则为null）",
  "participants": ["人员1", "人员2"]（如果用户提到和谁一起，如'和好朋友'、'和家人'、'和同事'等，提取人员名称；否则为空数组）,
  "category": "类别（如：工作、学习、健康、饮食、社交、旅行、家庭、娱乐、运动、其他）",
  "tags": ["标签1", "标签2", "标签3"]（3-5个相关的中文标签）
}

重要要求（必须严格遵守）：
1. title必须是简短摘要（10-20字），只提取核心事件，不要包含太多细节。例如：用户说"昨天和好朋友一起去了公园我们看日出心情特别开心感觉很满足"，title应该是"和好朋友看日出"，而不是完整文本！
2. description必须保留用户的完整描述，应该比title更详细，包含所有用户提到的细节和上下文。例如：用户说"昨天和好朋友一起去了公园我们看日出心情特别开心感觉很满足"，description应该是"昨天和好朋友一起去了公园，我们看日出，心情特别开心，感觉很满足"（可以适当整理语言，但保留所有信息）
3. title和description必须不同！title是简短摘要，description是完整描述。如果它们相同，说明提取失败！
4. date必须根据用户提到的日期信息计算，如果用户说'今天'、'昨天'、'上周'等，要根据当前日期${todayStr}合理推算。格式必须是ISO格式（YYYY-MM-DD）
5. type要根据事件性质判断：如果是完成某事、达成目标、获得成就，用'achievement'；如果是想要做什么、希望实现什么，用'wish'；其他用'event'
6. 情绪要准确反映用户的情感状态，如果没有明确提到，可以留空数组
7. 重要性要合理判断：人生重要节点（毕业、工作、结婚等）用'major'；日常琐事（吃饭、心情等）用'minor'；其他用'normal'
8. 地点和参与人员要仔细提取，如果用户提到但没说具体名称，可以提取关键词（如'朋友'、'家人'等）
9. 只返回JSON，不要其他文字，不要包含markdown代码块标记
10. 如果信息不明确，使用合理的默认值`

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
    const apiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // 保存用户输入的原始文本
    const originalUserText = text.trim()
    
    // 尝试解析 JSON（可能包含 markdown 代码块）
    let jsonText = apiResponseText.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    
    let result = {}
    try {
      result = JSON.parse(jsonText)
      console.log('AI分析结果:', result)
    } catch (parseError) {
      console.error('JSON解析失败:', parseError)
      console.error('API返回的文本:', apiResponseText)
      // 如果解析失败，尝试从文本中提取JSON部分
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0])
          console.log('从文本中提取的JSON:', result)
        } catch (e) {
          console.error('提取JSON也失败:', e)
        }
      }
    }
    
    // 确保返回的数据结构完整
    let finalTitle = result.title || ''
    let finalDescription = result.description || originalUserText
    
    // 如果description为空，使用原始文本
    if (!finalDescription || finalDescription.trim() === '') {
      finalDescription = originalUserText
    }
    
    // 如果title为空或title和description相同，尝试智能提取标题
    if (!finalTitle || finalTitle.trim() === '' || finalTitle === finalDescription) {
      // 尝试从原始文本中提取简短标题
      // 方法1：提取第一句话（如果合适）
      const firstSentence = originalUserText.split(/[。！？\n]/)[0]
      if (firstSentence && firstSentence.length > 5 && firstSentence.length <= 25) {
        finalTitle = firstSentence.trim()
      } else {
        // 方法2：提取前20字
        finalTitle = originalUserText.substring(0, 20).trim()
        // 如果截取在句子中间，尝试找到最近的标点
        const lastPunctuation = finalTitle.lastIndexOf(/[，,。！？]/)
        if (lastPunctuation > 10) {
          finalTitle = originalUserText.substring(0, lastPunctuation).trim()
        }
      }
    }
    
    // 确保title不会太长（最多30字）
    if (finalTitle.length > 30) {
      finalTitle = finalTitle.substring(0, 30).trim()
      // 如果截取在句子中间，尝试找到最近的标点
      const punctuationMatch = finalTitle.match(/[，,。！？]/g)
      if (punctuationMatch && punctuationMatch.length > 0) {
        const lastPunctuation = Math.max(
          finalTitle.lastIndexOf('，'),
          finalTitle.lastIndexOf(','),
          finalTitle.lastIndexOf('。'),
          finalTitle.lastIndexOf('！'),
          finalTitle.lastIndexOf('？')
        )
        if (lastPunctuation > 10) {
          finalTitle = finalTitle.substring(0, lastPunctuation).trim()
        }
      }
    }
    
    // 最终验证：确保title和description不同
    if (finalTitle === finalDescription) {
      // 如果还是相同，强制使用更短的标题
      const words = originalUserText.split(/[，,。！？\s]/).filter(w => w.length > 0)
      if (words.length > 0) {
        // 取前几个关键词作为标题
        finalTitle = words.slice(0, Math.min(5, words.length)).join('')
        if (finalTitle.length > 20) {
          finalTitle = finalTitle.substring(0, 20)
        }
      } else {
        finalTitle = originalUserText.substring(0, 15).trim()
      }
    }
    
    // 确保description包含完整信息
    if (finalDescription.length < finalTitle.length) {
      finalDescription = originalUserText
    }
    
    // 如果title太长，截取前30字
    if (finalTitle.length > 30) {
      finalTitle = finalTitle.substring(0, 30) + '...'
    }
    
    // 处理日期：如果result.date是字符串，尝试解析；否则尝试从文本中推断
    let eventDate = new Date()
    if (result.date) {
      try {
        // 如果是ISO格式字符串（YYYY-MM-DD），直接解析
        if (typeof result.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
          eventDate = new Date(result.date + 'T00:00:00')
        } else {
          eventDate = new Date(result.date)
        }
        // 验证日期是否有效
        if (isNaN(eventDate.getTime())) {
          eventDate = new Date()
        }
      } catch (e) {
        console.error('日期解析失败:', e, result.date)
        eventDate = new Date()
      }
    }
    
    // 如果日期解析失败或没有提供，尝试从原始文本中推断
    if (!result.date || isNaN(eventDate.getTime())) {
      const lowerText = originalUserText.toLowerCase()
      const today = new Date()
      
      if (lowerText.includes('昨天') || lowerText.includes('昨日')) {
        eventDate = new Date(today)
        eventDate.setDate(eventDate.getDate() - 1)
      } else if (lowerText.includes('前天')) {
        eventDate = new Date(today)
        eventDate.setDate(eventDate.getDate() - 2)
      } else if (lowerText.includes('今天') || lowerText.includes('今日')) {
        eventDate = new Date(today)
      } else {
        // 默认使用今天
        eventDate = new Date(today)
      }
    }
    
    // 处理事件类型：确保是有效的类型值
    const validTypes = ['achievement', 'wish', 'event']
    const eventType = validTypes.includes(result.type) ? result.type : 'event'
    
    return {
      title: finalTitle,
      description: finalDescription,
      date: eventDate,
      type: eventType,
      importance: result.importance || 'normal',
      emotions: Array.isArray(result.emotions) ? result.emotions : [],
      emotionNote: result.emotionNote || '',
      location: result.location ? { name: result.location } : null,
      participants: Array.isArray(result.participants) ? result.participants : [],
      category: result.category || '其他',
      tags: Array.isArray(result.tags) ? result.tags : [],
    }
  } catch (error) {
    console.error('AI分析失败:', error)
    // 返回基本结构，尝试智能提取标题
    const textTrimmed = text.trim()
    let title = textTrimmed.substring(0, 30) || '新事件'
    
    // 如果文本很长，尝试提取第一句话作为标题
    const firstSentence = textTrimmed.split(/[。！？\n]/)[0]
    if (firstSentence && firstSentence.length > 5 && firstSentence.length < 30) {
      title = firstSentence.trim()
    }
    
    return {
      title: title,
      description: textTrimmed, // 完整保留原始文本作为描述
      date: new Date(),
      type: 'event',
      importance: 'normal',
      emotions: [],
      emotionNote: '',
      location: null,
      participants: [],
      category: '其他',
      tags: [],
    }
  }
}
