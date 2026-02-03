import { useState, useEffect } from 'react'
import { useRecords } from './hooks/useRecords'
import Timeline from './components/Timeline'
import AchievementModal from './components/AchievementModal'
import VoiceRecordModal from './components/VoiceRecordModal'
import LoginModal from './components/LoginModal'
import StatsSummary from './components/StatsSummary'
import AiInsightPanel from './components/AiInsightPanel'
import AstrologyPanel from './components/AstrologyPanel'
import { createSampleEvents } from './lib/sampleEvents'
import { EMOTION_OPTIONS, IMPORTANCE_OPTIONS, EventType } from './lib/types'
import { onAuthStateChange, logout } from './lib/supabase'
import { hasBirthday } from './lib/userProfile'
import { Heart, Plus, Download, Mic, LogOut, User } from 'lucide-react'

function App() {
  const [user, setUser] = useState(null) // Supabase User 对象
  const [userId, setUserId] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [loadingSamples, setLoadingSamples] = useState(false)
  const [hasUserBirthday, setHasUserBirthday] = useState(false)
  const { records, addRecord, deleteRecord, loading: recordsLoading } = useRecords(userId)

  // 加载示例事件
  const handleLoadSamples = async () => {
    // 检查是否已经有示例事件
    const sampleTitles = [
      "第一次参加编程竞赛",
      "高中毕业",
      "第一次离家住宿舍",
      "和好朋友一起看日出",
      "第一次实习",
      "大学毕业",
      "第一次正式面试",
      "完成第一个项目",
      "参加朋友的婚礼",
      "学会了做红烧肉",
      "工作压力很大的一天",
      "开始学习新技能",
      "今天吃了辣椒炒肉",
      "今天长痘了"
    ]
    
    const existingSamples = records.filter(r => sampleTitles.includes(r.title))
    let shouldReplace = false
    
    if (existingSamples.length > 0) {
      shouldReplace = confirm(
        `检测到已有 ${existingSamples.length} 个示例事件。\n\n` +
        `选择"确定"将删除旧的示例事件并重新加载（使用正确的日期）。\n` +
        `选择"取消"将只添加不存在的示例事件。`
      )
      
      if (shouldReplace) {
        // 删除旧的示例事件
        for (const sample of existingSamples) {
          try {
            await deleteRecord(sample.id)
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (err) {
            console.error(`删除事件失败: ${sample.title}`, err)
          }
        }
        // 等待删除完成
        await new Promise(resolve => setTimeout(resolve, 500))
      } else if (!confirm('是否要添加剩余的示例事件？')) {
        return
      }
    } else if (records.length > 0) {
      if (!confirm('当前已有记录，是否要添加示例事件？')) {
        return
      }
    }

    setLoadingSamples(true)
    try {
      const sampleEvents = createSampleEvents()
      
      // 如果替换模式，添加所有事件；否则只添加不存在的
      const currentRecords = shouldReplace ? [] : records // 如果替换了，当前记录已更新
      const existingTitles = new Set(currentRecords.map(r => r.title))
      const eventsToAdd = shouldReplace
        ? sampleEvents
        : sampleEvents.filter(e => !existingTitles.has(e.title))
      
      if (eventsToAdd.length === 0) {
        alert('所有示例事件已存在！')
        setLoadingSamples(false)
        return
      }

      // 保存所有事件
      let successCount = 0
      let failedEvents = []
      for (let i = 0; i < eventsToAdd.length; i++) {
        const event = eventsToAdd[i]
        try {
          // 确保日期是 Date 对象
          const eventWithDate = {
            ...event,
            date: event.date instanceof Date ? event.date : new Date(event.date)
          }
          await addRecord(eventWithDate)
          successCount++
          // 短暂延迟，避免请求过快
          if (i < eventsToAdd.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        } catch (err) {
          console.error(`添加事件失败: ${event.title}`, err)
          failedEvents.push({ title: event.title, error: err.message || String(err) })
        }
      }
      
      // 等待记录同步
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (failedEvents.length > 0) {
        const errorMsg = failedEvents.map(f => `- ${f.title}: ${f.error}`).join('\n')
        alert(`成功添加 ${successCount} 个示例事件，${failedEvents.length} 个失败：\n\n${errorMsg}\n\n提示：可以在编辑事件时手动建立关联关系。`)
      } else {
        alert(`成功添加 ${successCount} 个示例事件！\n\n提示：可以在编辑事件时手动建立关联关系。`)
      }
    } catch (error) {
      console.error('加载示例事件失败:', error)
      alert('加载示例事件失败，请重试')
    } finally {
      setLoadingSamples(false)
    }
  }

  // 监听认证状态
  useEffect(() => {
    const unsubscribe = onAuthStateChange((supabaseUser) => {
      if (supabaseUser) {
        setUser(supabaseUser)
        // Supabase 用户对象使用 id 而不是 uid
        setUserId(supabaseUser.id)
      } else {
        setUser(null)
        setUserId(null)
        setHasUserBirthday(false)
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 检查用户是否已设置生日
  useEffect(() => {
    if (userId) {
      checkBirthday()
    } else {
      setHasUserBirthday(false)
    }
  }, [userId])

  const checkBirthday = async () => {
    try {
      const hasBday = await hasBirthday(userId)
      setHasUserBirthday(hasBday)
    } catch (error) {
      console.error('检查生日失败:', error)
      setHasUserBirthday(false)
    }
  }

  // 处理登录成功
  const handleLoginSuccess = () => {
    // 认证状态会自动更新，这里可以添加额外的逻辑
    setIsLoginModalOpen(false)
  }

  // 处理登出
  const handleLogout = async () => {
    if (confirm('确定要登出吗？')) {
      try {
        await logout()
        setUser(null)
        setUserId(null)
      } catch (error) {
        console.error('登出失败:', error)
        alert('登出失败，请重试')
      }
    }
  }

  // 加载状态
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">加载中...</div>
      </div>
    )
  }

  // 未登录状态
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">
              人生档案
            </h1>
            <p className="text-slate-600">请登录以访问您的人生记录</p>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            登录 / 注册
          </button>
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      </div>
    )
  }

  // 主界面
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 头部导航 */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              人生档案
            </h1>
            <div className="flex items-center gap-4">
              {/* 用户信息 */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4" />
                <span>{user.email || '用户'}</span>
              </div>
              {/* 登出按钮 */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="登出"
              >
                <LogOut className="w-4 h-4" />
                <span>登出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab 导航 */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: '概览' },
              { id: 'journey', label: '历程' },
              { id: 'wishes', label: '愿望' },
              { id: 'ai', label: 'AI复盘' },
              { id: 'astrology', label: '星盘', requiresBirthday: true },
            ].map((tab) => {
              const isDisabled = tab.requiresBirthday && !hasUserBirthday
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : isDisabled
                      ? 'text-slate-400 hover:text-slate-600 cursor-pointer'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={isDisabled ? '点击设置出生信息' : ''}
                >
                  {tab.label}
                  {isDisabled && <span className="ml-1 text-xs">🔒</span>}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">概览</h2>
              <button
                onClick={handleLoadSamples}
                disabled={loadingSamples}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                {loadingSamples ? '加载中...' : '加载示例事件'}
              </button>
            </div>
            <StatsSummary records={records} />
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">最近记录</h3>
              {records.length === 0 ? (
                <p className="text-slate-600 text-center py-8">
                  还没有任何记录，<button
                    onClick={() => setIsModalOpen(true)}
                    className="text-indigo-600 hover:text-indigo-700 underline"
                  >
                    添加第一条记录
                  </button>
                </p>
              ) : (
                <div className="space-y-3">
                  {records.slice(0, 5).map((record) => {
                    const isAchievement = record.type === EventType.ACHIEVEMENT
                    const isWish = record.type === EventType.WISH
                    const dotColor = isAchievement ? 'bg-indigo-500' : isWish ? 'bg-violet-500' : 'bg-slate-500'
                    
                    // 获取情绪标签
                    const emotionLabels = (record.emotions || []).map(emotion => {
                      const option = EMOTION_OPTIONS.find(opt => opt.value === emotion)
                      return option ? option.label : emotion
                    })
                    
                    // 获取重要性标签
                    const importanceLabel = IMPORTANCE_OPTIONS.find(opt => opt.value === record.importance)?.label || '普通'
                    const importanceColor = record.importance === 'major' 
                      ? 'bg-red-100 text-red-700' 
                      : record.importance === 'minor'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700'
                    
                    return (
                      <div
                        key={record.id}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-slate-900 truncate">{record.title}</div>
                            {record.importance && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${importanceColor}`}>
                                {importanceLabel}
                              </span>
                            )}
                          </div>
                          {record.description && (
                            <div className="text-sm text-slate-600 mt-1 line-clamp-2">
                              {record.description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {emotionLabels.length > 0 && (
                              <div className="flex items-center gap-1">
                                {emotionLabels.slice(0, 3).map((label, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-pink-100 text-pink-700">
                                    {label}
                                  </span>
                                ))}
                                {emotionLabels.length > 3 && (
                                  <span className="text-xs text-slate-500">+{emotionLabels.length - 3}</span>
                                )}
                              </div>
                            )}
                            {record.location?.name && (
                              <span className="text-xs text-slate-500">📍 {record.location.name}</span>
                            )}
                            {record.participants && record.participants.length > 0 && (
                              <span className="text-xs text-slate-500">👥 {record.participants.slice(0, 2).join('、')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'journey' && (
          <Timeline
            records={records}
            onDelete={async (id) => {
              if (confirm('确定要删除这条记录吗？')) {
                try {
                  await deleteRecord(id)
                } catch (error) {
                  alert('删除失败，请重试')
                }
              }
            }}
            onAdd={() => setIsModalOpen(true)}
            onVoiceAdd={() => setIsVoiceModalOpen(true)}
          />
        )}

        {activeTab === 'wishes' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">愿望清单</h2>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加愿望
              </button>
            </div>
            {records.filter(r => r.type === 'wish').length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <Heart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">还没有愿望记录</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  添加第一个愿望
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {records
                  .filter(r => r.type === 'wish')
                  .map((wish) => {
                    const date = wish.date?.toDate?.() || new Date(wish.date) || wish.createdAt
                    const dateStr = date instanceof Date
                      ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
                      : '未设置日期'
                    
                    return (
                      <div
                        key={wish.id}
                        className="bg-white rounded-lg border border-violet-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                              {wish.title}
                            </h3>
                            <div className="text-sm text-slate-500 mb-2">日期：{dateStr}</div>
                            {wish.description && (
                              <p className="text-slate-600 leading-relaxed">{wish.description}</p>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm('确定要删除这个愿望吗？')) {
                                try {
                                  await deleteRecord(wish.id)
                                } catch (error) {
                                  alert('删除失败，请重试')
                                }
                              }
                            }}
                            className="ml-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除愿望"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <AiInsightPanel records={records} userId={userId} />
        )}

        {activeTab === 'astrology' && (
          <AstrologyPanel userId={userId} records={records} />
        )}
      </main>

      {/* 添加/编辑记录模态框 */}
      <AchievementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        allRecords={records}
        onSave={async (recordData) => {
          try {
            await addRecord(recordData)
          } catch (error) {
            console.error('保存失败:', error)
            throw error
          }
        }}
      />

      {/* 语音添加记录模态框 */}
      <VoiceRecordModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        allRecords={records}
        onSave={async (recordData) => {
          try {
            await addRecord(recordData)
          } catch (error) {
            console.error('保存失败:', error)
            throw error
          }
        }}
      />

      {/* 登录/注册模态框 */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}

export default App
