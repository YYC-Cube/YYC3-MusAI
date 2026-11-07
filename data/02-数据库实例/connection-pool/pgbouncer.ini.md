# YYC³ PgBouncer 连接池配置文件

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file pgbouncer.ini
@description PgBouncer连接池配置文件
@author YYC³团队
@version 1.0.0

---

## 一、配置概述

### 1.1 配置目标

本配置文件定义YYC³项目PgBouncer连接池的配置策略，实现以下目标：

| 目标 | 说明 | 配置参数 |
|-----|------|---------|
| **高性能** | 复用数据库连接，减少连接开销 | pool_mode, default_pool_size |
| **高可用** | 支持自动故障转移 | automatic_failover, failover_command |
| **高安全** | 使用强认证，限制访问 | auth_type, auth_file |
| **高监控** | 提供详细的监控信息 | stats_users, query_timeout |

### 1.2 连接池模式

| 模式 | 说明 | 适用场景 |
|-----|------|---------|
| **session** | 会话模式：每个客户端连接分配一个服务器连接 | 需要会话状态的应用 |
| **transaction** | 事务模式：每个事务分配一个服务器连接 | 无状态应用（推荐）|
| **statement** | 语句模式：每个语句分配一个服务器连接 | 简单查询应用 |

---

## 二、数据库配置

### 2.1 数据库连接

```ini
[databases]

# ============================================================================
# 生产环境数据库
# ============================================================================

# AIFY生产数据库
yyc3_aify = host=primary_host port=5432 dbname=yyc3_aify user=yyc3_pool password=yyc3_pool_secure

# MUSIC生产数据库
yyc3_music = host=primary_host port=5432 dbname=yyc3_music user=yyc3_pool password=yyc3_pool_secure

# MANA生产数据库
yyc3_mana = host=primary_host port=5432 dbname=yyc3_mana user=yyc3_pool password=yyc3_pool_secure

# ============================================================================
# 预发布环境数据库
# ============================================================================

# 预发布数据库
yyc3_staging = host=staging_host port=5432 dbname=yyc3_staging user=yyc3_pool password=yyc3_pool_secure_staging

# ============================================================================
# 开发环境数据库
# ============================================================================

# 开发数据库
yyc3_dev = host=dev_host port=5432 dbname=yyc3_dev user=yyc3_pool password=yyc3_pool_secure_dev

# 测试数据库
yyc3_test = host=dev_host port=5432 dbname=yyc3_test user=yyc3_pool password=yyc3_pool_secure_test

# ============================================================================
# PgBouncer管理数据库
# ============================================================================

# PgBouncer管理数据库
pgbouncer = host=127.0.0.1 port=5432 dbname=pgbouncer user=pgbouncer
```

| 数据库别名 | 主机 | 端口 | 数据库 | 用户 | 环境 |
|-----------|------|------|--------|------|------|
| yyc3_aify | primary_host | 5432 | yyc3_aify | yyc3_pool | 生产 |
| yyc3_music | primary_host | 5432 | yyc3_music | yyc3_pool | 生产 |
| yyc3_mana | primary_host | 5432 | yyc3_mana | yyc3_pool | 生产 |
| yyc3_staging | staging_host | 5432 | yyc3_staging | yyc3_pool | 预发布 |
| yyc3_dev | dev_host | 5432 | yyc3_dev | yyc3_pool | 开发 |
| yyc3_test | dev_host | 5432 | yyc3_test | yyc3_pool | 测试 |

---

## 三、监听配置

### 3.1 网络监听

```ini
[pgbouncer]

# ============================================================================
# 监听配置
# ============================================================================

# 监听地址（0.0.0.0表示监听所有接口）
listen_addr = 0.0.0.0

# 监听端口
listen_port = 6432

# Unix套接字目录
unix_socket_dir = /var/run/postgresql
```

| 参数 | 值 | 说明 | 推荐值 |
|-----|------|------|--------|
| listen_addr | 0.0.0.0 | 监听所有网络接口 | 生产环境使用具体IP |
| listen_port | 6432 | PgBouncer默认端口 | 根据安全策略调整 |
| unix_socket_dir | /var/run/postgresql | Unix套接字目录 | 与PostgreSQL保持一致 |

---

## 四、认证配置

### 4.1 认证方法

