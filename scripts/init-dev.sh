#!/bin/bash

set -e

echo "🎵 D-Music-B 开发环境初始化脚本"
echo "=================================="
echo ""

# 检查 Node.js 版本
echo "📦 检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js,请先安装 Node.js"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 pnpm 版本
echo ""
echo "📦 检查 pnpm 版本..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ 错误: 未找到 pnpm,正在安装 pnpm..."
    npm install -g pnpm
fi

PNPM_VERSION=$(pnpm -v)
echo "✅ pnpm 版本: $PNPM_VERSION"

# 安装依赖
echo ""
echo "📦 安装项目依赖..."
pnpm install

# 检查是否成功安装
if [ -d "node_modules" ]; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 创建必要的配置文件
echo ""
echo "🔧 检查配置文件..."

if [ ! -f ".env.local" ]; then
    echo "📝 创建 .env.local 模板文件..."
    cat > .env.local << EOF
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 应用配置
VITE_APP_NAME=D-Music-B
VITE_APP_VERSION=0.0.1
EOF
    echo "✅ 已创建 .env.local 模板文件"
    echo "⚠️  请在 .env.local 中配置 Supabase 凭证"
else
    echo "✅ .env.local 已存在"
fi

# 验证项目结构
echo ""
echo "🔍 验证项目结构..."
REQUIRED_DIRS=("src" "src/app" "src/styles" "config" "database" "guidelines")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/"
    else
        echo "⚠️  $dir/ 不存在"
    fi
done

# 显示开发命令
echo ""
echo "=================================="
echo "✅ 开发环境初始化完成!"
echo ""
echo "📝 下一步操作:"
echo "   1. 配置 .env.local 文件中的 Supabase 凭证"
echo "   2. 运行开发服务器: pnpm dev"
echo "   3. 构建生产版本: pnpm build"
echo ""
echo "📚 可用命令:"
echo "   pnpm dev       - 启动开发服务器"
echo "   pnpm build     - 构建生产版本"
echo "   pnpm preview   - 预览生产构建"
echo ""
