# YYC³-AI-Family 多端数据库架构落地指南

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 文档信息

| 项目 | 内容 |
|------|------|
| 项目名称 | YYC³-AI-Family |
| 文档类型 | 架构落地指南 |
| 文档版本 | v1.0.0 |
| 创建日期 | 2026-02-23 |
| 最后更新 | 2026-02-23 |
| 作者 | YYC³ Team |

---

## 1. 架构设计总览

### 1.1 多端数据库架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           YYC³-AI-Family 多端数据库架构                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           应用层 (Application Layer)                      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
│  │  │ Web端   │  │ iOS端   │  │ Android │  │ Desktop │  │ API服务 │       │   │
│  │  │ React   │  │ Swift   │  │ Kotlin  │  │ Electron│  │ Node.js │       │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │   │
│  └───────┼────────────┼────────────┼────────────┼────────────┼─────────────┘   │
│          │            │            │            │            │                  │
│          └────────────┴────────────┼────────────┴────────────┘                  │
│                                      │                                          │
│  ┌───────────────────────────────────┼───────────────────────────────────────┐  │
│  │                      连接池层 (Connection Pool Layer)                      │  │
│  │                                  │                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                         PgBouncer / Pgpool-II                        │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │  │
│  │  │  │ Pool 1   │  │ Pool 2   │  │ Pool 3   │  │ Pool N   │            │  │  │
│  │  │  │ (Web)    │  │ (Mobile) │  │ (Desktop)│  │ (API)    │            │  │  │
│  │  │  │ 50 conn  │  │ 30 conn  │  │ 20 conn  │  │ 100 conn │            │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │  │  │
│  │  └─────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────┬───────────────────────────────────────┘  │
│                                      │                                          │
│  ┌───────────────────────────────────┼───────────────────────────────────────┐  │
│  │                      代理层 (Proxy Layer)                                  │  │
│  │                                  │                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                      HAProxy / Nginx TCP                             │  │  │
│  │  │                                                                      │  │  │
│  │  │    读写分离路由 ────────────────────────────────────────────────────  │  │  │
│  │  │    ┌─────────────────┐         ┌─────────────────┐                  │  │  │
│  │  │    │   写操作路由     │         │   读操作路由     │                  │  │  │
│  │  │    │   (INSERT/UPDATE│         │   (SELECT)      │                  │  │  │
│  │  │    │   /DELETE)      │         │                 │                  │  │  │
│  │  │    └────────┬────────┘         └────────┬────────┘                  │  │  │
│  │  └─────────────┼──────────────────────────┼────────────────────────────┘  │  │
│  └────────────────┼──────────────────────────┼───────────────────────────────┘  │
│                   │                          │                                   │
│  ┌────────────────┼──────────────────────────┼───────────────────────────────┐  │
│  │                │      数据库层 (Database Layer)          │                │  │
│  │                │                          │                               │  │
│  │  ┌─────────────┴────────────┐  ┌─────────┴──────────────┐               │  │
│  │  │      主库集群 (Primary)    │  │     从库集群 (Replicas)  │               │  │
│  │  │                           │  │                          │               │  │
│  │  │  ┌─────────┐ ┌─────────┐ │  │  ┌─────────┐ ┌─────────┐│               │  │
│  │  │  │Primary 1│ │Primary 2│ │  │  │Replica 1│ │Replica 2││               │  │
│  │  │  │(Active) │ │(Standby)│ │  │  │(Read)   │ │(Read)   ││               │  │
│  │  │  └─────────┘ └─────────┘ │  │  └─────────┘ └─────────┘│               │  │
│  │  │        Patroni           │  │      负载均衡读取        │               │  │
│  │  └───────────────────────────┘  └──────────────────────────┘               │  │
│  │                                                                             │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                        分片集群 (Sharding Cluster)                    │  │  │
│  │  │                                                                      │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │  │
│  │  │  │ Shard 1  │  │ Shard 2  │  │ Shard 3  │  │ Shard 4  │            │  │  │
│  │  │  │ users_1  │  │ users_2  │  │ messages │  │ logs     │            │  │  │
│  │  │  │ core     │  │ core     │  │ ai       │  │ audit    │            │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │  │  │
│  │  └─────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                        存储层 (Storage Layer)                              │  │
│  │                                                                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐          │  │
│  │  │   SSD      │  │   NVMe     │  │   NAS      │  │   S3/OSS   │          │  │
│  │  │   热数据    │  │   极热数据  │  │   温数据   │  │   冷数据    │          │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘          │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 架构分层说明

