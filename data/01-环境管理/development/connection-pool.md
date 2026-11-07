# YYC³(YanYuCloudCube)开发环境连接池配置

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file connection-pool.md
@description YYC³项目开发环境数据库连接池配置文档
@author YYC³团队
@version 1.0.0

---

## 一、概述

### 1.1 连接池目标

开发环境连接池的主要目标：

| 目标 | 说明 | 配置策略 |
|-----|------|---------|
| **快速开发** | 支持频繁的代码修改和调试 | 宽松的超时配置 |
| **资源隔离** | 避免开发环境相互影响 | 独立的连接池配置 |
| **调试友好** | 保留详细的连接日志 | 启用详细日志记录 |
| **成本控制** | 限制资源占用 | 限制最大连接数 |

### 1.2 技术选型

| 组件 | 技术 | 版本 | 说明 |
|-----|------|------|------|
| 连接池中间件 | PgBouncer | 1.20.0 | PostgreSQL连接池 |
| 连接模式 | Transaction | - | 事务级别连接池 |
| 超时配置 | 宽松模式 | - | 适应开发调试需求 |

### 1.3 环境参数

| 参数 | 值 | 说明 |
|-----|------|------|
| **数据库端口** | 5433 | PostgreSQL开发端口 |
| **PgBouncer端口** | 6432 | 连接池端口 |
| **最大连接数** | 200 | 最大客户端连接数 |
| **连接池大小** | 20 | 每个数据库的连接池大小 |

---

## 二、连接池架构

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                    开发环境连接池架构                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                             │
│  应用服务                                                    │
│     ↓                                                       │
│  PgBouncer (连接池)                                          │
│     ├─ yyc3_dev (开发数据库)                                 │
│     ├─ yyc3_aify (AIFY数据库)                               │
│     └─ yyc3_test (测试数据库)                                 │
│     ↓                                                       │
│  PostgreSQL 15 (开发数据库)                                  │
│     ├─ yyc3_dev                                            │
│     ├─ yyc3_aify                                           │
│     └─ yyc3_test                                            │
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

# 开发数据库
yyc3_dev = host=localhost port=5433 dbname=yyc3_dev user=yyc3_dev password=yyc3_dev

# AIFY数据库
yyc3_aify = host=localhost port=5433 dbname=yyc3_aify user=yyc3_aify password=yyc3_aify

# 测试数据库
yyc3_test = host=localhost port=5433 dbname=yyc3_test user=yyc3_test password=yyc3_test
```

### 3.2 PgBouncer配置

```ini
[pgbouncer]

# 监听配置
listen_addr = 127.0.0.1
listen_port = 6432
unix_socket_dir = /tmp

# 认证配置
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# 连接池配置
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 10
reserve_pool_timeout = 5

# 超时配置（开发环境宽松）
server_lifetime = 1800
server_idle_timeout = 300
server_connect_timeout = 5
query_timeout = 60
client_idle_timeout = 300

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

const devPool = new Pool({
    host: 'localhost',
    port: 6432,
    database: 'yyc3_dev',
    user: 'yyc3_dev',
    password: 'yyc3_dev',
    max: 10,
    min: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 60000,
    query_timeout: 60000,
    log: (msg) => console.log('[Dev Pool]', msg)
});

module.exports = devPool;
```

### 4.2 Python连接池配置

```python
import psycopg2.pool

dev_pool = psycopg2.pool.SimpleConnectionPool(
    host='localhost',
    port=6432,
    database='yyc3_dev',
    user='yyc3_dev',
    password='yyc3_dev',
    minconn=2,
    maxconn=10
)

def get_connection():
    return dev_pool.getconn()
```

---

## 五、性能监控

### 5.1 监控指标

| 指标 | 说明 | 阈值 |
|-----|------|------|
| **连接数** | 当前活跃连接数 | < 200 |
| **连接池使用率** | 连接池使用率 | < 80% |
| **查询响应时间** | 平均查询响应时间 | < 100ms |
| **连接等待时间** | 客户端等待连接时间 | < 50ms |

### 5.2 监控脚本

```bash
#!/bin/bash

# 开发环境PgBouncer监控脚本
PGBOUNCER_HOST="localhost"
PGBOUNCER_PORT="6432"

monitor_pgbouncer() {
    echo "=== Development PgBouncer Status ==="
    echo ""
    
    echo "=== Stats ==="
    psql -h $PGBOUNCER_HOST -p $PGBOUNCER_PORT -U pgbouncer -d pgbouncer -c "SHOW STATS;"
    
    echo ""
    echo "=== Pools ==="
    psql -h $PGBOUNCER_HOST -p $PGBOUNCER_PORT -U pgbouncer -d pgbouncer -c "SHOW POOLS;"
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
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "SHOW POOLS;"

# 2. 检查客户端连接
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "SHOW CLIENTS;"

# 3. 重启PgBouncer
sudo systemctl restart pgbouncer
```

#### 问题2: 连接超时

**症状**: 查询执行超时

**解决方案**:
```bash
# 1. 检查慢查询
psql -h localhost -p 5433 -U yyc3_dev -d yyc3_dev -c "
    SELECT query, mean_exec_time, calls 
    FROM pg_stat_statements 
    ORDER BY mean_exec_time DESC 
    LIMIT 10;
"

# 2. 增加超时时间
# 修改pgbouncer.ini中的query_timeout参数
# 重启PgBouncer
```

---

## 七、最佳实践

### 7.1 开发环境最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **使用事务模式** | 提高连接复用率 | pool_mode = transaction |
| **设置合理的超时** | 避免长时间占用连接 | query_timeout = 60s |
| **启用日志** | 便于调试问题 | log_connections = 1 |
| **限制连接数** | 避免资源耗尽 | max_client_conn = 200 |

### 7.2 安全最佳实践

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **使用本地访问** | 限制远程访问 | listen_addr = 127.0.0.1 |
| **定期更换密码** | 提高安全性 | 定期更新userlist.txt |
| **隔离环境** | 不同环境使用不同端口 | 使用不同的数据库端口 |
| **限制权限** | 只授予必要的权限 | 最小权限原则 |

---

## 八、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [环境管理总览](../README.md)
- [02-数据库实例](../../02-数据库实例/)
- [PgBouncer官方文档](https://www.pgbouncer.org/usage.html)
