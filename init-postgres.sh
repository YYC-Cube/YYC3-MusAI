#!/bin/bash

set -e

echo "======================================"
echo "D-Music PostgreSQL 15 初始化脚本"
echo "======================================"

DB_NAME="${DB_NAME:-d_music}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [ -z "$DB_PASSWORD" ]; then
    echo "错误: 请设置 DB_PASSWORD 环境变量"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/database/d_music_postgres.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "错误: SQL 文件不存在: $SQL_FILE"
    exit 1
fi

echo "检查 PostgreSQL 服务..."
if ! command -v psql &> /dev/null; then
    echo "错误: psql 命令未找到，请确保 PostgreSQL 15 已安装"
    exit 1
fi

echo "测试数据库连接..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo "错误: 无法连接到 PostgreSQL 服务器"
    echo "请检查:"
    echo "  - PostgreSQL 服务是否运行"
    echo "  - 主机地址: $DB_HOST:$DB_PORT"
    echo "  - 用户名: $DB_USER"
    echo "  - 密码是否正确"
    exit 1
fi

echo "检查数据库是否存在..."
DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo "创建数据库: $DB_NAME"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo "数据库创建成功"
else
    echo "数据库已存在: $DB_NAME"
    read -p "是否要删除并重新创建数据库? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "删除现有数据库..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE $DB_NAME;"
        echo "创建新数据库..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
        echo "数据库重新创建成功"
    fi
fi

echo "执行数据库架构..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"

echo "======================================"
echo "数据库初始化完成!"
echo "======================================"
echo "数据库名称: $DB_NAME"
echo "主机地址: $DB_HOST:$DB_PORT"
echo "用户名: $DB_USER"
echo ""
echo "请更新 .env.local 文件中的数据库配置:"
echo "  DB_HOST=$DB_HOST"
echo "  DB_PORT=$DB_PORT"
echo "  DB_NAME=$DB_NAME"
echo "  DB_USER=$DB_USER"
echo "  DB_PASSWORD=$DB_PASSWORD"
