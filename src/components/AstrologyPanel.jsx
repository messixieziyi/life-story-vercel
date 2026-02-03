import { useState, useEffect } from 'react'
import { Calendar, Sparkles, Loader2, RefreshCw, Briefcase, Heart, Zap, Calendar as CalendarIcon } from 'lucide-react'
import { getUserProfile, hasBirthday } from '../lib/userProfile'
import { calculateChart } from '../lib/astrologyService'
import { analyzeFate } from '../lib/fateAnalysisService'
import AstrologyChart from './AstrologyChart'
import BirthdayModal from './BirthdayModal'
import { marked } from 'marked'
import { getCachedAnalysis, saveCachedAnalysis, deleteCachedAnalysis, ANALYSIS_TYPES } from '../lib/aiCacheService'

// 分析类型映射
const ANALYSIS_TYPE_MAP = {
  past: ANALYSIS_TYPES.FATE_ANALYSIS_PAST,
  future7days: ANALYSIS_TYPES.FATE_ANALYSIS_FUTURE7,
  monthly: ANALYSIS_TYPES.FATE_ANALYSIS_MONTHLY,
  yearly: ANALYSIS_TYPES.FATE_ANALYSIS_YEARLY,
}

/**
 * 星盘面板组件
 */
export default function AstrologyPanel({ userId, records = [] }) {
  const [profile, setProfile] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [fateAnalyses, setFateAnalyses] = useState({}) // 存储所有类型的分析结果
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [analyzing, setAnalyzing] = useState({}) // 记录每个类型的分析状态
  const [refreshing, setRefreshing] = useState({}) // 记录每个类型的刷新状态
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [isCached, setIsCached] = useState({}) // 记录每个类型的缓存状态
  const [loadingCache, setLoadingCache] = useState({}) // 记录每个类型的缓存加载状态
  const [activeTab, setActiveTab] = useState('future7days') // 导航栏当前选中的标签

  // 加载用户资料
  useEffect(() => {
    if (userId) {
      loadProfile()
    }
  }, [userId])

  // 如果有生日，自动计算星盘
  useEffect(() => {
    if (profile && profile.birthday) {
      calculateChartData()
    }
  }, [profile])

  // 当星盘数据或记录变化时，尝试加载所有标签的缓存
  useEffect(() => {
    if (chartData && userId && records) {
      // 加载所有标签的缓存
      const tabIds = ['past', 'future7days', 'monthly', 'yearly']
      tabIds.forEach(tabId => {
        loadCachedFateAnalysis(tabId)
      })
    }
  }, [chartData, userId, records])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const userProfile = await getUserProfile(userId)
      setProfile(userProfile)
      
      if (!userProfile || !userProfile.birthday) {
        setLoading(false)
        return
      }
    } catch (error) {
      console.error('加载资料失败:', error)
      setError('加载资料失败')
      setLoading(false)
    }
  }

  const calculateChartData = async () => {
    if (!profile || !profile.birthday) {
      return
    }

    try {
      setCalculating(true)
      setError('')
      
      const birthDate = new Date(profile.birthday)
      const chart = await calculateChart(
        birthDate,
        profile.latitude,
        profile.longitude
      )
      
      setChartData(chart)
    } catch (error) {
      console.error('计算星盘失败:', error)
      setError('计算星盘失败: ' + (error.message || '未知错误'))
    } finally {
      setCalculating(false)
      setLoading(false)
    }
  }

  // 从缓存加载命运分析
  const loadCachedFateAnalysis = async (tabId = activeTab) => {
    if (!userId || !chartData || !profile) {
      return
    }

    const analysisType = ANALYSIS_TYPE_MAP[tabId]
    if (!analysisType) return

    try {
      setLoadingCache(prev => ({ ...prev, [tabId]: true }))
      const cached = await getCachedAnalysis(
        userId,
        analysisType,
        { profile, records, analysisType: tabId }
      )

      if (cached && cached.result) {
        setFateAnalyses(prev => ({ ...prev, [tabId]: cached.result }))
        setIsCached(prev => ({ ...prev, [tabId]: true }))
      } else {
        setIsCached(prev => ({ ...prev, [tabId]: false }))
      }
    } catch (error) {
      console.error('加载缓存失败:', error)
      setIsCached(prev => ({ ...prev, [tabId]: false }))
    } finally {
      setLoadingCache(prev => ({ ...prev, [tabId]: false }))
    }
  }

  // 刷新分析（强制重新分析所有标签）
  const refreshFateAnalysis = async () => {
    await handleAnalyzeAll(true)
  }

  // 切换标签时，如果没有数据则加载缓存（不自动分析）缓存（不自动分析）
  const handleTabChange = async (tabId) => {
    setActiveTab(tabId)
    // 如果该标签没有数据，只尝试加载缓存，不自动分析
    if (!fateAnalyses[tabId]) {
      await loadCachedFateAnalysis(tabId)
    }
  }

  // 一次性分析所有四个标签
  const handleAnalyzeAll = async (forceRefresh = false) => {
    if (!chartData) {
      return
    }

    const tabIds = ['past', 'future7days', 'monthly', 'yearly']
    
    // 如果不是强制刷新，先检查所有标签的缓存
    if (!forceRefresh && userId && profile) {
      let hasAllCached = true
      for (const tabId of tabIds) {
        if (!fateAnalyses[tabId]) {
          await loadCachedFateAnalysis(tabId)
          if (!fateAnalyses[tabId]) {
            hasAllCached = false
          }
        }
      }
      // 如果所有标签都有缓存，就不需要分析了
      if (hasAllCached) {
        return
      }
    }

    // 如果是强制刷新，先删除所有缓存
    if (forceRefresh && userId) {
      for (const tabId of tabIds) {
        const analysisType = ANALYSIS_TYPE_MAP[tabId]
        if (analysisType) {
          try {
            await deleteCachedAnalysis(userId, analysisType)
            setIsCached(prev => ({ ...prev, [tabId]: false }))
          } catch (error) {
            console.error(`删除缓存失败 (${tabId}):`, error)
          }
        }
      }
    }

    // 并行分析所有标签
    setAnalyzing({
      past: true,
      future7days: true,
      monthly: true,
      yearly: true,
    })
    setError('')

    try {
      const analysisPromises = tabIds.map(async (tabId) => {
        try {
          const analysis = await analyzeFate(chartData, records, tabId)
          setFateAnalyses(prev => ({ ...prev, [tabId]: analysis }))
          setIsCached(prev => ({ ...prev, [tabId]: false }))

          // 保存到缓存
          if (userId && profile && !analysis.error) {
            try {
              const analysisType = ANALYSIS_TYPE_MAP[tabId]
              await saveCachedAnalysis(
                userId,
                analysisType,
                analysis,
                { profile, records, analysisType: tabId }
              )
              setIsCached(prev => ({ ...prev, [tabId]: true }))
            } catch (error) {
              console.error(`保存缓存失败 (${tabId}):`, error)
            }
          }
        } catch (error) {
          console.error(`分析失败 (${tabId}):`, error)
          setFateAnalyses(prev => ({
            ...prev,
            [tabId]: { error: `分析失败: ${error.message || '未知错误'}` }
          }))
        } finally {
          setAnalyzing(prev => ({ ...prev, [tabId]: false }))
        }
      })

      await Promise.all(analysisPromises)
    } catch (error) {
      console.error('批量分析失败:', error)
      setError('分析失败: ' + (error.message || '未知错误'))
    }
  }

  const handleBirthdaySave = async (data) => {
    setProfile({
      ...profile,
      birthday: data.birthday.toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
    })
    setIsBirthdayModalOpen(false)
    // 自动计算星盘
    await new Promise(resolve => setTimeout(resolve, 500))
    await calculateChartData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-slate-600">加载中...</span>
      </div>
    )
  }

  // 如果没有设置生日
  if (!profile || !profile.birthday) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            设置出生信息
          </h2>
          <p className="text-slate-600 mb-6">
            请先设置您的出生日期、时间和地点，才能查看星盘分析
          </p>
          <button
            onClick={() => setIsBirthdayModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            设置出生信息
          </button>
        </div>

        <BirthdayModal
          isOpen={isBirthdayModalOpen}
          onClose={() => setIsBirthdayModalOpen(false)}
          userId={userId}
          onSave={handleBirthdaySave}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 出生信息卡片 */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">出生信息</h3>
            <div className="text-sm text-slate-600">
              {new Date(profile.birthday).toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              纬度: {profile.latitude?.toFixed(4)}, 经度: {profile.longitude?.toFixed(4)}
            </div>
          </div>
          <button
            onClick={() => setIsBirthdayModalOpen(true)}
            className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            修改
          </button>
        </div>
      </div>

      {/* 星盘图表 */}
      {calculating ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-slate-600">计算星盘中...</span>
        </div>
      ) : chartData ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">星盘</h2>
          <AstrologyChart chartData={chartData} />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-600">
          点击"计算星盘"开始
          <button
            onClick={calculateChartData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            计算星盘
          </button>
        </div>
      )}

      {/* 命运分析 */}
      {chartData && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                星盘分析
              </h2>
              {isCached[activeTab] && (
                <p className="text-xs text-slate-500 mt-1">（已缓存）</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {Object.values(fateAnalyses).some(a => a && !a.error) && (
                <button
                  onClick={refreshFateAnalysis}
                  disabled={Object.values(analyzing).some(v => v)}
                  className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="刷新分析（重新分析所有标签）"
                >
                  {Object.values(analyzing).some(v => v) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      刷新中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      刷新分析
                    </>
                  )}
                </button>
              )}
              {!Object.values(fateAnalyses).some(a => a && !a.error) && (
                <button
                  onClick={() => handleAnalyzeAll(false)}
                  disabled={Object.values(analyzing).some(v => v) || Object.values(loadingCache).some(v => v)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {Object.values(analyzing).some(v => v) || Object.values(loadingCache).some(v => v) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    '开始分析'
                  )}
                </button>
              )}
            </div>
          </div>

          {loadingCache[activeTab] && (!fateAnalyses[activeTab] || fateAnalyses[activeTab]?.error) ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-slate-600">加载缓存中...</span>
            </div>
          ) : analyzing[activeTab] ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-slate-600">AI 正在分析中...（正在分析所有标签，请稍候）</span>
            </div>
          ) : fateAnalyses[activeTab] && !fateAnalyses[activeTab].error ? (
            <div className="space-y-6">
              {/* 导航栏 */}
              <div className="flex gap-2 border-b border-slate-200 pb-2">
                {[
                  { id: 'past', label: '回顾过去' },
                  { id: 'future7days', label: '未来7天' },
                  { id: 'monthly', label: '本月运势' },
                  { id: 'yearly', label: '年度展望' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 主内容区域 */}
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                    未来指引
                  </span>
                  <div className="text-right">
                    <div className="text-sm text-slate-500 mb-1">灵性指数</div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {fateAnalyses[activeTab].spiritualityIndex || 78}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 text-slate-700 leading-relaxed">
                  <p>{fateAnalyses[activeTab].futureGuidance?.paragraph1 || ''}</p>
                  <p>{fateAnalyses[activeTab].futureGuidance?.paragraph2 || ''}</p>
                </div>
              </div>

              {/* 三个卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 事业卡片 */}
                <div className="bg-white rounded-lg p-5 border-l-4 border-blue-500 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      {fateAnalyses[activeTab].career?.title || '事业'}
                    </h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {fateAnalyses[activeTab].career?.content || ''}
                  </p>
                </div>

                {/* 情感卡片 */}
                <div className="bg-white rounded-lg p-5 border-l-4 border-pink-500 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Heart className="w-6 h-6 text-pink-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      {fateAnalyses[activeTab].emotion?.title || '情感'}
                    </h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {fateAnalyses[activeTab].emotion?.content || ''}
                  </p>
                </div>

                {/* 能量卡片 */}
                <div className="bg-white rounded-lg p-5 border-l-4 border-green-500 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      {fateAnalyses[activeTab].energy?.title || '能量'}
                    </h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {fateAnalyses[activeTab].energy?.content || ''}
                  </p>
                </div>
              </div>

              {/* 关键星象节点 */}
              {fateAnalyses[activeTab].keyNodes && fateAnalyses[activeTab].keyNodes.length > 0 && (
                <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-slate-900">关键星象节点</h3>
                  </div>
                  <div className="space-y-3">
                    {fateAnalyses[activeTab].keyNodes.map((node, index) => (
                      <div
                        key={index}
                        className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                      >
                        <div className="text-indigo-600 font-medium mb-2">
                          {node.date}
                        </div>
                        <div className="text-slate-600 text-sm">
                          {node.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : fateAnalyses[activeTab]?.error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {fateAnalyses[activeTab].error}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>点击"开始分析"获取 AI 命运解读</p>
            </div>
          )}
        </div>
      )}

      {/* 生日设置模态框 */}
      <BirthdayModal
        isOpen={isBirthdayModalOpen}
        onClose={() => setIsBirthdayModalOpen(false)}
        userId={userId}
        onSave={handleBirthdaySave}
      />
    </div>
  )
}
