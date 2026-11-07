# YYC³ PostgreSQL 用户名映射配置文件

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file pg_ident.conf
@description PostgreSQL用户名映射配置文件
@author YYC³团队
@version 1.0.0

---

## 一、配置概述

### 1.1 配置目标

本配置文件定义YYC³项目PostgreSQL主库的用户名映射策略，实现以下目标：

| 目标 | 说明 | 配置策略 |
|-----|------|---------|
| **系统对接** | 映射操作系统用户到数据库用户 | 使用peer认证 |
| **应用隔离** | 不同应用使用不同用户 | 用户映射分离 |
| **安全控制** | 限制用户访问权限 | 最小权限原则 |
| **便于管理** | 统一的用户命名规范 | 规范化命名 |

### 1.2 映射类型

| 类型 | 说明 | 适用场景 |
|-----|------|---------|
| **系统用户映射** | 操作系统用户映射到数据库用户 | 本地socket连接 |
| **应用用户映射** | 应用服务用户映射到数据库用户 | 应用连接 |
| **复制用户映射** | 复制服务用户映射到数据库用户 | 流复制连接 |

---

## 二、系统用户映射

### 2.1 PostgreSQL系统用户

```conf
# PostgreSQL系统用户映射
pgmap    postgres         postgres
```

| 映射名称 | 系统用户 | 数据库用户 | 说明 |
|---------|---------|-----------|------|
| pgmap | postgres | postgres | PostgreSQL超级用户 |

---

## 三、YYC³应用用户映射

### 3.1 开发环境用户

```conf
# YYC³应用用户映射（开发环境）
pgmap    yyc3_dev         yyc3_dev
pgmap    yyc3_aify        yyc3_aify
pgmap    yyc3_staging     yyc3_staging
pgmap    yyc3_test        yyc3_test
```

| 映射名称 | 系统用户 | 数据库用户 | 环境 |
|---------|---------|-----------|------|
| pgmap | yyc3_dev | yyc3_dev | 开发环境 |
| pgmap | yyc3_aify | yyc3_aify | 开发环境 |
| pgmap | yyc3_staging | yyc3_staging | 预发布环境 |
| pgmap | yyc3_test | yyc3_test | 测试环境 |

### 3.2 生产环境用户

```conf
# YYC³应用用户映射（生产环境）
pgmap    yyc3_aify        yyc3_aify
pgmap    yyc3_music        yyc3_music
pgmap    yyc3_mana         yyc3_mana
```

| 映射名称 | 系统用户 | 数据库用户 | 应用 |
|---------|---------|-----------|------|
| pgmap | yyc3_aify | yyc3_aify | AIFY应用 |
| pgmap | yyc3_music | yyc3_music | MUSIC应用 |
| pgmap | yyc3_mana | yyc3_mana | MANA应用 |

---

## 四、连接池用户映射

### 4.1 PgBouncer用户

```conf
# PgBouncer用户映射
pgmap    pgbouncer        yyc3_pool
```

| 映射名称 | 系统用户 | 数据库用户 | 说明 |
|---------|---------|-----------|------|
| pgmap | pgbouncer | yyc3_pool | PgBouncer连接池用户 |

---

## 五、复制用户映射

### 5.1 流复制用户

```conf
# 复制用户映射
pgmap    replicator       replicator
```

| 映射名称 | 系统用户 | 数据库用户 | 说明 |
|---------|---------|-----------|------|
| pgmap | replicator | replicator | 流复制用户 |

---

## 六、监控用户映射

### 6.1 监控用户

```conf
# 监控用户映射
pgmap    yyc3_monitor     yyc3_monitor
pgmap    yyc3_stats       yyc3_stats
```

| 映射名称 | 系统用户 | 数据库用户 | 说明 |
|---------|---------|-----------|------|
| pgmap | yyc3_monitor | yyc3_monitor | 监控用户 |
| pgmap | yyc3_stats | yyc3_stats | 统计用户 |

---

## 七、配置验证

### 7.1 配置检查

```bash
# 检查pg_ident.conf语法
pg_ident_check /etc/postgresql/15/main/pg_ident.conf

# 查看当前配置
cat /etc/postgresql/15/main/pg_ident.conf

# 测试用户映射
psql -h localhost -U postgres -d postgres -c "SELECT current_user, session_user;"
```

### 7.2 连接测试

```bash
# 测试peer认证连接
sudo -u yyc3_aify psql -d yyc3_aify -c "SELECT 1;"

# 测试应用用户连接
sudo -u yyc3_music psql -d yyc3_music -c "SELECT 1;"

# 测试复制用户连接
sudo -u replicator psql -d replication -c "IDENTIFY_SYSTEM;"
```

---

## 八、安全最佳实践

### 8.1 用户映射安全

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **最小权限** | 只授予必要的权限 | 使用角色分离 |
| **用户隔离** | 不同应用使用不同用户 | 用户映射分离 |
| **定期审计** | 定期审计用户映射 | 检查异常映射 |
| **密码管理** | 使用强密码 | 定期更换密码 |

### 8.2 访问控制

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **网络隔离** | 不同环境网络隔离 | 配置VLAN/VPC |
| **IP白名单** | 限制允许的IP地址 | 配置pg_hba.conf |
| **SSL加密** | 启用SSL加密连接 | 配置SSL证书 |
| **连接限制** | 限制最大连接数 | 配置max_connections |

---

## 九、故障处理

### 9.1 常见问题

#### 问题1: 用户映射失败

**症状**: 无法通过peer认证连接

**解决方案**:
```bash
# 1. 检查系统用户是否存在
id yyc3_aify

# 2. 检查数据库用户是否存在
psql -U postgres -c "\du yyc3_aify"

# 3. 检查pg_ident.conf配置
cat /etc/postgresql/15/main/pg_ident.conf

# 4. 重新加载配置
pg_ctl reload -D /var/lib/postgresql/15/main
```

#### 问题2: 权限不足

**症状**: 用户无法访问数据库

**解决方案**:
```sql
-- 1. 授予连接权限
GRANT CONNECT ON DATABASE yyc3_aify TO yyc3_aify;

-- 2. 授予schema权限
GRANT USAGE ON SCHEMA core TO yyc3_aify;

-- 3. 授予表权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO yyc3_aify;

-- 4. 授予序列权限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO yyc3_aify;
```

---

## 十、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [主库配置说明](./postgresql.conf.md)
- [客户端认证配置](./pg_hba.conf.md)
- [PostgreSQL官方文档](https://www.postgresql.org/docs/current/auth-username-maps.html)
- [08-安全管理](../../08-安全管理/)
