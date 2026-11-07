# YYC³(YanYuCloudCube)容灾环境配置

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file README.md
@description YYC³项目容灾环境配置总览文档
@author YYC³团队
@version 1.0.0

---

## 一、概述

### 1.1 容灾目标

容灾环境的主要目标：

| 目标 | 说明 | 配置策略 |
|-----|------|---------|
| **数据安全** | 确保数据安全和完整性 | 异地备份+流复制 |
| **快速恢复** | 在灾难发生时快速恢复服务 | 预先配置恢复流程 |
| **业务连续** | 最小化业务中断时间 | 故障自动转移 |
| **定期验证** | 定期验证容灾方案的有效性 | 定期演练 |

### 1.2 容灾级别

| 级别 | RPO | RTO | 说明 |
|-----|-----|-----|------|
| **灾难恢复** | <1小时 | <4小时 | 完整的数据恢复和服务恢复 |
| **热备** | <5分钟 | <30分钟 | 热备库可以快速接管 |
| **温备** | <1小时 | <2小时 | 温备库需要较短恢复时间 |
| **冷备** | <24小时 | <24小时 | 冷备库需要较长时间恢复 |

### 1.3 容灾策略

| 策略 | 说明 | 实施方法 |
|-----|------|---------|
| **异地容灾** | 在异地建立容灾中心 | 异地数据中心 |
| **流复制** | 实时同步数据到容灾库 | PostgreSQL流复制 |
| **定期备份** | 定期备份到云存储 | 3-2-1备份策略 |
| **自动切换** | 故障时自动切换到容灾库 | 自动故障转移 |

---

## 二、容灾架构

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                      YYC³容灾架构                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                             │
│  生产中心                                容灾中心         │
│  ┌─────────┐                           ┌─────────┐       │
│  │Primary  │                           │  DR     │       │
│  │  DB     │──────────────────────────▶│  DB     │       │
│  │ :5432   │   流复制 (Streaming)      │ :5435   │       │
│  │         │                           │         │       │
│  └─────────┘                           └─────────┘       │
│      │                                    │             │
│      │                                    │             │
│      ▼                                    ▼             │
│  ┌─────────┐                           ┌─────────┐       │
│  │Replica  │                           │PgBouncer│       │
│  │  DB     │                           │  :6434  │       │
│  │ :5433   │                           └─────────┘       │
│  │         │                               │             │
│  └─────────┘                               ▼             │
│      │                                ┌─────────┐       │
│      │                                │Backup   │       │
│      │                                │Storage  │       │
│      ▼                                └─────────┘       │
│  ┌─────────┘                                            │
│  │PgBouncer                                              │
│  │  :6432                                                │
│  └─────────┘                                            │
│      │                                                   │
│      ▼                                                   │
│  应用服务                                                │
│  (故障时自动切换)                                        │
│                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据同步流程

```
1. 主库接收写操作
   ↓
2. WAL日志生成
   ↓
3. WAL日志流复制到容灾库
   ↓
4. 容灾库重放WAL日志
   ↓
5. 容灾库数据同步完成
```

---

## 三、环境配置

### 3.1 容灾数据库配置

| 参数 | 值 | 说明 |
|-----|------|------|
| **数据库端口** | 5435 | 容灾数据库端口 |
| **PgBouncer端口** | 6434 | 连接池端口 |
| **最大连接数** | 500 | 最大客户端连接数 |
| **连接池大小** | 50 | 每个数据库的连接池大小 |

### 3.2 复制配置

```ini
# recovery.conf

# 热备模式
standby_mode = 'on'

# 主库连接信息
primary_conninfo = 'host=production_host port=5432 user=replicator password=replicator_secure_password application_name=dr_replica'

# 恢复目标时间线
recovery_target_timeline = 'latest'

# 恢复命令（从归档日志恢复）
restore_command = 'cp /var/lib/postgresql/archive/%f %p'

# 触发文件路径
trigger_file = '/var/lib/postgresql/trigger.promote'
```

### 3.3 连接池配置

```ini
[pgbouncer]

# 监听配置
listen_addr = 0.0.0.0
listen_port = 6434
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

# 超时配置（容灾环境标准）
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 5
query_timeout = 30
client_idle_timeout = 600
```

---

## 四、数据同步

### 4.1 复制状态监控

```bash
#!/bin/bash

# 容灾库复制状态监控脚本
DR_HOST="dr_host"
DR_PORT="5435"
DR_USER="yyc3_admin"
DR_DATABASE="yyc3_aify"

monitor_replication() {
    echo "=== DR Replication Status ==="
    echo ""
    
    psql -h $DR_HOST -p $DR_PORT -U $DR_USER -d $DR_DATABASE -c "
        SELECT 
            client_addr,
            state,
            sync_state,
            replay_lag,
            flush_lag,
            write_lag
        FROM pg_stat_replication;
    "
    
    echo ""
    echo "=== Replication Lag ==="
    psql -h $DR_HOST -p $DR_PORT -U $DR_USER -d $DR_DATABASE -c "
        SELECT 
            now() - pg_last_xact_replay_timestamp() AS replication_lag;
    "
}

monitor_replication
```

