# YYC³(YanYuCloudCube)从库配置

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file README.md
@description YYC³项目PostgreSQL从库配置文档
@author YYC³团队
@version 1.0.0

---

## 一、概述

### 1.1 从库职责

从库是YYC³项目的读库实例，负责：

| 职责 | 说明 | 配置要点 |
|-----|------|---------|
| **读操作** | 处理SELECT查询 | 热备配置 |
| **数据同步** | 接收和应用WAL日志 | 恢复配置 |
| **故障转移** | 提供故障转移能力 | 提升配置 |
| **负载均衡** | 分担主库读压力 | 多从库配置 |

### 1.2 硬件要求

| 组件 | 开发环境 | 预发布环境 | 生产环境 |
|-----|---------|-----------|---------|
| **CPU** | 1核 | 2核 | 4核 |
| **内存** | 2GB | 4GB | 8GB |
| **存储** | 100GB SSD | 500GB SSD | 1TB SSD |
| **网络** | 1Gbps | 10Gbps | 10Gbps |

### 1.3 软件版本

| 软件 | 版本 | 说明 |
|-----|------|------|
| **PostgreSQL** | 15.3 | 数据库引擎 |
| **pg_stat_statements** | 1.9 | 查询性能统计 |
| **pgvector** | 0.5.0 | 向量搜索支持 |

---

## 二、postgresql.conf

### 2.1 配置概述

postgresql.conf是PostgreSQL的主配置文件，从库配置与主库略有不同。

| 参数类别 | 说明 | 文档 |
|---------|------|------|
| **热备配置** | 启用热备模式 | [postgresql.conf.md](postgresql.conf.md) |
| **恢复配置** | WAL恢复相关参数 | [postgresql.conf.md](postgresql.conf.md) |
| **查询配置** | 查询优化配置 | [postgresql.conf.md](postgresql.conf.md) |

### 2.2 关键参数

| 参数 | 值 | 说明 |
|-----|------|------|
| **hot_standby** | on | 启用热备 |
| **hot_standby_feedback** | on | 热备反馈 |
| **max_standby_streaming_delay** | 30s | 最大流复制延迟 |
| **max_standby_archive_delay** | 60s | 最大归档恢复延迟 |

---

## 三、recovery.conf

### 3.1 配置概述

recovery.conf配置从库的恢复参数。

| 参数 | 说明 |
|-----|------|
| **standby_mode** | 热备模式 |
| **primary_conninfo** | 主库连接信息 |
| **recovery_target_timeline** | 恢复目标时间线 |
| **restore_command** | WAL恢复命令 |
| **trigger_file** | 触发文件路径 |

### 3.2 配置文件

详细的recovery.conf配置请参考：
- [recovery.conf.md](recovery.conf.md)

---

## 四、初始化配置

### 4.1 基础备份恢复

```bash
# 从主库获取基础备份
pg_basebackup -h primary_host -p 5432 -U replicator \
    -D /var/lib/postgresql/15/replica \
    -F p -X stream -R -P

# 启动从库
sudo systemctl start postgresql-replica
```

### 4.2 验证复制状态

```sql
-- 检查从库是否处于恢复状态
SELECT pg_is_in_recovery();

-- 查看复制延迟
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- 查看WAL接收状态
SELECT * FROM pg_stat_wal_receiver;
```

---

## 五、监控与维护

### 5.1 监控指标

| 指标 | 说明 | 阈值 |
|-----|------|------|
| **复制延迟** | WAL应用延迟 | < 1秒 |
| **连接数** | 当前活跃连接数 | < 100 |
| **查询时间** | 平均查询时间 | < 50ms |
| **WAL接收速率** | WAL接收速率 | > 10MB/s |

### 5.2 监控脚本

```bash
#!/bin/bash

# 从库监控脚本
REPLICA_HOST="localhost"
REPLICA_PORT="5433"
REPLICA_USER="postgres"

monitor_replica() {
    echo "=== Replica Database Status ==="
    echo ""
    
    echo "=== Recovery Status ==="
    psql -h $REPLICA_HOST -p $REPLICA_PORT -U $REPLICA_USER -c "SELECT pg_is_in_recovery();"
    
    echo ""
    echo "=== Replication Lag ==="
    psql -h $REPLICA_HOST -p $REPLICA_PORT -U $REPLICA_USER -c "
        SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
    "
    
    echo ""
    echo "=== WAL Receiver Status ==="
    psql -h $REPLICA_HOST -p $REPLICA_PORT -U $REPLICA_USER -c "SELECT * FROM pg_stat_wal_receiver;"
}

monitor_replica
```

---

## 六、故障处理

### 6.1 常见问题

#### 问题1: 复制延迟过大

**症状**: 从库数据明显落后于主库

**解决方案**:
```sql
-- 查看复制延迟
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- 检查慢查询
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- 检查锁等待
SELECT * FROM pg_stat_activity 
WHERE wait_event IS NOT NULL;
```

#### 问题2: 从库无法启动

**症状**: 从库启动失败

**解决方案**:
```bash
# 检查日志
sudo tail -f /var/log/postgresql/postgresql-15-replica.log

# 检查恢复配置
cat /var/lib/postgresql/15/replica/recovery.conf

# 重新获取基础备份
pg_basebackup -h primary_host -p 5432 -U replicator \
    -D /var/lib/postgresql/15/replica \
    -F p -X stream -R -P
```

---

## 七、故障转移

### 7.1 提升从库为主库

```bash
#!/bin/bash

# 提升从库为主库
REPLICA_HOST="localhost"
REPLICA_PORT="5433"
REPLICA_USER="postgres"

promote_replica() {
    echo "=== Promoting Replica to Primary ==="
    
    # 创建触发文件
    touch /var/lib/postgresql/trigger.promote
    
    # 或者使用SQL命令
    psql -h $REPLICA_HOST -p $REPLICA_PORT -U $REPLICA_USER -c "SELECT pg_promote();"
    
    echo "=== Promote Complete ==="
}

promote_replica
```

### 7.2 重建从库

```bash
#!/bin/bash

# 重建从库脚本
PRIMARY_HOST="primary_host"
PRIMARY_PORT="5432"
PRIMARY_USER="replicator"
REPLICA_DATA_DIR="/var/lib/postgresql/15/replica"

rebuild_replica() {
    echo "=== Rebuilding Replica ==="
    
    # 停止从库
    sudo systemctl stop postgresql-replica
    
    # 删除旧数据
    sudo rm -rf $REPLICA_DATA_DIR/*
    
    # 获取新的基础备份
    pg_basebackup -h $PRIMARY_HOST -p $PRIMARY_PORT -U $PRIMARY_USER \
        -D $REPLICA_DATA_DIR \
        -F p -X stream -R -P
    
    # 启动从库
    sudo systemctl start postgresql-replica
    
    echo "=== Rebuild Complete ==="
}

rebuild_replica
```

---

## 八、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [数据库实例总览](../README.md)
- [postgresql.conf.md](postgresql.conf.md)
- [recovery.conf.md](recovery.conf.md)
- [主库配置](../primary/)
- [连接池配置](../connection-pool/)
- [09-高可用与容灾](../../09-高可用与容灾/)
