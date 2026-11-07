# YYC³-AI-Family 数据库ER图可视化文档

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
| 数据库类型 | PostgreSQL 15+ |
| 文档版本 | v1.0.0 |
| 创建日期 | 2026-02-23 |
| 最后更新 | 2026-02-23 |
| 作者 | YYC³ Team |

---

## 1. 整体架构概览

### 1.1 六大Schema关系图

```mermaid
graph TB
    subgraph "YYC³-AI-Family Database"
        CORE[core<br/>核心业务]
        AI[ai<br/>AI智能体]
        WF[workflow<br/>工作流]
        AUDIT[audit<br/>审计日志]
        MONITOR[monitor<br/>监控]
        EXT[extension<br/>扩展]
    end
    
    CORE -->|用户关联| AI
    CORE -->|用户关联| WF
    CORE -->|用户关联| AUDIT
    CORE -->|用户关联| MONITOR
    CORE -->|用户关联| EXT
    
    AI -->|智能体执行| WF
    AI -->|操作审计| AUDIT
    MONITOR -->|告警通知| EXT
```

### 1.2 Schema职责矩阵

| Schema | 职责 | 核心实体 | 数据量级 |
|--------|------|----------|----------|
| core | 核心业务数据 | users, roles, permissions, organizations, projects, tasks | 百万级 |
| ai | AI智能体数据 | agents, models, conversations, messages, knowledge_bases | 千万级 |
| workflow | 工作流引擎 | definitions, executions, approval_flows | 百万级 |
| audit | 审计日志 | logs (分区表) | 亿级 |
| monitor | 监控告警 | devices, metrics, alerts, notifications | 亿级 |
| extension | 扩展功能 | plugins, api_keys, webhooks, integrations | 百万级 |

---

## 2. 核心业务Schema ER图

### 2.1 用户权限模型 (RBAC)

```mermaid
erDiagram
    users ||--o{ user_roles : "拥有"
    roles ||--o{ user_roles : "分配给"
    roles ||--o{ role_permissions : "包含"
    permissions ||--o{ role_permissions : "授予"
    roles }o--|| roles : "父子层级"
    permissions }o--|| permissions : "父子层级"
    
    users {
        uuid id PK "用户ID"
        varchar username UK "用户名"
        varchar email UK "邮箱"
        varchar password_hash "密码哈希"
        varchar full_name "全名"
        user_status status "状态"
        timestamp created_at "创建时间"
        timestamp deleted_at "删除时间"
    }
    
    roles {
        uuid id PK "角色ID"
        varchar name UK "角色名称"
        varchar code UK "角色编码"
        role_type type "角色类型"
        uuid parent_id FK "父角色ID"
        integer level "层级"
        boolean is_system "是否系统角色"
    }
    
    permissions {
        uuid id PK "权限ID"
        varchar name UK "权限名称"
        varchar code UK "权限编码"
        varchar resource "资源"
        varchar action "操作"
        uuid parent_id FK "父权限ID"
    }
    
    user_roles {
        uuid id PK "关联ID"
        uuid user_id FK "用户ID"
        uuid role_id FK "角色ID"
        boolean is_primary "是否主角色"
        timestamp expires_at "过期时间"
    }
    
    role_permissions {
        uuid id PK "关联ID"
        uuid role_id FK "角色ID"
        uuid permission_id FK "权限ID"
    }
```

### 2.2 组织架构模型

```mermaid
erDiagram
    organizations ||--o{ organizations : "父子层级"
    organizations ||--o{ departments : "包含"
    departments ||--o{ departments : "父子层级"
    departments ||--o{ user_departments : "包含"
    users ||--o{ user_departments : "属于"
    users ||--o{ departments : "管理"
    
    organizations {
        uuid id PK "组织ID"
        varchar name UK "组织名称"
        varchar code UK "组织编码"
        uuid parent_id FK "父组织ID"
        integer level "层级"
        boolean is_active "是否激活"
    }
    
    departments {
        uuid id PK "部门ID"
        uuid org_id FK "组织ID"
        varchar name "部门名称"
        varchar code "部门编码"
        uuid parent_id FK "父部门ID"
        uuid manager_id FK "部门负责人"
        integer level "层级"
    }
    
    user_departments {
        uuid id PK "关联ID"
        uuid user_id FK "用户ID"
        uuid dept_id FK "部门ID"
        boolean is_primary "是否主部门"
        varchar position "职位"
    }
```

### 2.3 项目任务模型