```ini
# ============================================================================
# 认证配置
# ============================================================================

# 认证方式（md5, scram-sha-256, trust, any, cert）
auth_type = scram-sha-256

# 认证文件路径
auth_file = /etc/pgbouncer/userlist.txt

# 认证查询（可选，用于动态认证）
# auth_query = SELECT usename, passwd FROM pgbouncer_users WHERE usename = $1

# HBA配置文件（可选）
# auth_hba_file = /etc/pgbouncer/pg_hba.conf

# 客户端认证延迟
auth_delay = 0s
```

| 参数 | 值 | 说明 | 推荐值 |
|-----|------|------|--------|
| auth_type | scram-sha-256 | 认证方式 | 推荐使用scram-sha-256 |
| auth_file | /etc/pgbouncer/userlist.txt | 认证文件路径 | 绝对路径 |
| auth_delay | 0s | 认证延迟 | 用于暴力破解防护 |

---

## 五、连接池配置

### 5.1 连接池参数

```ini
# ============================================================================
# 连接池配置
# ============================================================================

# 连接池模式（session, transaction, statement）
pool_mode = transaction

# 最大客户端连接数
max_client_conn = 1000

# 默认连接池大小
default_pool_size = 100

# 最小连接池大小
min_pool_size = 20

# 保留连接池大小（用于高峰期）
reserve_pool_size = 50

# 保留连接池超时（秒）
reserve_pool_timeout = 3

# 数据库特定连接池大小（可选）
# yyc3_aify_pool_size = 150
# yyc3_music_pool_size = 100
# yyc3_mana_pool_size = 100
```

| 参数 | 值 | 说明 | 推荐值 |
|-----|------|------|--------|
| pool_mode | transaction | 连接池模式 | 推荐transaction |
| max_client_conn | 1000 | 最大客户端连接数 | 根据应用负载调整 |
| default_pool_size | 100 | 默认连接池大小 | 根据数据库负载调整 |
| min_pool_size | 20 | 最小连接池大小 | 保持一定连接数 |
| reserve_pool_size | 50 | 保留连接池大小 | 用于高峰期 |
| reserve_pool_timeout | 3 | 保留连接池超时（秒） | 超时后放弃 |

---

## 六、超时配置

### 6.1 超时参数

```ini
# ============================================================================
# 超时配置
# ============================================================================

# 服务器生命周期（秒）
server_lifetime = 3600

# 服务器空闲超时（秒）
server_idle_timeout = 600

# 服务器连接超时（秒）
server_connect_timeout = 5

# 查询超时（秒）
query_timeout = 30

# 客户端空闲超时（秒）
client_idle_timeout = 600

# 服务器登录重试（秒）
server_login_retry = 30

# 查询等待超时（秒）
query_wait_timeout = 120
```

| 参数 | 值 | 说明 | 推荐值 |
|-----|------|------|--------|
| server_lifetime | 3600 | 服务器生命周期（秒） | 1小时 |
| server_idle_timeout | 600 | 服务器空闲超时（秒） | 10分钟 |
| server_connect_timeout | 5 | 服务器连接超时（秒） | 5秒 |
| query_timeout | 30 | 查询超时（秒） | 30秒 |
| client_idle_timeout | 600 | 客户端空闲超时（秒） | 10分钟 |
| server_login_retry | 30 | 服务器登录重试（秒） | 30秒 |
| query_wait_timeout | 120 | 查询等待超时（秒） | 2分钟 |

---

## 七、故障转移配置

### 7.1 自动故障转移

```ini
# ============================================================================
# 自动故障转移配置
# ============================================================================

# 自动故障转移（需要Patroni或repmgr支持）
automatic_failover = on

# 故障转移命令
failover_command = /etc/pgbouncer/failover.sh %d %h %p

# 故障转移延迟（秒）
failover_delay = 5
```

| 参数 | 值 | 说明 | 推荐值 |
|-----|------|------|--------|
| automatic_failover | on | 自动故障转移 | 与Patroni或repmgr配合 |
| failover_command | 脚本路径 | 故障转移命令 | 故障转移脚本 |
| failover_delay | 5 | 故障转移延迟（秒） | 避免频繁切换 |

---

## 八、日志配置

### 8.1 日志参数

