-- =====================================================
-- YYC³-AI-Family 活跃用户视图创建脚本
-- @file: active_users_view.sql
-- @description: 创建活跃用户相关视图
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- =====================================================
-- 活跃用户视图
-- =====================================================

CREATE OR REPLACE VIEW core.v_active_users AS
SELECT
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.avatar_url,
    u.phone,
    u.status,
    u.last_login_at,
    u.login_count,
    u.created_at,
    u.updated_at,
    r.id AS primary_role_id,
    r.name AS primary_role_name,
    r.code AS primary_role_code,
    d.id AS primary_dept_id,
    d.name AS primary_dept_name,
    o.id AS org_id,
    o.name AS org_name,
    s.last_activity_at,
    s.device_type AS last_device_type,
    s.ip_address AS last_ip
FROM core.users u
LEFT JOIN core.user_roles ur ON u.id = ur.user_id AND ur.is_primary = TRUE
LEFT JOIN core.roles r ON ur.role_id = r.id
LEFT JOIN core.user_departments ud ON u.id = ud.user_id AND ud.is_primary = TRUE
LEFT JOIN core.departments d ON ud.dept_id = d.id
LEFT JOIN core.organizations o ON d.org_id = o.id
LEFT JOIN LATERAL (
    SELECT last_activity_at, device_type, ip_address
    FROM core.sessions s
    WHERE s.user_id = u.id AND s.is_active = TRUE AND s.expires_at > CURRENT_TIMESTAMP
    ORDER BY s.last_activity_at DESC
    LIMIT 1
) s ON TRUE
WHERE u.deleted_at IS NULL
  AND u.status = 'active'
  AND u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

COMMENT ON VIEW core.v_active_users IS '活跃用户视图（30天内登录）';

-- =====================================================
-- 用户在线状态视图
-- =====================================================

CREATE OR REPLACE VIEW core.v_user_online_status AS
SELECT
    u.id AS user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    CASE 
        WHEN s.id IS NOT NULL AND s.expires_at > CURRENT_TIMESTAMP THEN TRUE
        ELSE FALSE
    END AS is_online,
    s.last_activity_at,
    s.device_type,
    s.ip_address,
    s.expires_at
FROM core.users u
LEFT JOIN LATERAL (
    SELECT id, last_activity_at, device_type, ip_address, expires_at
    FROM core.sessions s
    WHERE s.user_id = u.id 
      AND s.is_active = TRUE 
      AND s.expires_at > CURRENT_TIMESTAMP
    ORDER BY s.last_activity_at DESC
    LIMIT 1
) s ON TRUE
WHERE u.deleted_at IS NULL
  AND u.status = 'active';

COMMENT ON VIEW core.v_user_online_status IS '用户在线状态视图';

-- =====================================================
-- 用户登录统计视图
-- =====================================================

CREATE OR REPLACE VIEW core.v_user_login_stats AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.full_name,
    u.login_count,
    u.failed_login_count,
    u.last_login_at,
    u.last_login_ip,
    COUNT(DISTINCT s.id) AS total_sessions,
    COUNT(DISTINCT DATE(s.created_at)) AS active_days,
    MAX(s.last_activity_at) AS last_activity_at,
    MIN(s.created_at) AS first_session_at
FROM core.users u
LEFT JOIN core.sessions s ON u.id = s.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.email, u.full_name, u.login_count, 
         u.failed_login_count, u.last_login_at, u.last_login_ip;

COMMENT ON VIEW core.v_user_login_stats IS '用户登录统计视图';

-- =====================================================
-- 用户权限汇总视图
-- =====================================================

CREATE OR REPLACE VIEW core.v_user_permission_summary AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.full_name,
    STRING_AGG(DISTINCT r.code, ', ' ORDER BY r.code) AS role_codes,
    STRING_AGG(DISTINCT r.name, ', ' ORDER BY r.name) AS role_names,
    COUNT(DISTINCT p.id) AS total_permissions,
    COUNT(DISTINCT p.resource) AS accessible_resources
FROM core.users u
JOIN core.user_roles ur ON u.id = ur.user_id
JOIN core.roles r ON ur.role_id = r.id AND r.is_active = TRUE
JOIN core.role_permissions rp ON r.id = rp.role_id
JOIN core.permissions p ON rp.permission_id = p.id AND p.is_active = TRUE
WHERE u.deleted_at IS NULL
  AND u.status = 'active'
  AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
GROUP BY u.id, u.username, u.email, u.full_name;

COMMENT ON VIEW core.v_user_permission_summary IS '用户权限汇总视图';

-- =====================================================
-- 最近活跃用户视图（按时间段）
-- =====================================================

CREATE OR REPLACE VIEW core.v_recently_active_users AS
WITH time_ranges AS (
    SELECT
        u.id AS user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.status,
        COUNT(CASE WHEN s.last_activity_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 1 END) AS online_5m,
        COUNT(CASE WHEN s.last_activity_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) AS online_1h,
        COUNT(CASE WHEN s.last_activity_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) AS online_24h,
        COUNT(CASE WHEN s.last_activity_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) AS online_7d,
        COUNT(CASE WHEN s.last_activity_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) AS online_30d
    FROM core.users u
    LEFT JOIN core.sessions s ON u.id = s.user_id AND s.is_active = TRUE
    WHERE u.deleted_at IS NULL
    GROUP BY u.id, u.username, u.full_name, u.avatar_url, u.status
)
SELECT
    user_id,
    username,
    full_name,
    avatar_url,
    status,
    online_5m > 0 AS is_online,
    online_5m,
    online_1h,
    online_24h,
    online_7d,
    online_30d
FROM time_ranges
WHERE online_30d > 0;

COMMENT ON VIEW core.v_recently_active_users IS '最近活跃用户视图（多时间段）';

-- =====================================================
-- 用户设备分布视图
-- =====================================================

CREATE OR REPLACE VIEW core.v_user_device_distribution AS
SELECT
    u.id AS user_id,
    u.username,
    u.full_name,
    s.device_type,
    s.device_name,
    s.ip_address,
    s.location_country,
    s.location_city,
    s.last_activity_at,
    s.expires_at,
    CASE 
        WHEN s.expires_at > CURRENT_TIMESTAMP THEN TRUE
        ELSE FALSE
    END AS is_active
FROM core.users u
JOIN core.sessions s ON u.id = s.user_id
WHERE u.deleted_at IS NULL
  AND u.status = 'active'
ORDER BY u.id, s.last_activity_at DESC;

COMMENT ON VIEW core.v_user_device_distribution IS '用户设备分布视图';
