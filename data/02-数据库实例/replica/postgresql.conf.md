# YYC³ PostgreSQL 从库配置文件

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file postgresql.conf
@description PostgreSQL从库配置文件
@author YYC³团队
@version 1.0.0

---

## 一、配置概述

### 1.1 配置目标

本配置文件针对YYC³项目PostgreSQL从库进行优化，实现以下目标：

| 目标 | 说明 | 配置参数 |
|-----|------|---------|
| **高可用** | 支持热备，提供故障转移能力 | hot_standby, hot_standby_feedback |
| **高性能** | 优化读性能，支持负载均衡 | max_parallel_workers, effective_cache_size |
| **高同步** | 最小化复制延迟，确保数据一致性 | max_standby_streaming_delay, max_standby_archive_delay |
| **高安全** | 启用审计日志，记录所有操作 | logging_collector, log_recovery_conflict_waits |

### 1.2 硬件环境

| 组件 | 配置 | 说明 |
|-----|------|------|
| **CPU** | 4核 | 生产环境配置 |
| **内存** | 8GB | 优化内存参数的基础 |
| **存储** | 1TB SSD | 高性能存储 |
| **网络** | 10Gbps | 支持高速数据传输 |

---

## 二、连接配置

### 2.1 网络连接

```ini
# 监听地址（*表示监听所有网络接口）
listen_addresses = '*'

# 监听端口（默认5432）
port = 5432

# 最大连接数
max_connections = 500

# 超级用户保留连接数
superuser_reserved_connections = 3

# Unix套接字目录
unix_socket_directories = '/var/run/postgresql'
```

| 参数 | 值 | 说明 | 推荐值 |
|-----|------|------|--------|
| listen_addresses | * | 监听所有网络接口 | 生产环境使用具体IP |
| port | 5432 | PostgreSQL默认端口 | 根据安全策略调整 |
| max_connections | 500 | 最大并发连接数 | 根据应用负载调整 |
| superuser_reserved_connections | 3 | 保留给超级用户的连接 | 2-5 |

---

## 三、内存配置

### 3.1 内存参数

```ini
# 共享缓冲区大小（系统内存的25%）
shared_buffers = 2GB

# 工作内存（shared_buffers/1000，最大64MB）
work_mem = 32MB

# 维护工作内存（shared_buffers/10）
maintenance_work_mem = 512MB

# 有效缓存大小（系统内存的75%）
effective_cache_size = 6GB
```

| 参数 | 值 | 计算公式 | 说明 |
|-----|------|---------|------|
| shared_buffers | 2GB | 系统内存 × 25% | 缓存热数据 |
| work_mem | 32MB | shared_buffers ÷ 1000 | 每个查询操作的内存 |
| maintenance_work_mem | 512MB | shared_buffers ÷ 10 | 维护操作（VACUUM）的内存 |
| effective_cache_size | 6GB | 系统内存 × 75% | 告诉PostgreSQL系统缓存大小 |

---

## 四、复制配置

### 4.1 热备配置

```ini
# 热备模式（允许查询）
hot_standby = on

# 热备反馈（减少冲突）
hot_standby_feedback = on

# 流复制最大延迟
max_standby_streaming_delay = 30s

# 归档恢复最大延迟
max_standby_archive_delay = 60s
```

| 参数 | 值 | 说明 |
|-----|------|------|
| hot_standby | on | 允许在恢复期间执行查询 |
| hot_standby_feedback | on | 向主库反馈查询信息，减少冲突 |
| max_standby_streaming_delay | 30s | 流复制查询的最大延迟 |
| max_standby_archive_delay | 60s | 归档恢复查询的最大延迟 |

### 4.2 WAL接收配置

```ini
# WAL接收器进程数
max_wal_senders = 10
```

| 参数 | 值 | 说明 |
|-----|------|------|
| max_wal_senders | 10 | 最大WAL发送进程数 |

---

## 五、查询优化配置

### 5.1 查询优化参数

```ini
# 随机页面成本
random_page_cost = 1.1

# 有效IO并发度
effective_io_concurrency = 200

# 并行工作进程数
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
max_parallel_maintenance_workers = 2

# 统计信息目标
default_statistics_target = 100

# 连接池模式
shared_preload_libraries = 'pg_stat_statements, pgcrypto, pgvector'
```

