# YYC³(YanYuCloudCube)环境管理

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## @file README.md
@description YYC³项目数据库环境管理总览文档
@author YYC³团队
@version 1.0.0

---

## 一、概述

### 1.1 环境管理目标

YYC³项目采用多环境管理策略，支持从开发到生产的完整生命周期管理：

| 环境 | 端口 | 用途 | 连接数限制 |
|-----|------|------|-----------|
| **开发环境** | 5433 | 支持快速开发和调试 | 200 |
| **预发布环境** | 5434 | 模拟生产环境进行测试 | 500 |
| **生产环境** | 5432 | 高性能、高可用的生产环境 | 1000 |
| **容灾环境** | 5435 | 异地容灾，确保业务连续性 | 500 |

### 1.2 环境管理原则

| 原则 | 说明 | 实施方法 |
|-----|------|---------|
| **环境隔离** | 各环境相互独立，避免干扰 | 独立的数据库实例和配置 |
| **配置统一** | 统一的配置管理方式 | 标准化的配置文件格式 |
| **数据安全** | 敏感数据加密存储 | 环境变量加密 |
| **可追溯性** | 环境变更可追溯 | 配置版本控制 |
| **自动化** | 支持自动化部署和管理 | CI/CD集成 |

---

## 二、环境架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      YYC³环境架构                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                             │
│  开发环境                预发布环境               生产环境       │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐       │
│  │ Dev DB  │           │Staging  │           │Primary  │       │
│  │ :5433   │           │  DB     │           │  DB     │       │
│  │PgBouncer│           │ :5434   │           │ :5432   │       │
│  │  :6432  │           │PgBouncer│           │PgBouncer│       │
│  └─────────┘           │  :6433  │           │  :6432  │       │
│                         └─────────┘           └─────────┘       │
│                                                         │        │
│                    容灾环境                  │        │
│                    ┌─────────┐              │        │
│                    │ DR DB   │◄─────────────┘        │
│                    │ :5435   │   流复制               │
│                    │PgBouncer│                        │
│                    │  :6434  │                        │
│                    └─────────┘                        │
│                                                        │
│                    配置管理 (Git)                        │
│                    ┌─────────┐                         │
│                    │ .env.*  │                         │
│                    │配置文件  │                         │
│                    └─────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流向

```
开发 → 预发布 → 生产 → 容灾
  ↓        ↓        ↓        ↓
 本地测试   压力测试   正式运行   灾难恢复
```

---

## 三、环境列表

### 3.1 开发环境

| 项目 | 说明 | 文档 |
|-----|------|------|
| **连接池配置** | 开发环境连接池配置 | [development/connection-pool.md](development/connection-pool.md) |
| **环境变量** | 开发环境配置文件 | [development/.env.development](development/.env.development) |
| **种子数据** | 开发测试数据 | [development/seed-data/](development/seed-data/) |

### 3.2 预发布环境

| 项目 | 说明 | 文档 |
|-----|------|------|
| **连接池配置** | 预发布环境连接池配置 | [staging/connection-pool.md](staging/connection-pool.md) |
| **环境变量** | 预发布环境配置文件 | [staging/.env.staging](staging/.env.staging) |
| **故障转移配置** | 故障转移配置 | [staging/failover-config.yaml](staging/failover-config.yaml) |

### 3.3 生产环境

| 项目 | 说明 | 文档 |
|-----|------|------|
| **连接池配置** | 生产环境连接池配置 | [production/connection-pool.md](production/connection-pool.md) |
| **环境变量** | 生产环境配置文件 | [production/.env.production](production/.env.production) |
| **故障转移配置** | 故障转移配置 | [production/failover-config.yaml](production/failover-config.yaml) |

### 3.4 容灾环境

| 项目 | 说明 | 文档 |
|-----|------|------|
| **容灾配置** | 容灾环境配置 | [disaster-recovery/README.md](disaster-recovery/README.md) |
| **环境变量** | 容灾环境配置文件 | [disaster-recovery/.env.dr](disaster-recovery/.env.dr) |

---

## 四、配置管理

### 4.1 配置文件结构

```
01-环境管理/
├── development/
│   ├── .env.development
│   ├── connection-pool.md
│   └── seed-data/
│       ├── 01-users.sql
│       └── 02-permissions.sql
├── staging/
│   ├── .env.staging
│   ├── connection-pool.md
│   └── failover-config.yaml
├── production/
│   ├── .env.production
│   ├── connection-pool.md
│   └── failover-config.yaml
├── disaster-recovery/
│   ├── .env.dr
│   └── README.md
└── README.md
```

### 4.2 环境变量规范

| 变量名 | 说明 | 示例 |
|-------|------|------|
| `PG_HOST` | 数据库主机 | localhost |
| `PG_PORT` | 数据库端口 | 5432 |
| `PG_DATABASE` | 数据库名称 | yyc3_aify |
| `PG_USER` | 数据库用户 | yyc3_aify |
| `PG_PASSWORD` | 数据库密码 | ******** |
| `PG_POOL_HOST` | 连接池主机 | localhost |
| `PG_POOL_PORT` | 连接池端口 | 6432 |

---

## 五、环境切换

### 5.1 切换方法

```bash
# 切换到开发环境
export ENV=development
source .env.development

# 切换到预发布环境
export ENV=staging
source .env.staging

# 切换到生产环境
export ENV=production
source .env.production

# 切换到容灾环境
export ENV=dr
source .env.dr
```

### 5.2 连接测试

```bash
# 测试开发环境连接
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -c "SELECT version();"

# 测试预发布环境连接
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -c "SELECT version();"

# 测试生产环境连接
psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -c "SELECT version();"
```

---

## 六、最佳实践

### 6.1 环境管理最佳实践

| 最佳实践 | 说明 | 实施方法 |
|---------|------|---------|
| **环境隔离** | 确保各环境相互独立 | 使用独立的数据库实例 |
| **配置版本控制** | 所有配置纳入版本控制 | Git管理配置文件 |
| **敏感信息加密** | 加密存储敏感信息 | 使用密钥管理服务 |
| **定期备份** | 定期备份各环境数据 | 自动化备份脚本 |
| **环境一致性** | 保持环境配置一致性 | 使用配置模板 |

### 6.2 安全最佳实践

| 安全建议 | 说明 | 实施方法 |
|---------|------|---------|
| **最小权限原则** | 只授予必要的权限 | 精细化权限控制 |
| **访问控制** | 限制数据库访问 | 配置防火墙规则 |
| **审计日志** | 记录所有数据库操作 | 启用审计日志 |
| **定期审计** | 定期检查环境配置 | 安全审计脚本 |
| **应急响应** | 准备应急响应预案 | 灾难恢复演练 |

---

## 七、相关文档

- [YYC³数据库构建标准](../YYC³-数据库构建标准-统一性框架与推进计划.md)
- [02-数据库实例](../02-数据库实例/)
- [05-备份与恢复](../05-备份与恢复/)
- [09-高可用与容灾](../09-高可用与容灾/)
- [开发环境连接池配置](development/connection-pool.md)
- [预发布环境连接池配置](staging/connection-pool.md)
- [生产环境连接池配置](production/connection-pool.md)
- [容灾环境配置](disaster-recovery/README.md)
