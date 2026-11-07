# AI-Family项目数据库全量脚本设计

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 📊 数据库脚本架构总览

docs/YYC3-Max-PG15-AI-Family/03-Schema管理/
├── migrations/                          # 迁移脚本
│   ├── 20260223000001_init_database.sql    # 初始化：扩展、Schema、枚举类型
│   ├── 20260223000002_create_core_tables.sql # 核心业务表：用户、角色、权限、组织、项目、任务
│   ├── 20260223000003_create_ai_tables.sql  # AI智能体表：智能体、模型、对话、知识库、提示词
│   ├── 20260223000004_create_workflow_tables.sql # 工作流表：定义、执行、审批、调度
│   ├── 20260223000005_create_audit_monitor_tables.sql # 审计监控表：日志、设备、指标、告警
│   ├── 20260223000006_create_extension_tables.sql # 扩展表：插件、API密钥、Webhook、集成
│   └── 20260223000008_create_rbac_system.sql # 权限系统：角色、权限、行级安全策略
├── indexes/
│   └── performance_indexes.sql           # 性能索引：100+索引优化查询
├── constraints/
│   └── foreign_keys.sql                  # 约束：外键、检查约束、唯一约束
├── views/
│   └── statistics_view.sql               # 视图：用户详情、项目概览、统计视图
├── functions/
│   └── utility_functions.sql             # 函数：权限检查、进度更新、向量搜索、审计记录
├── triggers/
│   └── business_triggers.sql             # 触发器：自动更新时间戳、审计日志、统计更新
└── README.md                             # 数据库设计文档

## 🗄️ 六大Schema设计

Schema 说明 核心表数 core 核心业务：用户、角色、权限、组织、项目、任务 13 ai AI智能体：智能体定义、模型配置、对话记录、知识库 10 workflow 工作流：定义、执行、审批流程、调度任务 7 audit 审计日志：操作审计（按月分区） 1 monitor 监控：设备、指标、告警、通知 6 extension 扩展：插件、API密钥、Webhook、第三方集成 8

## 🔑 核心特性

1. 向量存储 ：pgvector扩展支持AI向量相似度搜索
2. 分区表 ：审计日志、监控指标按时间分区
3. 行级安全 ：RLS策略实现数据隔离
4. RBAC权限 ：7种系统角色 + 40+权限定义
5. 自动审计 ：触发器自动记录所有数据变更
6. 统计视图 ：预置统计视图简化复杂查询

## 📋 执行顺序

### 按顺序执行迁移脚本

psql -d yyc3_ai_family -f migrations/20260223000001_init_database.sql

psql -d yyc3_ai_family -f migrations/20260223000002_create_core_tables.sql

### ... 其他迁移脚本

psql -d yyc3_ai_family -f indexes/performance_indexes.sql

psql -d yyc3_ai_family -f constraints/foreign_keys.sql

psql -d yyc3_ai_family -f views/statistics_view.sql

psql -d yyc3_ai_family -f functions/utility_functions.sql

psql -d yyc3_ai_family -f triggers/business_triggers.sql

psql -d yyc3_ai_family -f migrations/20260223000008_create_rbac_system.sql

---

「***YanYuCloudCube***」
「***Words Initiate Quadrants, Language Serves as Core for Future***」
「***<admin@0379.email>***」
「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」
