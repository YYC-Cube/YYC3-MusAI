-- =====================================================
-- YYC³-AI-Family 数据库初始化回滚脚本
-- @file: 20260223000001_rollback.sql
-- @description: 回滚数据库初始化操作
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 删除枚举类型
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS role_type CASCADE;
DROP TYPE IF EXISTS agent_type CASCADE;
DROP TYPE IF EXISTS agent_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS workflow_status CASCADE;
DROP TYPE IF EXISTS execution_status CASCADE;
DROP TYPE IF EXISTS audit_operation_type CASCADE;
DROP TYPE IF EXISTS audit_operation_level CASCADE;
DROP TYPE IF EXISTS device_type CASCADE;
DROP TYPE IF EXISTS device_status CASCADE;
DROP TYPE IF EXISTS alert_severity CASCADE;
DROP TYPE IF EXISTS alert_status CASCADE;
DROP TYPE IF EXISTS plugin_status CASCADE;
DROP TYPE IF EXISTS api_key_status CASCADE;

-- 删除Schema
DROP SCHEMA IF EXISTS extension CASCADE;
DROP SCHEMA IF EXISTS monitor CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS workflow CASCADE;
DROP SCHEMA IF EXISTS ai CASCADE;
DROP SCHEMA IF EXISTS core CASCADE;

-- 删除扩展（谨慎操作）
-- DROP EXTENSION IF EXISTS pg_trgm;
-- DROP EXTENSION IF EXISTS pg_stat_statements;
-- DROP EXTENSION IF EXISTS pgvector;
-- DROP EXTENSION IF EXISTS pgcrypto;
-- DROP EXTENSION IF EXISTS "uuid-ossp";
