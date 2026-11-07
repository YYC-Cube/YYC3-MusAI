#!/bin/bash

set -e

echo "🎵 D-Music 数据库初始化脚本"
echo "=================================="
echo ""

# 加载环境变量
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ 错误: 未找到 .env.local 文件"
    echo "请先复制 .env.example 为 .env.local 并配置数据库连接信息"
    exit 1
fi

# 检查 PostgreSQL 是否运行
echo "🔍 检查 PostgreSQL 服务..."
if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} > /dev/null 2>&1; then
    echo "❌ 错误: PostgreSQL 服务未运行"
    echo "请先启动 PostgreSQL 15 服务"
    exit 1
fi
echo "✅ PostgreSQL 服务运行正常"

# 检查数据库是否存在
echo ""
echo "🔍 检查数据库..."
DB_EXISTS=$(psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -lqt | cut -d \| -f 1 | grep -w ${DB_NAME:-d_music} | wc -l)

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "📝 创建数据库 ${DB_NAME:-d_music}..."
    createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} ${DB_NAME:-d_music}
    echo "✅ 数据库创建成功"
else
    echo "✅ 数据库 ${DB_NAME:-d_music} 已存在"
fi

# 执行数据库架构
echo ""
echo "📝 执行数据库架构..."
psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -d ${DB_NAME:-d_music} -f database/d_music_postgres.sql

echo ""
echo "=================================="
echo "✅ 数据库初始化完成!"
echo ""
echo "📊 数据库信息:"
echo "   主机: ${DB_HOST:-localhost}"
echo "   端口: ${DB_PORT:-5432}"
echo "   数据库: ${DB_NAME:-d_music}"
echo "   用户: ${DB_USER:-postgres}"
echo ""
echo "📝 下一步:"
echo "   1. 启动应用: pnpm dev"
echo "   2. 访问应用: http://localhost:5173"
echo ""
