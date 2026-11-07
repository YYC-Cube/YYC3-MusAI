-- ============================================================
-- D-Music PostgreSQL 15 数据库架构
-- ============================================================
-- @file d_music_postgres.sql
-- @description D-Music音乐平台 PostgreSQL 15 数据库表结构
-- @author YYC³ Team
-- @version 1.0.0
-- @created 2026-02-23
-- ============================================================

-- 创建数据库扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. 用户系统
-- ============================================================

-- 用户基础表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    avatar VARCHAR(500) DEFAULT '/images/default-avatar.png',
    bio TEXT,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')) DEFAULT 'other',
    birthday DATE,
    country VARCHAR(50),
    city VARCHAR(50),
    role VARCHAR(20) CHECK (role IN ('user', 'creator', 'admin')) DEFAULT 'user',
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'banned')) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(100),
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- 用户社交信息
CREATE TABLE IF NOT EXISTS user_social (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wechat VARCHAR(100),
    weibo VARCHAR(100),
    qq VARCHAR(50),
    github VARCHAR(100),
    twitter VARCHAR(100),
    instagram VARCHAR(100),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id)
);

-- 用户偏好设置
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'zh-CN',
    theme VARCHAR(20) DEFAULT 'cosmic',
    autoplay BOOLEAN DEFAULT TRUE,
    default_quality VARCHAR(20) CHECK (default_quality IN ('low', 'medium', 'high', 'lossless')) DEFAULT 'high',
    download_quality VARCHAR(20) CHECK (download_quality IN ('low', 'medium', 'high', 'lossless')) DEFAULT 'high',
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_notification BOOLEAN DEFAULT TRUE,
    private_profile BOOLEAN DEFAULT FALSE,
    show_play_history BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id)
);

-- ============================================================
-- 2. 星力系统
-- ============================================================

-- 用户星力表
CREATE TABLE IF NOT EXISTS user_star_power (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_star_power INT DEFAULT 0,
    available_star_power INT DEFAULT 0,
    frozen_star_power INT DEFAULT 0,
    vip_level INT DEFAULT 1,
    vip_exp INT DEFAULT 0,
    mheart_value INT DEFAULT 0,
    mheart_level INT DEFAULT 1,
    daily_checkin_streak INT DEFAULT 0,
    last_checkin_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_star_power_user ON user_star_power(user_id);
CREATE INDEX idx_star_power_vip ON user_star_power(vip_level);
CREATE INDEX idx_star_power_mheart ON user_star_power(mheart_value);

-- 星力交易记录
CREATE TABLE IF NOT EXISTS star_power_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'transfer', 'exchange', 'reward')),
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    description VARCHAR(500),
    related_id UUID,
    related_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_created ON star_power_transactions(user_id, created_at);
CREATE INDEX idx_transactions_type ON star_power_transactions(transaction_type, related_type);

-- 星力获取规则
CREATE TABLE IF NOT EXISTS star_power_rules (
    id SERIAL PRIMARY KEY,
    rule_type VARCHAR(50) NOT NULL UNIQUE,
    rule_name VARCHAR(100) NOT NULL,
    base_amount INT NOT NULL,
    extra_conditions JSONB,
    daily_limit INT,
    total_limit INT,
    vip_multiplier DECIMAL(3,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. 音乐内容系统
-- ============================================================

-- 音乐表
CREATE TABLE IF NOT EXISTS musics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200) NOT NULL,
    album VARCHAR(200),
    cover VARCHAR(500) DEFAULT '/images/default-cover.jpg',
    duration INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    format VARCHAR(20),
    bitrate INT,
    sample_rate INT,
    genre VARCHAR(50),
    release_date DATE,
    lyrics TEXT,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'deleted')) DEFAULT 'pending',
    is_public BOOLEAN DEFAULT TRUE,
    is_original BOOLEAN DEFAULT TRUE,
    copyright_info TEXT,
    play_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    download_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    tags JSONB,
    emotions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_musics_creator ON musics(creator_id);
CREATE INDEX idx_musics_status ON musics(status);
CREATE INDEX idx_musics_play_count ON musics(play_count DESC);
CREATE INDEX idx_musics_created ON musics(created_at DESC);
CREATE INDEX idx_musics_title_artist ON musics USING gin(to_tsvector('english', title || ' ' || artist));

-- 专辑表
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200) NOT NULL,
    cover VARCHAR(500) DEFAULT '/images/default-album.jpg',
    description TEXT,
    release_date DATE,
    genre VARCHAR(50),
    creator_id UUID NOT NULL REFERENCES users(id),
    track_count INT DEFAULT 0,
    duration INT DEFAULT 0,
    play_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('draft', 'published', 'deleted')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_albums_creator ON albums(creator_id);
CREATE INDEX idx_albums_release ON albums(release_date DESC);

-- ============================================================
-- 4. 播放列表系统
-- ============================================================