```mermaid
erDiagram
    organizations ||--o{ projects : "拥有"
    users ||--o{ projects : "负责"
    projects ||--o{ project_members : "包含"
    users ||--o{ project_members : "参与"
    projects ||--o{ tasks : "包含"
    tasks ||--o{ tasks : "父子层级"
    tasks ||--o{ task_comments : "包含"
    users ||--o{ tasks : "执行"
    users ||--o{ tasks : "报告"
    
    projects {
        uuid id PK "项目ID"
        varchar name "项目名称"
        varchar code UK "项目编码"
        uuid org_id FK "组织ID"
        uuid owner_id FK "负责人ID"
        project_status status "状态"
        integer progress "进度"
        date start_date "开始日期"
        date end_date "结束日期"
    }
    
    project_members {
        uuid id PK "成员ID"
        uuid project_id FK "项目ID"
        uuid user_id FK "用户ID"
        varchar role "角色"
        timestamp joined_at "加入时间"
    }
    
    tasks {
        uuid id PK "任务ID"
        uuid project_id FK "项目ID"
        uuid parent_id FK "父任务ID"
        varchar title "任务标题"
        text description "描述"
        task_status status "状态"
        task_priority priority "优先级"
        uuid assignee_id FK "执行人ID"
        uuid reporter_id FK "报告人ID"
        integer progress "进度"
        date due_date "截止日期"
    }
    
    task_comments {
        uuid id PK "评论ID"
        uuid task_id FK "任务ID"
        uuid author_id FK "作者ID"
        text content "内容"
        timestamp created_at "创建时间"
    }
```

### 2.4 会话管理模型

```mermaid
erDiagram
    users ||--o{ sessions : "拥有"
    
    sessions {
        uuid id PK "会话ID"
        uuid user_id FK "用户ID"
        varchar token_hash UK "令牌哈希"
        varchar refresh_token_hash UK "刷新令牌哈希"
        varchar device_type "设备类型"
        inet ip_address "IP地址"
        boolean is_active "是否活跃"
        timestamp expires_at "过期时间"
        timestamp last_activity_at "最后活动时间"
    }
```

---

## 3. AI智能体Schema ER图

### 3.1 智能体核心模型

```mermaid
erDiagram
    agents ||--o{ agent_group_members : "属于"
    agent_groups ||--o{ agent_group_members : "包含"
    agents ||--o| agent_groups : "领导"
    agents ||--o{ conversations : "参与"
    models ||--o{ conversations : "使用"
    users ||--o{ conversations : "发起"
    
    agents {
        uuid id PK "智能体ID"
        varchar name "名称"
        varchar code UK "编码"
        agent_type type "类型"
        agent_status status "状态"
        jsonb capabilities "能力列表"
        jsonb model_config "模型配置"
        text system_prompt "系统提示词"
        uuid[] knowledge_base_ids "知识库ID列表"
        integer max_concurrent_tasks "最大并发数"
    }
    
    agent_groups {
        uuid id PK "协作组ID"
        varchar name "名称"
        varchar code UK "编码"
        uuid[] agent_ids "成员ID列表"
        uuid leader_agent_id FK "组长ID"
        varchar collaboration_mode "协作模式"
    }
    
    agent_group_members {
        uuid id PK "成员ID"
        uuid group_id FK "协作组ID"
        uuid agent_id FK "智能体ID"
        varchar role "角色"
        integer priority "优先级"
    }
```

### 3.2 对话消息模型

```mermaid
erDiagram
    conversations ||--o{ messages : "包含"
    models ||--o{ messages : "生成"
    messages ||--o| messages : "父消息"
    messages ||--o{ message_feedback : "收到"
    users ||--o{ message_feedback : "提供"
    
    conversations {
        uuid id PK "对话ID"
        uuid user_id FK "用户ID"
        uuid agent_id FK "智能体ID"
        uuid model_id FK "模型ID"
        varchar title "标题"
        conversation_status status "状态"
        integer total_tokens "总Token数"
        timestamp last_message_at "最后消息时间"
    }
    
    messages {
        uuid id PK "消息ID"
        uuid conversation_id FK "对话ID"
        uuid parent_id FK "父消息ID"
        varchar role "角色"
        text content "内容"
        integer prompt_tokens "提示Token"
        integer completion_tokens "完成Token"
        uuid model_id FK "模型ID"
        vector embedding "向量嵌入"
        jsonb tool_calls "工具调用"
    }
    
    message_feedback {
        uuid id PK "反馈ID"
        uuid message_id FK "消息ID"
        uuid user_id FK "用户ID"
        integer rating "评分"
        text comment "评论"
        boolean is_helpful "是否有帮助"
    }
```

### 3.3 知识库模型

