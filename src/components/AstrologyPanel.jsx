import { useState, useEffect } from 'react'
import { Calendar, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { getUserProfile, hasBirthday } from '../lib/userProfile'
import { calculateChart } from '../lib/astrologyService'
import { analyzeFate } from '../lib/fateAnalysisService'
import AstrologyChart from './AstrologyChart'
import BirthdayModal from './BirthdayModal'
import { marked } from 'marked'
import { getCachedAnalysis, saveCachedAnalysis, deleteCachedAnalysis, ANALYSIS_TYPES } from '../lib/aiCacheService'

/**
 * 星盘面板组件
 */
export default function AstrologyPanel({ userId, records = [] }) {
  const [profile, setProfile] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [fateAnalysis, setFateAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [isCached, setIsCached] = useState(false)
  const [loadingCache, setLoadingCache] = useState(false)

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

  // 当星盘数据或记录变化时，尝试加载缓存的命运分析
  useEffect(() => {
    if (chartData && userId && records) {
      loadCachedFateAnalysis()
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
  const loadCachedFateAnalysis = async () => {
    if (!userId || !chartData || !profile) {
      return
    }

    try {
      setLoadingCache(true)
      const cached = await getCachedAnalysis(
        userId,
        ANALYSIS_TYPES.FATE_ANALYSIS,
        { profile, records }
      )

      if (cached && cached.result) {
        setFateAnalysis(cached.result)
        setIsCached(true)
      } else {
        setIsCached(false)
      }
    } catch (error) {
      console.error('加载缓存失败:', error)
      setIsCached(false)
    } finally {
      setLoadingCache(false)
    }
  }

  // 刷新分析（强制重新分析）
  const refreshFateAnalysis = async () => {
    if (!userId) {
      await handleAnalyzeFate(true)
      return
    }

    try {
      // 删除缓存
      await deleteCachedAnalysis(userId, ANALYSIS_TYPES.FATE_ANALYSIS)
      setIsCached(false)
      // 重新分析
      await handleAnalyzeFate(true)
    } catch (error) {
      console.error('刷新分析失败:', error)
      await handleAnalyzeFate(true)
    }
  }

  const handleAnalyzeFate = async (forceRefresh = false) => {
    if (!chartData) {
      return
    }

    // 如果不是强制刷新，先检查缓存
    if (!forceRefresh && userId && profile) {
      const cached = await getCachedAnalysis(
        userId,
        ANALYSIS_TYPES.FATE_ANALYSIS,
        { profile, records }
      )

      if (cached && cached.result) {
        setFateAnalysis(cached.result)
        setIsCached(true)
        return
      }
    }

    try {
      setAnalyzing(true)
      setRefreshing(forceRefresh)
      setError('')
      if (forceRefresh) {
        setFateAnalysis(null)
      }
      
      const analysis = await analyzeFate(chartData, records)
      setFateAnalysis(analysis)
      setIsCached(false)

      // 保存到缓存
      if (userId && profile) {
        try {
          await saveCachedAnalysis(
            userId,
            ANALYSIS_TYPES.FATE_ANALYSIS,
            analysis,
            { profile, records }
          )
          setIsCached(true)
        } catch (error) {
          console.error('保存缓存失败:', error)
          // 不影响用户体验，继续显示结果
        }
      }
    } catch (error) {
      console.error('分析失败:', error)
      setError('分析失败: ' + (error.message || '未知错误'))
    } finally {
      setAnalyzing(false)
      setRefreshing(false)
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                命运分析
              </h2>
              {isCached && (
                <p className="text-xs text-slate-500 mt-1">（已缓存）</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {fateAnalysis && (
                <button
                  onClick={refreshFateAnalysis}
                  disabled={analyzing || refreshing}
                  className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="刷新分析（重新分析最新数据）"
                >
                  {refreshing ? (
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
              {!fateAnalysis && (
                <button
                  onClick={() => handleAnalyzeFate(false)}
                  disabled={analyzing || loadingCache}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {analyzing || loadingCache ? (
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

          {loadingCache && !fateAnalysis ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-slate-600">加载缓存中...</span>
            </div>
          ) : analyzing ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-slate-600">AI 正在分析中...</span>
            </div>
          ) : fateAnalysis ? (
            <div
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: marked.parse(fateAnalysis) }}
            />
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