| 参数 | 值 | 说明 |
|-----|------|------|
| random_page_cost | 1.1 | SSD存储推荐值 |
| effective_io_concurrency | 200 | 并发IO操作数 |
| max_parallel_workers_per_gather | 2 | 每个查询的最大并行工作进程 |
| max_parallel_workers | 4 | 系统最大并行工作进程数 |
| default_statistics_target | 100 | 统计信息采样量 |

---

## 六、日志配置

### 6.1 日志参数

```ini
# 日志收集
logging_collector = on

# 日志目录
log_directory = '/var/log/postgresql'

# 日志文件名
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'

# 日志轮转
log_rotation_age = 1d
log_rotation_size = 100MB

# 日志级别
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# 慢查询日志
log_min_duration_statement = 1000

# 检查点日志
log_checkpoints = on

# 连接日志
log_connections = on
log_disconnections = on

# 锁等待日志
log_lock_waits = on
deadlock_timeout = 1s

# 恢复冲突日志
log_recovery_conflict_waits = on
```

| 参数 | 值 | 说明 |
|-----|------|------|
| logging_collector | on | 启用日志收集器 |
| log_directory | /var/log/postgresql | 日志存储目录 |
| log_rotation_age | 1d | 日志文件轮转间隔 |
| log_rotation_size | 100MB | 日志文件最大大小 |
| log_min_duration_statement | 1000 | 记录执行时间超过1000ms的查询 |
| log_recovery_conflict_waits | on | 记录恢复冲突等待 |

---

## 七、自动清理配置

### 7.1 自动清理参数

```ini
# 自动清理工作进程数
autovacuum_max_workers = 3

# 自动清理延迟
autovacuum_naptime = 30s

# 自动清理阈值
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50

# 自动清理比例
autovacuum_vacuum_scale_factor = 0.2
autovacuum_analyze_scale_factor = 0.1

# 自动清理内存
autovacuum_work_mem = 128MB
```

| 参数 | 值 | 说明 |
|-----|------|------|
| autovacuum_max_workers | 3 | 自动清理最大工作进程数 |
| autovacuum_naptime | 30s | 自动清理运行间隔 |
| autovacuum_vacuum_threshold | 50 | 触发VACUUM的变更行数 |
| autovacuum_analyze_threshold | 50 | 触发ANALYZE的变更行数 |
| autovacuum_vacuum_scale_factor | 0.2 | 触发VACUUM的表比例 |
| autovacuum_analyze_scale_factor | 0.1 | 触发ANALYZE的表比例 |

---

## 八、其他配置

### 8.1 其他参数

```ini
# 时区
timezone = 'Asia/Shanghai'

# 默认表空间
default_tablespace = 'pg_default'

# 默认排序规则
lc_collate = 'en_US.UTF-8'
lc_ctype = 'en_US.UTF-8'

# 最大文件描述符
max_files_per_process = 4096
```

| 参数 | 值 | 说明 |
|-----|------|------|
| timezone | Asia/Shanghai | 服务器时区 |
| default_tablespace | pg_default | 默认表空间 |
| lc_collate | en_US.UTF-8 | 排序规则 |
| lc_ctype | en_US.UTF-8 | 字符分类规则 |

---

## 九、配置验证

### 9.1 配置检查

```bash
# 检查配置文件语法
postgres -C config_file

# 检查配置参数
postgres -C shared_buffers
postgres -C max_connections

# 重新加载配置（无需重启）
pg_ctl reload -D /var/lib/postgresql/15/main
```

### 9.2 性能监控

```sql
-- 查看当前配置
SHOW ALL;

-- 查看特定配置
SHOW hot_standby;
SHOW hot_standby_feedback;
SHOW max_standby_streaming_delay;

-- 修改配置（需要超级用户权限）
ALTER SYSTEM SET max_standby_streaming_delay = '60s';
SELECT pg_reload_conf();
```

---

## 十、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [从库配置说明](./README.md)
- [PostgreSQL官方文档](https://www.postgresql.org/docs/current/runtime-config.html)
- [主库配置](../primary/postgresql.conf.md)
