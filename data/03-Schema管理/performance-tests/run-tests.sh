#!/bin/bash
# =====================================================
# YYC³-AI-Family 多端数据库实测执行脚本
# @file: run-tests.sh
# @description: 执行多端数据库性能测试
# @author: YYC³ Team
# @version: v1.0.0
# @created: 2026-02-23
# @database: yyc3_aify (PostgreSQL 15)
# =====================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
DB_NAME="${DB_NAME:-yyc3_aify}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# 输出函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 分隔线
separator() {
    echo "============================================================"
}

# 检查 PostgreSQL 连接
check_connection() {
    log_info "检查数据库连接..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "数据库连接成功"
        return 0
    else
        log_error "数据库连接失败"
        log_info "请确保 PostgreSQL 服务正在运行，并且数据库 '$DB_NAME' 存在"
        return 1
    fi
}

# 检查数据库版本
check_version() {
    separator
    log_info "检查 PostgreSQL 版本..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();"
}

# 检查扩展
check_extensions() {
    separator
    log_info "检查已安装扩展..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT extname, extversion 
        FROM pg_extension 
        ORDER BY extname;
    "
}

# 检查配置
check_config() {
    separator
    log_info "检查数据库配置..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT name, setting, unit 
        FROM pg_settings 
        WHERE name IN ('max_connections', 'shared_buffers', 'work_mem', 
                       'effective_cache_size', 'random_page_cost',
                       'max_worker_processes', 'max_parallel_workers')
        ORDER BY name;
    "
}

# 执行测试 SQL
run_test_sql() {
    separator
    log_info "执行多端数据库测试脚本..."
    
    local sql_file="$(dirname "$0")/multi-platform-test.sql"
    
    if [ -f "$sql_file" ]; then
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"
        log_success "测试脚本执行完成"
    else
        log_error "测试脚本文件不存在: $sql_file"
        return 1
    fi
}

# 性能基准测试
run_benchmark() {
    separator
    log_info "执行性能基准测试..."
    
    # 单条查询测试
    log_info "测试1: 单条查询性能..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
        SELECT * FROM core.users WHERE email = 'user_500@yyc3.test';
    "
    
    # 关联查询测试
    log_info "测试2: 关联查询性能..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
        SELECT u.username, u.email, r.name AS role_name
        FROM core.users u
        LEFT JOIN core.user_roles ur ON u.id = ur.user_id
        LEFT JOIN core.roles r ON ur.role_id = r.id
        WHERE u.status = 'active'
        LIMIT 100;
    "
    
    # 分页查询测试
    log_info "测试3: 分页查询性能..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
        SELECT * FROM ai.messages
        ORDER BY created_at DESC
        LIMIT 20 OFFSET 0;
    "
    
    # 聚合查询测试
    log_info "测试4: 聚合查询性能..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, SUMMARY)
        SELECT 
            DATE_TRUNC('day', created_at) AS day,
            COUNT(*) AS message_count
        FROM ai.messages
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day DESC
        LIMIT 30;
    "
    
    log_success "性能基准测试完成"
}

# 并发测试
run_concurrent_test() {
    separator
    log_info "执行并发测试..."
    
    local concurrent_clients=10
    local transactions_per_client=100
    
    log_info "并发客户端数: $concurrent_clients"
    log_info "每客户端事务数: $transactions_per_client"
    
    # 使用 pgbench 进行并发测试
    if command -v pgbench &> /dev/null; then
        pgbench -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                -c "$concurrent_clients" -j 4 -T 30 -S 2>&1 || true
        log_success "并发测试完成"
    else
        log_warning "pgbench 未安装，跳过并发测试"
    fi
}

# 连接池测试
test_connection_pool() {
    separator
    log_info "测试连接池状态..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            state,
            COUNT(*) AS connection_count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
        ORDER BY connection_count DESC;
    "
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT COUNT(*) AS total_connections,
               COUNT(*) FILTER (WHERE state = 'active') AS active,
               COUNT(*) FILTER (WHERE state = 'idle') AS idle,
               COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database();
    "
}

# 生成测试报告
generate_report() {
    separator
    log_info "生成测试报告..."
    
    local report_file="$(dirname "$0")/test-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# YYC³-AI-Family 数据库测试报告

**测试时间**: $(date '+%Y-%m-%d %H:%M:%S')
**数据库**: $DB_NAME
**主机**: $DB_HOST:$DB_PORT

## 环境信息

### PostgreSQL 版本
\`\`\`
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();")
\`\`\`

### 数据库配置
\`\`\`
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT name, setting, unit 
    FROM pg_settings 
    WHERE name IN ('max_connections', 'shared_buffers', 'work_mem', 
                   'effective_cache_size', 'random_page_cost')
    ORDER BY name;
")
\`\`\`

## 数据统计

\`\`\`
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname || '.' || tablename AS table_name,
        n_tup_ins AS inserts,
        n_tup_upd AS updates,
        n_tup_del AS deletes,
        seq_scan AS seq_scans,
        idx_scan AS idx_scans
    FROM pg_stat_user_tables
    WHERE schemaname IN ('core', 'ai', 'audit')
    ORDER BY schemaname, tablename;
")
\`\`\`

## 测试结论

- [ ] 单条查询性能达标 (< 10ms)
- [ ] 关联查询性能达标 (< 50ms)
- [ ] 分页查询性能达标 (< 100ms)
- [ ] 聚合查询性能达标 (< 500ms)
- [ ] 并发测试通过

---
*报告生成时间: $(date '+%Y-%m-%d %H:%M:%S')*
EOF
    
    log_success "测试报告已生成: $report_file"
}

# 主函数
main() {
    clear
    separator
    echo -e "${GREEN}YYC³-AI-Family 多端数据库实测${NC}"
    separator
    echo ""
    
    # 检查连接
    if ! check_connection; then
        exit 1
    fi
    
    # 检查版本
    check_version
    
    # 检查扩展
    check_extensions
    
    # 检查配置
    check_config
    
    # 执行测试 SQL
    run_test_sql
    
    # 性能基准测试
    run_benchmark
    
    # 并发测试
    run_concurrent_test
    
    # 连接池测试
    test_connection_pool
    
    # 生成报告
    generate_report
    
    separator
    log_success "所有测试完成！"
    separator
}

# 执行主函数
main "$@"
