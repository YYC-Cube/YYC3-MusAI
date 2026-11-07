-- =====================================================
-- YYC³-AI-Family 数据库初始化脚本
-- @file: 01_init_database.sql
-- @description: 创建数据库、扩展和基础Schema
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 创建数据库（如果不存在）
-- CREATE DATABASE yyc3_ai_family;

-- 连接到数据库
-- \c yyc3_ai_family;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID生成
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- 加密函数
CREATE EXTENSION IF NOT EXISTS "pgvector";       -- 向量存储
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- 性能统计
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- 文本相似度

-- 创建Schema
CREATE SCHEMA IF NOT EXISTS core;        -- 核心业务Schema
CREATE SCHEMA IF NOT EXISTS ai;          -- AI智能体Schema
CREATE SCHEMA IF NOT EXISTS workflow;    -- 工作流Schema
CREATE SCHEMA IF NOT EXISTS audit;       -- 审计Schema
CREATE SCHEMA IF NOT EXISTS monitor;     -- 监控Schema
CREATE SCHEMA IF NOT EXISTS extension;   -- 扩展Schema

-- 设置默认Schema
SET search_path TO core, ai, workflow, audit, monitor, extension, public;

-- 创建枚举类型
-- 用户状态
CREATE TYPE user_status AS ENUM (
    'active',        -- 活跃
    'inactive',      -- 未激活
    'suspended',     -- 已暂停
    'deleted'        -- 已删除
);

-- 角色类型
CREATE TYPE role_type AS ENUM (
    'super_admin',      -- 超级管理员
    'system_admin',     -- 系统管理员
    'security_admin',   -- 安全管理员
    'auditor',          -- 审计人员
    'business_owner',   -- 业务负责人
    'developer',        -- 开发者
    'user'              -- 普通用户
);

-- AI智能体类型
CREATE TYPE agent_type AS ENUM (
    'navigator',    -- 智愈·领航员
    'thinker',      -- 洞见·思想家
    'prophet',      -- 预见·先知
    'bolero',       -- 知遇·伯乐
    'meta_oracle',  -- 元启·天枢
    'sentinel',     -- 卫安·哨兵
    'master'        -- 格物·宗师
);

-- AI智能体状态
CREATE TYPE agent_status AS ENUM (
    'idle',         -- 空闲
    'busy',         -- 忙碌
    'error',        -- 错误
    'offline',      -- 离线
    'maintenance'   -- 维护中
);

-- 任务状态
CREATE TYPE task_status AS ENUM (
    'pending',      -- 待处理
    'running',      -- 运行中
    'completed',    -- 已完成
    'failed',       -- 失败
    'cancelled'     -- 已取消
);

-- 任务优先级
CREATE TYPE task_priority AS ENUM (
    'low',          -- 低
    'medium',       -- 中
    'high',         -- 高
    'critical'      -- 紧急
);

-- 项目状态
CREATE TYPE project_status AS ENUM (
    'planning',     -- 规划中
    'active',       -- 活跃
    'paused',       -- 已暂停
    'completed',    -- 已完成
    'archived'      -- 已归档
);

-- 工作流状态
CREATE TYPE workflow_status AS ENUM (
    'draft',        -- 草稿
    'published',    -- 已发布
    'deprecated',   -- 已废弃
    'archived'      -- 已归档
);

-- 执行状态
CREATE TYPE execution_status AS ENUM (
    'pending',      -- 待执行
    'running',      -- 执行中
    'success',      -- 成功
    'failed',       -- 失败
    'timeout',      -- 超时
    'cancelled'     -- 已取消
);

-- 通知类型
CREATE TYPE notification_type AS ENUM (
    'email',        -- 邮件
    'sms',          -- 短信
    'push',         -- 推送
    'webhook',      -- Webhook
    'in_app'        -- 站内消息
);

-- 通知状态
CREATE TYPE notification_status AS ENUM (
    'pending',      -- 待发送
    'sent',         -- 已发送
    'delivered',    -- 已送达
    'read',         -- 已读
    'failed'        -- 发送失败
);

-- 审计操作类型
CREATE TYPE audit_operation_type AS ENUM (
    'create',       -- 创建
    'update',       -- 更新
    'delete',       -- 删除
    'read',         -- 读取
    'login',        -- 登录
    'logout',       -- 登出
    'export',       -- 导出
    'import',       -- 导入
    'approve',      -- 审批
    'reject'        -- 拒绝
);

-- 审计操作级别
CREATE TYPE audit_operation_level AS ENUM (
    'info',         -- 信息
    'warning',      -- 警告
    'error',        -- 错误
    'critical'      -- 严重
);

-- 插件状态
CREATE TYPE plugin_status AS ENUM (
    'installed',    -- 已安装
    'enabled',      -- 已启用
    'disabled',     -- 已禁用
    'error',        -- 错误
    'uninstalled'   -- 已卸载
);

-- API密钥状态
CREATE TYPE api_key_status AS ENUM (
    'active',       -- 活跃
    'expired',      -- 已过期
    'revoked',      -- 已撤销
    'suspended'     -- 已暂停
);

-- 告警级别
CREATE TYPE alert_level AS ENUM (
    'info',         -- 信息
    'warning',      -- 警告
    'error',        -- 错误
    'critical'      -- 严重
);

-- 告警状态
CREATE TYPE alert_status AS ENUM (
    'active',       -- 活跃
    'acknowledged', -- 已确认
    'resolved',     -- 已解决
    'suppressed'    -- 已抑制
);

-- 设备类型
CREATE TYPE device_type AS ENUM (
    'server',       -- 服务器
    'instance',     -- 实例
    'database',     -- 数据库
    'cache',        -- 缓存
    'storage',      -- 存储
    'network'       -- 网络
);

-- 设备状态
CREATE TYPE device_status AS ENUM (
    'running',      -- 运行中
    'stopped',      -- 已停止
    'error',        -- 错误
    'maintenance',  -- 维护中
    'offline'       -- 离线
);

-- 输出成功信息
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成: 扩展、Schema和枚举类型已创建';
END $$;
