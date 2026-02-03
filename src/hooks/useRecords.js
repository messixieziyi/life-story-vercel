import { useState, useEffect } from 'react'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase'
import { generateTagsAndCategory } from '../lib/aiService'
import { ImportanceLevel, EventType } from '../lib/types'

/**
 * 自定义 Hook：管理用户记录的实时同步和 CRUD 操作
 * @param {string} userId - 用户 ID
 * @returns {Object} { records, addRecord, deleteRecord, loading, error }
 */
export const useRecords = (userId) => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setRecords([])
      setLoading(false)
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase || !isSupabaseConfigured()) {
      // 使用本地存储作为后备方案
      loadRecordsFromLocalStorage(userId)
      return
    }

    // 初始加载数据
    const loadRecords = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('life_events')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        const recordsData = (data || []).map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          date: r.date ? new Date(r.date) : null,
          importance: r.importance || ImportanceLevel.NORMAL,
          emotions: r.emotions || [],
          emotionNote: r.emotion_note || '',
          location: r.location || null,
          participants: r.participants || [],
          media: r.media || null,
          tags: r.tags || [],
          category: r.category || null,
          relatedEvents: r.related_events || [],
          type: r.type || EventType.EVENT,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
          updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
        }))

        setRecords(recordsData)
        setLoading(false)
        setError(null)
      } catch (err) {
        console.error('加载记录失败:', err)
        loadRecordsFromLocalStorage(userId)
      }
    }

    loadRecords()

    // 实时监听数据变化
    const channel = supabase
      .channel('life_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'life_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // 重新加载数据
          loadRecords()
        }
      )
      .subscribe()

    // 清理订阅
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  /**
   * 从本地存储加载记录（演示模式）
   */
  const loadRecordsFromLocalStorage = (userId) => {
    try {
      const storageKey = `life_archive_${userId}_records`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const recordsData = JSON.parse(stored).map(r => {
          let date = null
          if (r.date) {
            if (r.date instanceof Date) {
              date = r.date
            } else if (typeof r.date === 'string') {
              date = new Date(r.date)
            } else {
              date = new Date(r.date)
            }
          }
          
          return {
            ...r,
            date: date,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          }
        })
        setRecords(recordsData)
      } else {
        setRecords([])
      }
      setLoading(false)
      setError(null)
    } catch (err) {
      console.error('从本地存储加载失败:', err)
      setRecords([])
      setLoading(false)
    }
  }

  /**
   * 添加新记录
   * @param {Object} recordData - 记录数据，支持新数据结构
   */
  const addRecord = async (recordData) => {
    if (!userId) {
      throw new Error('用户未登录')
    }

    try {
      // 确保日期是 Date 对象
      const date = recordData.date instanceof Date 
        ? recordData.date 
        : recordData.date ? new Date(recordData.date) : new Date()

      // 准备数据，设置默认值
      const dataToSave = {
        user_id: userId,
        title: recordData.title,
        description: recordData.description || '',
        date: date.toISOString(),
        importance: recordData.importance || ImportanceLevel.NORMAL,
        emotions: recordData.emotions || [],
        emotion_note: recordData.emotionNote || '',
        location: recordData.location || null,
        participants: recordData.participants || [],
        media: recordData.media || null,
        related_events: recordData.relatedEvents || [],
        type: recordData.type || EventType.EVENT,
        tags: [],
        category: null,
      }

      const supabase = getSupabaseClient()
      if (!supabase || !isSupabaseConfigured()) {
        // 使用本地存储作为后备方案
        return addRecordToLocalStorage(userId, dataToSave)
      }

      // 插入数据
      const { data, error: insertError } = await supabase
        .from('life_events')
        .insert([dataToSave])
        .select()
        .single()

      if (insertError) {
        console.error('Supabase 插入错误详情:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          data: dataToSave
        })
        // 提供更友好的错误信息
        let errorMessage = insertError.message || '插入失败'
        if (insertError.code === '42501') {
          errorMessage = '权限不足：请检查 RLS 策略或用户认证状态'
        } else if (insertError.code === '23503') {
          errorMessage = '外键约束失败：请检查 user_id 是否正确'
        } else if (insertError.code === '23505') {
          errorMessage = '唯一约束冲突：记录已存在'
        }
        throw new Error(errorMessage)
      }

      // 异步生成标签和类别
      generateTagsAndCategory({
        title: recordData.title,
        description: recordData.description || '',
        date: date,
        importance: dataToSave.importance,
        emotions: dataToSave.emotions,
      }).then(async ({ tags, category }) => {
        try {
          await supabase
            .from('life_events')
            .update({ tags, category })
            .eq('id', data.id)
        } catch (err) {
          console.warn('更新标签失败:', err)
        }
      }).catch(err => {
        console.warn('生成标签失败:', err)
      })
    } catch (err) {
      console.error('添加记录失败:', err)
      // 如果 Supabase 失败，尝试本地存储
      if (err.message.includes('Supabase') || err.message.includes('未初始化')) {
        return addRecordToLocalStorage(userId, recordData)
      }
      throw err
    }
  }

  /**
   * 使用本地存储添加记录（演示模式）
   */
  const addRecordToLocalStorage = (userId, recordData) => {
    try {
      const storageKey = `life_archive_${userId}_records`
      const existingRecords = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      let date = null
      if (recordData.date) {
        if (recordData.date instanceof Date) {
          date = recordData.date
        } else if (typeof recordData.date === 'string') {
          date = new Date(recordData.date)
        } else {
          date = new Date(recordData.date)
        }
      } else {
        date = new Date()
      }

      const newRecord = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...recordData,
        date: date,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      // 尝试生成标签（异步，不阻塞）
      generateTagsAndCategory({
        title: recordData.title,
        description: recordData.description || '',
        date: date,
        importance: recordData.importance || ImportanceLevel.NORMAL,
        emotions: recordData.emotions || [],
      }).then(({ tags, category }) => {
        newRecord.tags = tags
        newRecord.category = category
        // 更新本地存储
        const updatedRecords = [...existingRecords, newRecord]
        localStorage.setItem(storageKey, JSON.stringify(updatedRecords))
      }).catch(err => {
        console.warn('生成标签失败:', err)
      })
      
      existingRecords.push(newRecord)
      localStorage.setItem(storageKey, JSON.stringify(existingRecords))
      
      // 触发状态更新
      setRecords(existingRecords.map(r => ({
        ...r,
        createdAt: new Date(r.createdAt),
        date: r.date ? new Date(r.date) : null,
      })))
      
      return Promise.resolve()
    } catch (err) {
      console.error('本地存储失败:', err)
      throw new Error('保存失败：无法使用本地存储')
    }
  }

  /**
   * 删除记录
   * @param {string} recordId - 记录 ID
   */
  const deleteRecord = async (recordId) => {
    if (!userId) {
      throw new Error('用户未登录')
    }

    try {
      const supabase = getSupabaseClient()
      if (!supabase || !isSupabaseConfigured()) {
        // 使用本地存储作为后备方案
        return deleteRecordFromLocalStorage(userId, recordId)
      }

      const { error: deleteError } = await supabase
        .from('life_events')
        .delete()
        .eq('id', recordId)
        .eq('user_id', userId) // 确保只能删除自己的记录

      if (deleteError) {
        throw deleteError
      }
    } catch (err) {
      console.error('删除记录失败:', err)
      // 如果 Supabase 失败，尝试本地存储
      if (err.message.includes('Supabase') || err.message.includes('未初始化')) {
        return deleteRecordFromLocalStorage(userId, recordId)
      }
      throw err
    }
  }

  /**
   * 从本地存储删除记录（演示模式）
   */
  const deleteRecordFromLocalStorage = (userId, recordId) => {
    try {
      const storageKey = `life_archive_${userId}_records`
      const existingRecords = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const filteredRecords = existingRecords.filter(r => r.id !== recordId)
      localStorage.setItem(storageKey, JSON.stringify(filteredRecords))
      
      // 触发状态更新
      setRecords(filteredRecords.map(r => ({
        ...r,
        createdAt: new Date(r.createdAt),
        date: r.date ? new Date(r.date) : null,
      })))
      
      return Promise.resolve()
    } catch (err) {
      console.error('本地存储删除失败:', err)
      throw new Error('删除失败：无法使用本地存储')
    }
  }

  return {
    records,
    addRecord,
    deleteRecord,
    loading,
    error,
  }
}
