-- =====================================================
-- YYC³-AI-Family pgcrypto扩展配置
-- @file: pgcrypto.sql
-- @description: 配置pgcrypto加密扩展
-- @author: YYC³ Team
-- @version: v1.0.0
-- @created: 2026-02-23
-- @updated: 2026-02-23
-- =====================================================

-- 创建pgcrypto扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 密码哈希函数
CREATE OR REPLACE FUNCTION core.secure_hash_password(
    p_password VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
    RETURN crypt(p_password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

COMMENT ON FUNCTION core.secure_hash_password(VARCHAR) IS '使用bcrypt安全哈希密码';

-- 密码验证函数
CREATE OR REPLACE FUNCTION core.secure_verify_password(
    p_password VARCHAR,
    p_hash VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_hash = crypt(p_password, p_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

COMMENT ON FUNCTION core.secure_verify_password(VARCHAR, VARCHAR) IS '验证密码与哈希是否匹配';

-- 数据加密函数
CREATE OR REPLACE FUNCTION core.encrypt_data(
    p_data TEXT,
    p_key VARCHAR
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(encrypt(p_data::bytea, p_key::bytea, 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.encrypt_data(TEXT, VARCHAR) IS '使用AES加密数据';

-- 数据解密函数
CREATE OR REPLACE FUNCTION core.decrypt_data(
    p_encrypted_data TEXT,
    p_key VARCHAR
) RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(decode(p_encrypted_data, 'base64'), p_key::bytea, 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.decrypt_data(TEXT, VARCHAR) IS '使用AES解密数据';

-- 生成随机令牌
CREATE OR REPLACE FUNCTION core.generate_secure_token(
    p_length INTEGER DEFAULT 32
) RETURNS VARCHAR AS $$
BEGIN
    RETURN encode(gen_random_bytes(p_length), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION core.generate_secure_token(INTEGER) IS '生成安全随机令牌';

-- 生成UUID
CREATE OR REPLACE FUNCTION core.generate_uuid()
RETURNS UUID AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION core.generate_uuid() IS '生成随机UUID';

-- 敏感数据脱敏函数
CREATE OR REPLACE FUNCTION core.mask_email(
    p_email VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    v_at_pos INTEGER;
    v_username VARCHAR;
    v_domain VARCHAR;
BEGIN
    v_at_pos := position('@' IN p_email);
    IF v_at_pos IS NULL OR v_at_pos < 2 THEN
        RETURN '***@***.***';
    END IF;

    v_username := substring(p_email, 1, v_at_pos - 1);
    v_domain := substring(p_email, v_at_pos + 1);

    RETURN substring(v_username, 1, 2) || '***@' || v_domain;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION core.mask_email(VARCHAR) IS '邮箱脱敏函数';

CREATE OR REPLACE FUNCTION core.mask_phone(
    p_phone VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
    IF p_phone IS NULL OR length(p_phone) < 7 THEN
        RETURN '*******';
    END IF;

    RETURN substring(p_phone, 1, 3) || '****' || substring(p_phone, length(p_phone) - 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION core.mask_phone(VARCHAR) IS '手机号脱敏函数';

CREATE OR REPLACE FUNCTION core.mask_id_card(
    p_id_card VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
    IF p_id_card IS NULL OR length(p_id_card) < 8 THEN
        RETURN '**************';
    END IF;

    RETURN substring(p_id_card, 1, 4) || '**********' || substring(p_id_card, length(p_id_card) - 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION core.mask_id_card(VARCHAR) IS '身份证号脱敏函数';

-- 生成签名函数
CREATE OR REPLACE FUNCTION core.generate_signature(
    p_data TEXT,
    p_secret VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
    RETURN encode(hmac(p_data::bytea, p_secret::bytea, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

COMMENT ON FUNCTION core.generate_signature(TEXT, VARCHAR) IS '生成HMAC-SHA256签名';

-- 验证签名函数
CREATE OR REPLACE FUNCTION core.verify_signature(
    p_data TEXT,
    p_signature VARCHAR,
    p_secret VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_signature = encode(hmac(p_data::bytea, p_secret::bytea, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

COMMENT ON FUNCTION core.verify_signature(TEXT, VARCHAR, VARCHAR) IS '验证HMAC-SHA256签名';
