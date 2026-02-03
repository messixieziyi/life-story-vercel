import { useMemo } from 'react'
import { PLANET_NAMES, PLANET_CODES, ZODIAC_SIGNS, ASPECT_NAMES } from '../lib/astrologyService'

/**
 * 星盘可视化组件
 * 使用 SVG 绘制极简风格的星盘
 */
export default function AstrologyChart({ chartData }) {
  const { planets, aspects, houses } = chartData || {}

  // SVG 尺寸
  const size = 400
  const center = size / 2
  const radius = size / 2 - 40

  // 计算行星位置
  const planetPositions = useMemo(() => {
    if (!planets) return []
    
    const positions = []
    for (const [planetCode, planet] of Object.entries(planets)) {
      if (planet.longitude !== undefined) {
        const angle = (planet.longitude - 90) * (Math.PI / 180) // 转换为弧度，-90 使 0° 在顶部
        const x = center + radius * Math.cos(angle)
        const y = center + radius * Math.sin(angle)
        
        positions.push({
          code: parseInt(planetCode),
          name: PLANET_NAMES[planetCode] || `行星${planetCode}`,
          x,
          y,
          angle: planet.longitude,
          sign: planet.sign,
          degree: planet.degree,
          house: planet.house,
          ...planet,
        })
      }
    }
    return positions
  }, [planets, center, radius])

  // 计算相位连线
  const aspectLines = useMemo(() => {
    if (!aspects || !planets) return []
    
    const lines = []
    for (const aspect of aspects) {
      const planet1 = planets[aspect.planet1]
      const planet2 = planets[aspect.planet2]
      
      if (planet1 && planet2 && planet1.longitude !== undefined && planet2.longitude !== undefined) {
        const angle1 = (planet1.longitude - 90) * (Math.PI / 180)
        const angle2 = (planet2.longitude - 90) * (Math.PI / 180)
        
        const x1 = center + radius * Math.cos(angle1)
        const y1 = center + radius * Math.sin(angle1)
        const x2 = center + radius * Math.cos(angle2)
        const y2 = center + radius * Math.sin(angle2)
        
        lines.push({
          x1,
          y1,
          x2,
          y2,
          type: aspect.type,
          name: aspect.name,
          orb: aspect.orb,
        })
      }
    }
    return lines
  }, [aspects, planets, center, radius])

  // 计算宫位分割线
  const houseLines = useMemo(() => {
    if (!houses) return []
    
    return houses.map(house => {
      const angle = (house.cusp - 90) * (Math.PI / 180)
      const x = center + radius * Math.cos(angle)
      const y = center + radius * Math.sin(angle)
      
      return {
        x,
        y,
        number: house.number,
        cusp: house.cusp,
      }
    })
  }, [houses, center, radius])

  if (!chartData || !planets) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        暂无星盘数据
      </div>
    )
  }

  // 相位颜色映射
  const getAspectColor = (type) => {
    switch (type) {
      case 0: return '#3b82f6' // 合相 - 蓝色
      case 90: return '#ef4444' // 四分相 - 红色
      case 120: return '#10b981' // 三分相 - 绿色
      case 180: return '#f59e0b' // 对分相 - 橙色
      default: return '#6b7280'
    }
  }

  // 行星符号（简化版本，使用文字）
  const getPlanetSymbol = (code) => {
    const symbols = {
      [PLANET_CODES.SUN]: '☉',
      [PLANET_CODES.MOON]: '☽',
      [PLANET_CODES.MERCURY]: '☿',
      [PLANET_CODES.VENUS]: '♀',
      [PLANET_CODES.MARS]: '♂',
      [PLANET_CODES.JUPITER]: '♃',
      [PLANET_CODES.SATURN]: '♄',
      [PLANET_CODES.ASC]: 'ASC',
      [PLANET_CODES.MC]: 'MC',
    }
    return symbols[code] || '•'
  }

  return (
    <div className="w-full flex flex-col items-center">
      <svg width={size} height={size} className="border border-slate-200 rounded-lg bg-white">
        {/* 外圈 - 十二星座 */}
        <circle
          cx={center}
          cy={center}
          r={radius + 20}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        
        {/* 绘制星座标记 */}
        {ZODIAC_SIGNS.map((sign, index) => {
          const angle = (index * 30 - 90) * (Math.PI / 180)
          const x = center + (radius + 10) * Math.cos(angle)
          const y = center + (radius + 10) * Math.sin(angle)
          return (
            <text
              key={index}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-slate-600"
              fontSize="10"
            >
              {sign.substring(0, 1)}
            </text>
          )
        })}

        {/* 绘制宫位分割线 */}
        {houseLines.map((house, index) => (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={house.x}
            y2={house.y}
            stroke="#e2e8f0"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        ))}

        {/* 绘制相位连线 */}
        {aspectLines.map((line, index) => (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={getAspectColor(line.type)}
            strokeWidth="1"
            opacity="0.6"
          />
        ))}

        {/* 绘制行星 */}
        {planetPositions.map((planet, index) => (
          <g key={index}>
            <circle
              cx={planet.x}
              cy={planet.y}
              r="8"
              fill="white"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <text
              x={planet.x}
              y={planet.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-slate-900 font-medium"
              fontSize="10"
            >
              {getPlanetSymbol(planet.code)}
            </text>
            {/* 行星标签 */}
            <text
              x={planet.x}
              y={planet.y + 20}
              textAnchor="middle"
              className="text-xs fill-slate-600"
              fontSize="9"
            >
              {planet.name}
            </text>
          </g>
        ))}

        {/* 中心点 */}
        <circle
          cx={center}
          cy={center}
          r="3"
          fill="#3b82f6"
        />
      </svg>

      {/* 行星位置列表 */}
      <div className="mt-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">行星位置</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {planetPositions.map((planet, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-lg p-3 border border-slate-200"
            >
              <div className="font-medium text-slate-900 text-sm">{planet.name}</div>
              <div className="text-xs text-slate-600 mt-1">
                {ZODIAC_SIGNS[planet.sign]} {planet.degree.toFixed(1)}°
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {planet.house}宫
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 相位列表 */}
      {aspects && aspects.length > 0 && (
        <div className="mt-6 w-full max-w-2xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">主要相位</h3>
          <div className="space-y-2">
            {aspects.map((aspect, index) => (
              <div
                key={index}
                className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-slate-900">
                    {aspect.planet1Name} {aspect.name} {aspect.planet2Name}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    误差 {aspect.orb.toFixed(1)}°
                  </span>
                </div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getAspectColor(aspect.type) }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
