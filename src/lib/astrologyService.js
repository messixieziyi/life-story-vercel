/**
 * 星盘计算服务
 * 使用 Swiss Ephemeris 进行高精度星历计算
 * 
 * 注意：由于 Swiss Ephemeris 是 C 库，在浏览器环境中需要使用：
 * 1. WebAssembly 版本
 * 2. 后端 API 服务
 * 3. 或使用 JavaScript 实现的星历库
 * 
 * 这里提供一个结构化的服务接口，实际计算可以通过调用后端 API 或使用库实现
 */

/**
 * 行星代码（Swiss Ephemeris 标准）
 */
export const PLANET_CODES = {
  SUN: 0,
  MOON: 1,
  MERCURY: 2,
  VENUS: 3,
  MARS: 4,
  JUPITER: 5,
  SATURN: 6,
  URANUS: 7,
  NEPTUNE: 8,
  PLUTO: 9,
  ASC: 16,  // 上升点
  MC: 10,   // 中天
}

/**
 * 星座名称
 */
export const ZODIAC_SIGNS = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座'
]

/**
 * 星座英文代码
 */
export const ZODIAC_CODES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

/**
 * 行星名称
 */
export const PLANET_NAMES = {
  [PLANET_CODES.SUN]: '太阳',
  [PLANET_CODES.MOON]: '月亮',
  [PLANET_CODES.MERCURY]: '水星',
  [PLANET_CODES.VENUS]: '金星',
  [PLANET_CODES.MARS]: '火星',
  [PLANET_CODES.JUPITER]: '木星',
  [PLANET_CODES.SATURN]: '土星',
  [PLANET_CODES.ASC]: '上升点',
  [PLANET_CODES.MC]: '中天',
}

/**
 * 相位类型
 */
export const ASPECT_TYPES = {
  CONJUNCTION: 0,    // 合相 0°
  OPPOSITION: 180,   // 对分相 180°
  TRINE: 120,        // 三分相 120°
  SQUARE: 90,        // 四分相 90°
}

/**
 * 相位名称
 */
export const ASPECT_NAMES = {
  [ASPECT_TYPES.CONJUNCTION]: '合相',
  [ASPECT_TYPES.OPPOSITION]: '对分相',
  [ASPECT_TYPES.TRINE]: '三分相',
  [ASPECT_TYPES.SQUARE]: '四分相',
}

/**
 * 相位容许度（Orb）
 */
export const ASPECT_ORBS = {
  [ASPECT_TYPES.CONJUNCTION]: 8,   // 合相容许度 8°
  [ASPECT_TYPES.OPPOSITION]: 8,    // 对分相容许度 8°
  [ASPECT_TYPES.TRINE]: 8,         // 三分相容许度 8°
  [ASPECT_TYPES.SQUARE]: 8,        // 四分相容许度 8°
}

/**
 * 将度数转换为星座和度数
 * @param {number} longitude - 黄道经度（0-360°）
 * @returns {Object} { sign: 星座索引(0-11), degree: 星座内度数(0-30), totalDegree: 总度数 }
 */
export function degreeToSign(longitude) {
  const normalized = ((longitude % 360) + 360) % 360
  const sign = Math.floor(normalized / 30)
  const degree = normalized % 30
  
  return {
    sign,
    degree: parseFloat(degree.toFixed(2)),
    totalDegree: parseFloat(normalized.toFixed(2)),
    signName: ZODIAC_SIGNS[sign],
    signCode: ZODIAC_CODES[sign],
  }
}

/**
 * 计算两个度数之间的角度差
 * @param {number} deg1 - 度数1
 * @param {number} deg2 - 度数2
 * @returns {number} 角度差（0-180°）
 */
export function calculateAngle(deg1, deg2) {
  const diff = Math.abs(deg1 - deg2)
  return Math.min(diff, 360 - diff)
}

/**
 * 判断相位
 * @param {number} deg1 - 行星1度数
 * @param {number} deg2 - 行星2度数
 * @returns {Object|null} 相位信息 { type, orb, exact }
 */
export function calculateAspect(deg1, deg2) {
  const angle = calculateAngle(deg1, deg2)
  
  for (const [type, orb] of Object.entries(ASPECT_ORBS)) {
    const aspectAngle = parseInt(type)
    const diff = Math.abs(angle - aspectAngle)
    
    if (diff <= orb) {
      return {
        type: parseInt(type),
        name: ASPECT_NAMES[type],
        orb: parseFloat(diff.toFixed(2)),
        exact: diff === 0,
      }
    }
  }
  
  return null
}

/**
 * 计算星盘数据
 * @param {Date} birthDate - 出生日期时间
 * @param {number} latitude - 纬度
 * @param {number} longitude - 经度
 * @returns {Promise<Object>} 星盘数据
 */
export async function calculateChart(birthDate, latitude, longitude) {
  // 注意：这里需要实际的 Swiss Ephemeris 计算
  // 由于是前端环境，可以：
  // 1. 调用后端 API
  // 2. 使用 WebAssembly 版本的 Swiss Ephemeris
  // 3. 使用 JavaScript 实现的星历库
  
  // 这里提供一个占位实现，返回正确的数据结构
  // 实际项目中需要替换为真实的计算逻辑
  
  try {
    // 方案1: 如果有后端 API
    // const response = await fetch('/api/astrology/calculate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ birthDate, latitude, longitude })
    // })
    // return await response.json()
    
    // 方案2: 使用本地计算（需要引入库）
    // 这里使用简化的计算作为示例
    return calculateChartLocal(birthDate, latitude, longitude)
  } catch (error) {
    console.error('星盘计算失败:', error)
    throw error
  }
}

