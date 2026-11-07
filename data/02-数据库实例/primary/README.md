# YYC³(YanYuCloudCube)主库配置

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file README.md
@description YYC³项目PostgreSQL主库配置文档
@author YYC³团队
@version 1.0.0

---

## 一、概述

### 1.1 主库职责

主库是YYC³项目的核心数据库实例，负责：

| 职责 | 说明 | 配置要点 |
|-----|------|---------|
| **写操作** | 处理INSERT、UPDATE、DELETE | WAL配置优化 |
| **数据同步** | 生成和传输WAL日志到从库 | 复制槽配置 |
| **事务完整性** | 维护ACID特性 | 同步提交配置 |
| **并发控制** | 管理并发事务 | 锁配置 |

### 1.2 硬件要求

| 组件 | 开发环境 | 预发布环境 | 生产环境 |
|-----|---------|-----------|---------|
| **CPU** | 2核 | 4核 | 8核 |
| **内存** | 4GB | 8GB | 16GB |
| **存储** | 100GB SSD | 500GB SSD | 1TB SSD |
| **网络** | 1Gbps | 10Gbps | 10Gbps |

### 1.3 软件版本

| 软件 | 版本 | 说明 |
|-----|------|------|
| **PostgreSQL** | 15.3 | 数据库引擎 |
| **pg_stat_statements** | 1.9 | 查询性能统计 |
| **pgvector** | 0.5.0 | 向量搜索支持 |
| **pgcrypto** | 1.3 | 加密支持 |

---

## 二、postgresql.conf

### 2.1 配置概述

postgresql.conf是PostgreSQL的主配置文件，包含所有重要参数。

| 参数类别 | 说明 | 文档 |
|---------|------|------|
| **连接配置** | 数据库连接相关参数 | [postgresql.conf.md](postgresql.conf.md) |
| **内存配置** | 共享缓冲区和缓存配置 | [postgresql.conf.md](postgresql.conf.md) |
| **WAL配置** | 写前日志配置 | [postgresql.conf.md](postgresql.conf.md) |
| **查询配置** | 查询优化配置 | [postgresql.conf.md](postgresql.conf.md) |

### 2.2 关键参数

| 参数 | 值 | 说明 |
|-----|------|------|
| **max_connections** | 200 | 最大连接数 |
| **shared_buffers** | 4GB | 共享缓冲区 |
| **wal_level** | replica | WAL级别 |
| **max_wal_senders** | 10 | 最大WAL发送进程 |
| **synchronous_commit** | on | 同步提交 |

---

## 三、pg_hba.conf

### 3.1 配置概述

pg_hba.conf配置PostgreSQL的客户端认证。

| 认证类型 | 说明 | 使用场景 |
|---------|------|---------|
| **md5** | MD5密码认证 | 应用连接 |
| **scram-sha-256** | SCRAM-SHA-256认证 | 生产环境 |
| **trust** | 信任认证 | 本地开发 |
| **peer** | 操作系统用户认证 | 本地连接 |

### 3.2 配置文件

详细的pg_hba.conf配置请参考：
- [pg_hba.conf.md](pg_hba.conf.md)

---

## 四、pg_ident.conf

### 4.1 配置概述

pg_ident.conf配置操作系统用户与PostgreSQL用户的映射。

| 映射类型 | 说明 | 使用场景 |
|---------|------|---------|
| **系统用户映射** | 映射系统用户到PostgreSQL用户 | 本地连接 |
| **应用用户映射** | 映射应用用户到PostgreSQL用户 | 应用连接 |
| **复制用户映射** | 映射复制用户到PostgreSQL用户 | 复制连接 |

### 4.2 配置文件

详细的pg_ident.conf配置请参考：
- [pg_ident.conf.md](pg_ident.conf.md)

---

## 五、初始化配置

### 5.1 数据库初始化

```bash
# 创建数据目录
sudo mkdir -p /var/lib/postgresql/15/main
sudo chown postgres:postgres /var/lib/postgresql/15/main

# 初始化数据库
sudo -u postgres /usr/lib/postgresql/15/bin/initdb -D /var/lib/postgresql/15/main

# 启动数据库
sudo systemctl start postgresql
```

### 5.2 创建数据库和用户

```sql
-- 创建数据库
CREATE DATABASE yyc3_aify ENCODING 'UTF8';
CREATE DATABASE yyc3_music ENCODING 'UTF8';
CREATE DATABASE yyc3_mana ENCODING 'UTF8';

-- 创建用户
CREATE USER yyc3_aify WITH PASSWORD 'yyc3_aify_password';
CREATE USER yyc3_music WITH PASSWORD 'yyc3_music_password';
CREATE USER yyc3_mana WITH PASSWORD 'yyc3_mana_password';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE yyc3_aify TO yyc3_aify;
GRANT ALL PRIVILEGES ON DATABASE yyc3_music TO yyc3_music;
GRANT ALL PRIVILEGES ON DATABASE yyc3_mana TO yyc3_mana;
```

### 5.3 创建复制用户

```sql
-- 创建复制用户
CREATE USER replicator WITH REPLICATION PASSWORD 'replicator_password';

-- 授予复制权限
ALTER ROLE replicator WITH REPLICATION;
```

---

## 六、监控与维护

### 6.1 监控指标

| 指标 | 说明 | 阈值 |
|-----|------|------|
| **连接数** | 当前活跃连接数 | < 200 |
| **WAL大小** | WAL日志大小 | < 10GB |
| **复制延迟** | 从库复制延迟 | < 1秒 |
| **查询时间** | 平均查询时间 | < 100ms |

### 6.2 监控脚本

```bash
#!/bin/bash

# 主库监控脚本
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="postgres"

monitor_primary() {
    echo "=== Primary Database Status ==="
    echo ""
    
    echo "=== Connections ==="
    psql -h $PG_HOST -p $PG_PORT -U $PG_USER -c "SELECT count(*) FROM pg_stat_activity;"
    
    echo ""
    echo "=== Replication Status ==="
    psql -h $PG_HOST -p $PG_PORT -U $PG_USER -c "SELECT * FROM pg_stat_replication;"
    
    echo ""
    echo "=== WAL Size ==="
    psql -h $PG_HOST -p $PG_PORT -U $PG_USER -c "SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) AS wal_size;"
}

monitor_primary
```

---

## 七、故障处理

### 7.1 常见问题

#### 问题1: 连接数耗尽

**症状**: 无法连接到数据库

**解决方案**:
```sql
-- 查看当前连接
SELECT * FROM pg_stat_activity;

-- 终止空闲连接
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';

-- 增加最大连接数（需要重启）
-- 修改postgresql.conf中的max_connections
```

#### 问题2: WAL日志过大

**症状**: WAL日志占用大量磁盘空间

**解决方案**:
```sql
-- 查看WAL日志大小
SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) AS wal_size;

-- 手动切换WAL日志
SELECT pg_switch_wal();

-- 清理旧WAL日志
-- 配置archive_command和wal_keep_size
```

---

## 八、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [数据库实例总览](../README.md)
- [postgresql.conf.md](postgresql.conf.md)
- [pg_hba.conf.md](pg_hba.conf.md)
- [pg_ident.conf.md](pg_ident.conf.md)
- [从库配置](../replica/)
- [连接池配置](../connection-pool/)
