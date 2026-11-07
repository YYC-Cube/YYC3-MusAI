/**
 * @file D-Music类型定义
 * @description D-Music项目TypeScript类型定义
 * @module dmusic/types
 * @author YYC³ Team
 * @version 2.0.0
 * @created 2026-02-21
 * @updated 2026-02-21
 */

// ============================================================
// 用户系统类型
// ============================================================

export type UserRole = 'user' | 'creator' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'banned';
export type Gender = 'male' | 'female' | 'other';

export interface User {
    id: number;
    username: string;
    email: string;
    nickname?: string;
    avatar: string;
    bio?: string;
    gender: Gender;
    birthday?: Date;
    country?: string;
    city?: string;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    lastLoginAt?: Date;
    lastLoginIp?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserSocial {
    id: number;
    userId: number;
    wechat?: string;
    weibo?: string;
    qq?: string;
    github?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
}

export interface UserPreferences {
    id: number;
    userId: number;
    language: string;
    theme: string;
    autoplay: boolean;
    defaultQuality: 'low' | 'medium' | 'high' | 'lossless';
    downloadQuality: 'low' | 'medium' | 'high' | 'lossless';
    notificationEnabled: boolean;
    emailNotification: boolean;
    privateProfile: boolean;
    showPlayHistory: boolean;
}

// ============================================================
// 星力系统类型
// ============================================================

export interface UserStarPower {
    id: number;
    userId: number;
    totalStarPower: number;
    availableStarPower: number;
    frozenStarPower: number;
    vipLevel: number;
    vipExp: number;
    mheartValue: number;
    mheartLevel: number;
    dailyCheckinStreak: number;
    lastCheckinDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type TransactionType = 'earn' | 'spend' | 'transfer' | 'exchange' | 'reward';

export interface StarPowerTransaction {
    id: number;
    userId: number;
    transactionType: TransactionType;
    amount: number;
    balanceAfter: number;
    description?: string;
    relatedId?: number;
    relatedType?: string;
    createdAt: Date;
}

export interface StarPowerRule {
    id: number;
    ruleType: string;
    ruleName: string;
    baseAmount: number;
    extraConditions?: Record<string, unknown>;
    dailyLimit?: number;
    totalLimit?: number;
    vipMultiplier: number;
    isActive: boolean;
}

// ============================================================
// 音乐内容类型
// ============================================================

export type MusicStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'deleted';

export interface Music {
    id: number;
    title: string;
    artist: string;
    album?: string;
    cover: string;
    duration: number;
    filePath: string;
    fileSize?: number;
    format?: string;
    bitrate?: number;
    sampleRate?: number;
    genre?: string;
    releaseDate?: Date;
    lyrics?: string;
    description?: string;
    creatorId: number;
    status: MusicStatus;
    isPublic: boolean;
    isOriginal: boolean;
    copyrightInfo?: string;
    playCount: number;
    likeCount: number;
    shareCount: number;
    downloadCount: number;
    commentCount: number;
    tags?: string[];
    emotions?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Album {
    id: number;
    title: string;
    artist: string;
    cover: string;
    description?: string;
    releaseDate?: Date;
    genre?: string;
    creatorId: number;
    trackCount: number;
    duration: number;
    playCount: number;
    likeCount: number;
    status: 'draft' | 'published' | 'deleted';
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================
// 播放列表类型
// ============================================================

export interface Playlist {
    id: number;
    name: string;
    description?: string;
    cover: string;
    creatorId: number;
    isPublic: boolean;
    isCollaborative: boolean;
    isOfficial: boolean;
    trackCount: number;
    duration: number;
    playCount: number;
    likeCount: number;
    tags?: string[];
    status: 'active' | 'deleted';
    createdAt: Date;
    updatedAt: Date;
    lastPlayedAt?: Date;
}

export interface PlaylistMusic {
    id: number;
    playlistId: number;
    musicId: number;
    position: number;
    addedBy: number;
    addedAt: Date;
}

export type CollaboratorPermission = 'view' | 'edit' | 'admin';

export interface PlaylistCollaborator {
    id: number;
    playlistId: number;
    userId: number;
    permission: CollaboratorPermission;
    addedAt: Date;
}

// ============================================================
// 排行榜类型
// ============================================================

export type ContentType = 'music' | 'album' | 'playlist' | 'user';
export type RankingType = 'daily' | 'weekly' | 'monthly' | 'all_time';

export interface RankingData {
    id: number;
    contentId: number;
    contentType: ContentType;
    positiveVotes: number;
    totalVotes: number;
    playCount: number;
    shareCount: number;
    starPowerBoost: number;
    wilsonScore: number;
    rankingType: RankingType;
    rankingDate: Date;
    finalScore: number;
    rankPosition: number;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================
// 互动系统类型
// ============================================================

export type TargetType = 'music' | 'album' | 'playlist' | 'comment';

export interface Like {
    id: number;
    userId: number;
    targetType: TargetType;
    targetId: number;
    createdAt: Date;
}

export interface Comment {
    id: number;
    userId: number;
    targetType: TargetType;
    targetId: number;
    parentId?: number;
    content: string;
    likeCount: number;
    replyCount: number;
    status: 'active' | 'hidden' | 'deleted';
    createdAt: Date;
    updatedAt: Date;
}

export interface Share {
    id: number;
    userId: number;
    targetType: TargetType;
    targetId: number;
    platform?: string;
    createdAt: Date;
}

// ============================================================
// 播放历史与收藏类型
// ============================================================

export interface PlayHistory {
    id: number;
    userId: number;
    musicId: number;
    playDuration?: number;
    playSource?: string;
    playedAt: Date;
}

export interface Favorite {
    id: number;
    userId: number;
    name: string;
    description?: string;
    isDefault: boolean;
    itemCount: number;
    createdAt: Date;
}

export interface FavoriteItem {
    id: number;
    favoriteId: number;
    targetType: 'music' | 'album' | 'playlist';
    targetId: number;
    addedAt: Date;
}

// ============================================================
// 关注系统类型
// ============================================================

export interface Follow {
    id: number;
    followerId: number;
    followingId: number;
    createdAt: Date;
}

// ============================================================
// 消息系统类型
// ============================================================

export type MessageType = 'system' | 'private' | 'comment' | 'like' | 'follow' | 'gift';

export interface Message {
    id: number;
    senderId?: number;
    receiverId: number;
    type: MessageType;
    title?: string;
    content?: string;
    relatedType?: string;
    relatedId?: number;
    isRead: boolean;
    createdAt: Date;
}

// ============================================================
// 签到系统类型
// ============================================================

export interface Checkin {
    id: number;
    userId: number;
    checkinDate: Date;
    starPowerEarned: number;
    mheartEarned: number;
    streakDays: number;
    createdAt: Date;
}

// ============================================================
// 时空喊话系统类型
// ============================================================

export type SpaceTimeMessageType = 'text' | 'voice' | 'image';
export type SpaceTimeEmotion = 'happy' | 'sad' | 'energetic' | 'calm' | 'love' | 'neutral';

export interface SpaceTimeMessage {
    id: string;
    userId: string;
    userName: string;
    content: string;
    type: SpaceTimeMessageType;
    targetTime: string | null;
    targetLocation: GeoLocation | null;
    songId: string | null;
    songTitle: string | null;
    emotion: SpaceTimeEmotion;
    likes: number;
    likedBy: string[];
    replies: number;
    createdAt: number;
    status: string;
    distance?: number;
    // Voice message fields
    audioDuration?: number;
    audioWaveform?: number[];
    audioFilePath?: string;
    audioSignedUrl?: string;
    audioData?: string;
}

export interface GeoLocation {
    lat: number;
    lng: number;
    label?: string;
}

export interface SpaceTimeReply {
    id: string;
    messageId: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: number;
}

export interface TimeCapsule {
    id: string;
    userId: string;
    userName: string;
    title: string;
    content: string;
    unlockTs: number;
    songId: string | null;
    songTitle: string | null;
    emotion: SpaceTimeEmotion;
    recipientName: string | null;
    isUnlocked: boolean;
    likes: number;
    createdAt: number;
}

// ============================================================
// 创作协作系统类型
// ============================================================

export interface SharedWork {
    workId: string;
    title: string;
    theme: string;
    lyrics: string[];
    mode: string;
    createdAt: number;
    sharedAt: number;
    userName: string;
    userId?: string;
    likes: number;
    plays: number;
    forkedFrom?: ForkOrigin | null;
}

export interface ForkOrigin {
    workId: string;
    author: string;
    forkedAt: number;
}

export interface ForkNode {
    workId: string;
    author: string;
    forkedAt: number;
}

// ============================================================
// 成就徽章系统类型
// ============================================================

export interface Achievement {
    id: string;
    nameZh: string;
    nameEn: string;
    descZh: string;
    descEn: string;
    icon: string;
    unlocked: boolean;
    newlyUnlocked: boolean;
}

export interface AchievementStats {
    totalWorks: number;
    streakDays: number;
    totalLikesReceived: number;
    totalForks: number;
    totalPlays: number;
    totalMessages: number;
    totalCapsules: number;
    peakStarPower: number;
    locationMessages: number;
    voiceMessages: number;
    lastActiveDate?: string;
}

export type AchievementAction =
    | 'create_work'
    | 'receive_like'
    | 'receive_fork'
    | 'send_message'
    | 'create_capsule'
    | 'send_voice'
    | 'send_location'
    | 'daily_login';

// ============================================================
// IP 矩阵类型
// ============================================================

export interface CreatorInfo {
    userName: string;
    userId?: string;
    works: number;
    totalLikes: number;
    latestWork: number;
}

export type CreatorLevel = 'beginner' | 'bronze' | 'silver' | 'gold' | 'star';

export interface CreatorLevelDef {
    min: number;
    label: string;
    labelEn: string;
    icon: string;
}

// ============================================================
// 语音存储类型
// ============================================================

export interface VoiceUploadRequest {
    userId: string;
    audioBase64: string;
    mimeType: string;
}

export interface VoiceUploadResponse {
    success: boolean;
    filePath: string;
    signedUrl: string;
}

// ============================================================
// API响应类型
// ============================================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
    };
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ============================================================
// 配置类型
// ============================================================

export interface DMusicConfig {
    database: {
        mysql: MySQLConfig;
        redis: RedisConfig;
    };
    server: ServerConfig;
    jwt: JWTConfig;
    starPower: StarPowerConfig;
    mheart: MHeartConfig;
    vip: VIPConfig;
    storage: StorageConfig;
    audio: AudioConfig;
    ranking: RankingConfig;
    websocket: WebSocketConfig;
    security: SecurityConfig;
}

export interface MySQLConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    charset: string;
    pool: {
        min: number;
        max: number;
        idle: number;
    };
}

export interface RedisConfig {
    host: string;
    port: number;
    db: number;
    prefix: string;
}

export interface ServerConfig {
    name: string;
    port: number;
    env: string;
    debug: boolean;
}

export interface JWTConfig {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
}

export interface StarPowerConfig {
    initial: number;
    dailyCheckinBase: number;
    inviteFriend: number;
    vipMultiplierBase: number;
    rules: Record<string, StarPowerRuleConfig>;
}

export interface StarPowerRuleConfig {
    amount: number;
    dailyLimit?: number;
    vipMultiplier: number;
}

export interface MHeartConfig {
    initial: number;
    levelThreshold: number;
    levels: MHeartLevel[];
}

export interface MHeartLevel {
    level: number;
    min: number;
    max: number | null;
    name: string;
}

export interface VIPConfig {
    maxLevel: number;
    expBase: number;
    expMultiplier: number;
    levels: VIPLevel[];
}

export interface VIPLevel {
    level: number;
    name: string;
    expRequired: number;
    benefits: string[];
}

export interface StorageConfig {
    type: string;
    basePath: string;
    paths: Record<string, string>;
    maxSize: number;
    supportedFormats: string[];
}

export interface AudioConfig {
    maxBitrate: number;
    sampleRate: number;
    qualities: AudioQuality[];
}

export interface AudioQuality {
    name: string;
    bitrate: number;
    label: string;
}

export interface RankingConfig {
    updateInterval: number;
    wilsonConfidence: number;
    topLimit: number;
    types: string[];
}

export interface WebSocketConfig {
    port: number;
    path: string;
    heartbeat: number;
}

export interface SecurityConfig {
    passwordSaltRounds: number;
    loginMaxAttempts: number;
    loginLockDuration: number;
    rateLimit: {
        window: number;
        max: number;
    };
}