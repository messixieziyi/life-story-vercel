# 星盘功能设置指南

## 功能概述

星盘功能允许用户：
1. 输入出生日期、时间和地点（经纬度）
2. 计算并显示个人星盘（包含行星位置、宫位、相位）
3. 获取 AI 生成的命运分析（核心性格、天赋领域、避坑指南）

## 数据库设置

### 1. 在 Supabase 中执行迁移

在 Supabase Dashboard 的 SQL Editor 中执行 `supabase_migration_astrology.sql` 文件中的 SQL：

```sql
-- 创建用户资料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  birthday TIMESTAMPTZ,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ... (其他 SQL 见文件)
```

或者直接运行文件：
1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 点击 "New query"
4. 复制粘贴 `supabase_migration_astrology.sql` 的内容
5. 点击 "Run"

## 星盘计算说明

### 当前实现

当前使用的是**简化版本**的星盘计算，主要用于展示数据结构和功能流程。实际项目中需要替换为高精度计算。

### 替换为高精度计算的方法

#### 方案 1：使用后端 API（推荐）

1. 创建一个后端服务（Node.js/Python），集成 Swiss Ephemeris
2. 修改 `src/lib/astrologyService.js` 中的 `calculateChart` 函数：

```javascript
export async function calculateChart(birthDate, latitude, longitude) {
  const response = await fetch('/api/astrology/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ birthDate, latitude, longitude })
  })
  return await response.json()
}
```

#### 方案 2：使用 WebAssembly 版本的 Swiss Ephemeris

1. 安装 WebAssembly 版本的 Swiss Ephemeris
2. 在 `astrologyService.js` 中导入并使用

#### 方案 3：使用第三方 API

可以使用专业的星盘 API 服务（如搜索结果中提到的免费星盘 API）。

## 功能使用流程

1. **设置出生信息**
   - 用户首次进入"星盘"标签时，会提示设置出生信息
   - 需要输入：出生日期、出生时间、出生地经纬度
   - 可以使用"使用当前位置"按钮自动获取经纬度

2. **查看星盘**
   - 设置完成后，系统自动计算星盘
   - 显示 SVG 可视化星盘图
   - 显示行星位置列表和相位列表

3. **命运分析**
   - 点击"开始分析"按钮
   - AI 会基于星盘数据和人生记录生成分析报告
   - 包含三个板块：核心性格、天赋领域、避坑指南

## 数据结构

### 星盘数据格式

```javascript
{
  birthDate: "2024-01-01T12:00:00.000Z",
  latitude: 39.9042,
  longitude: 116.4074,
  julianDay: 2460314.5,
  planets: {
    0: { // 太阳
      longitude: 280.5,
      sign: 9, // 摩羯座
      degree: 10.5,
      signName: "摩羯座",
      house: 10
    },
    // ... 其他行星
  },
  aspects: [
    {
      planet1: 0,
      planet2: 1,
      planet1Name: "太阳",
      planet2Name: "月亮",
      type: 0, // 合相
      name: "合相",
      orb: 2.5
    }
  ],
  houses: [
    { number: 1, cusp: 120.5, sign: 4, ... },
    // ... 其他宫位
  ]
}
```

## 注意事项

1. **精度要求**：当前实现是简化版本，实际使用需要替换为高精度计算
2. **API 配置**：命运分析功能需要配置 `VITE_GEMINI_API_KEY`
3. **隐私保护**：用户资料数据通过 RLS 策略保护，只能访问自己的数据
4. **性能优化**：星盘计算可能较慢，建议添加加载状态和错误处理

## 依赖项

- `marked`: 用于渲染 Markdown 格式的命运分析（已包含在 package.json）
- `lucide-react`: 图标库（已包含）

## 故障排除

### 星盘计算失败
- 检查出生信息是否完整（日期、时间、经纬度）
- 检查网络连接
- 查看浏览器控制台错误信息

### 命运分析失败
- 检查 `VITE_GEMINI_API_KEY` 是否配置
- 检查 API 配额是否用完
- 查看控制台错误信息

### 数据库错误
- 确认已执行数据库迁移 SQL
- 检查 RLS 策略是否正确设置
- 确认用户已登录
