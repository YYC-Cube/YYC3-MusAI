-- ============================================================================
-- YYC³ MusAI · 审计日志表（musai schema）
-- 由 musai_owner 执行；应用侧以 musai_app_rw 仅需 INSERT 权限。
-- 应用启动时也会尝试 CREATE TABLE IF NOT EXISTS（无权限则自动降级 KV）。
-- ============================================================================

CREATE TABLE IF NOT EXISTS musai.audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  action     VARCHAR(80) NOT NULL,
  actor_id   VARCHAR(64),
  target_id  VARCHAR(64),
  ip         VARCHAR(64),
  success    BOOLEAN NOT NULL DEFAULT true,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_musai_audit_logs_created_at
  ON musai.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_musai_audit_logs_action
  ON musai.audit_logs (action);

COMMENT ON TABLE musai.audit_logs IS 'YYC³ MusAI 审计日志（认证/关注/歌单等关键操作）';
