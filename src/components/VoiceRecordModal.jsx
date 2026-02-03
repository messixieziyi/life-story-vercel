import { useState, useEffect, useRef } from 'react'
import { X, Mic, MicOff, Loader2, Check } from 'lucide-react'
import { startSpeechRecognition, isSpeechRecognitionSupported } from '../lib/speechService'
import { analyzeSpeechText } from '../lib/aiAnalysisService'
import { EMOTION_OPTIONS, IMPORTANCE_OPTIONS, EmotionType, ImportanceLevel, EventType } from '../lib/types'

/**
 * 语音添加记录模态框
 */
export default function VoiceRecordModal({ isOpen, onClose, onSave, allRecords = [] }) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzedData, setAnalyzedData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  // 表单状态（用于确认和编辑）
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [importance, setImportance] = useState(ImportanceLevel.NORMAL)
  const [emotions, setEmotions] = useState([])
  const [emotionNote, setEmotionNote] = useState('')
  const [location, setLocation] = useState('')
  const [participants, setParticipants] = useState('')
  const [type, setType] = useState(EventType.EVENT)

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false)
      setTranscript('')
      setAnalyzing(false)
      setAnalyzedData(null)
      setError(null)
      setTitle('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setImportance(ImportanceLevel.NORMAL)
      setEmotions([])
      setEmotionNote('')
      setLocation('')
      setParticipants('')
      setType(EventType.EVENT)
      
      // 停止识别
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [isOpen])

  // 开始录音
  const handleStartRecording = () => {
    if (!isSpeechRecognitionSupported()) {
      setError('您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器')
      return
    }

    setError(null)
    setTranscript('')
    setIsRecording(true)

    const recognition = startSpeechRecognition(
      (text) => {
        setTranscript(text)
      },
      (err) => {
        setError(err.message)
        setIsRecording(false)
        if (recognitionRef.current) {
          recognitionRef.current.stop()
          recognitionRef.current = null
        }
      },
      () => {
        setIsRecording(false)
        recognitionRef.current = null
      }
    )

    recognitionRef.current = recognition
  }

  // 停止录音并分析
  const handleStopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    setIsRecording(false)

    if (!transcript.trim()) {
      setError('未检测到语音内容，请重新录音')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      const analyzed = await analyzeSpeechText(transcript)
      setAnalyzedData(analyzed)
      
      // 填充表单
      setTitle(analyzed.title || '')
      setDescription(analyzed.description || '')
      
      // 处理日期：确保是有效的日期对象
      let eventDate = new Date()
      if (analyzed.date) {
        try {
          eventDate = analyzed.date instanceof Date ? analyzed.date : new Date(analyzed.date)
          // 验证日期是否有效
          if (isNaN(eventDate.getTime())) {
            eventDate = new Date()
          }
        } catch (e) {
          eventDate = new Date()
        }
      }
      setDate(eventDate.toISOString().split('T')[0])
      
      // 处理事件类型：从分析结果中获取，如果没有则默认为 EVENT
      if (analyzed.type) {
        // 确保类型值有效
        if (analyzed.type === 'achievement') {
          setType(EventType.ACHIEVEMENT)
        } else if (analyzed.type === 'wish') {
          setType(EventType.WISH)
        } else {
          setType(EventType.EVENT)
        }
      } else {
        setType(EventType.EVENT)
      }
      
      setImportance(analyzed.importance || ImportanceLevel.NORMAL)
      setEmotions(analyzed.emotions || [])
      setEmotionNote(analyzed.emotionNote || '')
      setLocation(analyzed.location?.name || '')
      setParticipants(analyzed.participants?.join(', ') || '')
    } catch (err) {
      console.error('分析失败:', err)
      setError('分析失败，请重试')
    } finally {
      setAnalyzing(false)
    }
  }

  // 处理情绪切换
  const handleEmotionToggle = (emotionValue) => {
    setEmotions(prev => 
      prev.includes(emotionValue)
        ? prev.filter(e => e !== emotionValue)
        : [...prev, emotionValue]
    )
  }

  // 保存
  const handleSave = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('请输入标题')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const participantsList = participants
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)

      const recordData = {
        title: title.trim(),
        description: description.trim(),
        type,
        date: new Date(date),
        importance,
        emotions,
        emotionNote: emotionNote.trim(),
        location: location.trim() ? { name: location.trim() } : null,
        participants: participantsList,
        relatedEvents: [],
      }

      await onSave(recordData)
      onClose()
    } catch (error) {
      console.error('保存失败:', error)
      setError(error.message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">语音添加记录</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 录音阶段 */}
          {!analyzedData && (
            <div className="space-y-4">
              <div className="text-center py-8">
                {isRecording ? (
                  <div className="space-y-4">
                    <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                      <MicOff className="w-10 h-10 text-red-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-900">正在录音...</p>
                    <p className="text-sm text-slate-500">点击停止按钮结束录音</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-20 h-20 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                      <Mic className="w-10 h-10 text-indigo-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-900">准备录音</p>
                    <p className="text-sm text-slate-500">点击开始按钮开始录音</p>
                  </div>
                )}
              </div>

              {/* 语音转文字显示 */}
              {transcript && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">识别内容：</p>
                  <p className="text-slate-900">{transcript}</p>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    开始录音
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    disabled={analyzing}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <MicOff className="w-5 h-5" />
                    {analyzing ? '分析中...' : '停止并分析'}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
              </div>

              {/* 分析中 */}
              {analyzing && (
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AI 正在分析语音内容...</span>
                </div>
              )}
            </div>
          )}

          {/* 确认和编辑阶段 */}
          {analyzedData && (
            <form onSubmit={handleSave} className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">AI 已自动填充以下信息，请确认或修改：</span>
                </div>
                {transcript && (
                  <p className="text-sm text-green-600 mt-2">
                    <span className="font-medium">原始语音：</span>
                    {transcript}
                  </p>
                )}
              </div>

              {/* 类型 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">类型</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType(EventType.ACHIEVEMENT)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      type === EventType.ACHIEVEMENT
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    成就
                  </button>
                  <button
                    type="button"
                    onClick={() => setType(EventType.WISH)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      type === EventType.WISH
                        ? 'bg-violet-50 border-violet-500 text-violet-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    愿望
                  </button>
                  <button
                    type="button"
                    onClick={() => setType(EventType.EVENT)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      type === EventType.EVENT
                        ? 'bg-slate-50 border-slate-500 text-slate-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    事件
                  </button>
                </div>
              </div>

              {/* 重要性 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">重要性</label>
                <div className="flex gap-2">
                  {IMPORTANCE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setImportance(option.value)}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        importance === option.value
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="例如：完成第一个项目"
                  required
                />
              </div>

              {/* 日期 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">日期</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="记录更多细节..."
                />
              </div>

              {/* 情绪 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">情绪（可多选）</label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {EMOTION_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={emotions.includes(option.value)}
                        onChange={() => handleEmotionToggle(option.value)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 情绪详细描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">情绪详细描述（可选）</label>
                <input
                  type="text"
                  value={emotionNote}
                  onChange={(e) => setEmotionNote(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="例如：非常兴奋，但有点紧张"
                />
              </div>

              {/* 地点 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">地点</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="例如：公司食堂、家里、XX大学"
                />
              </div>

              {/* 参与人员 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">参与人员（用逗号分隔）</label>
                <input
                  type="text"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="例如：家人、朋友、同事"
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      确认保存
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
