/**
 * AI 服务：用于自动生成标签和类别
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e9bbd3f7-fa3e-4a44-b99c-a006c4ae5b13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.js:15',message:'API call attempt',data:{attempt:attempt+1,maxRetries:maxRetries+1},timestamp:Date.now(),sessionId:'debug-session',runId:'retry-fix',hypothesisId:'RETRY'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch(apiUrl, options)
      
      if (response.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e9bbd3f7-fa3e-4a44-b99c-a006c4ae5b13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.js:22',message:'API call success',data:{attempt:attempt+1,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'retry-fix',hypothesisId:'RETRY'})}).catch(()=>{});
        // #endregion
        return response
      }
      
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || ''
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e9bbd3f7-fa3e-4a44-b99c-a006c4ae5b13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.js:30',message:'API call error',data:{attempt:attempt+1,status:response.status,errorMessage:errorMessage,isOverloaded:errorMessage.includes('overloaded')},timestamp:Date.now(),sessionId:'debug-session',runId:'retry-fix',hypothesisId:'RETRY'})}).catch(()=>{});
      // #endregion
      
      // 如果是过载错误且还有重试机会，则重试
      if ((errorMessage.includes('overloaded') || errorMessage.includes('try again')) && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000) // 指数退避，最多10秒
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e9bbd3f7-fa3e-4a44-b99c-a006c4ae5b13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.js:37',message:'Retrying after delay',data:{attempt:attempt+1,delayMs:delay},timestamp:Date.now(),sessionId:'debug-session',runId:'retry-fix',hypothesisId:'RETRY'})}).catch(()=>{});
        // #endregion
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // 如果不是可重试的错误，直接抛出
      throw new Error(errorMessage || `API 错误: ${response.status}`)
    } catch (error) {
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e9bbd3f7-fa3e-4a44-b99c-a006c4ae5b13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.js:47',message:'All retries exhausted',data:{attempt:attempt+1,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'retry-fix',hypothesisId:'RETRY'})}).catch(()=>{});
        // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9bbd3f7-fa3e-4a44-b99c-a006c4ae5b13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.js:21',message:'generateTagsAndCategory entry',data:{hasApiKey:!!apiKey,apiKeyLength:apiKey?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9bbd3f7-fa3e-4a44-b99c-a006c4ae5b13',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.js:108',message:'Before API call with retry',data:{url:apiUrl,model:'gemini-3-flash-preview',apiVersion:'v1beta'},timestamp:Date.now(),sessionId:'debug-session',runId:'retry-fix',hypothesisId:'RETRY'})}).catch(()=>{});
    // #endregion

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
