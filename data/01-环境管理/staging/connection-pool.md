# YYC³(YanYuCloudCube)预发布环境连接池配置

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file connection-pool.md
@description YYC³项目预发布环境数据库连接池配置文档
@author YYC³团队
@version 1.0.0

---

## 一、概述

### 1.1 连接池目标

预发布环境连接池的主要目标：

| 目标 | 说明 | 配置策略 |
|-----|------|---------|
| **生产仿真** | 模拟生产环境的连接池配置 | 采用生产标准配置 |
| **压力测试** | 支持压力测试和性能验证 | 允许较高并发 |
| **问题排查** | 在类生产环境中排查问题 | 启用详细日志 |
| **配置验证** | 验证生产配置的正确性 | 与生产环境一致 |

### 1.2 技术选型

| 组件 | 技术 | 版本 | 说明 |
|-----|------|------|------|
| 连接池中间件 | PgBouncer | 1.20.0 | PostgreSQL连接池 |
| 连接模式 | Transaction | - | 事务级别连接池 |
| 超时配置 | 生产标准 | - | 采用生产环境的超时配置 |

### 1.3 环境参数

| 参数 | 值 | 说明 |
|-----|------|------|
| **数据库端口** | 5434 | PostgreSQL预发布端口 |
| **PgBouncer端口** | 6433 | 连接池端口 |
| **最大连接数** | 500 | 最大客户端连接数 |
| **连接池大小** | 50 | 每个数据库的连接池大小 |

---

## 二、连接池架构

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                   预发布环境连接池架构                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                             │
│  应用服务                                                    │
│     ↓                                                       │
│  PgBouncer (连接池)                                          │
│     ├─ yyc3_staging (预发布数据库)                          │
│     ├─ yyc3_aify_staging (AIFY预发布数据库)                │
│     └─ yyc3_music_staging (MUSIC预发布数据库)               │
│     ↓                                                       │
│  PostgreSQL 15 (预发布数据库)                               │
│     ├─ yyc3_staging                                        │
│     ├─ yyc3_aify_staging                                   │
│     └─ yyc3_music_staging                                   │
│                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 连接模式

| 模式 | 说明 | 适用场景 |
|-----|------|---------|
| **Session** | 每个客户端连接分配一个服务器连接 | 需要会话状态的应用 |
| **Transaction** | 每个事务分配一个服务器连接 | 无状态应用（推荐）|
| **Statement** | 每个语句分配一个服务器连接 | 简单查询应用 |

---

## 三、PgBouncer配置

### 3.1 数据库配置

```ini
[databases]

# 预发布数据库
yyc3_staging = host=staging_host port=5432 dbname=yyc3_staging user=yyc3_staging password=yyc3_staging

# AIFY预发布数据库
yyc3_aify_staging = host=staging_host port=5432 dbname=yyc3_aify user=yyc3_aify password=yyc3_aify

# MUSIC预发布数据库
yyc3_music_staging = host=staging_host port=5432 dbname=yyc3_music user=yyc3_music password=yyc3_music
```

### 3.2 PgBouncer配置

```ini
[pgbouncer]

# 监听配置
listen_addr = 0.0.0.0
listen_port = 6433
unix_socket_dir = /var/run/postgresql

# 认证配置
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# 连接池配置
pool_mode = transaction
max_client_conn = 500
default_pool_size = 50
min_pool_size = 10
reserve_pool_size = 25
reserve_pool_timeout = 3

# 超时配置（预发布环境标准）
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 5
query_timeout = 30
client_idle_timeout = 600

# 日志配置
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

---

## 四、应用层连接池

### 4.1 Node.js连接池配置

```javascript
const { Pool } = require('pg');

const stagingPool = new Pool({
    host: 'localhost',
    port: 6433,
    database: 'yyc3_staging',
    user: 'yyc3_staging',
    password: 'yyc3_staging',
    max: 25,
    min: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
    query_timeout: 30000,
    log: (msg) => console.log('[Staging Pool]', msg)
});

