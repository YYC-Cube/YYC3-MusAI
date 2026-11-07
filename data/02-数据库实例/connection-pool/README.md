# YYC³(YanYuCloudCube)连接池配置

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file README.md
@description YYC³项目数据库连接池配置文档
@author YYC³团队
@version 1.0.0

---

## 一、概述

### 1.1 连接池职责

连接池是YYC³项目的数据库连接管理层，负责：

| 职责 | 说明 | 配置要点 |
|-----|------|---------|
| **连接管理** | 管理数据库连接生命周期 | 连接池大小配置 |
| **读写分离** | 路由读写请求到主从库 | 数据库路由配置 |
| **负载均衡** | 分发请求到多个实例 | 负载均衡算法 |
| **故障转移** | 支持自动故障转移 | 故障转移配置 |

### 1.2 技术选型

| 组件 | 技术 | 版本 | 说明 |
|-----|------|------|------|
| 连接池中间件 | PgBouncer | 1.20.0 | 轻量级连接池 |
| 连接模式 | Transaction | - | 事务级连接池 |
| 负载均衡 | Least Connections | - | 最少连接数负载均衡 |

### 1.3 连接池架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      YYC³连接池架构                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                             │
│  应用层                                                      │
│  ┌─────────────────────────────────────────────┐               │
│  │          应用服务                          │               │
│  │  - Node.js                               │               │
│  │  - Python                                │               │
│  │  - Go                                    │               │
│  └─────────────────────────────────────────────┘               │
│                      │                                       │
│                      ▼                                       │
│  连接池层                                                    │
│  ┌─────────────────────────────────────────────┐               │
│  │       PgBouncer (6432)                    │               │
│  │  - 连接池管理                            │               │
│  │  - 读写分离                              │               │
│  │  - 负载均衡                              │               │
│  │  - 故障转移                              │               │
│  └─────────────────────────────────────────────┘               │
│                      │                   │                       │
│        ┌─────────────┘                   └─────────────┐       │
│        ▼                                         ▼       │
│  主库层                                      从库层         │
│  ┌─────────────────────┐           ┌─────────────────────┐   │
│  │  PostgreSQL (5432)   │           │  PostgreSQL (5433)   │   │
│  │  - 写操作            │           │  - 读操作            │   │
│  │  - 数据同步          │           │  - 数据同步          │   │
│  └─────────────────────┘           └─────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、PgBouncer配置

### 2.1 配置概述

PgBouncer是PostgreSQL的轻量级连接池中间件。

| 配置类别 | 说明 | 文档 |
|---------|------|------|
| **数据库配置** | 数据库连接信息 | [pgbouncer.ini.md](pgbouncer.ini.md) |
| **连接池配置** | 连接池大小和超时 | [pgbouncer.ini.md](pgbouncer.ini.md) |
| **认证配置** | 用户认证方法 | [userlist.txt.md](userlist.txt.md) |
| **日志配置** | 日志记录级别 | [pgbouncer.ini.md](pgbouncer.ini.md) |

### 2.2 连接模式

| 模式 | 说明 | 适用场景 | 连接复用 |
|-----|------|---------|---------|
| **Session** | 每个客户端连接分配一个服务器连接 | 需要会话状态的应用 | 低 |
| **Transaction** | 每个事务分配一个服务器连接 | 无状态应用（推荐）| 高 |
| **Statement** | 每个语句分配一个服务器连接 | 简单查询应用 | 最高 |

---

## 三、应用层连接池

### 3.1 Node.js连接池

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 6432,
    database: 'yyc3_aify',
    user: 'yyc3_pool',
    password: 'yyc3_pool_password',
    max: 50,
    min: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
    query_timeout: 30000,
    application_name: 'yyc3-production',
    log: (msg) => console.log('[Pool]', msg)
});

module.exports = pool;
```

### 3.2 Python连接池

```python
import psycopg2.pool

pool = psycopg2.pool.SimpleConnectionPool(
    host='localhost',
    port=6432,
    database='yyc3_aify',
    user='yyc3_pool',
    password='yyc3_pool_password',
    minconn=10,
    maxconn=50,
    application_name='yyc3-production'
)

def get_connection():
    return pool.getconn()
```

---

## 四、监控与管理

### 4.1 监控指标

| 指标 | 说明 | 阈值 |
|-----|------|------|
| **连接数** | 当前活跃连接数 | < 1000 |
| **连接池使用率** | 连接池使用率 | < 80% |
| **查询响应时间** | 平均查询响应时间 | < 20ms |
| **连接等待时间** | 客户端等待连接时间 | < 10ms |

### 4.2 监控命令

```bash
# 查看连接池统计
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "SHOW STATS;"

# 查看连接池状态
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "SHOW POOLS;"

# 查看客户端连接
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "SHOW CLIENTS;"

# 查看服务器连接
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "SHOW SERVERS;"
```

---

## 五、故障处理

### 5.1 常见问题

#### 问题1: 连接池耗尽

**症状**: 无法获取数据库连接

**解决方案**:
```bash
# 检查连接池状态
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "SHOW POOLS;"

# 检查客户端连接
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "SHOW CLIENTS;"

# 检查慢查询
psql -h primary_host -p 5432 -U postgres -d yyc3_aify -c "
    SELECT query, mean_exec_time, calls 
    FROM pg_stat_statements 
    ORDER BY mean_exec_time DESC 
    LIMIT 10;
"

# 重启PgBouncer
sudo systemctl restart pgbouncer
```

#### 问题2: 连接泄漏

**症状**: 连接数持续增长

**解决方案**:
```bash
# 查看长时间运行的连接
psql -h primary_host -p 5432 -U postgres -d yyc3_aify -c "
    SELECT pid, state, query_start, state_change 
    FROM pg_stat_activity 
    WHERE state = 'active' 
    AND now() - query_start > interval '10 minutes';
"

# 终止长时间运行的连接
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'active' 
AND now() - query_start > interval '10 minutes';
```

---

## 六、最佳实践

### 6.1 连接池最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **使用事务模式** | 提高连接复用率 | pool_mode = transaction |
| **合理配置连接池大小** | 避免连接池过大或过小 | 根据负载调整 |
| **设置合理的超时** | 避免长时间占用连接 | 配置超时参数 |
| **启用监控** | 及时发现异常 | 配置监控告警 |

### 6.2 安全最佳实践

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **使用强认证** | 使用scram-sha-256 | auth_type = scram-sha-256 |
| **限制访问** | 限制允许的IP地址 | 配置pg_hba.conf |
| **定期更换密码** | 提高安全性 | 定期更新userlist.txt |
| **审计日志** | 记录所有连接池操作 | 启用日志记录 |

---

## 七、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [数据库实例总览](../README.md)
- [pgbouncer.ini.md](pgbouncer.ini.md)
- [userlist.txt.md](userlist.txt.md)
- [主库配置](../primary/)
- [从库配置](../replica/)
- [01-环境管理](../../01-环境管理/)
