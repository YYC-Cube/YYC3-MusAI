# YYC³-AI-Family 连接池配置建议

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 文档信息

| 项目 | 内容 |
|------|------|
| 项目名称 | YYC³-AI-Family |
| 数据库类型 | PostgreSQL 15+ |
| 文档版本 | v1.0.0 |
| 创建日期 | 2026-02-23 |
| 最后更新 | 2026-02-23 |
| 作者 | YYC³ Team |

---

## 1. 连接池概述

### 1.1 为什么需要连接池

| 问题 | 说明 | 连接池解决方案 |
|------|------|----------------|
| 连接开销大 | 每次建立连接需要TCP握手、认证 | 复用已建立连接 |
| 资源消耗高 | 每个连接占用内存和CPU | 控制连接数量 |
| 连接数限制 | PostgreSQL默认最大100连接 | 共享连接池 |
| 响应延迟 | 频繁创建销毁连接 | 预热连接池 |

### 1.2 连接池选型

| 连接池 | 类型 | 适用场景 | 推荐指数 |
|--------|------|----------|----------|
| **PgBouncer** | 进程级 | 高并发、轻量级 | ⭐⭐⭐⭐⭐ |
| **Pgpool-II** | 进程级 | 读写分离、负载均衡 | ⭐⭐⭐⭐ |
| **应用连接池** | 应用级 | Java/HikariCP, Node/pg-pool | ⭐⭐⭐⭐ |

---

## 2. PgBouncer 配置

### 2.1 安装与基础配置

```ini
; =====================================================
; pgbouncer.ini - PgBouncer 配置文件
; =====================================================

[databases]
; 数据库连接配置
yyc3_ai_family = host=127.0.0.1 port=5432 dbname=yyc3_ai_family

; 读写分离配置
yyc3_ai_family_write = host=primary.example.com port=5432 dbname=yyc3_ai_family
yyc3_ai_family_read = host=standby.example.com port=5432 dbname=yyc3_ai_family

[pgbouncer]
; 监听配置
listen_addr = 0.0.0.0
listen_port = 6432

; 连接池模式
; session: 会话级（推荐用于兼容性）
; transaction: 事务级（推荐用于性能）
; statement: 语句级（不推荐，有风险）
pool_mode = transaction

; 连接池大小
max_client_conn = 1000
default_pool_size = 50
min_pool_size = 10
reserve_pool_size = 10
reserve_pool_timeout = 3

; 超时配置
server_connect_timeout = 15
server_idle_timeout = 600
server_lifetime = 3600
server_check_delay = 30
server_check_query = SELECT 1

; 客户端超时
client_idle_timeout = 0
client_login_timeout = 60

; 日志配置
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
log_stats = 1
stats_period = 60

; 管理配置
admin_users = postgres
stats_users = stats
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; 忽略参数
ignore_startup_parameters = extra_float_digits
```

### 2.2 用户认证文件

```
; userlist.txt
"postgres" "SCRAM-SHA-256$..."
"app_user" "SCRAM-SHA-256$..."
"readonly_user" "SCRAM-SHA-256$..."
```

### 2.3 连接池模式对比

| 模式 | 说明 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **session** | 会话级复用 | 兼容性好 | 并发受限 | 需要会话变量 |
| **transaction** | 事务级复用 | 高并发 | 不支持预备语句 | 大多数场景 |
| **statement** | 语句级复用 | 最高并发 | 不支持事务 | 只读查询 |

---

## 3. 应用层连接池配置

### 3.1 Node.js (pg-pool)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'yyc3_ai_family',
    user: 'app_user',
    password: 'secure_password',
    
    max: 50,                    // 最大连接数
    min: 10,                    // 最小连接数
    idleTimeoutMillis: 30000,   // 空闲超时
    connectionTimeoutMillis: 2000, // 连接超时
    
    // 健康检查
    allowExitOnIdle: false,
    
    // SSL配置
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('/path/to/ca.crt').toString(),
        cert: fs.readFileSync('/path/to/client.crt').toString(),
        key: fs.readFileSync('/path/to/client.key').toString()
    }
});