| 层级 | 组件 | 职责 | 技术选型 |
|------|------|------|----------|
| **应用层** | 多端客户端 | 业务逻辑、用户交互 | React/Swift/Kotlin/Electron |
| **连接池层** | PgBouncer | 连接复用、负载控制 | PgBouncer/Pgpool-II |
| **代理层** | HAProxy | 读写分离、负载均衡 | HAProxy/Nginx |
| **数据库层** | PostgreSQL | 数据存储、事务处理 | PostgreSQL 15+ |
| **存储层** | 分布式存储 | 持久化存储、备份 | SSD/NVMe/S3 |

---

## 2. 多端连接架构

### 2.1 端到端连接拓扑

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           多端连接拓扑结构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        客户端层 (Clients)                             │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │    Web Client   │  │  Mobile Client  │  │ Desktop Client  │     │   │
│  │  │                 │  │                 │  │                 │     │   │
│  │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │     │   │
│  │  │ │ Browser     │ │  │ │ iOS App     │ │  │ │ Electron    │ │     │   │
│  │  │ │ (React)     │ │  │ │ (Swift)     │ │  │ │ (Node.js)   │ │     │   │
│  │  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │     │   │
│  │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │     │   │
│  │  │ │ pg-pool     │ │  │ │ SQLite      │ │  │ │ better-sql  │ │     │   │
│  │  │ │ (HTTP/WS)   │ │  │ │ (本地缓存)   │ │  │ │ (本地缓存)   │ │     │   │
│  │  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │   API Gateway   │  │  Backend API    │  │  Admin Panel    │     │   │
│  │  │                 │  │                 │  │                 │     │   │
│  │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │     │   │
│  │  │ │ Kong/APISIX │ │  │ │ Node.js     │ │  │ │ React Admin │ │     │   │
│  │  │ └─────────────┘ │  │ │ Express     │ │  │ └─────────────┘ │     │   │
│  │  │ ┌─────────────┐ │  │ │ Fastify     │ │  │ ┌─────────────┐ │     │   │
│  │  │ │ Rate Limit  │ │  │ └─────────────┘ │  │ │ pg-admin    │ │     │   │
│  │  │ │ Auth        │ │  │ ┌─────────────┐ │  │ └─────────────┘ │     │   │
│  │  │ └─────────────┘ │  │ │ HikariCP    │ │  │                 │     │   │
│  │  └─────────────────┘  │ └─────────────┘ │  └─────────────────┘     │   │
│  │                       └─────────────────┘                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      连接池集群 (Connection Pool Cluster)             │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                     PgBouncer Cluster                          │  │   │
│  │  │                                                                │  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │   │
│  │  │  │  PgBouncer  │  │  PgBouncer  │  │  PgBouncer  │            │  │   │
│  │  │  │  Instance 1 │  │  Instance 2 │  │  Instance 3 │            │  │   │
│  │  │  │             │  │             │  │             │            │  │   │
│  │  │  │  Port: 6432 │  │  Port: 6433 │  │  Port: 6434 │            │  │   │
│  │  │  │  Mode: Tx   │  │  Mode: Tx   │  │  Mode: Tx   │            │  │   │
│  │  │  │  Pool: 100  │  │  Pool: 100  │  │  Pool: 100  │            │  │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘            │  │   │
│  │  │                                                                │  │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │              负载均衡 (HAProxy)                          │  │  │   │
│  │  │  │                                                         │  │  │   │
│  │  │  │   frontend pg_frontend                                  │  │  │   │
│  │  │  │       bind *:5432                                       │  │  │   │
│  │  │  │       mode tcp                                          │  │  │   │
│  │  │  │       default_backend pg_pgbouncer                      │  │  │   │
│  │  │  │                                                         │  │  │   │
│  │  │  │   backend pg_pgbouncer                                  │  │  │   │
│  │  │  │       balance roundrobin                                │  │  │   │
│  │  │  │       server pg1 127.0.0.1:6432 check                   │  │  │   │
│  │  │  │       server pg2 127.0.0.1:6433 check                   │  │  │   │
│  │  │  │       server pg3 127.0.0.1:6434 check                   │  │  │   │
│  │  │  └─────────────────────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      数据库集群 (Database Cluster)                    │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Primary-Standby Cluster                      │  │   │
│  │  │                                                                │  │   │
│  │  │           ┌─────────────────┐                                  │  │   │
│  │  │           │     Primary     │ ◄─── 写入请求                     │  │   │
│  │  │           │   (Port 5432)   │                                  │  │   │
│  │  │           │                 │                                  │  │   │
│  │  │           │  ┌───────────┐  │                                  │  │   │
│  │  │           │  │  WAL      │  │                                  │  │   │
│  │  │           │  │  Stream   │──────┬─────────┐                   │  │   │
│  │  │           │  └───────────┘  │    │         │                   │  │   │
│  │  │           └─────────────────┘    │         │                   │  │   │
│  │  │                                  ▼         ▼                   │  │   │
│  │  │           ┌─────────────────┐  ┌─────────────────┐            │  │   │
│  │  │           │    Standby 1    │  │    Standby 2    │ ◄─── 读取   │  │   │
│  │  │           │   (Port 5433)   │  │   (Port 5434)   │    请求     │  │   │
│  │  │           │                 │  │                 │            │  │   │
│  │  │           │  Hot Standby    │  │  Hot Standby    │            │  │   │
│  │  │           └─────────────────┘  └─────────────────┘            │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 各端连接配置

