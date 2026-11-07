-- ============================================================
-- D-Music 数据库完整设计方案
-- ============================================================
-- @file d_music_schema.sql
-- @description D-Music音乐平台数据库表结构
-- @author YYC³ Team
-- @version 1.0.0
-- @created 2026-02-21
-- ============================================================

-- 创建D-Music数据库
CREATE DATABASE IF NOT EXISTS yyc3_music DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE yyc3_music;

-- ============================================================
-- 1. 用户系统
-- ============================================================

-- 用户基础表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    avatar VARCHAR(500) DEFAULT '/images/default-avatar.png',
    bio TEXT,
    gender ENUM('male', 'female', 'other') DEFAULT 'other',
    birthday DATE,
    country VARCHAR(50),
    city VARCHAR(50),
    role ENUM('user', 'creator', 'admin') DEFAULT 'user',
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100),
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户社交信息
CREATE TABLE IF NOT EXISTS user_social (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    wechat VARCHAR(100),
    weibo VARCHAR(100),
    qq VARCHAR(50),
    github VARCHAR(100),
    twitter VARCHAR(100),
    instagram VARCHAR(100),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户偏好设置
CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    language VARCHAR(10) DEFAULT 'zh-CN',
    theme VARCHAR(20) DEFAULT 'cosmic',
    autoplay BOOLEAN DEFAULT TRUE,
    default_quality ENUM('low', 'medium', 'high', 'lossless') DEFAULT 'high',
    download_quality ENUM('low', 'medium', 'high', 'lossless') DEFAULT 'high',
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_notification BOOLEAN DEFAULT TRUE,
    private_profile BOOLEAN DEFAULT FALSE,
    show_play_history BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. 星力系统
-- ============================================================

-- 用户星力表
CREATE TABLE IF NOT EXISTS user_star_power (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,
    total_star_power INT DEFAULT 0 COMMENT '总星力',
    available_star_power INT DEFAULT 0 COMMENT '可用星力',
    frozen_star_power INT DEFAULT 0 COMMENT '冻结星力',
    vip_level INT DEFAULT 1 COMMENT 'VIP等级',
    vip_exp INT DEFAULT 0 COMMENT 'VIP经验',
    mheart_value INT DEFAULT 0 COMMENT 'M❤️值',
    mheart_level INT DEFAULT 1 COMMENT 'M❤️等级',
    daily_checkin_streak INT DEFAULT 0 COMMENT '连续签到天数',
    last_checkin_date DATE COMMENT '最后签到日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_vip_level (vip_level),
    INDEX idx_mheart_value (mheart_value),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 星力交易记录
CREATE TABLE IF NOT EXISTS star_power_transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    transaction_type ENUM('earn', 'spend', 'transfer', 'exchange', 'reward') NOT NULL,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    description VARCHAR(500),
    related_id BIGINT COMMENT '关联业务ID',
    related_type VARCHAR(50) COMMENT '业务类型: checkin, invite, consume, gift',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_type_related (transaction_type, related_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 星力获取规则
CREATE TABLE IF NOT EXISTS star_power_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_type VARCHAR(50) NOT NULL UNIQUE,
    rule_name VARCHAR(100) NOT NULL,
    base_amount INT NOT NULL,
    extra_conditions JSON,
    daily_limit INT DEFAULT NULL,
    total_limit INT DEFAULT NULL,
    vip_multiplier DECIMAL(3,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. 音乐内容系统
-- ============================================================

-- 音乐表
CREATE TABLE IF NOT EXISTS musics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200) NOT NULL,
    album VARCHAR(200),
    cover VARCHAR(500) DEFAULT '/images/default-cover.jpg',
    duration INT NOT NULL COMMENT '时长(秒)',
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT COMMENT '文件大小(字节)',
    format VARCHAR(20) COMMENT '格式: mp3, flac, wav',
    bitrate INT COMMENT '比特率(kbps)',
    sample_rate INT COMMENT '采样率(Hz)',
    genre VARCHAR(50),
    release_date DATE,
    lyrics TEXT,
    description TEXT,
    creator_id BIGINT NOT NULL,
    status ENUM('draft', 'pending', 'approved', 'rejected', 'deleted') DEFAULT 'pending',
    is_public BOOLEAN DEFAULT TRUE,
    is_original BOOLEAN DEFAULT TRUE,
    copyright_info TEXT,
    play_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    download_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    tags JSON,
    emotions JSON COMMENT '情感标签',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_creator (creator_id),
    INDEX idx_status (status),
    INDEX idx_play_count (play_count DESC),
    INDEX idx_created (created_at DESC),
    FULLTEXT INDEX ft_title_artist (title, artist),
    FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 专辑表
CREATE TABLE IF NOT EXISTS albums (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200) NOT NULL,
    cover VARCHAR(500) DEFAULT '/images/default-album.jpg',
    description TEXT,
    release_date DATE,
    genre VARCHAR(50),
    creator_id BIGINT NOT NULL,
    track_count INT DEFAULT 0,
    duration INT DEFAULT 0 COMMENT '总时长(秒)',
    play_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    status ENUM('draft', 'published', 'deleted') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_creator (creator_id),
    INDEX idx_release (release_date DESC),
    FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. 播放列表系统
-- ============================================================

-- 播放列表表
CREATE TABLE IF NOT EXISTS playlists (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover VARCHAR(500) DEFAULT '/images/default-playlist.jpg',
    creator_id BIGINT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    is_collaborative BOOLEAN DEFAULT FALSE,
    is_official BOOLEAN DEFAULT FALSE,
    track_count INT DEFAULT 0,
    duration INT DEFAULT 0 COMMENT '总时长(秒)',
    play_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    tags JSON,
    status ENUM('active', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_played_at TIMESTAMP,
    INDEX idx_creator (creator_id),
    INDEX idx_public_play (is_public, play_count DESC),
    INDEX idx_created (created_at DESC),
    FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 播放列表-音乐关联表
CREATE TABLE IF NOT EXISTS playlist_musics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    playlist_id BIGINT NOT NULL,
    music_id BIGINT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    added_by BIGINT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_playlist_music (playlist_id, music_id),
    INDEX idx_playlist_position (playlist_id, position),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (music_id) REFERENCES musics(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 播放列表协作者
CREATE TABLE IF NOT EXISTS playlist_collaborators (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    playlist_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    permission ENUM('view', 'edit', 'admin') DEFAULT 'edit',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_playlist_user (playlist_id, user_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. 排行榜系统
-- ============================================================

-- 排行榜数据表
CREATE TABLE IF NOT EXISTS ranking_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_id BIGINT NOT NULL,
    content_type ENUM('music', 'album', 'playlist', 'user') NOT NULL,
    positive_votes INT DEFAULT 0,
    total_votes INT DEFAULT 0,
    play_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    star_power_boost INT DEFAULT 0 COMMENT '星力助推值',
    wilson_score DECIMAL(10,8) DEFAULT 0,
    ranking_type ENUM('daily', 'weekly', 'monthly', 'all_time') NOT NULL,
    ranking_date DATE NOT NULL,
    final_score DECIMAL(10,4) DEFAULT 0,
    rank_position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_content_ranking (content_id, content_type, ranking_type, ranking_date),
    INDEX idx_ranking_score (ranking_type, ranking_date, final_score DESC),
    INDEX idx_wilson (wilson_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. 互动系统
-- ============================================================

-- 点赞记录
CREATE TABLE IF NOT EXISTS likes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    target_type ENUM('music', 'album', 'playlist', 'comment') NOT NULL,
    target_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_target (user_id, target_type, target_id),
    INDEX idx_target (target_type, target_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    target_type ENUM('music', 'album', 'playlist') NOT NULL,
    target_id BIGINT NOT NULL,
    parent_id BIGINT DEFAULT NULL COMMENT '父评论ID',
    content TEXT NOT NULL,
    like_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    status ENUM('active', 'hidden', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_target (target_type, target_id),
    INDEX idx_parent (parent_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 分享记录
CREATE TABLE IF NOT EXISTS shares (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    target_type ENUM('music', 'album', 'playlist') NOT NULL,
    target_id BIGINT NOT NULL,
    platform VARCHAR(50) COMMENT '分享平台',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_target (target_type, target_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. 播放历史与收藏
-- ============================================================

-- 播放历史
CREATE TABLE IF NOT EXISTS play_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    music_id BIGINT NOT NULL,
    play_duration INT COMMENT '播放时长(秒)',
    play_source VARCHAR(50) COMMENT '播放来源',
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_time (user_id, played_at DESC),
    INDEX idx_music (music_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (music_id) REFERENCES musics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 收藏夹
CREATE TABLE IF NOT EXISTS favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    item_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 收藏项
CREATE TABLE IF NOT EXISTS favorite_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    favorite_id BIGINT NOT NULL,
    target_type ENUM('music', 'album', 'playlist') NOT NULL,
    target_id BIGINT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_favorite_target (favorite_id, target_type, target_id),
    FOREIGN KEY (favorite_id) REFERENCES favorites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. 关注系统
-- ============================================================

-- 用户关注
CREATE TABLE IF NOT EXISTS follows (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    follower_id BIGINT NOT NULL COMMENT '关注者',
    following_id BIGINT NOT NULL COMMENT '被关注者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_follow (follower_id, following_id),
    INDEX idx_follower (follower_id),
    INDEX idx_following (following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 9. 消息通知系统
-- ============================================================

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender_id BIGINT DEFAULT NULL COMMENT '发送者(NULL为系统消息)',
    receiver_id BIGINT NOT NULL,
    type ENUM('system', 'private', 'comment', 'like', 'follow', 'gift') NOT NULL,
    title VARCHAR(200),
    content TEXT,
    related_type VARCHAR(50),
    related_id BIGINT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_receiver_read (receiver_id, is_read),
    INDEX idx_created (created_at DESC),
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 10. 签到系统
-- ============================================================

-- 签到记录
CREATE TABLE IF NOT EXISTS checkins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    checkin_date DATE NOT NULL,
    star_power_earned INT DEFAULT 0,
    mheart_earned INT DEFAULT 0,
    streak_days INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, checkin_date),
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 初始化数据
-- ============================================================

-- 插入默认星力规则
INSERT INTO star_power_rules (rule_type, rule_name, base_amount, daily_limit, vip_multiplier) VALUES
('daily_checkin', '每日签到', 10, 1, 1.0),
('invite_friend', '邀请好友', 100, NULL, 1.5),
('first_play', '首次播放新歌', 5, 10, 1.0),
('share_content', '分享内容', 3, 5, 1.0),
('create_playlist', '创建播放列表', 20, 3, 1.2),
('upload_music', '上传音乐', 50, 5, 1.5),
('comment', '发表评论', 2, 20, 1.0),
('like', '点赞', 1, 50, 1.0),
('complete_profile', '完善资料', 200, 1, 1.0),
('bind_email', '绑定邮箱', 100, 1, 1.0);

SELECT '✅ D-Music 数据库创建完成!' as message;
SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'yyc3_music';
