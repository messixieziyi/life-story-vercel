import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

/**
 * AI 复盘面板组件
 */
export default function AiInsightPanel({ records }) {
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAiSummary = async () => {
    if (records.length === 0) {
      alert('请先添加一些记录，才能进行 AI 复盘')
      return
    }

    setLoading(true)
    setError(null)
    setInsight('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey || apiKey === 'your_gemini_api_key') {
        throw new Error('请配置 Gemini API Key')
      }

      // 格式化记录数据（使用新数据结构）
      const recordsText = records
        .map((r, index) => {
          const date = r.date?.toDate?.() || new Date(r.date) || r.createdAt
          const dateStr = date instanceof Date 
            ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
            : '未知日期'
          
          const typeLabel = r.type === 'achievement' ? '成就' : r.type === 'wish' ? '愿望' : '事件'
          const importanceLabel = r.importance === 'major' ? '大事' : r.importance === 'minor' ? '小事' : '普通'
          
          // 获取情绪标签
          const emotionLabels = (r.emotions || []).map(emotion => {
            const emotionMap = {
              'happy': '开心', 'excited': '兴奋', 'grateful': '感激', 'peaceful': '平静',
              'satisfied': '满足', 'proud': '自豪', 'hopeful': '充满希望', 'loved': '被爱/爱',
              'content': '满足/知足', 'neutral': '中性', 'calm': '平静', 'focused': '专注',
              'sad': '难过', 'angry': '愤怒', 'anxious': '焦虑', 'stressed': '压力大',
              'tired': '疲惫', 'frustrated': '沮丧', 'lonely': '孤独', 'worried': '担心',
              'disappointed': '失望', 'confused': '困惑', 'bored': '无聊', 'annoyed': '烦恼'
            }
            return emotionMap[emotion] || emotion
          })
          
          let recordText = `${index + 1}. 【${typeLabel}】${r.title}
   日期：${dateStr}
   重要性：${importanceLabel}
   描述：${r.description || '无'}`
          
          if (emotionLabels.length > 0) {
            recordText += `\n   情绪：${emotionLabels.join('、')}`
            if (r.emotionNote) {
              recordText += ` (${r.emotionNote})`
            }
          }
          
          if (r.location?.name) {
            recordText += `\n   地点：${r.location.name}`
          }
          
          if (r.participants && r.participants.length > 0) {
            recordText += `\n   参与人员：${r.participants.join('、')}`
          }
          
          if (r.tags && r.tags.length > 0) {
            recordText += `\n   标签：${r.tags.join('、')}`
          }
          
          if (r.category) {
            recordText += `\n   类别：${r.category}`
          }
          
          if (r.relatedEvents && r.relatedEvents.length > 0) {
            const relatedTitles = r.relatedEvents
              .map(id => {
                const related = records.find(rec => rec.id === id)
                return related ? related.title : null
              })
              .filter(Boolean)
            if (relatedTitles.length > 0) {
              recordText += `\n   关联事件：${relatedTitles.join('、')}`
            }
          }
          
          return recordText
        })
        .join('\n\n')

      const prompt = `你是一位专业的人生复盘分析师。请基于以下用户的人生记录，提供客观、深入的分析。

要求：
1. 仅基于提供的事实进行分析，不要编造或推测未提供的信息
2. 分析用户的成长轨迹、核心能力、价值取向
3. 分析情绪模式和变化趋势（注意情绪的组合和关联）
4. 分析事件之间的关联关系，发现因果关系和模式
5. 分析地点、参与人员等社交和环境因素
6. 指出明显的模式和趋势
7. 提供建设性的观察和建议
8. 使用 Markdown 格式，结构清晰
9. 语气专业但温暖，具有启发性

用户记录：
${recordsText}

请开始分析：`

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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API 错误: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '无法生成内容'

      setInsight(text)
    } catch (err) {
      console.error('AI 复盘失败:', err)
      setError(err.message || '生成复盘失败，请检查 API 配置')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">AI 复盘</h2>
          <p className="text-sm text-slate-600">
            基于你的人生记录，AI 将为你提供客观的分析和洞察
          </p>
        </div>
        <button
          onClick={fetchAiSummary}
          disabled={loading || records.length === 0}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              开始复盘
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {insight && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div
            className="prose prose-slate max-w-none
              prose-headings:text-slate-900
              prose-p:text-slate-700
              prose-strong:text-slate-900
              prose-ul:text-slate-700
              prose-ol:text-slate-700
              prose-li:text-slate-700
              prose-code:text-indigo-600
              prose-code:bg-indigo-50
              prose-code:px-1
              prose-code:py-0.5
              prose-code:rounded"
            dangerouslySetInnerHTML={{
              __html: insight
                .split('\n')
                .map((line) => {
                  // 简单的 Markdown 转 HTML
                  if (line.startsWith('## ')) {
                    return `<h2>${line.substring(3)}</h2>`
                  }
                  if (line.startsWith('### ')) {
                    return `<h3>${line.substring(4)}</h3>`
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return `<li>${line.substring(2)}</li>`
                  }
                  if (line.match(/^\d+\. /)) {
                    return `<li>${line.replace(/^\d+\. /, '')}</li>`
                  }
                  if (line.trim()) {
                    return `<p>${line}</p>`
                  }
                  return ''
                })
                .join(''),
            }}
          />
        </div>
      )}

      {!insight && !loading && records.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">请先添加一些记录，然后进行 AI 复盘</p>
        </div>
      )}
    </div>
  )
}