```mermaid
erDiagram
    knowledge_bases ||--o{ documents : "包含"
    documents ||--o{ document_chunks : "分块"
    models ||--o| knowledge_bases : "嵌入模型"
    users ||--o| knowledge_bases : "拥有"
    organizations ||--o| knowledge_bases : "所属"
    
    knowledge_bases {
        uuid id PK "知识库ID"
        varchar name "名称"
        varchar code UK "编码"
        varchar type "类型"
        uuid owner_id FK "所有者ID"
        uuid org_id FK "组织ID"
        uuid embedding_model_id FK "嵌入模型ID"
        integer document_count "文档数"
        integer chunk_count "分块数"
        integer embedding_dimension "向量维度"
    }
    
    documents {
        uuid id PK "文档ID"
        uuid knowledge_base_id FK "知识库ID"
        varchar title "标题"
        varchar source_type "来源类型"
        varchar source_url "来源URL"
        varchar content_hash UK "内容哈希"
        document_status status "状态"
        integer chunk_count "分块数"
        timestamp processed_at "处理时间"
    }
    
    document_chunks {
        uuid id PK "分块ID"
        uuid document_id FK "文档ID"
        uuid knowledge_base_id FK "知识库ID"
        text content "内容"
        vector embedding "向量嵌入"
        integer chunk_index "分块索引"
        jsonb metadata "元数据"
    }
```

---

## 4. 工作流Schema ER图

### 4.1 工作流执行模型

```mermaid
erDiagram
    definitions ||--o{ executions : "执行"
    executions ||--o{ node_executions : "包含"
    users ||--o{ executions : "执行"
    
    definitions {
        uuid id PK "定义ID"
        varchar name "名称"
        varchar code UK "编码"
        jsonb definition "工作流定义"
        jsonb triggers "触发器"
        jsonb variables "变量"
        workflow_status status "状态"
        integer timeout_seconds "超时秒数"
        integer execution_count "执行次数"
    }
    
    executions {
        uuid id PK "执行ID"
        uuid workflow_id FK "工作流ID"
        varchar trigger_type "触发类型"
        jsonb input "输入"
        jsonb output "输出"
        execution_status status "状态"
        timestamp started_at "开始时间"
        timestamp completed_at "完成时间"
        integer duration_seconds "耗时"
        uuid executed_by FK "执行人ID"
    }
    
    node_executions {
        uuid id PK "节点执行ID"
        uuid execution_id FK "执行ID"
        varchar node_id "节点ID"
        varchar node_type "节点类型"
        execution_status status "状态"
        jsonb input "输入"
        jsonb output "输出"
        timestamp started_at "开始时间"
        timestamp completed_at "完成时间"
    }
```

### 4.2 审批流程模型

```mermaid
erDiagram
    approval_flows ||--o{ approval_applications : "发起"
    approval_applications ||--o{ approval_records : "审批"
    users ||--o{ approval_applications : "申请"
    users ||--o{ approval_records : "审批"
    
    approval_flows {
        uuid id PK "流程ID"
        varchar name "名称"
        varchar code UK "编码"
        jsonb steps "审批步骤"
        integer timeout_hours "超时小时"
        boolean is_active "是否激活"
    }
    
    approval_applications {
        uuid id PK "申请ID"
        uuid flow_id FK "流程ID"
        uuid applicant_id FK "申请人ID"
        varchar title "标题"
        text content "内容"
        approval_status status "状态"
        integer current_level "当前层级"
        timestamp submitted_at "提交时间"
    }
    
    approval_records {
        uuid id PK "记录ID"
        uuid application_id FK "申请ID"
        uuid approver_id FK "审批人ID"
        integer level "层级"
        approval_action action "动作"
        text comment "评论"
        timestamp created_at "创建时间"
    }
```

---

## 5. 监控Schema ER图

```mermaid
erDiagram
    devices ||--o{ metrics : "产生"
    devices ||--o{ alerts : "触发"
    alert_rules ||--o{ alerts : "生成"
    alerts ||--o{ notifications : "通知"
    notification_channels ||--o{ notifications : "发送"
    
    devices {
        uuid id PK "设备ID"
        varchar name "名称"
        varchar code UK "编码"
        device_type type "类型"
        inet ip_address "IP地址"
        device_status status "状态"
        jsonb config "配置"
        timestamp last_heartbeat_at "最后心跳"
    }
    
    metrics {
        uuid id PK "指标ID"
        uuid device_id FK "设备ID"
        varchar metric_name "指标名称"
        float metric_value "指标值"
        jsonb labels "标签"
        timestamp collected_at "采集时间"
    }
    
    alert_rules {
        uuid id PK "规则ID"
        varchar name "名称"
        varchar metric_name "指标名称"
        varchar condition "条件"
        float threshold "阈值"
        alert_severity severity "严重程度"
        boolean is_active "是否激活"
    }
    
    alerts {
        uuid id PK "告警ID"
        uuid rule_id FK "规则ID"
        uuid device_id FK "设备ID"
        alert_severity severity "严重程度"
        alert_status status "状态"
        text message "消息"
        timestamp triggered_at "触发时间"
        timestamp resolved_at "解决时间"
    }
    
    notifications {
        uuid id PK "通知ID"
        uuid alert_id FK "告警ID"
        uuid channel_id FK "渠道ID"
        varchar status "状态"
        timestamp sent_at "发送时间"
    }
```

