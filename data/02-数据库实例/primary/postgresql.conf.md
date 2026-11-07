# YYC³ PostgreSQL 主库配置文件

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file postgresql.conf
@description PostgreSQL主库配置文件
@author YYC³团队
@version 1.0.0

---

## 一、配置概述

### 1.1 配置目标

本配置文件针对YYC³项目PostgreSQL主库进行优化，实现以下目标：

| 目标 | 说明 | 配置参数 |
|-----|------|---------|
| **高性能** | 优化查询性能，支持高并发 | shared_buffers, work_mem, effective_cache_size |
| **高可用** | 支持流复制，确保数据安全 | wal_level, max_wal_senders, synchronous_commit |
| **高安全** | 启用审计日志，记录所有操作 | logging_collector, log_connections, log_disconnections |
| **高扩展** | 支持水平扩展，适应业务增长 | max_connections, max_worker_processes |

### 1.2 硬件环境

| 组件 | 配置 | 说明 |
|-----|------|------|
| **CPU** | 8核 | 生产环境配置 |
| **内存** | 16GB | 优化内存参数的基础 |
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
shared_buffers = 4GB

# 工作内存（shared_buffers/1000，最大64MB）
work_mem = 64MB

# 维护工作内存（shared_buffers/10）
maintenance_work_mem = 1GB

# 有效缓存大小（系统内存的75%）
effective_cache_size = 12GB
```

| 参数 | 值 | 计算公式 | 说明 |
|-----|------|---------|------|
| shared_buffers | 4GB | 系统内存 × 25% | 缓存热数据 |
| work_mem | 64MB | shared_buffers ÷ 1000 | 每个查询操作的内存 |
| maintenance_work_mem | 1GB | shared_buffers ÷ 10 | 维护操作（VACUUM）的内存 |
| effective_cache_size | 12GB | 系统内存 × 75% | 告诉PostgreSQL系统缓存大小 |

### 3.2 内存优化建议

| 场景 | shared_buffers | work_mem | maintenance_work_mem |
|-----|---------------|----------|-------------------|
| **小规模**（<1GB） | 128MB | 4MB | 32MB |
| **中等规模**（1-8GB） | 512MB | 16MB | 128MB |
| **大规模**（8-32GB） | 2GB | 32MB | 512MB |
| **超大规模**（>32GB） | 8GB | 64MB | 2GB |

---

## 四、WAL配置

### 4.1 WAL参数

```ini
# WAL级别（支持流复制）
wal_level = replica

# WAL日志压缩
wal_compression = on

# WAL日志同步方式
synchronous_commit = on

# WAL缓冲区大小
wal_buffers = 16MB

# 最大WAL发送进程数
max_wal_senders = 10

# 最大复制槽数
max_replication_slots = 10

# 保留的WAL日志大小
wal_keep_size = 1GB

# WAL日志归档
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
```

| 参数 | 值 | 说明 |
|-----|------|------|
| wal_level | replica | 支持流复制和热备 |
| wal_compression | on | 压缩WAL日志，节省空间 |
| synchronous_commit | on | 确保事务持久化 |
| max_wal_senders | 10 | 最大流复制连接数 |
| max_replication_slots | 10 | 最大复制槽数量 |
| wal_keep_size | 1GB | 保留WAL日志的大小 |
| archive_mode | on | 启用WAL归档 |
| archive_command | cp | WAL归档命令 |

### 4.2 检查点配置

```ini
# 检查点超时时间
checkpoint_timeout = 15min

# 最大WAL日志大小
max_wal_size = 4GB

# 最小WAL日志大小
min_wal_size = 1GB
```

| 参数 | 值 | 说明 |
|-----|------|------|
| checkpoint_timeout | 15min | 自动检查点间隔 |
| max_wal_size | 4GB | 触发检查点的最大WAL量 |
| min_wal_size | 1GB | 检查点后WAL的最小大小 |

---

## 五、查询优化配置

### 5.1 查询优化参数

```ini
# 随机页面成本
random_page_cost = 1.1

# 有效IO并发度
effective_io_concurrency = 200

# 并行工作进程数
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# 统计信息目标
default_statistics_target = 100

# 连接池模式
shared_preload_libraries = 'pg_stat_statements, pgcrypto, pgvector'
```

| 参数 | 值 | 说明 |
|-----|------|------|
| random_page_cost | 1.1 | SSD存储推荐值 |
| effective_io_concurrency | 200 | 并发IO操作数 |
| max_parallel_workers_per_gather | 4 | 每个查询的最大并行工作进程 |
| max_parallel_workers | 8 | 系统最大并行工作进程数 |
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
```

| 参数 | 值 | 说明 |
|-----|------|------|
| logging_collector | on | 启用日志收集器 |
| log_directory | /var/log/postgresql | 日志存储目录 |
| log_rotation_age | 1d | 日志文件轮转间隔 |
| log_rotation_size | 100MB | 日志文件最大大小 |
| log_min_duration_statement | 1000 | 记录执行时间超过1000ms的查询 |

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
autovacuum_work_mem = 256MB
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
SHOW shared_buffers;
SHOW max_connections;
SHOW work_mem;

-- 修改配置（需要超级用户权限）
ALTER SYSTEM SET shared_buffers = '8GB';
SELECT pg_reload_conf();
```

---

## 十、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [PostgreSQL官方文档](https://www.postgresql.org/docs/current/runtime-config.html)
- [主库配置说明](./README.md)
- [从库配置](../replica/postgresql.conf.md)
