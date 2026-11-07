# YYC³(YanYuCloudCube)生产环境连接池配置

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file connection-pool.md
@description YYC³项目生产环境数据库连接池配置文档
@author YYC³团队
@version 1.0.0

---

## 一、概述

### 1.1 连接池目标

生产环境连接池的主要目标：

| 目标 | 说明 | 配置策略 |
|-----|------|---------|
| **高性能** | 最大化数据库性能，最小化连接开销 | 优化连接池大小和超时 |
| **高可用** | 支持故障转移和负载均衡 | 多实例+连接池架构 |
| **资源优化** | 优化连接资源使用，避免浪费 | 合理的连接池配置 |
| **稳定性** | 确保系统稳定运行，避免连接耗尽 | 监控和自动故障转移 |

### 1.2 技术选型

| 组件 | 技术 | 版本 | 说明 |
|-----|------|------|------|
| 连接池中间件 | PgBouncer | 1.20.0 | PostgreSQL连接池 |
| 连接模式 | Transaction | - | 事务级别连接池 |
| 高可用模式 | 主从+连接池 | - | 支持故障转移 |
| 负载均衡 | 多实例+PgBouncer | - | 分发请求到多个实例 |

### 1.3 环境参数

| 参数 | 值 | 说明 |
|-----|------|------|
| **数据库端口** | 5432 | PostgreSQL生产端口 |
| **PgBouncer端口** | 6432 | 连接池端口 |
| **最大连接数** | 1000 | 最大客户端连接数 |
| **连接池大小** | 100 | 每个数据库的连接池大小 |

---

## 二、连接池架构

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                    生产环境连接池架构                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                             │
│  应用服务                                                    │
│     ↓                                                       │
│  PgBouncer (连接池)                                          │
│     ├─ 写操作 → 主库 (Primary)                            │
│     └─ 读操作 → 从库 (Replica)                            │
│                                                             │
│  主库 (Primary)                                              │
│     ├─ yyc3_aify                                           │
│     ├─ yyc3_music                                           │
│     └─ yyc3_mana                                            │
│     ↓                                                       │
│  流复制 (Streaming Replication)                                 │
│     ↓                                                       │
│  从库 (Replica)                                              │
│     ├─ yyc3_aify                                           │
│     ├─ yyc3_music                                           │
│     └─ yyc3_mana                                            │
│                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 读写分离

| 操作类型 | 路由策略 | 目标实例 |
|---------|---------|---------|
| **写操作** | 路由到主库 | Primary (5432) |
| **读操作** | 路由到从库 | Replica (5433) |

---

## 三、PgBouncer配置

### 3.1 数据库配置

```ini
[databases]

# 生产主库（写操作）
yyc3_aify_primary = host=primary_host port=5432 dbname=yyc3_aify user=yyc3_pool password=yyc3_pool_secure
yyc3_music_primary = host=primary_host port=5432 dbname=yyc3_music user=yyc3_pool password=yyc3_pool_secure
yyc3_mana_primary = host=primary_host port=5432 dbname=yyc3_mana user=yyc3_pool password=yyc3_pool_secure

# 生产从库（读操作）
yyc3_aify_replica = host=replica_host port=5433 dbname=yyc3_aify user=yyc3_pool password=yyc3_pool_secure
yyc3_music_replica = host=replica_host port=5433 dbname=yyc3_music user=yyc3_pool password=yyc3_pool_secure
yyc3_mana_replica = host=replica_host port=5433 dbname=yyc3_mana user=yyc3_pool password=yyc3_pool_secure
```

### 3.2 PgBouncer配置

```ini
[pgbouncer]

# 监听配置
listen_addr = 0.0.0.0
listen_port = 6432
unix_socket_dir = /var/run/postgresql

# 认证配置
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# 连接池配置
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 100
min_pool_size = 20
reserve_pool_size = 50
reserve_pool_timeout = 3

# 超时配置（生产环境严格）
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 5
query_timeout = 30
client_idle_timeout = 600

# 高可用配置
automatic_failover = on
failover_command = /etc/pgbouncer/failover.sh %d %h %p
failover_delay = 5

# 日志配置
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
log_stats = 1
stats_period = 60
```

---

## 四、应用层连接池

### 4.1 Node.js连接池配置