/**
 * 本地计算星盘（简化版本，实际应使用 Swiss Ephemeris）
 * 这是一个占位实现，展示数据结构
 */
function calculateChartLocal(birthDate, latitude, longitude) {
  // 计算儒略日（简化版本）
  const julianDay = dateToJulianDay(birthDate)
  
  // 计算行星位置（这里使用简化的计算，实际应使用 Swiss Ephemeris）
  const planets = {}
  
  // 计算主要行星（简化计算，仅作示例）
  const baseLongitude = (julianDay % 360) * 0.9856 // 简化的太阳位置计算
  
  planets[PLANET_CODES.SUN] = {
    longitude: baseLongitude,
    ...degreeToSign(baseLongitude),
    house: calculateHouse(baseLongitude, latitude, birthDate, longitude),
  }
  
  planets[PLANET_CODES.MOON] = {
    longitude: (baseLongitude + 120) % 360,
    ...degreeToSign((baseLongitude + 120) % 360),
    house: calculateHouse((baseLongitude + 120) % 360, latitude, birthDate, longitude),
  }
  
  // 其他行星的简化计算...
  const planetOffsets = {
    [PLANET_CODES.MERCURY]: 30,
    [PLANET_CODES.VENUS]: 60,
    [PLANET_CODES.MARS]: 90,
    [PLANET_CODES.JUPITER]: 150,
    [PLANET_CODES.SATURN]: 210,
  }
  
  for (const [planet, offset] of Object.entries(planetOffsets)) {
    const lon = (baseLongitude + offset) % 360
    planets[planet] = {
      longitude: lon,
      ...degreeToSign(lon),
      house: calculateHouse(lon, latitude, birthDate, longitude),
    }
  }
  
  // 计算上升点和中天（简化）
  const ascLongitude = calculateAscendant(birthDate, latitude, longitude)
  const mcLongitude = (ascLongitude + 90) % 360
  
  planets[PLANET_CODES.ASC] = {
    longitude: ascLongitude,
    ...degreeToSign(ascLongitude),
    house: 1,
  }
  
  planets[PLANET_CODES.MC] = {
    longitude: mcLongitude,
    ...degreeToSign(mcLongitude),
    house: 10,
  }
  
  // 计算相位
  const aspects = []
  const planetEntries = Object.entries(planets)
  
  for (let i = 0; i < planetEntries.length; i++) {
    for (let j = i + 1; j < planetEntries.length; j++) {
      const [planet1, pos1] = planetEntries[i]
      const [planet2, pos2] = planetEntries[j]
      
      const aspect = calculateAspect(pos1.longitude, pos2.longitude)
      if (aspect) {
        aspects.push({
          planet1: parseInt(planet1),
          planet2: parseInt(planet2),
          planet1Name: PLANET_NAMES[planet1],
          planet2Name: PLANET_NAMES[planet2],
          ...aspect,
        })
      }
    }
  }
  
  // 计算宫位（Placidus 系统，简化版本）
  const houses = calculateHouses(birthDate, latitude, longitude)
  
  return {
    birthDate: birthDate.toISOString(),
    latitude,
    longitude,
    julianDay,
    planets,
    aspects,
    houses,
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * 日期转儒略日（简化版本）
 */
function dateToJulianDay(date) {
  const time = date.getTime()
  return time / 86400000 + 2440587.5
}

/**
 * 计算上升点（简化版本）
 */
function calculateAscendant(birthDate, latitude, longitude) {
  // 实际应使用 Swiss Ephemeris 的 swe_houses() 函数
  // 这里使用简化的计算
  const hour = birthDate.getHours() + birthDate.getMinutes() / 60
  const dayOfYear = getDayOfYear(birthDate)
  const base = (dayOfYear * 0.9856 + hour * 15 + longitude) % 360
  return base
}

/**
 * 计算宫位（简化版本，实际应使用 Placidus 系统）
 */
function calculateHouse(longitude, latitude, birthDate, birthLongitude) {
  // 实际应使用 Swiss Ephemeris 的 swe_houses() 函数计算 Placidus 宫位
  // 这里使用简化的等宫制
  const asc = calculateAscendant(birthDate, latitude, birthLongitude)
  const diff = (longitude - asc + 360) % 360
  return Math.floor(diff / 30) + 1
}

/**
 * 计算十二宫位（Placidus 系统，简化版本）
 */
function calculateHouses(birthDate, latitude, longitude) {
  // 实际应使用 Swiss Ephemeris
  const asc = calculateAscendant(birthDate, latitude, longitude)
  const houses = []
  
  for (let i = 0; i < 12; i++) {
    const cusp = (asc + i * 30) % 360
    houses.push({
      number: i + 1,
      cusp: cusp,
      ...degreeToSign(cusp),
    })
  }
  
  return houses
}

/**
 * 获取一年中的第几天
 */
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  return Math.floor(diff / 86400000)
}