#### 2.2.1 Web端配置

```javascript
const { Pool } = require('pg');

const webPoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'yyc3_ai_family',
    user: 'web_app_user',
    password: process.env.DB_PASSWORD,
    
    max: 50,
    min: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    
    statement_timeout: 30000,
    query_timeout: 30000,
    
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true,
        ca: process.env.DB_CA_CERT,
    } : false,
};

const pool = new Pool(webPoolConfig);

module.exports = { pool };
```

#### 2.2.2 iOS端配置

```swift
import SQLite
import Foundation

class DatabaseManager {
    static let shared = DatabaseManager()
    
    private var localDB: Connection?
    private let apiClient = APIClient()
    
    private init() {
        setupLocalDatabase()
    }
    
    private func setupLocalDatabase() {
        let path = NSSearchPathForDirectoriesInDomains(
            .documentDirectory,
            .userDomainMask,
            true
        ).first!
        
        do {
            localDB = try Connection("\(path)/yyc3_local.sqlite3")
            createLocalTables()
        } catch {
            print("Local database error: \(error)")
        }
    }
    
    func syncWithServer() async throws {
        let pendingChanges = try getPendingChanges()
        try await apiClient.syncChanges(pendingChanges)
        try clearPendingChanges()
    }
}
```

#### 2.2.3 Android端配置

```kotlin
class DatabaseManager(context: Context) {
    
    private val apiClient = ApiClient()
    private val localDb = Room.databaseBuilder(
        context.applicationContext,
        YYC3Database::class.java,
        "yyc3_local"
    ).build()
    
    suspend fun syncWithServer() {
        val pendingChanges = localDb.changeLogDao().getPending()
        apiClient.syncChanges(pendingChanges)
        localDb.changeLogDao().clearPending()
    }
    
    fun getConnectionConfig(): ConnectionConfig {
        return ConnectionConfig(
            host = BuildConfig.DB_HOST,
            port = BuildConfig.DB_PORT,
            database = "yyc3_ai_family",
            user = "mobile_app_user",
            sslEnabled = true
        )
    }
}
```

#### 2.2.4 Desktop端配置

```javascript
const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');

class DesktopDatabase {
    constructor() {
        const dbPath = path.join(app.getPath('userData'), 'yyc3_local.db');
        this.localDb = new Database(dbPath);
        this.setupLocalTables();
    }
    
    setupLocalTables() {
        this.localDb.exec(`
            CREATE TABLE IF NOT EXISTS local_cache (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at INTEGER
            );
            
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation TEXT,
                data TEXT,
                created_at INTEGER
            );
        `);
    }
    
    async syncWithServer() {
        const pending = this.localDb.prepare('SELECT * FROM sync_queue').all();
        await apiClient.syncChanges(pending);
        this.localDb.exec('DELETE FROM sync_queue');
    }
}
```