```javascript
const { Pool } = require('pg');

const productionPool = new Pool({
    host: 'localhost',
    port: 6432,
    database: 'yyc3_aify',
    user: 'yyc3_pool',
    password: 'yyc3_pool_secure',
    max: 50,
    min: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
    query_timeout: 30000,
    application_name: 'yyc3-production',
    log: (msg) => console.log('[Production Pool]', msg)
});

module.exports = productionPool;
```

### 4.2 Python连接池配置

```python
import psycopg2.pool

production_pool = psycopg2.pool.SimpleConnectionPool(
    host='localhost',
    port=6432,
    database='yyc3_aify',
    user='yyc3_pool',
    password='yyc3_pool_secure',
    minconn=10,
    maxconn=50,
    application_name='yyc3-production'
)

def get_connection():
    return production_pool.getconn()
```

---

## 五、性能监控

### 5.1 监控指标

| 指标 | 说明 | 阈值 |
|-----|------|------|
| **连接数** | 当前活跃连接数 | < 1000 |
| **连接池使用率** | 连接池使用率 | < 80% |
| **查询响应时间** | 平均查询响应时间 | < 20ms |
| **连接等待时间** | 客户端等待连接时间 | < 10ms |
| **故障转移次数** | 自动故障转移次数 | < 1/天 |

### 5.2 监控脚本

```bash
#!/bin/bash

# 生产环境PgBouncer监控脚本
PGBOUNCER_HOST="localhost"
PGBOUNCER_PORT="6432"

monitor_pgbouncer() {
    echo "=== Production PgBouncer Status ==="
    echo ""
    
    echo "=== Stats ==="
    psql -h $PGBOUNCER_HOST -p $PGBOUNCER_PORT -U yyc3_stats -d pgbouncer -c "SHOW STATS;"
    
    echo ""
    echo "=== Pools ==="
    psql -h $PGBOUNCER_HOST -p $PGBOUNCER_PORT -U yyc3_stats -d pgbouncer -c "SHOW POOLS;"
    
    echo ""
    echo "=== Servers ==="
    psql -h $PGBOUNCER_HOST -p $PGBOUNCER_PORT -U yyc3_stats -d pgbouncer -c "SHOW SERVERS;"
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
psql -h localhost -p 6432 -U yyc3_stats -d pgbouncer -c "SHOW POOLS;"

# 2. 检查客户端连接
psql -h localhost -p 6432 -U yyc3_stats -d pgbouncer -c "SHOW CLIENTS;"

# 3. 检查慢查询
psql -h primary_host -p 5432 -U yyc3_admin -d yyc3_aify -c "
    SELECT query, mean_exec_time, calls 
    FROM pg_stat_statements 
    ORDER BY mean_exec_time DESC 
    LIMIT 10;
"

# 4. 重启PgBouncer（如果需要）
sudo systemctl restart pgbouncer
```

#### 问题2: 故障转移失败

**症状**: 主库故障后，无法自动切换到从库

**解决方案**:
```bash
# 1. 检查故障转移脚本
cat /etc/pgbouncer/failover.sh

# 2. 检查复制状态
psql -h replica_host -p 5433 -U replicator -d replication -c "IDENTIFY_SYSTEM;"

# 3. 手动提升从库
psql -h replica_host -p 5433 -U postgres -c "SELECT pg_promote();"

# 4. 重新加载PgBouncer配置
psql -h localhost -p 6432 -U yyc3_admin -d pgbouncer -c "RELOAD;"
```

---

## 七、最佳实践

### 7.1 生产环境最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **使用事务模式** | 提高连接复用率 | pool_mode = transaction |
| **读写分离** | 分发读写操作到不同实例 | 配置主从路由 |
| **自动故障转移** | 实现高可用 | automatic_failover = on |
| **监控告警** | 及时发现异常 | 配置监控和告警 |

### 7.2 安全最佳实践

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **使用强认证** | 使用scram-sha-256 | auth_type = scram-sha-256 |
| **限制访问** | 限制允许的IP地址 | 配置pg_hba.conf |
| **定期更换密码** | 提高安全性 | 定期更新userlist.txt |
| **审计日志** | 记录所有访问 | 启用日志记录 |
| **SSL加密** | 启用SSL连接 | 配置SSL证书 |

---

## 八、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [环境管理总览](../README.md)
- [02-数据库实例](../../02-数据库实例/)
- [09-高可用与容灾](../../09-高可用与容灾/)
- [PgBouncer官方文档](https://www.pgbouncer.org/usage.html)
