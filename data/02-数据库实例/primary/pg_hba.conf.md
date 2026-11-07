# YYC³ PostgreSQL 客户端认证配置文件

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file pg_hba.conf
@description PostgreSQL客户端认证配置文件
@author YYC³团队
@version 1.0.0

---

## 一、配置概述

### 1.1 配置目标

本配置文件定义YYC³项目PostgreSQL主库的客户端认证策略，实现以下目标：

| 目标 | 说明 | 配置策略 |
|-----|------|---------|
| **高安全** | 限制访问，防止未授权访问 | IP白名单、强认证 |
| **高可用** | 支持多环境访问 | 多环境配置、灵活认证 |
| **高审计** | 记录所有访问 | 连接日志、审计日志 |
| **高可控** | 细粒度权限控制 | 角色分离、最小权限 |

### 1.2 认证方法

| 方法 | 说明 | 适用场景 |
|-----|------|---------|
| **trust** | 无条件信任 | 本地超级用户 |
| **md5** | MD5密码哈希 | 一般用户连接 |
| **scram-sha-256** | SCRAM-SHA-256认证 | 推荐的安全认证 |
| **peer** | 操作系统用户认证 | 本地socket连接 |
| **cert** | 客户端证书认证 | SSL连接 |
| **reject** | 拒绝连接 | 默认拒绝策略 |

---

## 二、本地连接配置

### 2.1 本地Socket连接

```conf
# 本地socket连接（PostgreSQL超级用户）
local   all             postgres                                peer

# 本地socket连接（YYC³应用用户）
local   yyc3_dev        yyc3_dev                                md5
local   yyc3_aify       yyc3_aify                               md5
local   yyc3_staging    yyc3_staging                            md5
local   yyc3_test       yyc3_test                               md5

# 本地socket连接（监控用户）
local   all             yyc3_monitor                             md5
local   all             yyc3_stats                               md5
```

| 连接类型 | 数据库 | 用户 | 认证方法 | 说明 |
|---------|-------|------|---------|------|
| local | all | postgres | peer | 信任本地超级用户 |
| local | yyc3_dev | yyc3_dev | md5 | 开发环境数据库 |
| local | yyc3_aify | yyc3_aify | md5 | AIFY数据库 |
| local | yyc3_staging | yyc3_staging | md5 | 预发布环境数据库 |
| local | yyc3_test | yyc3_test | md5 | 测试数据库 |

---

## 三、IPv4本地连接配置

### 3.1 本地主机连接

```conf
# 本地主机连接（所有数据库，所有用户）
host    all             all             127.0.0.1/32            md5

# 本地主机连接（PostgreSQL超级用户）
host    all             postgres        127.0.0.1/32            trust
```

| 连接类型 | 数据库 | 用户 | IP地址 | 认证方法 | 说明 |
|---------|-------|------|-------|---------|------|
| host | all | all | 127.0.0.1/32 | md5 | 本地回环地址 |
| host | all | postgres | 127.0.0.1/32 | trust | 信任本地超级用户 |

---

## 四、IPv4复制连接配置

### 4.1 流复制连接

```conf
# 复制用户（从从库连接）
host    replication     replicator      10.0.1.0/24            md5
host    replication     replicator      10.0.2.0/24            md5
host    replication     replicator      10.0.3.0/24            md5
```

| 连接类型 | 数据库 | 用户 | IP地址 | 认证方法 | 说明 |
|---------|-------|------|-------|---------|------|
| host | replication | replicator | 10.0.1.0/24 | md5 | 生产中心网络 |
| host | replication | replicator | 10.0.2.0/24 | md5 | 容灾中心网络 |
| host | replication | replicator | 10.0.3.0/24 | md5 | 备份服务器网络 |

---

## 五、IPv4应用连接配置

### 5.1 开发环境连接

```conf
# 开发环境
host    yyc3_dev        yyc3_dev        10.0.1.0/24            md5
host    yyc3_aify       yyc3_aify       10.0.1.0/24            md5
host    yyc3_test       yyc3_test       10.0.1.0/24            md5
```

### 5.2 预发布环境连接

```conf
# 预发布环境
host    yyc3_staging    yyc3_staging    10.0.1.0/24            md5
host    yyc3_aify_staging yyc3_aify_staging 10.0.1.0/24      md5
```

### 5.3 生产环境连接

```conf
# 生产环境
host    yyc3_aify       yyc3_aify       10.0.1.0/24            md5
host    yyc3_music       yyc3_music       10.0.1.0/24            md5
host    yyc3_mana        yyc3_mana        10.0.1.0/24            md5
```

