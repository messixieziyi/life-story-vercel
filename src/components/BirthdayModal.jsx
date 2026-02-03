import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { saveUserProfile, getUserProfile } from '../lib/userProfile'

/**
 * 生日输入模态框
 */
export default function BirthdayModal({ isOpen, onClose, userId, onSave }) {
  const [birthday, setBirthday] = useState('')
  const [time, setTime] = useState('12:00')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [locationName, setLocationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 加载现有资料
  useEffect(() => {
    if (isOpen && userId) {
      loadProfile()
    }
  }, [isOpen, userId])

  const loadProfile = async () => {
    try {
      const profile = await getUserProfile(userId)
      if (profile) {
        if (profile.birthday) {
          const date = new Date(profile.birthday)
          setBirthday(date.toISOString().split('T')[0])
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          setTime(`${hours}:${minutes}`)
        }
        if (profile.latitude) setLatitude(String(profile.latitude))
        if (profile.longitude) setLongitude(String(profile.longitude))
      }
    } catch (error) {
      console.error('加载资料失败:', error)
    }
  }

  // 获取当前位置
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('您的浏览器不支持地理位置功能')
      return
    }

    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude.toFixed(6)))
        setLongitude(String(position.coords.longitude.toFixed(6)))
        setLoading(false)
      },
      (error) => {
        setError('获取位置失败: ' + error.message)
        setLoading(false)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!birthday) {
      setError('请选择出生日期')
      return
    }

    if (!latitude || !longitude) {
      setError('请输入或获取出生地经纬度')
      return
    }

    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('经纬度格式不正确')
      return
    }

    setLoading(true)
    try {
      // 合并日期和时间
      const [hours, minutes] = time.split(':').map(Number)
      const birthDateTime = new Date(birthday)
      birthDateTime.setHours(hours, minutes, 0, 0)

      await saveUserProfile(userId, {
        birthday: birthDateTime.toISOString(),
        latitude: lat,
        longitude: lng,
      })

      if (onSave) {
        onSave({
          birthday: birthDateTime,
          latitude: lat,
          longitude: lng,
        })
      }

      onClose()
    } catch (error) {
      let errorMessage = error.message || '未知错误'
      
      // 如果错误提示表不存在，给出更友好的提示
      if (errorMessage.includes('user_profiles') || errorMessage.includes('table') || errorMessage.includes('schema cache')) {
        errorMessage = '数据库表未创建。请在 Supabase Dashboard 的 SQL Editor 中执行 supabase_migration_astrology.sql 文件中的 SQL 语句来创建表。'
      }
      
      setError('保存失败: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">设置出生信息</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              出生日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              出生时间
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">如果不确定，可以使用默认时间 12:00</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              出生地经纬度 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <input
                  type="text"
                  placeholder="纬度 (如: 39.9042)"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="经度 (如: 116.4074)"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm disabled:opacity-50"
            >
              {loading ? '获取中...' : '📍 使用当前位置'}
            </button>
            <p className="text-xs text-slate-500 mt-1">
              提示：在{' '}
              <a
                href="https://www.google.com/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                Google Maps
              </a>
              {' '}搜索出生地，右键点击位置 → 选择第一个数字（经纬度）
            </p>
          </div>

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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
