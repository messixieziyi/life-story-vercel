# AI 分析缓存功能设置指南

## 功能概述

AI 分析缓存功能可以：
1. **自动缓存** AI 分析结果（AI 复盘和星盘命运分析）
2. **智能检测** 数据变化，自动判断是否需要重新分析
3. **提供刷新按钮** 让用户可以手动刷新分析结果

## 数据库设置

### 1. 在 Supabase 中执行迁移

在 Supabase Dashboard 的 SQL Editor 中执行 `supabase_migration_ai_cache.sql` 文件中的 SQL：

1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 点击 "New query"
4. 复制粘贴 `supabase_migration_ai_cache.sql` 的内容
5. 点击 "Run"

或者直接复制以下 SQL：

```sql
-- 创建 AI 分析缓存表
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'ai_insight' 或 'fate_analysis'
  analysis_result TEXT NOT NULL, -- 分析结果（Markdown 格式）
  cache_key TEXT, -- 缓存键（用于判断是否需要刷新）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, analysis_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_user_id ON ai_analysis_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_type ON ai_analysis_cache(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_user_type ON ai_analysis_cache(user_id, analysis_type);

-- 启用 Row Level Security (RLS)
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能访问自己的缓存
CREATE POLICY "Users can view their own analysis cache"
  ON ai_analysis_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis cache"
  ON ai_analysis_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis cache"
  ON ai_analysis_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis cache"
  ON ai_analysis_cache FOR DELETE
  USING (auth.uid() = user_id);

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_analysis_cache_updated_at
  BEFORE UPDATE ON ai_analysis_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 功能说明

### AI 复盘缓存

1. **首次分析**：用户点击"开始复盘"时，会进行 AI 分析并自动保存结果到缓存
2. **自动加载**：下次打开 AI 复盘标签时，如果数据没有变化，会自动加载缓存的结果
3. **智能检测**：系统会检测记录数量和最后更新时间，如果数据有变化，会自动重新分析
4. **手动刷新**：用户可以点击"刷新分析"按钮，强制重新分析最新数据

### 星盘命运分析缓存

1. **首次分析**：用户点击"开始分析"时，会进行 AI 分析并自动保存结果到缓存
2. **自动加载**：下次打开星盘标签时，如果生日和记录没有变化，会自动加载缓存的结果
3. **智能检测**：系统会检测生日、记录数量和最后更新时间，如果数据有变化，会自动重新分析
4. **手动刷新**：用户可以点击"刷新分析"按钮，强制重新分析最新数据（例如时间变化导致星盘变化）

## 缓存键说明

缓存键用于判断数据是否发生变化：

- **AI 复盘**：基于记录数量和最后更新时间
- **星盘分析**：基于生日、记录数量和最后更新时间

如果缓存键不匹配，系统会自动重新分析。

## 使用场景

### 场景 1：添加新记录后刷新分析

1. 用户添加了新的历程或愿望
2. 打开 AI 复盘或星盘标签
3. 系统检测到数据变化，自动重新分析
4. 或者用户点击"刷新分析"按钮手动刷新

### 场景 2：时间变化导致星盘变化

1. 用户想要查看当前时间的星盘分析
2. 点击"刷新分析"按钮
3. 系统会重新分析最新的星盘数据

### 场景 3：查看历史分析结果

1. 用户打开 AI 复盘或星盘标签
2. 如果数据没有变化，系统自动加载缓存
3. 无需等待，立即显示之前的分析结果

## 注意事项

1. **缓存是用户级别的**：每个用户有自己独立的缓存
2. **缓存会自动失效**：当数据变化时，缓存会自动失效并重新分析
3. **可以手动刷新**：用户可以随时点击"刷新分析"按钮强制重新分析
4. **需要 Supabase 配置**：缓存功能需要 Supabase 数据库支持

## 故障排除

### 问题：缓存没有生效

**解决方案**：
1. 检查是否已执行数据库迁移 SQL
2. 检查 Supabase 配置是否正确
3. 检查浏览器控制台是否有错误信息

### 问题：缓存没有自动更新

**解决方案**：
1. 点击"刷新分析"按钮手动刷新
2. 检查记录是否真的发生了变化
3. 清除浏览器缓存后重试

### 问题：数据库错误

**解决方案**：
1. 检查 Supabase 连接是否正常
2. 检查 RLS 策略是否正确设置
3. 检查用户是否已登录