-- 播放列表表
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover VARCHAR(500) DEFAULT '/images/default-playlist.jpg',
    creator_id UUID NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT TRUE,
    is_collaborative BOOLEAN DEFAULT FALSE,
    is_official BOOLEAN DEFAULT FALSE,
    track_count INT DEFAULT 0,
    duration INT DEFAULT 0,
    play_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    tags JSONB,
    status VARCHAR(20) CHECK (status IN ('active', 'deleted')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_played_at TIMESTAMP
);

CREATE INDEX idx_playlists_creator ON playlists(creator_id);
CREATE INDEX idx_playlists_public ON playlists(is_public, play_count DESC);
CREATE INDEX idx_playlists_created ON playlists(created_at DESC);

-- 播放列表-音乐关联表
CREATE TABLE IF NOT EXISTS playlist_musics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    music_id UUID NOT NULL REFERENCES musics(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0,
    added_by UUID NOT NULL REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (playlist_id, music_id)
);

CREATE INDEX idx_playlist_musics_position ON playlist_musics(playlist_id, position);

-- 播放列表协作者
CREATE TABLE IF NOT EXISTS playlist_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) CHECK (permission IN ('view', 'edit', 'admin')) DEFAULT 'edit',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (playlist_id, user_id)
);

-- ============================================================
-- 5. 排行榜系统
-- ============================================================

-- 排行榜数据表
CREATE TABLE IF NOT EXISTS ranking_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('music', 'album', 'playlist', 'user')),
    positive_votes INT DEFAULT 0,
    total_votes INT DEFAULT 0,
    play_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    star_power_boost INT DEFAULT 0,
    wilson_score DECIMAL(10,8) DEFAULT 0,
    ranking_type VARCHAR(20) NOT NULL CHECK (ranking_type IN ('daily', 'weekly', 'monthly', 'all_time')),
    ranking_date DATE NOT NULL,
    final_score DECIMAL(10,4) DEFAULT 0,
    rank_position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (content_id, content_type, ranking_type, ranking_date)
);

CREATE INDEX idx_ranking_score ON ranking_data(ranking_type, ranking_date, final_score DESC);
CREATE INDEX idx_ranking_wilson ON ranking_data(wilson_score DESC);

-- ============================================================
-- 6. 互动系统
-- ============================================================

-- 点赞记录
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('music', 'album', 'playlist', 'comment')),
    target_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX idx_likes_target ON likes(target_type, target_id);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('music', 'album', 'playlist')),
    target_id UUID NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('active', 'hidden', 'deleted')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_target ON comments(target_type, target_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- 分享记录
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('music', 'album', 'playlist')),
    target_id UUID NOT NULL,
    platform VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shares_user ON shares(user_id);
CREATE INDEX idx_shares_target ON shares(target_type, target_id);

-- ============================================================
-- 7. 播放历史与收藏
-- ============================================================

-- 播放历史
CREATE TABLE IF NOT EXISTS play_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    music_id UUID NOT NULL REFERENCES musics(id) ON DELETE CASCADE,
    play_duration INT,
    play_source VARCHAR(50),
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_play_history_user_time ON play_history(user_id, played_at DESC);
CREATE INDEX idx_play_history_music ON play_history(music_id);

-- 收藏夹
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    item_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- 收藏项
CREATE TABLE IF NOT EXISTS favorite_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    favorite_id UUID NOT NULL REFERENCES favorites(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('music', 'album', 'playlist')),
    target_id UUID NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (favorite_id, target_type, target_id)
);

-- ============================================================
-- 8. 关注系统
-- ============================================================

-- 用户关注
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================
-- 9. 消息通知系统
-- ============================================================

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('system', 'private', 'comment', 'like', 'follow', 'gift')),
    title VARCHAR(200),
    content TEXT,
    related_type VARCHAR(50),
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_receiver_read ON messages(receiver_id, is_read);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ============================================================
-- 10. 签到系统
-- ============================================================

-- 签到记录
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    star_power_earned INT DEFAULT 0,
    mheart_earned INT DEFAULT 0,
    streak_days INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, checkin_date)
);

CREATE INDEX idx_checkins_user ON checkins(user_id);

-- ============================================================
-- 11. AI 创作系统
-- ============================================================

-- AI 生成作品表
CREATE TABLE IF NOT EXISTS ai_works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    theme VARCHAR(100),
    mood VARCHAR(50),
    keywords TEXT[],
    language VARCHAR(10) DEFAULT 'zh-CN',
    lyrics TEXT[],
    mode VARCHAR(50),
    composition_params JSONB,
    model_used VARCHAR(100),
    generation_time DECIMAL(5,2),
    status VARCHAR(20) CHECK (status IN ('generating', 'completed', 'failed')) DEFAULT 'generating',
    is_public BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    play_count INT DEFAULT 0,
    fork_count INT DEFAULT 0,
    forked_from UUID REFERENCES ai_works(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_works_user ON ai_works(user_id);
CREATE INDEX idx_ai_works_status ON ai_works(status);
CREATE INDEX idx_ai_works_public ON ai_works(is_public, created_at DESC);

-- ============================================================
-- 12. 时空系统
-- ============================================================

-- 时空消息表
CREATE TABLE IF NOT EXISTS spacetime_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50),
    emotion VARCHAR(50),
    target_location GEOGRAPHY(POINT, 4326),
    target_time TIMESTAMP,
    song_id UUID REFERENCES musics(id),
    song_title VARCHAR(200),
    audio_duration INT,
    audio_waveform DECIMAL[],
    audio_file_path VARCHAR(500),
    like_count INT DEFAULT 0,
    liked_by UUID[],
    reply_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spacetime_location ON spacetime_messages USING GIST(target_location);
