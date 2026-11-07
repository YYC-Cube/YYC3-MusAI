# YYC³ PostgreSQL 从库恢复配置文件

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file recovery.conf
@description PostgreSQL从库恢复配置文件
@author YYC³团队
@version 1.0.0

---

## 一、配置概述

### 1.1 配置目标

本配置文件定义YYC³项目PostgreSQL从库的恢复策略，实现以下目标：

| 目标 | 说明 | 配置参数 |
|-----|------|---------|
| **高可用** | 支持故障转移，确保业务连续性 | standby_mode, primary_conninfo |
| **高同步** | 最小化复制延迟，确保数据一致性 | restore_command, recovery_target_timeline |
| **高可靠** | 支持时间点恢复，灵活应对故障 | recovery_target_time, recovery_target_xid |
| **高监控** | 提供恢复状态监控，及时发现问题 | recovery_min_apply_delay |

### 1.2 恢复类型

| 类型 | 说明 | 适用场景 |
|-----|------|---------|
| **流复制恢复** | 从主库实时流式接收WAL日志 | 主从复制 |
| **归档恢复** | 从归档日志恢复WAL日志 | 时间点恢复 |
| **时间点恢复** | 恢复到指定时间点 | 数据误删除 |
| **事务恢复** | 恢复到指定事务 | 数据回滚 |

---

## 二、基本配置

### 2.1 基本恢复参数

```conf
# 热备模式
standby_mode = 'on'

# 主库连接信息
primary_conninfo = 'host=primary_host port=5432 user=replicator password=replicator_secure_password application_name=replica_1'

# 恢复目标时间线
recovery_target_timeline = 'latest'
```

| 参数 | 值 | 说明 |
|-----|------|------|
| standby_mode | on | 启用热备模式 |
| primary_conninfo | 连接字符串 | 主库连接信息 |
| recovery_target_timeline | latest | 恢复到最新时间线 |

---

## 三、WAL日志恢复

### 3.1 归档恢复配置

```conf
# 恢复命令（从归档日志恢复）
restore_command = 'cp /var/lib/postgresql/archive/%f %p'

# 归档恢复超时
archive_cleanup_command = 'pg_archivecleanup /var/lib/postgresql/archive %r'
```

| 参数 | 值 | 说明 |
|-----|------|------|
| restore_command | cp命令 | 从归档目录复制WAL日志 |
| archive_cleanup_command | pg_archivecleanup | 清理不再需要的归档文件 |

---

## 四、时间点恢复

### 4.1 时间点恢复配置

```conf
# 恢复目标时间（可选）
# recovery_target_time = '2026-02-25 10:00:00'

# 恢复目标XID（可选）
# recovery_target_xid = '12345678'

# 恢复目标名称（可选）
# recovery_target_name = 'backup_before_migration'

# 恢复目标策略
# recovery_target_inclusive = true

# 恢复目标动作
# recovery_target_action = 'pause'
```

| 参数 | 值 | 说明 |
|-----|------|------|
| recovery_target_time | 时间戳 | 恢复到指定时间点 |
| recovery_target_xid | 事务ID | 恢复到指定事务 |
| recovery_target_name | 恢复点名称 | 恢复到命名恢复点 |
| recovery_target_inclusive | true/false | 是否包含目标点 |
| recovery_target_action | pause/promote/shutdown | 恢复完成后的动作 |

---

## 五、流复制配置

### 5.1 流复制参数

```conf
# 流复制槽名称（可选）
primary_slot_name = 'replica_1_slot'

# 应用延迟（可选，用于创建延迟从库）
recovery_min_apply_delay = '0'
```

| 参数 | 值 | 说明 |
|-----|------|------|
| primary_slot_name | replica_1_slot | 使用复制槽接收WAL日志 |
| recovery_min_apply_delay | 0s | 应用延迟（用于创建延迟从库） |

---

## 六、触发文件配置

### 6.1 触发文件参数

```conf
# 触发文件路径
trigger_file = '/var/lib/postgresql/trigger.promote'
```

| 参数 | 值 | 说明 |
|-----|------|------|
| trigger_file | /var/lib/postgresql/trigger.promote | 触发文件路径 |

