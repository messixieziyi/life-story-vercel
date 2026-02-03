/**
 * AI 分析服务：从语音文字中提取结构化信息
 */

/**
 * 从语音文字中提取事件信息
 * @param {string} text - 语音转文字的内容
 * @returns {Promise<Object>} 提取的事件信息
 */
export async function analyzeSpeechText(text) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    // 如果没有配置 API Key，返回基本结构
    return {
      title: text.substring(0, 50) || '新事件',
      description: text,
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
    const prompt = `请分析以下用户用语音记录的人生事件，并提取结构化信息。用户可能说的是大事（如毕业、工作、结婚）或小事（如今天吃了什么、心情如何）。

用户说的话：
${text}

请提取以下信息并以JSON格式返回：
{
  "title": "事件的简短标题（不超过20字，只提取核心事件，如'今天吃了辣椒炒肉'、'大学毕业'、'和好朋友看日出'）",
  "description": "事件的详细描述（完整保留用户说的内容，可以适当整理但不要简化，应该比title更详细）",
  "importance": "major" 或 "minor" 或 "normal"（根据事件重要性判断）,
  "emotions": ["情绪1", "情绪2"]（从以下选项中选择：happy, excited, grateful, peaceful, satisfied, proud, hopeful, loved, content, neutral, calm, focused, sad, angry, anxious, stressed, tired, frustrated, lonely, worried, disappointed, confused, bored, annoyed）,
  "emotionNote": "情绪详细描述（可选，用中文）",
  "location": "地点名称（如果有提到，否则为null）",
  "participants": ["人员1", "人员2"]（如果提到和谁一起，否则为空数组）,
  "category": "类别（如：工作、学习、健康、饮食、社交、旅行、家庭、娱乐、运动、其他）",
  "tags": ["标签1", "标签2", "标签3"]（3-5个相关标签）
}

重要要求：
1. title必须是简短摘要（10-20字），只提取核心事件
2. description必须保留用户的完整描述，应该比title更详细，可以包含更多细节
3. title和description必须不同，description应该包含更多信息
4. 如果用户没有明确提到日期，使用今天的日期
5. 情绪要准确反映用户的情感状态
6. 重要性要合理判断（大事如毕业、工作、结婚等；小事如吃饭、心情等）
7. 只返回JSON，不要其他文字
8. 如果信息不明确，使用合理的默认值`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
    
    // 确保返回的数据结构完整
    // 如果title和description相同，尝试从description中提取更详细的描述
    let finalTitle = result.title || text.substring(0, 30).trim() || '新事件'
    let finalDescription = result.description || text
    
    // 如果title和description相同或description为空，使用原始文本作为description
    if (finalTitle === finalDescription || !finalDescription || finalDescription.trim() === '') {
      finalDescription = text
    }
    
    // 如果title太长，截取前30字
    if (finalTitle.length > 30) {
      finalTitle = finalTitle.substring(0, 30) + '...'
    }
    
    return {
      title: finalTitle,
      description: finalDescription,
      importance: result.importance || 'normal',
      emotions: Array.isArray(result.emotions) ? result.emotions : [],
      emotionNote: result.emotionNote || '',
      location: result.location ? { name: result.location } : null,
      participants: Array.isArray(result.participants) ? result.participants : [],
      category: result.category || '其他',
      tags: Array.isArray(result.tags) ? result.tags : [],
      date: new Date(), // 默认使用今天
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
      importance: 'normal',
      emotions: [],
      emotionNote: '',
      location: null,
      participants: [],
      category: '其他',
      tags: [],
      date: new Date(),
    }
  }
}
