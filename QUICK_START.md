# 快速部署指南

## 🚀 一键部署（推荐）

运行部署脚本：

```bash
./deploy.sh
```

脚本会引导你完成所有步骤。

## 📝 手动部署步骤

### 1. 在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 仓库名：`life-story`（或你喜欢的名字）
3. **不要**勾选任何初始化选项（README、.gitignore、license）
4. 点击 "Create repository"

### 2. 推送代码到 GitHub

```bash
# 添加远程仓库（替换 YOUR_USERNAME 和 REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 推送代码
git branch -M main
git push -u origin main
```

### 3. 在 Vercel 部署

1. 访问 https://vercel.com
2. 使用 GitHub 登录
3. 点击 "Add New Project"
4. 选择你的仓库
5. **添加环境变量**（重要！）：
   ```
   VITE_SUPABASE_URL=https://xbybtpiplxdsflzvulim.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_ax5MQislCoKYt4ZaxpSJfQ_T5KwaMsr
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```
6. 点击 "Deploy"

## ✅ 完成！

部署完成后，Vercel 会给你一个 URL，比如：
`https://your-project.vercel.app`

每次你推送代码到 GitHub，Vercel 会自动重新部署。

## 📚 详细说明

查看 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) 获取更详细的说明。