---

## 七、配置验证

### 7.1 配置检查

```bash
# 检查recovery.conf配置
cat /var/lib/postgresql/15/main/recovery.conf

# 检查复制状态
psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# 检查WAL接收状态
psql -U postgres -c "SELECT * FROM pg_stat_wal_receiver;"
```

### 7.2 复制监控

```sql
-- 查看复制状态
SELECT 
    pid,
    state,
    sync_state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    replay_lag,
    flush_lag,
    write_lag
FROM pg_stat_replication;

-- 查看WAL接收状态
SELECT * FROM pg_stat_wal_receiver;

-- 查看恢复进度
SELECT 
    pg_is_in_recovery(),
    pg_last_xlog_receive_location(),
    pg_last_xlog_replay_location(),
    pg_last_xact_replay_timestamp();
```

---

## 八、故障处理

### 8.1 常见问题

#### 问题1: 复制连接失败

**症状**: 从库无法连接到主库

**解决方案**:
```bash
# 1. 检查网络连接
ping primary_host
telnet primary_host 5432

# 2. 检查复制用户权限
psql -U postgres -h primary_host -c "\du replicator"

# 3. 检查主库配置
psql -U postgres -h primary_host -c "SHOW max_wal_senders;"
psql -U postgres -h primary_host -c "SHOW wal_level;"

# 4. 检查从库日志
tail -f /var/log/postgresql/postgresql-*.log
```

#### 问题2: 复制延迟过高

**症状**: 从库数据落后主库过多

**解决方案**:
```sql
-- 1. 检查复制延迟
SELECT 
    now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- 2. 检查WAL日志
SELECT * FROM pg_stat_replication;

-- 3. 检查网络带宽
-- 使用iftop或nethogs监控网络流量

-- 4. 检查从库性能
-- 使用top或htop监控CPU和内存使用
```

#### 问题3: 恢复冲突

**症状**: 查询与恢复冲突

**解决方案**:
```sql
-- 1. 检查恢复冲突
SELECT * FROM pg_stat_database_conflicts;

-- 2. 调整热备参数
ALTER SYSTEM SET max_standby_streaming_delay = '60s';
ALTER SYSTEM SET max_standby_archive_delay = '120s';
SELECT pg_reload_conf();

-- 3. 启用热备反馈
ALTER SYSTEM SET hot_standby_feedback = 'on';
SELECT pg_reload_conf();
```

---

## 九、故障转移

### 9.1 手动故障转移

```bash
# 1. 停止从库
pg_ctl stop -D /var/lib/postgresql/15/main

# 2. 创建触发文件
touch /var/lib/postgresql/trigger.promote

# 3. 启动从库（提升为主库）
pg_ctl start -D /var/lib/postgresql/15/main

# 4. 验证新主库
psql -U postgres -c "SELECT pg_is_in_recovery();"
```

### 9.2 自动故障转移

使用工具如Patroni或repmgr实现自动故障转移：

```bash
# 使用Patroni
patronictl switchover

# 使用repmgr
repmgr standby promote
```

---

## 十、最佳实践

### 10.1 复制配置最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **使用复制槽** | 避免WAL日志被过早清理 | 配置primary_slot_name |
| **监控复制延迟** | 及时发现复制问题 | 定期检查复制状态 |
| **定期测试故障转移** | 确保故障转移正常工作 | 定期执行故障转移测试 |
| **启用热备反馈** | 减少恢复冲突 | 配置hot_standby_feedback |

### 10.2 性能优化最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **优化网络** | 使用高速网络连接 | 使用10Gbps网络 |
| **调整缓冲区** | 增加WAL缓冲区大小 | 配置wal_buffers |
| **并行恢复** | 启用并行恢复 | 配置max_parallel_workers |
| **延迟从库** | 创建延迟从库用于灾难恢复 | 配置recovery_min_apply_delay |

---

## 十一、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [从库配置说明](./README.md)
- [PostgreSQL官方文档](https://www.postgresql.org/docs/current/recovery-config.html)
- [09-高可用与容灾](../../09-高可用与容灾/)