CREATE INDEX idx_spacetime_user ON spacetime_messages(user_id);
CREATE INDEX idx_spacetime_created ON spacetime_messages(created_at DESC);

-- 时空胶囊表
CREATE TABLE IF NOT EXISTS spacetime_capsules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    unlock_ts TIMESTAMP NOT NULL,
    emotion VARCHAR(50),
    is_unlocked BOOLEAN DEFAULT FALSE,
    like_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_capsules_unlock ON spacetime_capsules(unlock_ts);
CREATE INDEX idx_capsules_user ON spacetime_capsules(user_id);

-- ============================================================
-- 13. 成就系统
-- ============================================================

-- 成就定义表
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_zh VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    desc_zh TEXT NOT NULL,
    desc_en TEXT NOT NULL,
    icon VARCHAR(500),
    category VARCHAR(50) NOT NULL CHECK (category IN ('listening', 'social', 'collection', 'streak', 'creation')),
    requirement INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户成就记录
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    newly_unlocked BOOLEAN DEFAULT TRUE,
    UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- 用户成就统计
CREATE TABLE IF NOT EXISTS user_achievement_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_works INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    total_likes_received INT DEFAULT 0,
    total_forks INT DEFAULT 0,
    total_plays INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    total_capsules INT DEFAULT 0,
    peak_star_power INT DEFAULT 0,
    location_messages INT DEFAULT 0,
    voice_messages INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 14. 模板系统
-- ============================================================

-- 主题模板表
CREATE TABLE IF NOT EXISTS theme_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    preview_image VARCHAR(500),
    is_free BOOLEAN DEFAULT TRUE,
    star_power_cost INT DEFAULT 0,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户解锁主题
CREATE TABLE IF NOT EXISTS user_unlocked_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme_id UUID NOT NULL REFERENCES theme_templates(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, theme_id)
);

-- ============================================================
-- 15. 通知系统
-- ============================================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fork', 'like', 'comment', 'achievement', 'follow', 'system')),
    from_user VARCHAR(100),
    work_title VARCHAR(200),
    original_work_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- 16. 语音存储
-- ============================================================

-- 语音文件表
CREATE TABLE IF NOT EXISTS voice_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    duration DECIMAL(10,2),
    transcription TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voice_files_user ON voice_files(user_id);

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
('bind_email', '绑定邮箱', 100, 1, 1.0)
ON CONFLICT (rule_type) DO NOTHING;

-- 插入默认成就
INSERT INTO achievements (name_zh, name_en, desc_zh, desc_en, icon, category, requirement) VALUES
('初次聆听', 'First Listen', '播放第一首歌曲', 'Play your first song', '🎵', 'listening', 1),
('音乐达人', 'Music Master', '累计播放100首歌曲', 'Play 100 songs', '🎼', 'listening', 100),
('社交新星', 'Social Star', '获得10个点赞', 'Get 10 likes', '⭐', 'social', 10),
('收藏家', 'Collector', '收藏50首歌曲', 'Favorite 50 songs', '💎', 'collection', 50),
('连续签到7天', '7-Day Streak', '连续签到7天', 'Check in for 7 days in a row', '🔥', 'streak', 7),
('创作新手', 'Creator Novice', '创建第一个AI作品', 'Create your first AI work', '✨', 'creation', 1)
ON CONFLICT DO NOTHING;

-- 插入默认主题模板
INSERT INTO theme_templates (name, description, is_free, star_power_cost, category) VALUES
('宇宙深空', '深邃的宇宙主题', TRUE, 0, 'cosmic'),
('极光幻境', '绚丽的极光效果', TRUE, 0, 'aurora'),
('赛博朋克', '未来科技风格', FALSE, 100, 'cyberpunk'),
('水墨丹青', '中国传统水墨风格', FALSE, 150, 'ink')
ON CONFLICT DO NOTHING;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_star_power_updated_at BEFORE UPDATE ON user_star_power
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_musics_updated_at BEFORE UPDATE ON musics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ranking_data_updated_at BEFORE UPDATE ON ranking_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_works_updated_at BEFORE UPDATE ON ai_works
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_achievement_stats_updated_at BEFORE UPDATE ON user_achievement_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 显示完成信息
SELECT '✅ D-Music PostgreSQL 15 数据库创建完成!' as message;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
