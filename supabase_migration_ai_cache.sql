-- 创建 AI 分析缓存表（用于存储 AI 复盘和星盘分析结果）
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'ai_insight' 或 'fate_analysis'
  analysis_result TEXT NOT NULL, -- 分析结果（Markdown 格式）
  cache_key TEXT, -- 缓存键（用于判断是否需要刷新，如记录数量、生日等）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, analysis_type) -- 每个用户每种分析类型只有一条缓存
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
-- 注意：如果 update_updated_at_column 函数不存在，需要先创建
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