### 5.4 连接池连接

```conf
# PgBouncer连接池
host    all             yyc3_pool       127.0.0.1/32            md5
host    all             yyc3_pool       10.0.1.0/24            md5
```

| 数据库 | 用户 | IP地址 | 认证方法 | 说明 |
|-------|------|-------|---------|------|
| yyc3_aify | yyc3_aify | 10.0.1.0/24 | md5 | AIFY生产数据库 |
| yyc3_music | yyc3_music | 10.0.1.0/24 | md5 | MUSIC生产数据库 |
| yyc3_mana | yyc3_mana | 10.0.1.0/24 | md5 | MANA生产数据库 |
| all | yyc3_pool | 10.0.1.0/24 | md5 | 连接池用户 |

---

## 六、IPv6连接配置

### 6.1 IPv6本地连接

```conf
# IPv6本地连接
host    all             all             ::1/128                 md5
```

| 连接类型 | 数据库 | 用户 | IP地址 | 认证方法 | 说明 |
|---------|-------|------|-------|---------|------|
| host | all | all | ::1/128 | md5 | IPv6本地回环地址 |

---

## 七、SSL连接配置

### 7.1 SSL连接（生产环境推荐）

```conf
# SSL连接（生产环境）
# hostssl all             all             0.0.0.0/0               md5
# hostssl all             all             ::/0                    md5

# SSL连接要求客户端证书
# hostssl all             all             0.0.0.0/0               cert
# hostssl all             all             ::/0                    cert
```

| 连接类型 | 数据库 | 用户 | IP地址 | 认证方法 | 说明 |
|---------|-------|------|-------|---------|------|
| hostssl | all | all | 0.0.0.0/0 | md5 | SSL加密连接（可选）|
| hostssl | all | all | ::/0 | cert | SSL证书认证（可选）|

### 7.2 SSL配置

```ini
# postgresql.conf SSL配置
ssl = on
ssl_cert_file = '/etc/postgresql/15/main/server.crt'
ssl_key_file = '/etc/postgresql/15/main/server.key'
ssl_ca_file = '/etc/postgresql/15/main/root.crt'
```

---

## 八、拒绝策略配置

### 8.1 默认拒绝

```conf
# 拒绝所有其他连接
host    all             all             0.0.0.0/0               reject
host    all             all             ::/0                    reject
```

| 连接类型 | 数据库 | 用户 | IP地址 | 认证方法 | 说明 |
|---------|-------|------|-------|---------|------|
| host | all | all | 0.0.0.0/0 | reject | 拒绝所有IPv4连接 |
| host | all | all | ::/0 | reject | 拒绝所有IPv6连接 |

---

## 九、配置验证

### 9.1 配置检查

```bash
# 检查pg_hba.conf语法
pg_hba_check /etc/postgresql/15/main/pg_hba.conf

# 查看当前配置
cat /etc/postgresql/15/main/pg_hba.conf

# 重新加载配置
pg_ctl reload -D /var/lib/postgresql/15/main
```

### 9.2 连接测试

```bash
# 测试本地连接
psql -h localhost -U postgres -d postgres -c "SELECT 1;"

# 测试应用连接
psql -h localhost -U yyc3_aify -d yyc3_aify -c "SELECT 1;"

# 测试复制连接
psql -h localhost -U replicator -d replication -c "IDENTIFY_SYSTEM;"

# 测试SSL连接
psql -h localhost -U yyc3_aify -d yyc3_aify -c "SELECT 1;" -h localhost --sslmode=require
```

---

## 十、安全最佳实践

### 10.1 认证安全

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **使用强认证** | 使用scram-sha-256而非md5 | 修改认证方法 |
| **IP白名单** | 限制允许的IP地址 | 配置IP地址范围 |
| **SSL加密** | 启用SSL加密连接 | 配置SSL证书 |
| **密码策略** | 使用强密码 | 定期更换密码 |

### 10.2 访问控制

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **最小权限** | 只授予必要的权限 | 使用角色分离 |
| **网络隔离** | 不同环境网络隔离 | 配置VLAN/VPC |
| **连接限制** | 限制最大连接数 | 配置max_connections |
| **审计日志** | 记录所有访问 | 启用日志记录 |

---

## 十一、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [主库配置说明](./postgresql.conf.md)
- [PostgreSQL官方文档](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [08-安全管理](../../08-安全管理/)