module.exports = stagingPool;
```

### 4.2 Python连接池配置

```python
import psycopg2.pool

staging_pool = psycopg2.pool.SimpleConnectionPool(
    host='localhost',
    port=6433,
    database='yyc3_staging',
    user='yyc3_staging',
    password='yyc3_staging',
    minconn=5,
    maxconn=25
)

def get_connection():
    return staging_pool.getconn()
```

---

## 五、性能监控

### 5.1 监控指标

| 指标 | 说明 | 阈值 |
|-----|------|------|
| **连接数** | 当前活跃连接数 | < 500 |
| **连接池使用率** | 连接池使用率 | < 80% |
| **查询响应时间** | 平均查询响应时间 | < 50ms |
| **连接等待时间** | 客户端等待连接时间 | < 20ms |

### 5.2 监控脚本

```bash
#!/bin/bash

# 预发布环境PgBouncer监控脚本
PGBOUNCER_HOST="localhost"
PGBOUNCER_PORT="6433"

monitor_pgbouncer() {
    echo "=== Staging PgBouncer Status ==="
    echo ""
    
    echo "=== Stats ==="
    psql -h $PGBOUNCER_HOST -p $PGBOUNCER_PORT -U pgbouncer -d pgbouncer -c "SHOW STATS;"
    
    echo ""
    echo "=== Pools ==="
    psql -h $PGBOUNCER_HOST -p $PGBOUNCER_PORT -U pgbouncer -d pgbouncer -c "SHOW POOLS;"
    
    echo ""
    echo "=== Clients ==="
    psql -h $PGBOUNCER_HOST -p $PGBOUNCER_PORT -U pgbouncer -d pgbouncer -c "SHOW CLIENTS;" | head -20
}

monitor_pgbouncer
```

---

## 六、故障排查

### 6.1 常见问题

#### 问题1: 连接池耗尽

**症状**: 无法获取数据库连接

**解决方案**:
```bash
# 1. 检查连接池状态
psql -h localhost -p 6433 -U pgbouncer -d pgbouncer -c "SHOW POOLS;"

# 2. 检查客户端连接
psql -h localhost -p 6433 -U pgbouncer -d pgbouncer -c "SHOW CLIENTS;"

# 3. 重启PgBouncer
sudo systemctl restart pgbouncer
```

#### 问题2: 性能下降

**症状**: 查询响应时间变长

**解决方案**:
```bash
# 1. 检查慢查询
psql -h staging_host -p 5432 -U yyc3_staging -d yyc3_staging -c "
    SELECT query, mean_exec_time, calls 
    FROM pg_stat_statements 
    ORDER BY mean_exec_time DESC 
    LIMIT 10;
"

# 2. 检查锁等待
psql -h staging_host -p 5432 -U yyc3_staging -d yyc3_staging -c "
    SELECT * FROM pg_stat_activity 
    WHERE wait_event IS NOT NULL;
"
```

---

## 七、最佳实践

### 7.1 预发布环境最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **使用事务模式** | 提高连接复用率 | pool_mode = transaction |
| **与生产一致** | 配置与生产环境一致 | 采用生产标准配置 |
| **启用日志** | 便于调试问题 | log_connections = 1 |
| **定期测试** | 定期进行压力测试 | 模拟生产负载 |

### 7.2 安全最佳实践

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **使用强认证** | 使用scram-sha-256 | auth_type = scram-sha-256 |
| **限制访问** | 限制允许的IP地址 | 配置pg_hba.conf |
| **定期更换密码** | 提高安全性 | 定期更新userlist.txt |
| **审计日志** | 记录所有访问 | 启用日志记录 |

---

## 八、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [环境管理总览](../README.md)
- [02-数据库实例](../../02-数据库实例/)
- [PgBouncer官方文档](https://www.pgbouncer.org/usage.html)
