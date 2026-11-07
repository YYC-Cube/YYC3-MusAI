-- =====================================================
-- YYC³-AI-Family 认证函数创建脚本
-- @file: auth_functions.sql
-- @description: 创建认证、授权相关存储过程和函数
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 密码管理函数
-- =====================================================

CREATE OR REPLACE FUNCTION core.hash_password(
    p_password VARCHAR,
    p_salt VARCHAR DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
    v_salt VARCHAR;
BEGIN
    v_salt := COALESCE(p_salt, encode(gen_random_bytes(16), 'hex'));
    RETURN crypt(p_password, v_salt);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.hash_password(VARCHAR, VARCHAR) IS '密码哈希函数';

CREATE OR REPLACE FUNCTION core.verify_password(
    p_password VARCHAR,
    p_hash VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_hash = crypt(p_password, p_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.verify_password(VARCHAR, VARCHAR) IS '密码验证函数';

-- =====================================================
-- Token管理函数
-- =====================================================

CREATE OR REPLACE FUNCTION core.generate_token(
    p_user_id UUID,
    p_device_type VARCHAR DEFAULT 'web',
    p_ip_address INET DEFAULT NULL,
    p_expires_hours INTEGER DEFAULT 24
) RETURNS TABLE (
    token_hash VARCHAR,
    refresh_token_hash VARCHAR,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_token VARCHAR;
    v_refresh_token VARCHAR;
    v_token_hash VARCHAR;
    v_refresh_hash VARCHAR;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    v_token := encode(gen_random_bytes(32), 'hex');
    v_refresh_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := digest(v_token, 'sha256');
    v_refresh_hash := digest(v_refresh_token, 'sha256');
    v_expires_at := CURRENT_TIMESTAMP + (p_expires_hours || ' hours')::INTERVAL;

    INSERT INTO core.sessions (
        user_id,
        token_hash,
        refresh_token_hash,
        device_type,
        ip_address,
        expires_at,
        refresh_expires_at
    ) VALUES (
        p_user_id,
        v_token_hash,
        v_refresh_hash,
        p_device_type,
        p_ip_address,
        v_expires_at,
        CURRENT_TIMESTAMP + '7 days'::INTERVAL
    );

    RETURN QUERY SELECT v_token_hash, v_refresh_hash, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.generate_token(UUID, VARCHAR, INET, INTEGER) IS '生成访问令牌';

CREATE OR REPLACE FUNCTION core.refresh_token(
    p_refresh_token_hash VARCHAR,
    p_ip_address INET DEFAULT NULL
) RETURNS TABLE (
    token_hash VARCHAR,
    refresh_token_hash VARCHAR,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_session RECORD;
    v_new_token VARCHAR;
    v_new_refresh VARCHAR;
    v_new_token_hash VARCHAR;
    v_new_refresh_hash VARCHAR;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT * INTO v_session
    FROM core.sessions
    WHERE refresh_token_hash = p_refresh_token_hash
      AND is_active = TRUE
      AND refresh_expires_at > CURRENT_TIMESTAMP;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired refresh token';
    END IF;

    UPDATE core.sessions SET is_active = FALSE WHERE id = v_session.id;

    v_new_token := encode(gen_random_bytes(32), 'hex');
    v_new_refresh := encode(gen_random_bytes(32), 'hex');
    v_new_token_hash := digest(v_new_token, 'sha256');
    v_new_refresh_hash := digest(v_new_refresh, 'sha256');
    v_expires_at := CURRENT_TIMESTAMP + '24 hours'::INTERVAL;

    INSERT INTO core.sessions (
        user_id,
        token_hash,
        refresh_token_hash,
        device_type,
        ip_address,
        expires_at,
        refresh_expires_at
    ) VALUES (
        v_session.user_id,
        v_new_token_hash,
        v_new_refresh_hash,
        v_session.device_type,
        p_ip_address,
        v_expires_at,
        CURRENT_TIMESTAMP + '7 days'::INTERVAL
    );

    RETURN QUERY SELECT v_new_token_hash, v_new_refresh_hash, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.refresh_token(VARCHAR, INET) IS '刷新访问令牌';

CREATE OR REPLACE FUNCTION core.invalidate_token(
    p_token_hash VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE core.sessions
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE token_hash = p_token_hash;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.invalidate_token(VARCHAR) IS '使令牌失效';

CREATE OR REPLACE FUNCTION core.invalidate_all_user_tokens(
    p_user_id UUID,
    p_except_token_hash VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE core.sessions
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id
      AND is_active = TRUE
      AND (p_except_token_hash IS NULL OR token_hash != p_except_token_hash);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.invalidate_all_user_tokens(UUID, VARCHAR) IS '使用户所有令牌失效';

-- =====================================================
-- 权限检查函数
-- =====================================================

CREATE OR REPLACE FUNCTION core.has_permission(
    p_user_id UUID,
    p_permission_code VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM core.user_roles ur
        JOIN core.role_permissions rp ON ur.role_id = rp.role_id
        JOIN core.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
          AND p.code = p_permission_code
          AND p.is_active = TRUE
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION core.has_permission(UUID, VARCHAR) IS '检查用户是否拥有指定权限';

CREATE OR REPLACE FUNCTION core.has_any_permission(
    p_user_id UUID,
    p_permission_codes VARCHAR[]
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM core.user_roles ur
        JOIN core.role_permissions rp ON ur.role_id = rp.role_id
        JOIN core.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
          AND p.code = ANY(p_permission_codes)
          AND p.is_active = TRUE
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION core.has_any_permission(UUID, VARCHAR[]) IS '检查用户是否拥有任意指定权限';

CREATE OR REPLACE FUNCTION core.has_all_permissions(
    p_user_id UUID,
    p_permission_codes VARCHAR[]
) RETURNS BOOLEAN AS $$
DECLARE
    v_required_count INTEGER;
    v_actual_count INTEGER;
BEGIN
    v_required_count := array_length(p_permission_codes, 1);

    SELECT COUNT(DISTINCT p.code) INTO v_actual_count
    FROM core.user_roles ur
    JOIN core.role_permissions rp ON ur.role_id = rp.role_id
    JOIN core.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.code = ANY(p_permission_codes)
      AND p.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

    RETURN v_actual_count = v_required_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION core.has_all_permissions(UUID, VARCHAR[]) IS '检查用户是否拥有所有指定权限';

-- =====================================================
-- 角色管理函数
-- =====================================================

CREATE OR REPLACE FUNCTION core.assign_role(
    p_user_id UUID,
    p_role_id UUID,
    p_assigned_by UUID,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_is_primary BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_is_primary THEN
        UPDATE core.user_roles
        SET is_primary = FALSE
        WHERE user_id = p_user_id AND is_primary = TRUE;
    END IF;

    INSERT INTO core.user_roles (
        user_id,
        role_id,
        assigned_by,
        expires_at,
        is_primary
    ) VALUES (
        p_user_id,
        p_role_id,
        p_assigned_by,
        p_expires_at,
        p_is_primary
    )
    ON CONFLICT (user_id, role_id) DO UPDATE SET
        assigned_by = p_assigned_by,
        expires_at = p_expires_at,
        is_primary = p_is_primary,
        assigned_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.assign_role(UUID, UUID, UUID, TIMESTAMP WITH TIME ZONE, BOOLEAN) IS '为用户分配角色';

CREATE OR REPLACE FUNCTION core.revoke_role(
    p_user_id UUID,
    p_role_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM core.user_roles
    WHERE user_id = p_user_id AND role_id = p_role_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.revoke_role(UUID, UUID) IS '撤销用户角色';

-- =====================================================
-- 会话管理函数
-- =====================================================

CREATE OR REPLACE FUNCTION core.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM core.sessions
    WHERE (expires_at < CURRENT_TIMESTAMP OR is_active = FALSE)
      AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.cleanup_expired_sessions() IS '清理过期会话';

CREATE OR REPLACE FUNCTION core.get_active_sessions(
    p_user_id UUID
) RETURNS TABLE (
    id UUID,
    device_type VARCHAR,
    device_name VARCHAR,
    ip_address INET,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.device_type,
        s.device_name,
        s.ip_address,
        s.last_activity_at,
        s.created_at,
        s.expires_at
    FROM core.sessions s
    WHERE s.user_id = p_user_id
      AND s.is_active = TRUE
      AND s.expires_at > CURRENT_TIMESTAMP
    ORDER BY s.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION core.get_active_sessions(UUID) IS '获取用户活跃会话列表';
