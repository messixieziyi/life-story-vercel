/**
 * 用户资料服务：管理用户生日和地理位置信息
 */

import { getSupabaseClient } from './supabase'

/**
 * 获取用户资料
 * @param {string} userId - 用户ID
 * @returns {Promise<Object|null>} 用户资料 { birthday, latitude, longitude }
 */
export async function getUserProfile(userId) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId) {
    return null
  }

  try {
    // 从 auth.users 的 metadata 中获取，或者创建独立的 user_profiles 表
    // 这里我们使用 user_profiles 表
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('获取用户资料失败:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('获取用户资料失败:', error)
    return null
  }
}

/**
 * 保存用户资料
 * @param {string} userId - 用户ID
 * @param {Object} profile - 资料数据 { birthday, latitude, longitude }
 * @returns {Promise<Object>}
 */
export async function saveUserProfile(userId, profile) {
  const supabase = getSupabaseClient()
  if (!supabase || !userId) {
    throw new Error('Supabase 未初始化或用户未登录')
  }

  try {
    const { birthday, latitude, longitude } = profile

    // 使用 upsert 操作（如果存在则更新，不存在则插入）
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        birthday: birthday ? new Date(birthday).toISOString() : null,
        latitude: latitude || null,
        longitude: longitude || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('保存用户资料失败:', error)
    throw error
  }
}

/**
 * 检查用户是否已设置生日
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>}
 */
export async function hasBirthday(userId) {
  const profile = await getUserProfile(userId)
  return profile && profile.birthday !== null
}