// 使用示例
async function query(sql, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows;
    } finally {
        client.release();
    }
}
```

### 3.2 Java (HikariCP)

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:5432/yyc3_ai_family");
config.setUsername("app_user");
config.setPassword("secure_password");

// 连接池大小
config.setMaximumPoolSize(50);
config.setMinimumIdle(10);

// 超时配置
config.setConnectionTimeout(30000);     // 连接超时 30s
config.setIdleTimeout(600000);          // 空闲超时 10min
config.setMaxLifetime(1800000);         // 最大生命周期 30min

// 性能优化
config.setLeakDetectionThreshold(60000); // 连接泄漏检测
config.setConnectionTestQuery("SELECT 1");

// 连接池名称
config.setPoolName("YYC3-Pool");

HikariDataSource dataSource = new HikariDataSource(config);
```

### 3.3 Python (asyncpg)

```python
import asyncpg

async def create_pool():
    pool = await asyncpg.create_pool(
        host='localhost',
        port=5432,
        database='yyc3_ai_family',
        user='app_user',
        password='secure_password',
        
        min_size=10,           # 最小连接数
        max_size=50,           # 最大连接数
        max_queries=50000,     # 单连接最大查询数
        max_inactive_connection_lifetime=300.0,  # 空闲连接超时
        
        command_timeout=60.0,  # 命令超时
    )
    return pool

async def query(pool, sql, *args):
    async with pool.acquire() as conn:
        return await conn.fetch(sql, *args)
```

---

## 4. 连接池大小计算

### 4.1 计算公式

```
连接数 = (核心数 * 2) + 有效磁盘数
```

### 4.2 推荐配置

| 服务器配置 | CPU核心 | 推荐连接池大小 | 说明 |
|------------|---------|----------------|------|
| 小型 | 4核 | 10-20 | 开发/测试环境 |
| 中型 | 8核 | 20-40 | 生产环境 |
| 大型 | 16核 | 40-80 | 高并发场景 |
| 超大型 | 32核+ | 80-160 | 大规模应用 |

### 4.3 PostgreSQL 配置优化

```sql
-- postgresql.conf 连接相关配置

-- 最大连接数（配合连接池使用）
max_connections = 200

-- 每个连接的内存
work_mem = 64MB

-- 维护内存
maintenance_work_mem = 512MB

-- 共享缓冲区
shared_buffers = 4GB

-- 有效缓存大小
effective_cache_size = 12GB

-- 最大工作进程
max_worker_processes = 16

-- 并行查询
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
```

---

## 5. 监控与告警

### 5.1 连接池监控视图

```sql
-- 创建连接池监控视图
CREATE OR REPLACE VIEW monitor.v_connection_stats AS
SELECT
    datname AS database,
    usename AS username,
    application_name,
    client_addr,
    state,
    COUNT(*) AS connection_count,
    COUNT(*) FILTER (WHERE state = 'active') AS active_count,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle_count,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction_count,
    MAX(EXTRACT(EPOCH FROM (now() - query_start))) AS max_query_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connection_count DESC;

-- 查看当前连接
SELECT * FROM monitor.v_connection_stats;

-- 查看长时间运行的查询
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    EXTRACT(EPOCH FROM (now() - query_start)) AS duration_seconds,
    query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
  AND EXTRACT(EPOCH FROM (now() - query_start)) > 60
ORDER BY query_start;
```

### 5.2 连接池告警规则

```yaml
# alert-rules.yaml
groups:
  - name: connection_pool_alerts
    rules:
      - alert: HighConnectionCount
        expr: pg_stat_activity_count > 150
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "连接数过高"
          description: "当前连接数 {{ $value }} 超过阈值 150"

      - alert: IdleInTransaction
        expr: pg_stat_activity_idle_in_transaction_count > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "空闲事务连接过多"
          description: "空闲事务连接数 {{ $value }} 超过阈值 10"

      - alert: LongRunningQuery
        expr: pg_stat_activity_max_duration_seconds > 300
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "长时间运行查询"
          description: "有查询运行超过 {{ $value }} 秒"
```

---

## 6. 最佳实践

### 6.1 连接池使用规范

| 规范 | 说明 |
|------|------|
| **及时释放连接** | 使用完毕立即释放回池 |
| **避免长事务** | 事务尽快提交或回滚 |
| **设置超时** | 合理设置连接和查询超时 |
| **监控告警** | 实时监控连接池状态 |
| **预热连接池** | 应用启动时预热连接 |

### 6.2 故障排查

```sql
-- 查看阻塞的连接
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 终止长时间运行的连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < now() - INTERVAL '10 minutes'
  AND query NOT LIKE '%pg_stat_activity%';
```

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>
