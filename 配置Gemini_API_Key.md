# 配置 Gemini API Key 指南

## 为什么需要 API Key？

命运分析功能使用 Google Gemini API 来生成个性化的星盘分析。你需要一个免费的 API Key 来使用这个功能。

## 获取 Gemini API Key

1. **访问 Google AI Studio**
   - 打开 https://aistudio.google.com/
   - 使用你的 Google 账号登录

2. **创建 API Key**
   - 点击左侧菜单的 "Get API key"
   - 点击 "Create API key" 按钮
   - 选择或创建一个 Google Cloud 项目
   - 复制生成的 API Key（格式类似：`AIzaSy...`）

## 配置到项目中

### 方法一：创建 .env 文件（本地开发）

1. **在项目根目录创建 `.env` 文件**
   ```bash
   # 在项目根目录执行
   touch .env
   ```

2. **编辑 `.env` 文件，添加以下内容：**
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=你的_Gemini_API_Key_粘贴在这里
   ```

   **重要提示：**
   - 将 `你的_Gemini_API_Key_粘贴在这里` 替换为你刚才复制的实际 API Key
   - 如果已经有 Supabase 配置，只需要添加 `VITE_GEMINI_API_KEY` 这一行

3. **重启开发服务器**
   ```bash
   # 停止当前服务器（Ctrl+C）
   # 然后重新启动
   npm run dev
   ```

### 方法二：在 Vercel 中配置（生产环境）

如果你部署到 Vercel：

1. **进入 Vercel Dashboard**
   - 访问 https://vercel.com/dashboard
   - 选择你的项目

2. **添加环境变量**
   - 点击项目 → Settings → Environment Variables
   - 点击 "Add New"
   - Name: `VITE_GEMINI_API_KEY`
   - Value: 粘贴你的 API Key
   - 选择环境（Production, Preview, Development）
   - 点击 "Save"

3. **重新部署**
   - 在 Deployments 页面，点击最新部署的 "..." 菜单
   - 选择 "Redeploy"

## 验证配置

配置完成后：

1. 刷新应用页面
2. 进入"星盘"标签
3. 设置出生信息（如果还没设置）
4. 点击"开始分析"按钮
5. 应该能看到 AI 生成的分析结果，而不是错误提示

## 安全提示

⚠️ **重要安全提醒：**

1. **永远不要**将 `.env` 文件提交到 Git
   - `.env` 文件应该已经在 `.gitignore` 中
   - 如果还没有，确保添加它

2. **不要**在代码中硬编码 API Key
   - API Key 应该只存在于环境变量中

3. **不要**在公开场合分享你的 API Key
   - 如果 API Key 泄露，立即在 Google AI Studio 中删除并重新创建

## 常见问题

### Q: 为什么配置后还是提示需要 API Key？
A: 
- 确保 `.env` 文件在项目根目录（和 `package.json` 同级）
- 确保变量名是 `VITE_GEMINI_API_KEY`（注意 `VITE_` 前缀）
- 重启开发服务器（环境变量只在启动时加载）

### Q: API Key 有使用限制吗？
A: 
- Google Gemini API 免费层有配额限制
- 通常足够个人使用
- 可以在 Google Cloud Console 查看使用情况

### Q: 如何检查 API Key 是否有效？
A: 
- 在浏览器控制台（F12）查看 Network 请求
- 如果看到 401 或 403 错误，可能是 API Key 无效
- 检查 API Key 是否正确复制（没有多余空格）

## 需要帮助？

如果遇到问题：
1. 检查浏览器控制台的错误信息
2. 确认 `.env` 文件格式正确（没有引号，没有多余空格）
3. 确认重启了开发服务器
