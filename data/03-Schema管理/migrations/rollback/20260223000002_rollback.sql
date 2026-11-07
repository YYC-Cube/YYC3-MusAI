-- =====================================================
-- YYC³-AI-Family 核心业务表回滚脚本
-- @file: 20260223000002_rollback.sql
-- @description: 回滚核心业务表创建操作
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 删除核心业务表（按依赖顺序倒序删除）
DROP TABLE IF EXISTS core.task_comments CASCADE;
DROP TABLE IF EXISTS core.tasks CASCADE;
DROP TABLE IF EXISTS core.project_members CASCADE;
DROP TABLE IF EXISTS core.projects CASCADE;
DROP TABLE IF EXISTS core.user_departments CASCADE;
DROP TABLE IF EXISTS core.departments CASCADE;
DROP TABLE IF EXISTS core.organizations CASCADE;
DROP TABLE IF EXISTS core.role_permissions CASCADE;
DROP TABLE IF EXISTS core.permissions CASCADE;
DROP TABLE IF EXISTS core.user_roles CASCADE;
DROP TABLE IF EXISTS core.roles CASCADE;
DROP TABLE IF EXISTS core.sessions CASCADE;
DROP TABLE IF EXISTS core.users CASCADE;