```ini
# ============================================================================
# 日志配置
# ============================================================================

# 日志文件路径
log_file = /var/log/pgbouncer/pgbouncer.log

# 日志级别（syslog, stderr, /path/to/logfile）
log_connections = 1

# 记录断开连接
log_disconnections = 1

# 记录查询
log_pooler_errors = 1

# 记录统计信息
log_stats = 1

# 统计信息刷新间隔（秒）
stats_period = 60

# 详细日志
verbose = 0
```

| 参数 | 值 | 说明 | 推荐值 |
|-----|------|------|--------|
| log_file | /var/log/pgbouncer/pgbouncer.log | 日志文件路径 | 绝对路径 |
| log_connections | 1 | 记录连接 | 1=启用，0=禁用 |
| log_disconnections | 1 | 记录断开连接 | 1=启用，0=禁用 |
| log_pooler_errors | 1 | 记录错误 | 1=启用，0=禁用 |
| log_stats | 1 | 记录统计信息 | 1=启用，0=禁用 |
| stats_period | 60 | 统计信息刷新间隔（秒） | 60秒 |
| verbose | 0 | 详细日志 | 0=关闭，1=开启 |

---

## 九、管理配置

### 9.1 管理参数

```ini
# ============================================================================
# 管理配置
# ============================================================================

# 管理用户
admin_users = yyc3_admin

# 统计用户
stats_users = yyc3_stats

# 临时目录
tmpdir = /tmp

# 服务器重置查询
server_reset_query = DISCARD ALL

# 服务器检查查询
server_check_query = SELECT 1

# 服务器检查延迟（秒）
server_check_delay = 30
```

| 参数 | 值 | 说明 | 推荐值 |
|-----|------|------|--------|
| admin_users | yyc3_admin | 管理用户 | 逗号分隔 |
| stats_users | yyc3_stats | 统计用户 | 逗号分隔 |
| tmpdir | /tmp | 临时目录 | 绝对路径 |
| server_reset_query | DISCARD ALL | 服务器重置查询 | 清理会话状态 |
| server_check_query | SELECT 1 | 服务器检查查询 | 检查服务器可用性 |
| server_check_delay | 30 | 服务器检查延迟（秒） | 30秒 |

---

## 十、配置验证

### 10.1 配置检查

```bash
# 检查配置文件语法
pgbouncer -R /etc/pgbouncer/pgbouncer.ini

# 检查配置文件
cat /etc/pgbouncer/pgbouncer.ini

# 重新加载配置
psql -h localhost -p 6432 -U pgbouncer -d pgbouncer -c "RELOAD;"
```

### 10.2 连接测试

```bash
# 测试PgBouncer连接
psql -h localhost -p 6432 -U yyc3_pool -d yyc3_aify -c "SELECT 1;"

# 测试管理数据库
psql -h localhost -p 6432 -U yyc3_admin -d pgbouncer -c "SHOW STATS;"

# 测试统计信息
psql -h localhost -p 6432 -U yyc3_stats -d pgbouncer -c "SHOW POOLS;"
```

---

## 十一、监控配置

### 11.1 监控命令

```sql
-- 查看统计信息
SHOW STATS;

-- 查看连接池状态
SHOW POOLS;

-- 查看客户端连接
SHOW CLIENTS;

-- 查看服务器连接
SHOW SERVERS;

-- 查看列表
SHOW LISTS;

-- 重新加载配置
RELOAD;

-- 暂停PgBouncer
PAUSE;

-- 恢复PgBouncer
RESUME;

-- 关闭特定数据库连接
KILL database_name;
```

---

## 十二、最佳实践

### 12.1 连接池配置最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **使用事务模式** | 提高连接复用率 | pool_mode = transaction |
| **设置合理的连接池大小** | 避免连接泄漏 | default_pool_size = CPU核心数 × 10 |
| **启用日志记录** | 便于故障排查 | log_connections = 1 |
| **配置超时参数** | 避免连接堆积 | query_timeout = 30 |

### 12.2 安全最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **使用强认证** | 使用scram-sha-256 | auth_type = scram-sha-256 |
| **限制管理用户** | 只授予必要的权限 | admin_users = yyc3_admin |
| **启用认证延迟** | 防止暴力破解 | auth_delay = 1s |
| **定期更换密码** | 提高安全性 | 定期更新auth_file |

---

## 十三、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [连接池配置说明](./README.md)
- [PgBouncer官方文档](https://www.pgbouncer.org/usage.html)
- [02-数据库实例](../../02-数据库实例/)
