# YYC³ PgBouncer 用户列表配置文件

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file userlist.txt
@description PgBouncer用户列表配置文件
@author YYC³团队
@version 1.0.0

---

## 一、配置概述

### 1.1 配置目标

本配置文件定义YYC³项目PgBouncer连接池的用户列表，实现以下目标：

| 目标 | 说明 | 配置策略 |
|-----|------|---------|
| **高安全** | 使用强密码，防止未授权访问 | 使用scram-sha-256哈希 |
| **高隔离** | 不同环境使用不同用户 | 用户分离策略 |
| **高审计** | 记录所有用户访问 | 用户访问日志 |
| **高可控** | 细粒度权限控制 | 角色分离原则 |

### 1.2 用户类型

| 类型 | 说明 | 适用场景 |
|-----|------|---------|
| **管理用户** | PgBouncer管理员 | 管理PgBouncer连接池 |
| **统计用户** | 只读统计用户 | 监控和统计 |
| **连接池用户** | 应用连接池用户 | 应用连接 |
| **监控用户** | 监控系统用户 | 自动化监控 |

---

## 二、用户列表格式

### 2.1 格式说明

userlist.txt文件格式：
```
"username" "password_hash"
```

其中password_hash可以是：
- MD5密码哈希：`md5hash`
- SCRAM-SHA-256密码哈希：`scram-sha-256:iteration:salt:StoredKey:ServerKey`

---

## 三、用户密码生成

### 3.1 生成SCRAM-SHA-256密码

```bash
# 使用pgbouncer工具生成密码
pgbouncer -a /etc/pgbouncer/userlist.txt -u yyc3_pool

# 或者使用PostgreSQL工具
psql -c "SELECT 'yyc3_pool', passwd FROM pg_shadow WHERE usename='yyc3_pool';"
```

### 3.2 生成MD5密码

```bash
# 使用md5sum生成密码
echo -n "yyc3_pool_your_password" | md5sum

# 输出格式：md5hash
```

---

## 四、用户配置示例

### 4.1 管理用户

```conf
# PgBouncer管理员
"yyc3_admin" "scram-sha-256:4096:salt:StoredKey:ServerKey"
```

| 用户名 | 权限 | 说明 |
|-------|------|------|
| yyc3_admin | 管理员 | 管理PgBouncer连接池 |

### 4.2 统计用户

```conf
# 统计用户
"yyc3_stats" "scram-sha-256:4096:salt:StoredKey:ServerKey"
```

| 用户名 | 权限 | 说明 |
|-------|------|------|
| yyc3_stats | 只读 | 查看统计信息 |

### 4.3 连接池用户

```conf
# 连接池用户（生产环境）
"yyc3_pool" "scram-sha-256:4096:salt:StoredKey:ServerKey"

# 连接池用户（开发环境）
"yyc3_pool_dev" "scram-sha-256:4096:salt:StoredKey:ServerKey"

# 连接池用户（预发布环境）
"yyc3_pool_staging" "scram-sha-256:4096:salt:StoredKey:ServerKey"
```

| 用户名 | 权限 | 环境 | 说明 |
|-------|------|------|------|
| yyc3_pool | 应用连接 | 生产 | 生产环境连接池 |
| yyc3_pool_dev | 应用连接 | 开发 | 开发环境连接池 |
| yyc3_pool_staging | 应用连接 | 预发布 | 预发布环境连接池 |

### 4.4 监控用户

```conf
# 监控用户
"yyc3_monitor" "scram-sha-256:4096:salt:StoredKey:ServerKey"
```

| 用户名 | 权限 | 说明 |
|-------|------|------|
| yyc3_monitor | 只读 | 自动化监控 |

---

## 五、密码管理

### 5.1 密码策略

| 策略 | 要求 | 说明 |
|-----|------|------|
| **长度** | 至少16字符 | 增强安全性 |
| **复杂度** | 包含大小写、数字、特殊字符 | 防止暴力破解 |
| **定期更换** | 每90天更换 | 降低安全风险 |
| **不重复使用** | 不重复使用旧密码 | 防止历史密码攻击 |

### 5.2 密码生成脚本

```bash
#!/bin/bash

# 生成随机密码
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-24
}

# 生成SCRAM-SHA-256密码哈希
generate_scram_hash() {
    local password=$1
    local username=$2
    
    psql -c "SELECT 'scram-sha-256' || ':' || 
                    salt || ':' || 
                    storedkey || ':' || 
                    serverkey 
             FROM pg_shadow 
             WHERE usename = '$username';"
}

# 使用示例
PASSWORD=$(generate_password)
echo "Generated password: $PASSWORD"
```

---

## 六、配置验证

### 6.1 配置检查

```bash
# 检查userlist.txt格式
pgbouncer -R /etc/pgbouncer/pgbouncer.ini

# 检查用户列表
cat /etc/pgbouncer/userlist.txt

# 重新加载配置
psql -h localhost -p 6432 -U yyc3_admin -d pgbouncer -c "RELOAD;"
```

### 6.2 连接测试

```bash
# 测试管理员连接
psql -h localhost -p 6432 -U yyc3_admin -d pgbouncer -c "SHOW STATS;"

# 测试统计用户连接
psql -h localhost -p 6432 -U yyc3_stats -d pgbouncer -c "SHOW POOLS;"

# 测试连接池用户连接
psql -h localhost -p 6432 -U yyc3_pool -d yyc3_aify -c "SELECT 1;"
```

---

## 七、安全最佳实践

### 7.1 密码安全

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **使用强哈希** | 使用SCRAM-SHA-256 | 避免使用MD5 |
| **定期更换密码** | 每90天更换 | 降低安全风险 |
| **密码不共享** | 每个用户独立密码 | 防止权限扩散 |
| **使用密钥管理** | 使用密钥管理服务 | 避免密码泄露 |

### 7.2 访问控制

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **限制管理用户** | 只授予必要的权限 | 最小权限原则 |
| **IP白名单** | 限制允许的IP地址 | 配置pg_hba.conf |
| **启用审计** | 记录所有访问 | 启用日志记录 |
| **定期审计** | 定期检查用户列表 | 发现异常用户 |

---

## 八、故障处理

### 8.1 常见问题

#### 问题1: 用户认证失败

**症状**: 无法使用用户名密码登录

**解决方案**:
```bash
# 1. 检查userlist.txt格式
cat /etc/pgbouncer/userlist.txt

# 2. 检查用户名是否正确
grep "yyc3_pool" /etc/pgbouncer/userlist.txt

# 3. 重新生成密码哈希
pgbouncer -a /etc/pgbouncer/userlist.txt -u yyc3_pool

# 4. 重新加载配置
psql -h localhost -p 6432 -U yyc3_admin -d pgbouncer -c "RELOAD;"
```

#### 问题2: 权限不足

**症状**: 用户无法访问数据库

**解决方案**:
```sql
-- 1. 授予连接权限
GRANT CONNECT ON DATABASE yyc3_aify TO yyc3_pool;

-- 2. 授予schema权限
GRANT USAGE ON SCHEMA core TO yyc3_pool;

-- 3. 授予表权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO yyc3_pool;

-- 4. 授予序列权限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO yyc3_pool;
```

---

## 九、相关文档

- [YYC³数据库构建标准](../../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [连接池配置说明](./README.md)
- [PgBouncer官方文档](https://www.pgbouncer.org/config.html)
- [08-安全管理](../../08-安全管理/)