---

## 3. 数据同步架构

### 3.1 同步策略矩阵

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数据同步策略矩阵                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        同步场景分类                                   │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │  实时同步    │  │  准实时同步  │  │  定时同步    │  │  手动同步   │ │   │
│  │  │             │  │             │  │             │  │            │ │   │
│  │  │ 消息/通知   │  │ 用户资料    │  │ 统计数据    │  │ 历史记录   │ │   │
│  │  │ 在线状态    │  │ 权限变更    │  │ 报表数据    │  │ 归档数据   │ │   │
│  │  │ 协作编辑    │  │ 配置更新    │  │ 日志数据    │  │ 备份数据   │ │   │
│  │  │             │  │             │  │             │  │            │ │   │
│  │  │ 延迟: <1s   │  │ 延迟: <30s  │  │ 延迟: <5min │  │ 延迟: 按需 │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        同步方向矩阵                                   │   │
│  │                                                                      │   │
│  │              ┌─────────────────────────────────────┐                │   │
│  │              │           Server Database           │                │   │
│  │              │                                     │                │   │
│  │              │    ┌─────────────────────────┐     │                │   │
│  │              │    │      Change Data        │     │                │   │
│  │              │    │      Capture (CDC)      │     │                │   │
│  │              │    └───────────┬─────────────┘     │                │   │
│  │              │                │                    │                │   │
│  │              └────────────────┼────────────────────┘                │   │
│  │                               │                                     │   │
│  │           ┌───────────────────┼───────────────────┐                 │   │
│  │           │                   │                   │                 │   │
│  │           ▼                   ▼                   ▼                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │   Web端     │  │  Mobile端   │  │ Desktop端   │  │  其他端    │ │   │
│  │  │             │  │             │  │             │  │            │ │   │
│  │  │ WebSocket   │  │ Push/APNs   │  │ IPC/Socket  │  │ REST API   │ │   │
│  │  │ Server-Sent │  │ FCM         │  │ Electron IPC│  │ GraphQL    │ │   │
│  │  │ Events      │  │             │  │             │  │            │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 冲突解决策略

| 冲突类型 | 解决策略 | 实现方式 |
|----------|----------|----------|
| **更新冲突** | 最后写入胜出 (LWW) | 使用 `updated_at` 时间戳 |
| **删除冲突** | 软删除优先 | 使用 `deleted_at` 字段 |
| **插入冲突** | UUID去重 | 使用全局唯一UUID |
| **关联冲突** | 级联处理 | 事务保证一致性 |

---

## 4. 部署架构

### 4.1 生产环境部署