### 4.2 数据一致性检查

```sql
-- 检查容灾库数据一致性
SELECT 
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;
```

---

## 五、故障转移

### 5.1 自动故障转移

| 步骤 | 操作 | 说明 |
|-----|------|------|
| 1 | 检测主库故障 | 监控系统检测到主库不可达 |
| 2 | 验证故障 | 多次确认主库故障 |
| 3 | 停止应用 | 停止对主库的写操作 |
| 4 | 提升容灾库 | 将容灾库提升为主库 |
| 5.1 | 更新DNS | 将应用请求路由到容灾库 |
| 6 | 恢复服务 | 恢复应用服务 |
| 7 | 通知运维 | 发送故障转移通知 |

### 5.2 手动故障转移

```bash
#!/bin/bash

# 手动故障转移脚本
DR_HOST="dr_host"
DR_PORT="5435"
DR_USER="postgres"

manual_failover() {
    echo "=== Manual Failover to DR ==="
    
    # 1. 停止容灾库的复制进程
    psql -h $DR_HOST -p $DR_PORT -U $DR_USER -c "
        SELECT pg_stop_replication();
    "
    
    # 2. 提升容灾库为主库
    psql -h $DR_HOST -p $DR_PORT -U $DR_USER -c "
        SELECT pg_promote();
    "
    
    # 3. 验证提升成功
    psql -h $DR_HOST -p $DR_PORT -U $DR_USER -c "
        SELECT pg_is_in_recovery();
    "
    
    echo "=== Failover Complete ==="
}

manual_failover
```

---

## 六、恢复流程

### 6.1 恢复流程

| 步骤 | 操作 | 说明 |
|-----|------|------|
| 1 | 评估故障 | 评估主库故障范围和影响 |
| 2 | 启动容灾库 | 启动容灾库服务 |
| 3.1 | 提升容灾库 | 将容灾库提升为主库 |
| 4 | 数据验证 | 验证数据完整性 |
| 5 | 应用切换 | 切换应用连接到容灾库 |
| 6 | 监控验证 | 监控系统运行状态 |
| 7 | 原主库修复 | 修复原主库并配置为从库 |

### 6.2 回切流程

| 步骤 | 操作 | 说明 |
|-----|------|------|
| 1 | 数据同步 | 将容灾库数据同步到原主库 |
| 2 | 配置复制 | 配置原主库为从库 |
| 3 | 验证复制 | 验证复制状态正常 |
| 4.1 | 选择时间窗口 | 选择业务低峰期进行回切 |
| 5 | 停止应用 | 暂停应用服务 |
| 6.1 | 切换回原主库 | 将应用切换回原主库 |
| 7 | 监控验证 | 监控系统运行状态 |

---

## 七、测试验证

### 7.1 定期演练

| 频率 | 测试类型 | 说明 |
|-----|---------|------|
| **每月** | 容灾演练 | 模拟主库故障，切换到容灾库 |
| **每季度** | 全量恢复测试 | 从备份恢复完整数据 |
| **每年** | 灾难恢复测试 | 模拟完整灾难场景 |

### 7.2 演练脚本

```bash
#!/bin/bash

# 容灾演练脚本
演练步骤:
1. 准备阶段
   - 通知相关人员
   - 备份当前数据
   - 记录当前状态

2. 演练阶段
   - 模拟主库故障
   - 切换到容灾库
   - 验证数据完整性
   - 验证应用功能

3. 恢复阶段
   - 切换回原主库
   - 验证数据同步
   - 清理演练数据

4. 总结阶段
   - 记录演练结果
   - 分析问题
   - 优化流程
```

---

## 八、最佳实践

### 8.1 容灾最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **定期演练** | 定期进行容灾演练 | 每月演练 |
| **监控告警** | 监控容灾库状态 | 配置监控告警 |
| **文档完善** | 完善容灾文档 | 维护操作手册 |
| **人员培训** | 培训运维人员 | 定期培训 |

### 8.2 安全最佳实践

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **数据加密** | 容灾数据加密存储 | 启用加密 |
| **访问控制** | 限制容灾库访问 | 配置访问控制 |
| **审计日志** | 记录所有容灾操作 | 启用审计 |
| **定期审计** | 定期审计容灾配置 | 安全审计 |

---

## 九、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [环境管理总览](../README.md)
- [05-备份与恢复](../../05-备份与恢复/)
- [09-高可用与容灾](../../09-高可用与容灾/)
- [02-数据库实例](../../02-数据库实例/)
