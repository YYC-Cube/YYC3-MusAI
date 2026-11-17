/**
 * 审计日志 — 写入 musai.audit_logs
 *
 * 表结构见 deploy/sql/001-musai-audit-logs.sql。
 * 落库失败（无 DDL 权限 / PG 不可用）时自动降级写入 KV，保证事件不丢。
 */

import { safeExecResult } from "./db.ts";
import { kv } from "./server-utils.ts";

export interface AuditEvent {
  action: string;
  actorId?: string | null;
  targetId?: string | null;
  ip?: string | null;
  success?: boolean;
  detail?: unknown;
}

let tableEnsured = false;
let warned = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  tableEnsured = true;
  await safeExecResult('audit.ensure', async (client) => {
    // 表已存在时直接复用（musai_app_rw 无 schema CREATE 权限，避免重复 DDL 报错）
    const exists = await client.query(`SELECT to_regclass('musai.audit_logs') AS t`);
    if (exists.rows[0]?.t) return;

    await client.query(
      `CREATE TABLE IF NOT EXISTS musai.audit_logs (
         id BIGSERIAL PRIMARY KEY,
         action VARCHAR(80) NOT NULL,
         actor_id VARCHAR(64),
         target_id VARCHAR(64),
         ip VARCHAR(64),
         success BOOLEAN NOT NULL DEFAULT true,
         detail JSONB,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_musai_audit_logs_created_at
         ON musai.audit_logs (created_at DESC)`,
    );
  });
}

/** 记录审计事件（永不抛出） */
export async function recordAudit(event: AuditEvent): Promise<void> {
  const detail = event.detail === undefined ? null : JSON.stringify(event.detail);
  let persisted = false;

  try {
    await ensureTable();
    persisted = await safeExecResult('audit.insert', async (client) => {
      await client.query(
        `INSERT INTO musai.audit_logs (action, actor_id, target_id, ip, success, detail)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          event.action.slice(0, 80),
          event.actorId ?? null,
          event.targetId ?? null,
          event.ip ?? null,
          event.success !== false,
          detail,
        ],
      );
    });
  } catch (error) {
    if (!warned) {
      warned = true;
      console.log('[Audit] 落库异常，降级 KV:', error);
    }
  }

  if (persisted) return;

  // KV 兜底
  try {
    await kv.set(
      `audit:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      JSON.stringify({ ...event, createdAt: new Date().toISOString() }),
    );
  } catch {
    // 忽略：审计不可用不应阻断业务
  }
}
