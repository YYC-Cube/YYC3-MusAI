# @file YYC³ 数据库标准化规范化架构详情完整版
# @description YYC³ 数据库标准化规范化架构详情完整版 - 基于大数据分析的完整架构设计
# @author YYC³ Team
# @version 1.0.0
# @created 2026-02-21
# @updated 2026-02-21
# @copyright Copyright (c) 2026 YYC³
# @license MIT

# YYC³ 数据库标准化规范化架构详情完整版

> **YanYuCloudCube**
> **标语**：言启象限 | 语枢未来
> **Words Initiate Quadrants, Language Serves as Core for Future**
> **标语**：万象归元于云枢 | 深栈智启新纪元
> **All things converge in cloud pivot; Deep stacks ignite a new era of intelligence**

---

**文档版本**：1.0.0
**文档类型**：数据库架构设计
**文档作者**：YYC³ Team
**最后更新**：2026-02-21
**适用环境**：YYC3 全平台

---

## 目录

1. [架构概述](#1-架构概述)
2. [大数据分析基础](#2-大数据分析基础)
3. [数据库标准化规范](#3-数据库标准化规范)
4. [数据库架构设计](#4-数据库架构设计)
5. [数据模型设计](#5-数据模型设计)
6. [性能优化策略](#6-性能优化策略)
7. [安全与合规](#7-安全与合规)
8. [监控与运维](#8-监控与运维)
9. [数据治理](#9-数据治理)
10. [最佳实践](#10-最佳实践)

---

## 1. 架构概述

### 1.1 架构目标

基于大数据分析的 YYC³ 数据库标准化规范化架构旨在实现：

- **高可用性**：99.99% SLA，多可用区部署，自动故障转移
- **高性能**：亚秒级响应，智能缓存，查询优化
- **高扩展性**：弹性伸缩，微服务架构，云原生
- **高安全性**：零信任架构，深度防御，合规认证
- **高智能性**：自适应学习，AutoML，智能自动化

### 1.2 架构原则

#### 1.2.1 标准化原则

| 原则 | 描述 | 实施方法 |
|------|------|----------|
| 命名规范 | 统一的命名约定 | 数据库、表、字段、索引命名规范 |
| 数据类型规范 | 标准化的数据类型 | 统一使用标准数据类型，避免冗余 |
| 约束规范 | 完整的约束定义 | 主键、外键、唯一、检查约束 |
| 索引规范 | 合理的索引设计 | 基于查询模式设计索引 |

#### 1.2.2 规范化原则

| 范式 | 描述 | 适用场景 |
|------|------|----------|
| 第一范式 (1NF) | 属性不可再分 | 所有表必须满足 |
| 第二范式 (2NF) | 消除部分依赖 | 大多数表应满足 |
| 第三范式 (3NF) | 消除传递依赖 | 核心业务表应满足 |
| BCNF | 消除主属性依赖 | 高度规范化场景 |
| 第四范式 (4NF) | 消除多值依赖 | 特殊场景 |

#### 1.2.3 反范式化原则

| 场景 | 描述 | 实施方法 |
|------|------|----------|
| 性能优化 | 减少连接查询 | 冗余字段、预计算字段 |
| 统计分析 | 加速聚合查询 | 物化视图、汇总表 |
| 读写分离 | 优化读取性能 | 主从复制、读写分离 |

### 1.3 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application Layer)                │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │yyc3_aifl │yyc3_music│yyc3_mana │  其他     │            │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┘            │
└───────┼──────────┼──────────┼──────────┼────────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                  数据访问层 (Data Access Layer)              │
│              (ORM + 连接池 + 缓存)                          │
└─────────────────────────────────────────────────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                  数据库层 (Database Layer)                   │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │PostgreSQL│  Redis   │Elasticsearch│ 其他  │            │
│  │  15.x    │  8.x     │   8.x     │          │            │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┘            │
└───────┼──────────┼──────────┼──────────┼────────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                  存储层 (Storage Layer)                      │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │  本地SSD │   NAS    │  云存储   │  其他    │            │
│  │  NVMe    │  NFS/SMB │   S3     │          │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 大数据分析基础

### 2.1 数据量分析

#### 2.1.1 数据增长预测

| 时间范围 | 数据量 | 增长率 | 存储需求 |
|---------|--------|--------|----------|
| 当前 | 1 GB | - | 10 GB |
| 3 个月 | 5 GB | 400% | 50 GB |
| 6 个月 | 20 GB | 300% | 200 GB |
| 12 个月 | 100 GB | 400% | 1 TB |
| 24 个月 | 500 GB | 400% | 5 TB |

#### 2.1.2 数据分布分析

| 数据类型 | 占比 | 增长速度 | 访问频率 |
|---------|------|----------|----------|
| 用户数据 | 10% | 中 | 高 |
| 业务数据 | 40% | 高 | 高 |
| 日志数据 | 30% | 高 | 低 |
| 缓存数据 | 15% | 中 | 极高 |
| 临时数据 | 5% | 低 | 低 |

### 2.2 查询模式分析

#### 2.2.1 查询类型分布

| 查询类型 | 占比 | 平均响应时间 | 优化优先级 |
|---------|------|-------------|-----------|
| 简单查询 (SELECT) | 60% | 10ms | 中 |
| 复杂查询 (JOIN) | 20% | 100ms | 高 |
| 聚合查询 (GROUP BY) | 10% | 500ms | 高 |
| 写入操作 (INSERT/UPDATE) | 8% | 20ms | 中 |
| 删除操作 (DELETE) | 2% | 30ms | 低 |

#### 2.2.2 热点查询分析

| 查询模式 | 频率 | 响应时间 | 优化建议 |
|---------|------|----------|----------|
| 用户登录验证 | 1000次/分钟 | 5ms | 缓存优化 |
| 业务数据查询 | 500次/分钟 | 50ms | 索引优化 |
| 统计报表生成 | 10次/小时 | 2000ms | 物化视图 |
| 日志查询 | 100次/分钟 | 100ms | 分区优化 |

### 2.3 性能基准分析

#### 2.3.1 当前性能指标

| 指标 | 当前值 | 目标值 | 差距 |
|------|--------|--------|------|
| 平均响应时间 | 50ms | 20ms | 60% |
| 95% 响应时间 | 200ms | 100ms | 50% |
| 吞吐量 | 1000 TPS | 5000 TPS | 80% |
| 缓存命中率 | 70% | 95% | 26% |
| 连接池利用率 | 80% | 60% | -33% |

#### 2.3.2 性能瓶颈分析

| 瓶颈类型 | 影响 | 原因 | 解决方案 |
|---------|------|------|----------|
| 索引缺失 | 40% | 查询慢 | 创建合适索引 |
| 连接数过多 | 25% | 资源竞争 | 连接池优化 |
| 锁竞争 | 20% | 并发低 | 事务优化 |
| 磁盘I/O | 10% | 响应慢 | SSD优化 |
| 内存不足 | 5% | 缓存低 | 内存扩容 |

---

## 3. 数据库标准化规范

### 3.1 命名规范

#### 3.1.1 数据库命名

| 对象 | 命名规则 | 示例 | 说明 |
|------|---------|------|------|
| 数据库 | yyc3_{业务域} | yyc3_dev, yyc3_aify | 小写，下划线分隔 |
| Schema | {业务模块} | sys_management, biz_core | 小写，下划线分隔 |
| 表 | {实体名称} | users, orders | 小写，复数形式 |
| 字段 | {属性名称} | user_id, created_at | 小写，下划线分隔 |
| 主键 | {表名}_pkey | users_pkey | 表名 + _pkey |
| 外键 | {表名}_{引用表}_fkey | orders_users_fkey | 表名 + 引用表 + _fkey |
| 索引 | idx_{表名}_{字段} | idx_users_email | idx + 表名 + 字段 |
| 唯一索引 | uk_{表名}_{字段} | uk_users_email | uk + 表名 + 字段 |

#### 3.1.2 数据类型规范

| 数据类型 | PostgreSQL | 用途 | 示例 |
|---------|-----------|------|------|
| 主键 | UUID | 唯一标识 | uuid_generate_v4() |
| 字符串 | VARCHAR(n) | 短文本 | VARCHAR(255) |
| 长文本 | TEXT | 长文本 | TEXT |
| 整数 | INTEGER | 整数 | INTEGER |
| 大整数 | BIGINT | 大整数 | BIGINT |
| 小数 | DECIMAL(p,s) | 精确小数 | DECIMAL(10,2) |
| 浮点数 | DOUBLE PRECISION | 近似小数 | DOUBLE PRECISION |
| 布尔值 | BOOLEAN | 布尔值 | BOOLEAN |
| 日期时间 | TIMESTAMP WITH TIME ZONE | 时间戳 | TIMESTAMP WITH TIME ZONE |
| JSON | JSONB | JSON 数据 | JSONB |
| 数组 | ARRAY | 数组 | TEXT[] |
| 枚举 | ENUM | 枚举 | VARCHAR(20) + CHECK |

#### 3.1.3 字段命名规范

| 字段类型 | 命名规则 | 示例 | 说明 |
|---------|---------|------|------|
| 主键 | id | id | UUID 类型 |
| 外键 | {引用表}_id | user_id | UUID 类型 |
| 名称 | name | user_name | VARCHAR 类型 |
| 描述 | description | product_description | TEXT 类型 |
| 状态 | status | order_status | VARCHAR 类型 |
| 类型 | type | user_type | VARCHAR 类型 |
| 创建时间 | created_at | created_at | TIMESTAMP 类型 |
| 更新时间 | updated_at | updated_at | TIMESTAMP 类型 |
| 删除时间 | deleted_at | deleted_at | TIMESTAMP 类型 |
| 创建人 | created_by | created_by | UUID 类型 |
| 更新人 | updated_by | updated_by | UUID 类型 |

### 3.2 约束规范

#### 3.2.1 主键约束

```sql
-- 标准主键定义
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- 其他字段
);

-- 复合主键定义
CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id)
);
```

#### 3.2.2 外键约束

```sql
-- 标准外键定义
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 外键级联策略
-- ON DELETE CASCADE: 删除主记录时删除从记录
-- ON DELETE SET NULL: 删除主记录时将从记录设为 NULL
-- ON DELETE RESTRICT: 阻止删除主记录（默认）
-- ON DELETE NO ACTION: 无操作（默认）
```

#### 3.2.3 唯一约束

```sql
-- 单字段唯一约束
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL
);

-- 复合唯一约束
CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    UNIQUE (user_id, role_id)
);
```

#### 3.2.4 检查约束

```sql
-- 标准检查约束
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    CHECK (total_amount >= 0)
);
```

### 3.3 索引规范

#### 3.3.1 索引类型选择

| 索引类型 | 适用场景 | 示例 |
|---------|---------|------|
| B-Tree | 等值查询、范围查询 | WHERE user_id = ? |
| Hash | 等值查询（性能更好） | WHERE email = ? |
| GIN | JSONB、数组、全文搜索 | WHERE data @> '{"key":"value"}' |
| GiST | 几何数据、范围数据 | WHERE location @> point |
| BRIN | 大表范围查询 | WHERE created_at BETWEEN ? AND ? |

#### 3.3.2 索引设计原则

```sql
-- 1. 为外键创建索引
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 2. 为常用查询条件创建索引
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 3. 为排序字段创建索引
CREATE INDEX idx_orders_created_at_desc ON orders(created_at DESC);

-- 4. 为多字段查询创建复合索引
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 5. 为 JSONB 字段创建 GIN 索引
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

-- 6. 为全文搜索创建索引
CREATE INDEX idx_products_name_search ON products USING GIN (to_tsvector('english', name));
```

#### 3.3.3 索引维护

```sql
-- 查看索引使用情况
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 查看未使用的索引
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname NOT IN ('pg_catalog', 'information_schema');

-- 重建索引
REINDEX INDEX idx_users_email;

-- 并发重建索引（不阻塞）
REINDEX INDEX CONCURRENTLY idx_users_email;
```

---

## 4. 数据库架构设计

### 4.1 多租户架构

#### 4.1.1 租户隔离策略

| 隔离级别 | 描述 | 优点 | 缺点 | 适用场景 |
|---------|------|------|------|----------|
| 独立数据库 | 每个租户一个数据库 | 最高隔离度 | 成本高 | 大型企业客户 |
| 共享数据库独立Schema | 每个租户一个Schema | 较高隔离度 | 管理复杂 | 中型企业客户 |
| 共享数据库共享Schema | 所有租户共享Schema | 成本低 | 隔离度低 | 小型客户 |

#### 4.1.2 租户隔离实现

```sql
-- 方案1：共享数据库独立Schema
CREATE SCHEMA tenant_001;
CREATE SCHEMA tenant_002;

CREATE TABLE tenant_001.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE tenant_002.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- 方案2：共享数据库共享Schema（推荐）
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE (tenant_id, email)
);

-- 行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 4.2 分库分表策略

#### 4.2.1 垂直分库

```
┌─────────────────────────────────────────────────────────────┐
│                    垂直分库架构                              │
└────────────┬────────────────┬────────────────┬────────────┘
             │                │                │
             ▼                ▼                ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │  用户库     │    │  订单库     │    │  商品库     │
    │  yyc3_user │    │yyc3_order  │    │yyc3_product│
    └────────────┘    └────────────┘    └────────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ▼
                    ┌────────────┐
                    │  统一网关   │
                    └────────────┘
```

#### 4.2.2 水平分表

```sql
-- 按时间分表（推荐）
CREATE TABLE orders_2025_01 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE orders_2025_02 PARTITION OF orders
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- 按 ID 哈希分表
CREATE TABLE orders_0 PARTITION OF orders
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE orders_1 PARTITION OF orders
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE orders_2 PARTITION OF orders
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE orders_3 PARTITION OF orders
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### 4.3 读写分离架构

```
┌─────────────────────────────────────────────────────────────┐
│                    读写分离架构                              │
└────────────┬────────────────┬────────────────┬────────────┘
             │                │                │
             ▼                ▼                ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │  应用层     │    │  应用层     │    │  应用层     │
    │  (写操作)   │    │  (读操作)   │    │  (读操作)   │
    └────┬───────┘    └────┬───────┘    └────┬───────┘
         │                 │                 │
         ▼                 ▼                 ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │  主库       │───▶│  从库1     │    │  从库2     │
    │  (Master)  │    │  (Slave1)  │    │  (Slave2)  │
    └────────────┘    └────────────┘    └────────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ▼
                    ┌────────────┐
                    │  数据同步   │
                    └────────────┘
```

---

## 5. 数据模型设计

### 5.1 核心实体模型

#### 5.1.1 用户管理模型

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, email),
    UNIQUE (tenant_id, username)
);

-- 角色表
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, name)
);

-- 用户角色关联表
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, role_id)
);

-- 索引
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_roles_tenant ON roles(tenant_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

#### 5.1.2 业务数据模型

```sql
-- 订单表（分区表）
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    shipping_address JSONB,
    billing_address JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, order_number)
) PARTITION BY RANGE (created_at);

-- 订单明细表
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### 5.2 审计日志模型

```sql
-- 操作日志表
CREATE TABLE operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    module VARCHAR(100),
    operation VARCHAR(100) NOT NULL,
    method VARCHAR(50),
    request_url VARCHAR(500),
    request_params JSONB,
    response_result JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    execution_time INTEGER,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- 数据变更日志表
CREATE TABLE data_change_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (changed_at);

-- 索引
CREATE INDEX idx_operation_logs_tenant ON operation_logs(tenant_id);
CREATE INDEX idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_time ON operation_logs(created_at);
CREATE INDEX idx_data_change_logs_table ON data_change_logs(table_name);
CREATE INDEX idx_data_change_logs_record ON data_change_logs(record_id);
CREATE INDEX idx_data_change_logs_time ON data_change_logs(changed_at);
```

---

## 6. 性能优化策略

### 6.1 查询优化

#### 6.1.1 查询优化原则

| 原则 | 描述 | 示例 |
|------|------|------|
| 避免 SELECT * | 只查询需要的字段 | SELECT id, name FROM users |
| 使用索引 | 确保查询使用索引 | WHERE user_id = ? |
| 避免 OR | 使用 UNION ALL 代替 | UNION ALL 代替 OR |
| 避免 LIKE '%x%' | 使用全文搜索 | to_tsvector() |
| 避免 NOT IN | 使用 NOT EXISTS | NOT EXISTS 代替 NOT IN |
| 避免 DISTINCT | 使用 GROUP BY | GROUP BY 代替 DISTINCT |
| 使用 LIMIT | 限制结果集大小 | LIMIT 100 |

#### 6.1.2 查询优化示例

```sql
-- 不推荐的查询
SELECT * FROM users WHERE email LIKE '%@example.com';

-- 推荐的查询
SELECT id, email, name FROM users WHERE email LIKE '%@example.com' LIMIT 100;

-- 使用全文搜索
SELECT id, name FROM products
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'laptop');

-- 使用覆盖索引
CREATE INDEX idx_users_email_name ON users(email, name);
SELECT email, name FROM users WHERE email = 'user@example.com';

-- 使用物化视图
CREATE MATERIALIZED VIEW user_order_summary AS
SELECT
    u.id AS user_id,
    u.email,
    COUNT(o.id) AS order_count,
    SUM(o.total_amount) AS total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.email;

-- 定期刷新物化视图
REFRESH MATERIALIZED VIEW CONCURRENTLY user_order_summary;
```

### 6.2 缓存优化

#### 6.2.1 多级缓存架构

```
┌─────────────────────────────────────────────────────────────┐
│                    多级缓存架构                              │
└────────────┬────────────────┬────────────────┬────────────┘
             │                │                │
             ▼                ▼                ▼
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │  L1 缓存    │    │  L2 缓存    │    │  L3 缓存    │
    │  (应用内存)  │    │  (Redis)   │    │  (CDN)     │
    │  100MB     │    │  集群模式    │    │  全球边缘    │
    │  TTL: 60s  │    │  TTL: 300s │    │  TTL: 3600s│
    └────────────┘    └────────────┘    └────────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ▼
                    ┌────────────┐
                    │  数据库     │
                    └────────────┘
```

#### 6.2.2 缓存策略

| 缓存类型 | TTL | 更新策略 | 适用场景 |
|---------|-----|----------|----------|
| 用户会话 | 1800s | 定时更新 | 用户登录状态 |
| 用户信息 | 3600s | 主动失效 | 用户基本信息 |
| 配置信息 | 86400s | 主动失效 | 系统配置 |
| 查询结果 | 300s | 定时更新 | 复杂查询结果 |
| 统计数据 | 600s | 定时更新 | 统计报表 |

#### 6.2.3 缓存实现

```typescript
// Redis 缓存管理器
class RedisCacheManager {
  private client: RedisClient;

  async get(key: string): Promise<any> {
    const cached = await this.client.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }
}
```

### 6.3 连接池优化

#### 6.3.1 连接池配置

```typescript
// 连接池配置
const poolConfig = {
  host: 'localhost',
  port: 5433,
  database: 'yyc3_dev',
  user: 'yyc3_dev',
  password: 'yyc3_dev',
  min: 10,              // 最小连接数
  max: 100,             // 最大连接数
  idleTimeoutMillis: 30000,  // 空闲超时
  connectionTimeoutMillis: 2000,  // 连接超时
  statement_timeout: 30000,  // 语句超时
  query_timeout: 30000,  // 查询超时
};
```

#### 6.3.2 连接池监控

```sql
-- 查看当前连接数
SELECT
    datname,
    usename,
    application_name,
    client_addr,
    state,
    count(*)
FROM pg_stat_activity
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY count(*) DESC;

-- 查看最大连接数
SHOW max_connections;

-- 查看连接池状态
SELECT
    state,
    count(*)
FROM pg_stat_activity
WHERE datname = 'yyc3_dev'
GROUP BY state;
```

---

## 7. 安全与合规

### 7.1 访问控制

#### 7.1.1 用户权限管理

```sql
-- 创建用户
CREATE USER yyc3_app WITH PASSWORD 'secure_password' CREATEDB;

-- 授予数据库权限
GRANT ALL PRIVILEGES ON DATABASE yyc3_dev TO yyc3_app;

-- 授予 Schema 权限
GRANT ALL PRIVILEGES ON SCHEMA public TO yyc3_app;

-- 授予表权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO yyc3_app;

-- 授予序列权限
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO yyc3_app;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO yyc3_app;
```

#### 7.1.2 行级安全策略

```sql
-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能看到自己租户的数据
CREATE POLICY tenant_isolation_policy ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 创建策略：用户只能修改自己的数据
CREATE POLICY user_self_policy ON users
    FOR UPDATE
    USING (id = current_setting('app.current_user_id')::UUID);
```

### 7.2 数据加密

#### 7.2.1 传输加密

```ini
# postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
ssl_ca_file = '/path/to/ca.crt'
```

#### 7.2.2 存储加密

```sql
-- 使用 pgcrypto 扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 加密函数
CREATE OR REPLACE FUNCTION encrypt_data(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(data::bytea, key::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql;

-- 解密函数
CREATE OR REPLACE FUNCTION decrypt_data(encrypted_data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), key::bytea, 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql;

-- 使用示例
SELECT encrypt_data('sensitive_data', 'encryption_key');
SELECT decrypt_data('encrypted_result', 'encryption_key');
```

### 7.3 审计日志

#### 7.3.1 操作审计

```sql
-- 创建审计触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO data_change_logs (
            tenant_id, table_name, record_id, operation, new_data, changed_by
        ) VALUES (
            NEW.tenant_id, TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), current_user_id()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO data_change_logs (
            tenant_id, table_name, record_id, operation, old_data, new_data, changed_by
        ) VALUES (
            NEW.tenant_id, TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user_id()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO data_change_logs (
            tenant_id, table_name, record_id, operation, old_data, changed_by
        ) VALUES (
            OLD.tenant_id, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), current_user_id()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建审计触发器
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## 8. 监控与运维

### 8.1 性能监控

#### 8.1.1 关键指标

| 指标类型 | 监控项 | 告警阈值 | 监控频率 |
|---------|--------|----------|----------|
| 连接数 | 活跃连接数 | > 80% | 1 分钟 |
| 查询性能 | 平均响应时间 | > 100ms | 1 分钟 |
| 缓存命中率 | 缓存命中率 | < 90% | 5 分钟 |
| 磁盘使用 | 磁盘使用率 | > 80% | 5 分钟 |
| 锁等待 | 锁等待时间 | > 1000ms | 1 分钟 |
| 死锁 | 死锁次数 | > 0 | 1 分钟 |

#### 8.1.2 监控查询

```sql
-- 查看活跃连接
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start;

-- 查看慢查询
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- 查看锁等待
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 查看表大小
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS bytes
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY bytes DESC
LIMIT 20;
```

### 8.2 备份与恢复

#### 8.2.1 备份策略

| 备份类型 | 频率 | 保留时间 | 存储位置 |
|---------|------|----------|----------|
| 全量备份 | 每日 | 30 天 | NAS + 云存储 |
| 增量备份 | 每小时 | 7 天 | NAS |
| WAL 归档 | 实时 | 7 天 | NAS |
| 配置备份 | 每周 | 90 天 | NAS + 云存储 |

#### 8.2.2 备份脚本

```bash
#!/bin/bash
# PostgreSQL 备份脚本

BACKUP_DIR="/Volumes/NAS/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR/$DATE"

# 全量备份
pg_dump -h localhost -p 5433 -U yyc3_dev -d yyc3_dev \
    -F c -f "$BACKUP_DIR/$DATE/yyc3_dev.backup"

# 压缩备份
gzip "$BACKUP_DIR/$DATE/yyc3_dev.backup"

# 清理旧备份
find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;

# 备份到云存储
aws s3 sync "$BACKUP_DIR/$DATE" s3://yyc3-backups/postgresql/$DATE/

echo "✅ 备份完成: $BACKUP_DIR/$DATE"
```

#### 8.2.3 恢复脚本

```bash
#!/bin/bash
# PostgreSQL 恢复脚本

BACKUP_FILE="/Volumes/NAS/backups/postgresql/20260221_120000/yyc3_dev.backup.gz"

# 解压备份文件
gunzip -c "$BACKUP_FILE" > /tmp/yyc3_dev.backup

# 恢复数据库
pg_restore -h localhost -p 5433 -U yyc3_dev -d yyc3_dev \
    -v /tmp/yyc3_dev.backup

# 清理临时文件
rm /tmp/yyc3_dev.backup

echo "✅ 恢复完成"
```

---

## 9. 数据治理

### 9.1 数据质量管理

#### 9.1.1 数据质量维度

| 维度 | 描述 | 检查方法 |
|------|------|----------|
| 完整性 | 数据是否完整 | NULL 值检查 |
| 准确性 | 数据是否准确 | 业务规则验证 |
| 一致性 | 数据是否一致 | 跨表一致性检查 |
| 及时性 | 数据是否及时 | 时间戳检查 |
| 唯一性 | 数据是否唯一 | 重复数据检查 |

#### 9.1.2 数据质量检查

```sql
-- 完整性检查
SELECT
    COUNT(*) AS total_records,
    COUNT(email) AS email_count,
    COUNT(phone) AS phone_count,
    ROUND(COUNT(email) * 100.0 / COUNT(*), 2) AS email_completeness
FROM users;

-- 准确性检查
SELECT
    COUNT(*) AS invalid_emails
FROM users
WHERE email NOT LIKE '%@%.%';

-- 一致性检查
SELECT
    o.id AS order_id,
    o.user_id,
    u.id AS user_id
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;

-- 唯一性检查
SELECT
    email,
    COUNT(*) AS count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

### 9.2 数据生命周期管理

#### 9.2.1 数据保留策略

| 数据类型 | 保留时间 | 归档策略 | 删除策略 |
|---------|----------|----------|----------|
| 用户数据 | 永久 | 不归档 | 用户注销后删除 |
| 业务数据 | 3 年 | 1 年后归档 | 3 年后删除 |
| 日志数据 | 90 天 | 30 天后归档 | 90 天后删除 |
| 临时数据 | 7 天 | 不归档 | 7 天后删除 |

#### 9.2.2 数据归档

```sql
-- 创建归档表
CREATE TABLE orders_archive (LIKE orders INCLUDING ALL);

-- 归档旧数据
INSERT INTO orders_archive
SELECT * FROM orders
WHERE created_at < CURRENT_DATE - INTERVAL '1 year';

-- 删除已归档数据
DELETE FROM orders
WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
```

---

## 10. 最佳实践

### 10.1 设计最佳实践

#### 10.1.1 表设计

1. **使用 UUID 作为主键**：避免序列瓶颈，支持分布式
2. **添加时间戳字段**：created_at, updated_at, deleted_at
3. **添加审计字段**：created_by, updated_by
4. **使用软删除**：deleted_at 字段代替物理删除
5. **合理使用 JSONB**：灵活字段使用 JSONB，固定字段使用普通字段

#### 10.1.2 索引设计

1. **为外键创建索引**：加速 JOIN 查询
2. **为常用查询条件创建索引**：WHERE 子句字段
3. **为排序字段创建索引**：ORDER BY 字段
4. **使用复合索引**：多字段查询
5. **避免过度索引**：影响写入性能

#### 10.1.3 查询设计

1. **避免 SELECT ***：只查询需要的字段
2. **使用参数化查询**：防止 SQL 注入
3. **使用连接池**：减少连接开销
4. **使用事务**：保证数据一致性
5. **避免大事务**：减少锁竞争

### 10.2 运维最佳实践

#### 10.2.1 日常维护

```sql
-- 定期执行 VACUUM
VACUUM ANALYZE;

-- 定期重建索引
REINDEX DATABASE yyc3_dev;

-- 定期更新统计信息
ANALYZE;

-- 清理死元组
VACUUM FULL;
```

#### 10.2.2 性能调优

```ini
# postgresql.conf 性能优化

# 共享缓冲区（内存的 25%）
shared_buffers = 32GB

# 有效缓存大小
effective_cache_size = 96GB

# 维护工作内存
maintenance_work_mem = 2GB

# WAL 缓冲区
wal_buffers = 64MB

# 并行查询
max_parallel_workers = 16
max_parallel_workers_per_gather = 8

# 工作内存
work_mem = 64MB

# 随机页面成本
random_page_cost = 1.1

# 有效 IO 并发
effective_io_concurrency = 200
```

### 10.3 安全最佳实践

1. **最小权限原则**：用户只拥有完成任务所需的最小权限
2. **定期更换密码**：每季度更换数据库密码
3. **启用 SSL**：加密数据库连接
4. **启用审计日志**：记录所有操作
5. **定期备份**：确保数据安全
6. **监控告警**：实时监控异常行为

---

## 💎 总结

YYC³ 数据库标准化规范化架构通过以下设计实现了企业级的数据库管理：

### 🎯 核心成就

1. **标准化**：统一的命名规范、数据类型规范、约束规范
2. **规范化**：遵循数据库范式，合理反范式化
3. **高性能**：查询优化、缓存优化、连接池优化
4. **高可用**：多租户架构、分库分表、读写分离
5. **高安全**：访问控制、数据加密、审计日志
6. **可监控**：性能监控、备份恢复、数据治理

### 📊 架构特点

- **大数据分析基础**：数据量分析、查询模式分析、性能基准分析
- **多租户架构**：租户隔离、行级安全策略
- **分库分表**：垂直分库、水平分表
- **读写分离**：主从复制、读写分离
- **数据治理**：数据质量、数据生命周期管理

### 🚀 实施建议

1. **短期（1-2周）**：实施标准化规范，优化索引
2. **中期（1-2月）**：实施分库分表，读写分离
3. **长期（3-6月）**：实施多租户架构，完善监控

---

<div align="center">

> **「YanYuCloudCube」**
> **「<admin@0379.email>」**
> **「Words Initiate Quadrants, Language Serves as Core for Future」**
> **「All things converge in cloud pivot; Deep stacks ignite a new era of intelligence」**

</div>
