#!/bin/bash

# 部署脚本：推送到 GitHub 并部署到 Vercel

echo "🚀 准备部署到 GitHub 和 Vercel"
echo ""

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  检测到未提交的更改，正在添加..."
  git add .
  read -p "请输入提交信息: " commit_message
  git commit -m "${commit_message:-Update project}"
fi

# 检查是否已设置远程仓库
if ! git remote | grep -q origin; then
  echo ""
  echo "📦 需要设置 GitHub 远程仓库"
  echo ""
  read -p "请输入你的 GitHub 用户名: " github_username
  read -p "请输入仓库名称 (例如: life-story): " repo_name
  
  echo ""
  echo "选择连接方式:"
  echo "1) HTTPS (推荐，简单)"
  echo "2) SSH (需要配置 SSH key)"
  read -p "请选择 (1 或 2): " connection_type
  
  if [ "$connection_type" = "2" ]; then
    git remote add origin "git@github.com:${github_username}/${repo_name}.git"
  else
    git remote add origin "https://github.com/${github_username}/${repo_name}.git"
  fi
  
  echo ""
  echo "✅ 远程仓库已添加"
  echo ""
  echo "⚠️  请先在 GitHub 创建仓库: https://github.com/new"
  echo "   仓库名: ${repo_name}"
  echo "   不要初始化 README、.gitignore 或 license"
  echo ""
  read -p "创建完成后按 Enter 继续..."
fi

# 推送代码
echo ""
echo "📤 推送到 GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 代码已推送到 GitHub!"
  echo ""
  echo "🎯 下一步：在 Vercel 部署"
  echo ""
  echo "1. 访问 https://vercel.com"
  echo "2. 使用 GitHub 登录"
  echo "3. 点击 'Add New Project'"
  echo "4. 选择你的仓库: ${repo_name}"
  echo "5. 添加环境变量："
  echo "   - VITE_SUPABASE_URL=https://xbybtpiplxdsflzvulim.supabase.co"
  echo "   - VITE_SUPABASE_ANON_KEY=sb_publishable_ax5MQislCoKYt4ZaxpSJfQ_T5KwaMsr"
  echo "   - VITE_GEMINI_API_KEY=your_gemini_api_key"
  echo "6. 点击 'Deploy'"
  echo ""
else
  echo ""
  echo "❌ 推送失败，请检查："
  echo "   - GitHub 仓库是否已创建"
  echo "   - 远程仓库地址是否正确"
  echo "   - 是否有推送权限"
fi
