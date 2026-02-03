/**
 * AI 分析缓存服务
 * 用于缓存 AI 复盘和星盘分析结果，避免重复分析
 */

import { getSupabaseClient } from './supabase'

/**
 * 分析类型常量
 */
export const ANALYSIS_TYPES = {
  AI_INSIGHT: 'ai_insight',      // AI 复盘
  FATE_ANALYSIS: 'fate_analysis', // 星盘命运分析
}

/**
 * 生成缓存键
 * 用于判断数据是否发生变化，是否需要刷新缓存
 * @param {string} type - 分析类型
 * @param {Object} params - 参数对象
 * @returns {string} 缓存键
 */
function generateCacheKey(type, params) {
  if (type === ANALYSIS_TYPES.AI_INSIGHT) {
    // AI 复盘：基于记录数量和最后更新时间
    const { records } = params
    const recordCount = records?.length || 0
    const lastUpdated = records?.length > 0 
      ? Math.max(...records.map(r => {
          const date = r.updated_at || r.created_at || r.date
          return date ? new Date(date).getTime() : 0
        }))
      : 0
    return `${type}_${recordCount}_${lastUpdated}`
  } else if (type === ANALYSIS_TYPES.FATE_ANALYSIS) {
    // 星盘分析：基于生日和记录数量
    const { profile, records } = params
    const birthday = profile?.birthday || ''
    const recordCount = records?.length || 0
    const lastUpdated = records?.length > 0
      ? Math.max(...records.map(r => {
          const date = r.updated_at || r.created_at || r.date
          return date ? new Date(date).getTime() : 0
        }))
      : 0
    return `${type}_${birthday}_${recordCount}_${lastUpdated}`
  }
  return `${type}_${Date.now()}`
}

/**
 * 获取缓存的分析结果
 * @param {string} userId - 用户ID
 * @param {string} type - 分析类型
 * @param {Object} params - 参数对象（用于生成缓存键）
 * @returns {Promise<Object|null>} 缓存结果 { result, cacheKey, updatedAt } 或 null
 */
export async function getCachedAnalysis(userId, type, params = {}) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('ai_analysis_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('analysis_type', type)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('获取缓存失败:', error)
      return null
    }

    if (!data) {
      return null
    }

    // 检查缓存键是否匹配（判断数据是否已变化）
    const currentCacheKey = generateCacheKey(type, params)
    if (data.cache_key !== currentCacheKey) {
      // 缓存键不匹配，说明数据已变化，返回 null 表示需要重新分析
      return null
    }

    return {
      result: data.analysis_result,
      cacheKey: data.cache_key,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error('获取缓存失败:', error)
    return null
  }
}

/**
 * 保存分析结果到缓存
 * @param {string} userId - 用户ID
 * @param {string} type - 分析类型
 * @param {string} result - 分析结果（Markdown 格式）
 * @param {Object} params - 参数对象（用于生成缓存键）
 * @returns {Promise<Object>} 保存的缓存数据
 */
export async function saveCachedAnalysis(userId, type, result, params = {}) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId) {
    throw new Error('Supabase 未初始化或用户未登录')
  }

  try {
    const cacheKey = generateCacheKey(type, params)

    // 使用 upsert 操作（如果存在则更新，不存在则插入）
    const { data, error } = await supabase
      .from('ai_analysis_cache')
      .upsert({
        user_id: userId,
        analysis_type: type,
        analysis_result: result,
        cache_key: cacheKey,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,analysis_type',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('保存缓存失败:', error)
    throw error
  }
}

/**
 * 删除缓存的分析结果（用于强制刷新）
 * @param {string} userId - 用户ID
 * @param {string} type - 分析类型
 * @returns {Promise<void>}
 */
export async function deleteCachedAnalysis(userId, type) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId) {
    return
  }

  try {
    const { error } = await supabase
      .from('ai_analysis_cache')
      .delete()
      .eq('user_id', userId)
      .eq('analysis_type', type)

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('删除缓存失败:', error)
    throw error
  }
}
