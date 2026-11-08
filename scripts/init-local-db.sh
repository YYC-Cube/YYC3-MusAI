#!/bin/bash

set -e

echo "🎵 YYC³ D-Music 本地数据库初始化脚本 v2.0"
echo "=================================="
echo ""

# 数据库配置
DB_HOST="localhost"
DB_PORT="5433"
DB_ADMIN_USER="yanyu"          # 管理员用户，用于创建数据库（Superuser, Create role, Create DB）
DB_USER="yyc3_dev"             # 应用用户，用于连接数据库

# 数据库名称
DB_MUSIC="yyc3_music"      # 生产数据库 - 用于应用业务数据
DB_DEV="yyc3_dev"          # 管理员数据库 - 用于管理操作

echo "📋 配置信息:"
echo "   主机: $DB_HOST"
echo "   端口: $DB_PORT"
echo "   管理员用户: $DB_ADMIN_USER"
echo "   应用用户: $DB_USER"
echo "   生产数据库 ($DB_MUSIC): 用于应用业务数据"
echo "   管理员数据库 ($DB_DEV): 用于管理操作"
echo ""

# 检查 PostgreSQL 是否运行
echo "🔍 检查 PostgreSQL 15 服务..."
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "❌ 错误: PostgreSQL 服务未运行"
    echo "请先启动 PostgreSQL 15 服务"
    echo "   macOS: brew services start postgresql@15"
    echo "   Linux: sudo systemctl start postgresql"
    exit 1
fi
echo "✅ PostgreSQL 15 服务运行正常"
echo ""

# 显示现有数据库列表
echo "📊 现有数据库列表:"
psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -lqt | cut -d \| -f 1
echo ""

# 创建 yyc3_music 数据库
echo "📝 创建数据库 $DB_MUSIC..."
DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -lqt | cut -d \| -f 1 | grep -w $DB_MUSIC | wc -l)

if [ "$DB_EXISTS" -eq 0 ]; then
    psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -d postgres -c "CREATE DATABASE $DB_MUSIC OWNER $DB_USER TEMPLATE template0;"
    echo "✅ 数据库 $DB_MUSIC 创建成功"
else
    echo "✅ 数据库 $DB_MUSIC 已存在"
fi

# 创建 yyc3_dev 数据库
echo "📝 检查数据库 $DB_DEV..."
DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -lqt | cut -d \| -f 1 | grep -w $DB_DEV | wc -l)

if [ "$DB_EXISTS" -eq 1 ]; then
    echo "✅ 数据库 $DB_DEV 已存在"
else
    echo "⚠️  数据库 $DB_DEV 不存在，跳过创建"
fi

echo ""
echo "📝 执行数据库架构..."

# 检查架构文件是否存在
if [ ! -f "database/d_music_postgres.sql" ]; then
    echo "❌ 错误: 未找到数据库架构文件 database/d_music_postgres.sql"
    exit 1
fi

# 执行 yyc3_music 数据库架构
echo "   → 初始化 $DB_MUSIC 数据库..."
psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -d $DB_MUSIC -f database/d_music_postgres.sql
if [ $? -eq 0 ]; then
    echo "   ✅ $DB_MUSIC 数据库架构初始化完成"
else
    echo "   ❌ $DB_MUSIC 数据库架构初始化失败"
    exit 1
fi

# 执行 yyc3_dev 数据库架构
echo "   → 初始化 $DB_DEV 数据库..."
psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -d $DB_DEV -f database/d_music_postgres.sql
if [ $? -eq 0 ]; then
    echo "   ✅ $DB_DEV 数据库架构初始化完成"
else
    echo "   ❌ $DB_DEV 数据库架构初始化失败"
    exit 1
fi

echo ""
echo "📊 验证数据库结构..."

# 验证 yyc3_music 数据库
echo "   → 验证 $DB_MUSIC 数据库..."
TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -d $DB_MUSIC -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null)
echo "     表数量: $TABLE_COUNT"

# 验证 yyc3_dev 数据库
echo "   → 验证 $DB_DEV 数据库..."
TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN_USER -d $DB_DEV -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null)
echo "     表数量: $TABLE_COUNT"

echo ""
echo "=================================="
echo "✅ 数据库初始化完成!"
echo ""
echo "📊 数据库信息:"
echo "   主机: $DB_HOST"
echo "   端口: $DB_PORT"
echo "   生产数据库: $DB_MUSIC"
echo "   管理员数据库: $DB_DEV"
echo "   应用用户: $DB_USER"
echo ""
echo "🔗 连接字符串:"
echo "   PostgreSQL ($DB_MUSIC): postgresql://$DB_USER@localhost:$DB_PORT/$DB_MUSIC"
echo "   PostgreSQL ($DB_DEV): postgresql://$DB_USER@localhost:$DB_PORT/$DB_DEV"
echo ""
echo "📝 连接命令:"
echo "   连接 $DB_MUSIC: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_MUSIC"
echo "   连接 $DB_DEV: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DEV"
echo ""
echo "📝 下一步:"
echo "   1. 更新 .env 文件中的数据库配置（已自动更新）"
echo "   2. 启动应用: pnpm dev"
echo "   3. 访问应用: http://localhost:3198"
echo ""
echo "📚 相关文档:"
echo "   - 数据库架构: database/d_music_postgres.sql"
echo "   - 数据库标准: data/Max-PG15-数据库标准化规范化架构详情完整版.md"
echo "   - 审计总览: data/00-PG15-审计总览.md"
echo ""