```yaml
version: '3.8'

services:
  postgres-primary:
    image: postgres:15
    container_name: yyc3-primary
    environment:
      POSTGRES_DB: yyc3_ai_family
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    volumes:
      - primary_data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf
      - ./pg_hba.conf:/etc/postgresql/pg_hba.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    ports:
      - "5432:5432"
    networks:
      - yyc3-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 16G
        reservations:
          cpus: '2'
          memory: 8G

  postgres-standby-1:
    image: postgres:15
    container_name: yyc3-standby-1
    environment:
      POSTGRES_DB: yyc3_ai_family
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      PGUSER: replicator
      PGPASSWORD: ${REPLICATOR_PASSWORD}
    volumes:
      - standby1_data:/var/lib/postgresql/data
    command: >
      postgres
      -c hot_standby=on
      -c primary_conninfo='host=postgres-primary port=5432 user=replicator password=${REPLICATOR_PASSWORD}'
    depends_on:
      postgres-primary:
        condition: service_healthy
    networks:
      - yyc3-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 8G

  postgres-standby-2:
    image: postgres:15
    container_name: yyc3-standby-2
    environment:
      POSTGRES_DB: yyc3_ai_family
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      PGUSER: replicator
      PGPASSWORD: ${REPLICATOR_PASSWORD}
    volumes:
      - standby2_data:/var/lib/postgresql/data
    command: >
      postgres
      -c hot_standby=on
      -c primary_conninfo='host=postgres-primary port=5432 user=replicator password=${REPLICATOR_PASSWORD}'
    depends_on:
      postgres-primary:
        condition: service_healthy
    networks:
      - yyc3-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 8G

  pgbouncer:
    image: edoburu/pgbouncer:latest
    container_name: yyc3-pgbouncer
    environment:
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres-primary:5432/yyc3_ai_family
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 50
      PGBOUNCER_MIN_POOL_SIZE: 10
    ports:
      - "6432:5432"
    depends_on:
      - postgres-primary
      - postgres-standby-1
      - postgres-standby-2
    networks:
      - yyc3-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G

  haproxy:
    image: haproxy:2.8
    container_name: yyc3-haproxy
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg
    ports:
      - "5433:5432"
      - "8404:8404"
    depends_on:
      - pgbouncer
    networks:
      - yyc3-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  patroni:
    image: patroni/patroni:latest
    container_name: yyc3-patroni
    environment:
      PATRONI_NAME: yyc3-cluster
      PATRONI_SCOPE: yyc3
      PATRONI_RESTAPI_LISTEN: 0.0.0.0:8008
      PATRONI_POSTGRESQL_DATA_DIR: /var/lib/postgresql/data
      PATRONI_ETCD_HOSTS: etcd:2379
    depends_on:
      - etcd
      - postgres-primary
    networks:
      - yyc3-network

  etcd:
    image: bitnami/etcd:latest
    container_name: yyc3-etcd
    environment:
      ALLOW_NONE_AUTHENTICATION: "yes"
      ETCD_ADVERTISE_CLIENT_URLS: http://etcd:2379
    volumes:
      - etcd_data:/bitnami/etcd
    networks:
      - yyc3-network

volumes:
  primary_data:
  standby1_data:
  standby2_data:
  etcd_data:

networks:
  yyc3-network:
    driver: bridge
```

### 4.2 HAProxy 配置

```haproxy
global
    log stdout format raw local0
    maxconn 4096

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 10s
    timeout client  30s
    timeout server  30s
    retries 3

frontend pg_write_frontend
    bind *:5432
    mode tcp
    option tcplog
    default_backend pg_primary

frontend pg_read_frontend
    bind *:5433
    mode tcp
    option tcplog
    default_backend pg_standby

backend pg_primary
    mode tcp
    option httpchk GET /primary
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server primary postgres-primary:5432 check port 8008

backend pg_standby
    mode tcp
    balance roundrobin
    option httpchk GET /replica
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server standby1 postgres-standby-1:5432 check port 8008
    server standby2 postgres-standby-2:5432 check port 8008

frontend stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if TRUE
```

---

## 5. 监控与运维

### 5.1 监控指标

```yaml
monitoring:
  metrics:
    - name: connection_count
      query: "SELECT count(*) FROM pg_stat_activity"
      threshold: 150
      alert: warning
      
    - name: replication_lag
      query: "SELECT EXTRACT(EPOCH FROM (now() - replay_lsn)) FROM pg_stat_replication"
      threshold: 10
      alert: critical
      
    - name: query_duration_p99
      query: "SELECT percentile_cont(0.99) WITHIN GROUP (ORDER BY mean_exec_time) FROM pg_stat_statements"
      threshold: 1000
      alert: warning
      
    - name: cache_hit_ratio
      query: "SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) FROM pg_statio_user_tables"
      threshold: 0.95
      alert: warning
```

### 5.2 运维检查清单

| 检查项 | 频率 | 命令/脚本 |
|--------|------|-----------|
| 连接数检查 | 每分钟 | `SELECT count(*) FROM pg_stat_activity` |
| 复制延迟 | 每分钟 | `pg_stat_replication` |
| 慢查询分析 | 每小时 | `pg_stat_statements` |
| 磁盘空间 | 每5分钟 | `df -h` |
| 备份验证 | 每天 | `pg_verifybackup` |
| 索引维护 | 每周 | `REINDEX CONCURRENTLY` |
| 统计信息更新 | 每天 | `ANALYZE` |

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>
