# 部署指南：GitHub + Vercel

## 步骤 1: 推送到 GitHub

### 1.1 在 GitHub 创建新仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" → "New repository"
3. 填写仓库信息：
   - Repository name: `life-story` (或你喜欢的名字)
   - Description: "人生档案 - 记录你的一生"
   - 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（我们已经有了）
4. 点击 "Create repository"

### 1.2 推送代码到 GitHub

在终端运行以下命令（GitHub 会显示这些命令，但这里已经准备好了）：

```bash
# 添加远程仓库（替换 YOUR_USERNAME 和 REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 重命名主分支为 main（如果还没有）
git branch -M main

# 推送代码
git push -u origin main
```

**或者使用 SSH**（如果你配置了 SSH key）：

```bash
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## 步骤 2: 部署到 Vercel

### 2.1 通过 Vercel Dashboard（推荐）

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Add New Project"
4. 导入你的 GitHub 仓库（选择刚才创建的仓库）
5. 配置项目：
   - **Framework Preset**: Vite（应该自动检测）
   - **Root Directory**: `./`（默认）
   - **Build Command**: `npm run build`（自动）
   - **Output Directory**: `dist`（自动）
   - **Install Command**: `npm install`（自动）

6. **添加环境变量**（重要！）
   在 "Environment Variables" 部分添加：
   ```
   VITE_SUPABASE_URL=https://xbybtpiplxdsflzvulim.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_ax5MQislCoKYt4ZaxpSJfQ_T5KwaMsr
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

7. 点击 "Deploy"
8. 等待构建完成（约 1-2 分钟）

### 2.2 使用 Vercel CLI（可选）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目目录运行
cd "/Users/xieziyi/life story"
vercel

# 按照提示：
# - 登录 Vercel 账号
# - 选择项目设置
# - 配置环境变量
```

## 步骤 3: 后续更新

每次更新代码后：

```bash
# 提交更改
git add .
git commit -m "描述你的更改"

# 推送到 GitHub
git push

# Vercel 会自动检测并重新部署
```

## 注意事项

1. **环境变量安全**
   - `.env` 文件已经在 `.gitignore` 中，不会被推送到 GitHub
   - 但需要在 Vercel Dashboard 中手动添加环境变量

2. **Supabase 配置**
   - 确保 Supabase 项目的 RLS 策略已正确配置
   - 确保邮箱认证已启用

3. **自定义域名**（可选）
   - 在 Vercel Dashboard 中可以添加自定义域名
   - 完全免费

## 故障排除

### 构建失败
- 检查环境变量是否正确配置
- 检查 `package.json` 中的依赖是否正确
- 查看 Vercel 构建日志

### 运行时错误
- 检查浏览器控制台的错误信息
- 确认 Supabase 连接正常
- 确认 API 密钥有效