---

## 6. 扩展Schema ER图

```mermaid
erDiagram
    plugins ||--o{ plugin_configs : "配置"
    users ||--o| plugins : "拥有"
    users ||--o{ api_keys : "使用"
    users ||--o{ webhooks : "创建"
    webhooks ||--o{ webhook_events : "触发"
    
    plugins {
        uuid id PK "插件ID"
        varchar name "名称"
        varchar code UK "编码"
        varchar version "版本"
        jsonb permissions "权限"
        plugin_status status "状态"
        integer download_count "下载数"
        decimal rating "评分"
    }
    
    plugin_configs {
        uuid id PK "配置ID"
        uuid plugin_id FK "插件ID"
        varchar scope "范围"
        uuid scope_id "范围ID"
        jsonb config "配置"
    }
    
    api_keys {
        uuid id PK "密钥ID"
        varchar name "名称"
        varchar key_hash UK "密钥哈希"
        jsonb permissions "权限"
        integer rate_limit "速率限制"
        api_key_status status "状态"
        timestamp expires_at "过期时间"
    }
    
    webhooks {
        uuid id PK "WebhookID"
        varchar name "名称"
        varchar code UK "编码"
        varchar url "URL"
        jsonb events "事件"
        boolean is_active "是否激活"
        varchar secret "密钥"
    }
    
    webhook_events {
        uuid id PK "事件ID"
        uuid webhook_id FK "WebhookID"
        varchar event_type "事件类型"
        jsonb payload "负载"
        varchar status "状态"
        integer retry_count "重试次数"
        timestamp sent_at "发送时间"
    }
```

---

## 7. 实体关系汇总

### 7.1 核心实体关系矩阵

| 实体 | 关联实体 | 关系类型 | 说明 |
|------|----------|----------|------|
| users | roles | N:M | 用户拥有多个角色 |
| roles | permissions | N:M | 角色包含多个权限 |
| users | departments | N:M | 用户属于多个部门 |
| users | projects | N:M | 用户参与多个项目 |
| projects | tasks | 1:N | 项目包含多个任务 |
| tasks | tasks | 1:N | 任务有子任务 |
| agents | conversations | 1:N | 智能体参与多个对话 |
| conversations | messages | 1:N | 对话包含多条消息 |
| knowledge_bases | documents | 1:N | 知识库包含多个文档 |
| documents | document_chunks | 1:N | 文档分成多个块 |

### 7.2 跨Schema关系

| 源Schema | 源实体 | 目标Schema | 目标实体 | 关系说明 |
|----------|--------|------------|----------|----------|
| core | users | ai | conversations | 用户发起对话 |
| core | users | ai | knowledge_bases | 用户拥有知识库 |
| core | users | workflow | executions | 用户执行工作流 |
| core | users | audit | logs | 用户操作审计 |
| core | users | extension | api_keys | 用户使用API密钥 |
| ai | agents | workflow | definitions | 智能体定义工作流 |
| monitor | alerts | extension | webhooks | 告警触发Webhook |

---

## 8. 数据流图

### 8.1 用户认证流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant S as sessions表
    participant UR as user_roles表
    participant RP as role_permissions表
    
    U->>S: 1. 登录请求
    S->>S: 2. 创建会话记录
    S->>UR: 3. 查询用户角色
    UR->>RP: 4. 查询角色权限
    RP-->>U: 5. 返回权限列表
    S-->>U: 6. 返回Token
```

### 8.2 AI对话流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant C as conversations表
    participant M as messages表
    participant KB as knowledge_bases表
    participant DC as document_chunks表
    
    U->>C: 1. 创建对话
    U->>M: 2. 发送消息
    M->>KB: 3. 查询相关知识库
    KB->>DC: 4. 向量相似度搜索
    DC-->>M: 5. 返回相关内容
    M->>M: 6. 生成回复
    M-->>U: 7. 返回AI回复
```

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>
