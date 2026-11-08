/**
 * D-Music — Global TypeScript Type Definitions
 * ==============================================================
 *
 * Unified type system for the entire D-Music project.
 * All types are organized into the following categories:
 *
 *   1. Enums & Union Types        — Core domain enumerations
 *   2. Data Models                — Domain entities and value objects
 *   3. API Request Types          — Payload types for API calls
 *   4. API Response Types         — Response structures from backend
 *   5. Component Props            — All React component prop interfaces
 *   6. Hook Return Types          — Return types for custom hooks
 *   7. Utility Types              — Generic helpers and branded types
 *
 * Design Principles:
 *   - All types are re-exportable; components can import { Type } from '../types'
 *   - Strict null safety — optional fields use `?` or `| null`
 *   - Consistent naming: `XxxData` for models, `XxxProps` for components,
 *     `XxxRequest`/`XxxResponse` for API, `XxxConfig` for options
 *   - No circular imports — this file has ZERO runtime imports
 *
 * @module types
 * @version 11.2.0
 * @date 2026-02-25
 */

import type React from 'react';

// ════════════════════════════════════════════════════════════════
// §1. ENUMS & UNION TYPES
// ════════════════════════════════════════════════════════════════

/** Core emotion types used across audio engine, annotations, and AI */
export type Emotion = 'happy' | 'sad' | 'energetic' | 'calm' | 'neutral';

/** Extended emotion types (includes AI lyrics themes) */
export type EmotionExtended =
  | Emotion
  | 'love'
  | 'nostalgic'
  | 'hopeful'
  | 'angry'
  | 'romantic';

/** AI lyrics theme selector */
export type AILyricsTheme = 'happy' | 'sad' | 'energetic' | 'calm' | 'love';

/** Language codes for i18n */
export type Lang = 'zh' | 'en';

/** Playback repeat modes */
export type RepeatMode = 'off' | 'all' | 'one';

/** Media display modes */
export type MediaMode = 'audio' | 'video';

/** Audio engine source modes */
export type AudioMode = 'file' | 'demo';

/** Theme system identifiers */
export type ThemeId =
  | 'deep-space'
  | 'aurora'
  | 'ocean'
  | 'light'
  | 'midnight'
  | 'custom';

/** MV Creator visual themes */
export type MVTheme =
  | 'starfield'
  | 'neonPulse'
  | 'aurora'
  | 'inkWash'
  | 'cyberCity';

/** Creation studio modes */
export type CreationMode = 'quick' | 'master' | 'remix' | 'works' | 'mv';

/** Album store view modes */
export type AlbumViewMode = 'marketplace' | 'collection' | 'detail';

/** Secondary market view modes */
export type MarketViewMode = 'browse' | 'sell' | 'history' | 'detail';

/** Market listing status */
export type MarketListingStatus = 'active' | 'sold' | 'cancelled';

/** E2EE setup wizard steps */
export type E2ESetupStep =
  | 'intro'
  | 'generating'
  | 'uploading'
  | 'backup'
  | 'complete'
  | 'status'
  | 'restore';

/** Community activity types */
export type CommunityActivityType =
  | 'annotation'
  | 'like'
  | 'achievement'
  | 'play';

/** Notification event types */
export type NotificationType =
  | 'fork'
  | 'like'
  | 'comment'
  | 'achievement';

/** Achievement categories */
export type AchievementCategory =
  | 'listening'
  | 'social'
  | 'collection'
  | 'streak';

/** User roles */
export type UserRole = 'user' | 'creator' | 'admin';

/** AI model providers */
export type AIProvider = 'openai' | 'template';

/** AI tip priority levels */
export type AITipPriority = 'low' | 'medium' | 'high';

/** AI tip categories */
export type AITipCategory =
  | 'emotion'
  | 'achievement'
  | 'streak'
  | 'discovery'
  | 'interaction'
  | 'voice'
  | 'system';

/** User engagement levels (from AI analysis) */
export type EngagementLevel =
  | 'casual'
  | 'regular'
  | 'enthusiast'
  | 'power';

/** Exclusive content types for albums */
export type ExclusiveContentType =
  | 'pdf'
  | 'stem'
  | 'video'
  | 'bonus-track';

/** Rate limit tiers */
export type RateLimitTier =
  | 'standard'
  | 'sensitive'
  | 'heavy'
  | 'auth'
  | 'starpower';

/** SpaceTime message types */
export type SpaceTimeMessageType = 'text' | 'voice';

/** Copyright certification status */
export type CopyrightStatus = 'pending' | 'certified' | 'rejected';

/** Star Power shop item rarity */
export type ShopItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Shop item categories */
export type ShopItemCategory = 'theme' | 'sound' | 'badge';


// ════════════════════════════════════════════════════════════════
// §2. DATA MODELS
// ════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// 2.1 Music Domain
// ──────────────────────────────────────────────────────────────

/** A single line of synchronized lyrics */
export interface LyricLine {
  /** Timestamp in seconds */
  time: number;
  /** Lyric text (original language) */
  text: string;
  /** Optional translation text */
  translation?: string;
  /** Emotional tag for the line */
  emotion?: Emotion;
}

/** A playable track in the playlist */
export interface Track {
  /** Unique track identifier */
  id: string;
  /** Song title */
  title: string;
  /** Artist name */
  artist: string;
  /** Album name */
  album: string;
  /** Duration in seconds (fallback for demo mode) */
  duration: number;
  /** Album art image URL */
  albumArt: string;
  /** If provided, plays real audio; otherwise demo oscillator */
  audioUrl?: string;
  /** Synchronized lyrics array */
  lyrics: LyricLine[];
  /** Which chord progression set for demo mode (0-3) */
  chordSet: number;
  /** Theme color hex for the track */
  color: string;
}

/** Song statistics from backend */
export interface SongStats {
  likes?: number;
  plays?: number;
  comments?: number;
  shares?: number;
}

/** Emotion annotations per lyric line */
export interface EmotionAnnotation {
  [lineIndex: number]: {
    [emotion: string]: number;
  };
}

/** Annotation data from API */
export interface AnnotationData {
  annotations?: Record<string, Record<string, number>>;
}

// ──────────────────────────────────────────────────────────────
// 2.2 User Domain
// ──────────────────────────────────────────────────────────────

/** Supabase Auth user object (minimal, from auth.getUser()) */
export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    [key: string]: any;
  };
}

/** User profile as displayed in the app */
export interface UserProfileData {
  userId: string;
  email: string;
  displayName: string;
  starPower: number;
  totalListeningTime: number;
  totalAnnotations: number;
  totalLikes: number;
  achievements: string[];
  joinedAt: string;
  streak: number;
}

/** Extended user profile from backend API */
export interface UserProfileAPI {
  id?: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  favoriteGenres?: string[];
  totalPlays?: number;
  totalLikes?: number;
  joinedAt?: string;
}

/** User preferences (persisted in localStorage + KV) */
export interface UserPreferences {
  lang: Lang;
  volume: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  mode: MediaMode;
  theme: ThemeId;
}

// ──────────────────────────────────────────────────────────────
// 2.3 Social & Community Domain
// ──────────────────────────────────────────────────────────────

/** Community activity feed item */
export interface CommunityActivity {
  id: string;
  type: CommunityActivityType;
  userId: string;
  userName: string;
  songId: string;
  songTitle: string;
  detail: string;
  timestamp: number;
}

/** Comment on a song */
export interface CommentItem {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp?: number;
  likes: number;
  createdAt: number;
}

/** Internal comment model (component-level) */
export interface CommentModel {
  id: string;
  userId: string;
  userName: string;
  text: string;
  /** Playback seconds */
  timestamp: number;
  createdAt: number;
  likes: number;
  likedBy: string[];
}

/** Timeline comment (danmaku-style) */
export interface TimelineComment {
  id: string;
  text: string;
  /** Seconds in playback */
  timestamp: number;
  userName: string;
  color: string;
  createdAt: number;
  likes: number;
}

/** Notification item */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  fromUser: string;
  workTitle?: string;
  originalWorkId?: string;
  createdAt: number;
  read: boolean;
}

// ──────────────────────────────────────────────────────────────
// 2.4 Creation & Works Domain
// ──────────────────────────────────────────────────────────────

/** Shared work in community */
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

/** Fork origin reference */
export interface ForkOrigin {
  workId: string;
  author: string;
  forkedAt: number;
}

/** Fork tree node */
export interface ForkNode {
  workId: string;
  author: string;
  forkedAt: number;
}

/** Fork work in tree view */
export interface ForkWork {
  id: string;
  title: string;
  theme?: string;
  authorName: string;
  authorId: string;
  parentWorkId?: string;
  lyrics?: string[];
  likes?: number;
  createdAt: number;
}

/** Fork tree node with children */
export interface ForkTreeNode {
  work: ForkWork;
  children: ForkTreeNode[];
  depth: number;
}

/** Created work in Creation Studio */
export interface CreatedWork {
  id: string;
  title: string;
  theme: string;
  lyrics: string[];
  mode: string;
  createdAt: number;
}

/** Creator info from discovery endpoint */
export interface CreatorInfo {
  userName: string;
  userId?: string;
  works: number;
  totalLikes: number;
  latestWork: number;
}

// ──────────────────────────────────────────────────────────────
// 2.5 Star Power Economy
// ──────────────────────────────────────────────────────────────

/** Star power balance data */
export interface StarPowerData {
  starPower?: number;
  transactions?: StarPowerTransaction[];
}

/** Star power transaction record */
export interface StarPowerTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  timestamp: number;
  balance: number;
}

/** VIP level definition */
export interface VIPLevel {
  level: number;
  label: string;
  labelEn: string;
  threshold: number;
  color: string;
  dailyReward: number;
  nextThreshold?: number | null;
  nextLabel?: string | null;
}

/** Shop item */
export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  cost: number;
  icon: string;
  rarity: ShopItemRarity;
}

// ──────────────────────────────────────────────────────────────
// 2.6 Achievement & Gamification
// ──────────────────────────────────────────────────────────────

/** Achievement definition (client-side, playlistData) */
export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: number;
  category: AchievementCategory;
}

/** Achievement data from backend API */
export interface AchievementData {
  id: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  icon: string;
  unlocked: boolean;
  newlyUnlocked: boolean;
}

/** Achievement statistics */
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
}

/** M Heart value data */
export interface MHeartData {
  score: number;
  emotionIntensity: number;
  resonance: number;
  rarity: number;
  emotionBreakdown: Record<string, number>;
  updatedAt: number;
  listeningMinutes?: number;
  totalSessions?: number;
}

/** M Heart trend data point */
export interface MHeartTrendPoint {
  score: number;
  timestamp: number;
}

// ──────────────────────────────────────────────────────────────
// 2.7 Space-Time Domain
// ──────────────────────────────────────────────────────────────

/** Geographic location */
export interface GeoLocation {
  lat: number;
  lng: number;
  label?: string;
}

/** Space-Time message */
export interface STMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type?: SpaceTimeMessageType;
  emotion: string;
  likes: number;
  likedBy: string[];
  replies: number;
  createdAt: number;
  targetLocation?: GeoLocation | null;
  targetTime?: string | null;
  songId?: string | null;
  songTitle?: string | null;
  audioDuration?: number;
  audioWaveform?: number[];
  audioFilePath?: string;
  audioSignedUrl?: string;
  distance?: number;
}

/** Time capsule */
export interface TimeCapsule {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  unlockTs: number;
  emotion: string;
  isUnlocked: boolean;
  likes: number;
  createdAt: number;
}

// ──────────────────────────────────────────────────────────────
// 2.8 Leaderboard & Analytics
// ──────────────────────────────────────────────────────────────

/** Leaderboard entry (Wilson Score) */
export interface LeaderboardEntry {
  songId: string;
  title: string;
  artist: string;
  positiveVotes: number;
  totalVotes: number;
  playCount: number;
  wilsonScore: number;
  finalScore: number;
  rank: number;
}

/** Internal ranking entry (component-level) */
export interface RankingEntry {
  songId: string;
  likes: number;
  plays: number;
  comments: number;
  wilsonScore: number;
  engagement: number;
}

/** Recommendation item */
export interface RecommendationItem {
  songId: string;
  title: string;
  artist: string;
  score: number;
  reason: string;
}

/** Internal recommendation with extended fields */
export interface Recommendation {
  songId: string;
  score: number;
  reason: string;
  reasonZh: string;
}

/** Listening history entry */
export interface ListeningHistoryEntry {
  songId: string;
  songTitle: string;
  emotion: string;
  listenDuration: number;
  totalDuration: number;
  completionRate: number;
  skipped: boolean;
  timestamp?: number;
}

/** Analytics overview data */
export interface AnalyticsData {
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalEngagement: number;
  songBreakdown: Array<{
    songId: string;
    plays: number;
    likes: number;
    comments: number;
  }>;
}

/** Smart playlist mood analysis */
export interface MoodAnalysis {
  dominant: string;
  distribution: Array<{ emotion: string; pct: number }>;
  listenCount: number;
  avgCompletionRate: number;
}

// ──────────────────────────────────────────────────────────────
// 2.9 Digital Albums & Market
// ──────────────────────────────────────────────────────────────

/** Album track */
export interface AlbumTrack {
  songId: string;
  title: string;
  artist: string;
  duration: number;
  trackNumber: number;
}

/** Album exclusive content */
export interface AlbumExclusiveContent {
  type: ExclusiveContentType;
  label: string;
  labelEn: string;
}

/** Digital album */
export interface Album {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  coverUrl: string;
  genre: string;
  tracks: AlbumTrack[];
  price: number;
  limitedEdition: boolean;
  maxSupply: number | null;
  circulatingSupply: number;
  releaseDate: number;
  exclusiveContent: AlbumExclusiveContent[];
  tags: string[];
  likes: number;
  totalSales: number;
  createdAt: number;
}

/** Album ownership record */
export interface AlbumOwnership {
  albumId: string;
  userId: string;
  purchasedAt: number;
  price: number;
  edition: number;
}

/** Secondary market listing */
export interface MarketListing {
  id: string;
  albumId: string;
  albumTitle: string;
  albumGenre: string;
  albumCoverUrl: string;
  sellerId: string;
  sellerName: string;
  price: number;
  originalPrice: number;
  edition: number;
  maxSupply: number | null;
  limitedEdition: boolean;
  createdAt: number;
  status: MarketListingStatus;
}

/** Completed sale record */
export interface MarketSale {
  listingId: string;
  albumId: string;
  albumTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  price: number;
  sellerEarnings: number;
  creatorRoyalty: number;
  platformFee: number;
  edition: number;
  soldAt: number;
}

/** Market statistics */
export interface MarketStats {
  activeListings: number;
  totalListings: number;
  totalSales: number;
  totalVolume: number;
  floorPrices: Record<string, number>;
  recentSales: MarketSale[];
}

// ──────────────────────────────────────────────────────────────
// 2.10 E2EE / PKI
// ──────────────────────────────────────────────────────────────

/** E2EE key pair */
export interface E2EKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  createdAt: number;
  userId: string;
}

/** Encrypted message payload */
export interface EncryptedPayload {
  /** AES-GCM encrypted content (base64) */
  ciphertext: string;
  /** AES-GCM initialization vector (base64) */
  iv: string;
  /** RSA-OAEP encrypted AES session key (base64) */
  encryptedSessionKey: string;
  /** Sender's public key fingerprint */
  senderFingerprint: string;
}

/** Key backup data */
export interface KeyBackup {
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  publicKeyJwk?: JsonWebKey;
  createdAt: number;
}

/** PKI enrollment status */
export interface PkiStatus {
  enrolled: boolean;
  hasBackup: boolean;
  fingerprint: string | null;
  enrolledAt: number | null;
}

/** PKI public key record */
export interface PkiPublicKeyRecord {
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
  algorithm: string;
  createdAt: number;
  updatedAt: number;
  enrolled: boolean;
}

// ──────────────────────────────────────────────────────────────
// 2.11 Challenge & Competition
// ──────────────────────────────────────────────────────────────

/** Challenge contest */
export interface Challenge {
  id: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  tags: string[];
  startsAt: number;
  endsAt: number;
  totalEntries: number;
}

/** Challenge entry (submission) */
export interface ChallengeEntry {
  id: string;
  userId: string;
  userName: string;
  workId?: string;
  workTitle: string;
  workTheme?: string;
  workLyrics?: string[];
  votes: number;
  aiScore?: number;
  submittedAt: number;
}

/** Champion record */
export interface ChallengeChampion {
  challengeId: string;
  challengeTitle: string;
  winner: ChallengeEntry;
  finalizedAt: number;
}

// ──────────────────────────────────────────────────────────────
// 2.12 Live Session
// ──────────────────────────────────────────────────────────────

/** Live listener presence */
export interface LiveListener {
  userId: string;
  userName: string;
  trackTitle: string;
  emotion: string;
  isPlaying: boolean;
  lastSeen: number;
}

/** Danmaku (live chat message) */
export interface DanmakuMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  color: string;
  timestamp: number;
}

// ──────────────────────────────────────────────────────────────
// 2.13 Copyright
// ──────────────────────────────────────────────────────────────

/** Copyright certification */
export interface CopyrightCert {
  certId: string;
  userId: string;
  userName: string;
  workId: string;
  workTitle: string;
  workTheme: string;
  workLyrics: string[];
  contentHash: string;
  status: CopyrightStatus;
  appliedAt: number;
  certifiedAt?: number;
}

// ──────────────────────────────────────────────────────────────
// 2.14 AI Assistant
// ──────────────────────────────────────────────────────────────

/** AI tip message */
export interface AITip {
  id: string;
  message: string;
  category: AITipCategory;
  priority: AITipPriority;
  icon: string;
  actionLabel?: string;
  actionKey?: string;
  expiresAt: number;
  dismissed?: boolean;
}

/** Voice command recognition result */
export interface VoiceCommand {
  command: string;
  transcript: string;
  confidence: number;
  timestamp: number;
}

/** AI behavior analysis snapshot */
export interface BehaviorSnapshot {
  emotionHistory: Emotion[];
  totalListeningSec: number;
  sessionListeningSec: number;
  tracksPlayed: string[];
  annotationCount: number;
  likeCount: number;
  lastInteractionAt: number;
  consecutiveSameEmotion: number;
  dominantSessionEmotion: Emotion | null;
}

// ──────────────────────────────────────────────────────────────
// 2.15 Theme System
// ──────────────────────────────────────────────────────────────

/** Theme definition (complete) */
export interface ThemeDefinition {
  id: ThemeId;
  label: { zh: string; en: string };
  description: { zh: string; en: string };
  icon: string;
  isDark: boolean;
  bg: string;
  bgPanel: string;
  bgElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentFrom: string;
  accentTo: string;
  border: string;
  glassOverlay: string;
}

/** Custom theme user configuration */
export interface CustomThemeConfig {
  bg: string;
  bgPanel: string;
  accentFrom: string;
  accentTo: string;
  isDark: boolean;
}


// ════════════════════════════════════════════════════════════════
// §3. API REQUEST TYPES
// ════════════════════════════════════════════════════════════════

/** Share work request payload */
export interface ShareWorkRequest {
  workId: string;
  title: string;
  theme?: string;
  lyrics?: string[];
  mode?: string;
  createdAt?: number;
  userId?: string;
  userName?: string;
}

/** Fork work request payload */
export interface ForkWorkRequest {
  userId: string;
  userName: string;
  originalWorkId: string;
  originalAuthor: string;
  title: string;
  theme: string;
  lyrics: string[];
}

/** SpaceTime message request payload */
export interface SpaceTimeMessageRequest {
  userId?: string;
  userName?: string;
  content: string;
  type?: SpaceTimeMessageType;
  targetTime?: string | null;
  targetLocation?: GeoLocation | null;
  songId?: string | null;
  songTitle?: string | null;
  emotion?: string;
  isPublic?: boolean;
}

/** SpaceTime reply request payload */
export interface SpaceTimeReplyRequest {
  userId?: string;
  userName?: string;
  content: string;
}

/** Time capsule create request payload */
export interface TimeCapsuleRequest {
  userId?: string;
  userName?: string;
  title: string;
  content: string;
  unlockAt: string;
  emotion?: string;
  recipientName?: string;
  songId?: string | null;
  songTitle?: string | null;
  /** E2EE fields (P3 §2) */
  encrypted?: boolean;
  encryptedContent?: string;
  encryptedSessionKey?: string;
  encryptionIv?: string;
  senderFingerprint?: string;
  recipientUserId?: string;
}

/** Comment post request */
export interface CommentRequest {
  userId: string;
  userName: string;
  text: string;
  timestamp?: number;
}

/** Annotation post request */
export interface AnnotationRequest {
  lineIndex: number;
  emotion: Emotion;
}

/** Star power add request */
export interface StarPowerAddRequest {
  amount: number;
  reason: string;
}

/** Star power consume request */
export interface StarPowerConsumeRequest {
  amount: number;
  purpose: string;
  targetId?: string;
}

/** Leaderboard boost request */
export interface LeaderboardBoostRequest {
  songId: string;
  userId: string;
  amount?: number;
  starPowerCost?: number;
}

/** Copyright application request */
export interface CopyrightApplyRequest {
  workId: string;
  userId: string;
  userName?: string;
  workTitle: string;
  description?: string;
}

/** Profile update request */
export interface ProfileUpdateRequest {
  displayName?: string;
  bio?: string;
  email?: string;
  avatar?: string;
  [key: string]: any; // passthrough for additional fields
}

/** Album create request */
export interface AlbumCreateRequest {
  creatorId: string;
  creatorName: string;
  title: string;
  description?: string;
  genre?: string;
  tracks: Array<{
    songId?: string;
    title: string;
    artist?: string;
    duration?: number;
  }>;
  price?: number;
  limitedEdition?: boolean;
  maxSupply?: number;
  tags?: string[];
}

/** Market list request */
export interface MarketListRequest {
  userId: string;
  userName?: string;
  albumId: string;
  price: number;
}

/** Market buy request */
export interface MarketBuyRequest {
  userId: string;
  userName?: string;
}

/** Challenge submit request */
export interface ChallengeSubmitRequest {
  userId: string;
  userName?: string;
  workId?: string;
  workTitle: string;
  workTheme?: string;
  workLyrics?: string[];
}

/** Challenge vote request */
export interface ChallengeVoteRequest {
  userId: string;
  entryId: string;
}

/** Timeline comment request */
export interface TimelineCommentRequest {
  userId?: string;
  userName: string;
  text: string;
  timestamp: number;
  songId: string;
}

/** Live session heartbeat request */
export interface LiveHeartbeatRequest {
  userId: string;
  userName?: string;
  trackId?: string;
  trackTitle?: string;
  emotion?: string;
  isPlaying?: boolean;
}

/** Danmaku send request */
export interface DanmakuRequest {
  userId: string;
  userName?: string;
  text: string;
  trackId?: string;
  color?: string;
}

/** Shop purchase request */
export interface ShopPurchaseRequest {
  userId: string;
  itemId: string;
}

/** Achievement track request */
export interface AchievementTrackRequest {
  action: string;
  [key: string]: any; // extra counters
}

/** Listening history record request */
export interface ListeningHistoryRequest {
  userId: string;
  songId: string;
  songTitle: string;
  emotion: string;
  listenDuration: number;
  totalDuration: number;
  completionRate: number;
  skipped: boolean;
}

/** Voice upload request */
export interface VoiceUploadRequest {
  userId: string;
  audioBase64: string;
  mimeType: string;
}

/** AI lyrics generation request */
export interface AILyricsRequest {
  theme: string;
  mood: string;
  keywords: string[];
  lang: Lang;
}

/** AI composition request */
export interface AIComposeRequest {
  theme: string;
  mood: string;
  lang: Lang;
}

/** STT transcribe request */
export interface STTTranscribeRequest {
  audio: string;
  language: string;
  mimeType?: string;
}

/** PKI public key upload request */
export interface PkiUploadKeyRequest {
  userId: string;
  publicKeyJwk: JsonWebKey;
}

/** PKI key backup store request */
export interface PkiKeyBackupRequest {
  userId: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  publicKeyJwk?: JsonWebKey;
}


// ════════════════════════════════════════════════════════════════
// §4. API RESPONSE TYPES
// ════════════════════════════════════════════════════════════════

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Health check response */
export interface HealthResponse {
  status: 'ok';
}

/** Diagnostics: KV stats response */
export interface KVStatsResponse {
  summary: {
    totalRows: number;
    totalPrefixGroups: number;
    uncategorizedCount: number;
    estimatedSizeKB: number;
    estimatedSizeMB: number;
    queriedAt: string;
  };
  domainStats: {
    userDomain: number;
    songDomain: number;
    socialDomain: number;
    spacetimeDomain: number;
    economyDomain: number;
    systemDomain: number;
  };
  prefixStats: Array<{
    prefix: string;
    label: string;
    labelEn: string;
    count: number;
    sampleKeys: string[];
  }>;
  emptyPrefixes: string[];
  uncategorizedKeys: string[];
  cacheStats: {
    entries: number;
    hits: number;
    misses: number;
    hitRate: string;
  };
}

/** Diagnostics: health check response */
export interface DiagnosticsHealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  checks: Record<string, {
    status: string;
    latencyMs?: number;
    detail?: string;
  }>;
  environment: Record<string, string>;
  routeModules: number;
  version: string;
}

/** AI lyrics response */
export interface AILyricsResponse {
  lyrics: string[];
  theme: string;
  themeLabel: string;
  provider: AIProvider;
  cached: boolean;
  generatedAt: string;
}

/** AI preference analysis response */
export interface AIPreferenceAnalysis {
  userId: string;
  analysis: {
    insights: string;
    suggestedMoods: string[];
    personalityTag: string;
    personalityTagEn: string;
    engagementLevel: EngagementLevel;
    recommendations: Array<{
      mood: string;
      reason: string;
      reasonZh: string;
      weight: number;
    }>;
    provider: AIProvider;
    cached: boolean;
  };
}

/** STT transcribe response */
export interface STTTranscribeResponse {
  text?: string;
  fallback?: string;
  provider?: string;
  available?: boolean;
  duration?: number;
}

/** STT stream response */
export interface STTStreamResponse {
  chunks: Array<{
    index: number;
    text: string;
    isFinal: boolean;
    language?: string;
    provider: string;
  }>;
  fullText: string;
  provider: string;
  available: boolean;
  sessionId?: string;
  fallback?: string;
}

/** Album purchase response */
export interface AlbumPurchaseResponse {
  success: boolean;
  ownership: AlbumOwnership;
  starPower: number;
  edition: number;
  maxSupply: number | null;
}

/** Market buy response */
export interface MarketBuyResponse {
  success: boolean;
  sale: MarketSale;
  buyerStarPower: number;
}

/** Voice upload response */
export interface VoiceUploadResponse {
  success: boolean;
  filePath: string;
  signedUrl: string;
}

/** Achievement list response */
export interface AchievementListResponse {
  achievements: AchievementData[];
  stats: AchievementStats;
  totalUnlocked: number;
  totalAchievements: number;
}


// ════════════════════════════════════════════════════════════════
// §5. COMPONENT PROPS
// ════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
// 5.1 Core Player Components
// ──────────────────────────────────────────────────────────────

export interface StarfieldProps {
  emotion?: Emotion;
  isPlaying?: boolean;
  audioEnergy?: number;
  bassEnergy?: number;
}

export interface MediaDisplayProps {
  mode: MediaMode;
  isPlaying: boolean;
  albumArtUrl: string;
  frequencyData: Uint8Array;
  emotion: Emotion;
  audioEnergy: number;
  songTitle: string;
  artist: string;
}

export interface AudioVisualizerProps {
  frequencyData: Uint8Array;
  emotion: Emotion;
  isPlaying: boolean;
  size: number;
  mode?: 'circular' | 'bars';
}

export interface LyricsDisplayProps {
  currentTime: number;
  lyrics: LyricLine[];
  onLineClick?: (time: number) => void;
  annotations?: EmotionAnnotation;
  onAnnotate?: (lineIndex: number, emotion: Emotion) => void;
  isPlaying?: boolean;
}

export interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  progress: number;
  onSeek: (value: number) => void;
  duration: number;
  mode: MediaMode;
  onToggleMode: () => void;
  mValue: number;
  onLike: () => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  songTitle: string;
  artist: string;
  audioEnergy?: number;
  onPrev: () => void;
  onNext: () => void;
  onPlaylistToggle: () => void;
  onCommunityToggle?: () => void;
  onCommentsToggle?: () => void;
  onAILyricsToggle?: () => void;
  onLeaderboardToggle?: () => void;
  onAnalyticsToggle?: () => void;
  shuffleEnabled: boolean;
  onShuffleToggle: () => void;
  repeatMode: RepeatMode;
  onRepeatCycle: () => void;
  audioMode: AudioMode;
  albumArt?: string;
  emotion?: Emotion;
  onEmotionFilter?: (emotion: Emotion | null) => void;
  activeEmotionFilter?: Emotion | null;
  lyrics?: LyricLine[];
}

export interface EmotionRippleProps {
  emotion: Emotion;
  /** 0-1 normalized */
  audioEnergy: number;
  isPlaying: boolean;
  frequencyData?: Uint8Array;
  className?: string;
}

// ──────────────────────────────────────────────────────────────
// 5.2 Playlist & Navigation
// ──────────────────────────────────────────────────────────────

export interface PlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onAddTrackFromFile: (file: File) => void;
  onAddTrackFromUrl: (url: string, title?: string) => void;
  audioMode: AudioMode;
}

export interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isPlaying: boolean;
  audioEnergy: number;
  hasUser: boolean;
  onMicTap?: () => void;
  isListening?: boolean;
  unreadNotifications?: number;
  onOpenForkTree?: () => void;
  onOpenMHeart?: () => void;
  onOpenSmartPlaylist?: () => void;
  onOpenLiveSession?: () => void;
}

export interface MobilePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  progress: number;
  duration: number;
  onSeek: (t: number) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  songTitle: string;
  artist: string;
  albumArt: string;
  audioEnergy: number;
  emotion: Emotion;
  mValue: number;
  onLike: () => void;
  onPrev: () => void;
  onNext: () => void;
  shuffleEnabled: boolean;
  onShuffleToggle: () => void;
  repeatMode: RepeatMode;
  onRepeatCycle: () => void;
  audioMode: AudioMode;
  onPlaylistToggle: () => void;
  onCommentsToggle: () => void;
  onAILyricsToggle: () => void;
  onLeaderboardToggle: () => void;
  onAnalyticsToggle: () => void;
  onMicToggle?: () => void;
  isListening?: boolean;
  lyrics?: LyricLine[];
  currentLyricText?: string;
  currentLyricTranslation?: string;
  frequencyData?: Uint8Array;
}

// ─────────────────��────────────────────────────────────────────
// 5.3 Auth & User
// ──────────────────────────────────────────────────────────────

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChange: (user: AuthUser | null) => void;
}

export interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  profile: UserProfileData | null;
  starPower: number;
}

// ──────────────────────────────────────────────────────────────
// 5.4 Community & Social Panels
// ──────────────────────────────────────────────────────────────

export interface CommunityFeedProps {
  isOpen: boolean;
  onClose: () => void;
  activities: CommunityActivity[];
  onRefresh: () => void;
  isLoading: boolean;
}

export interface CommentSystemProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  currentTime: number;
  user: AuthUser | null;
}

export interface TimelineCommentsProps {
  songId: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  user: AuthUser | null;
  lang: Lang;
}

export interface ForkTreeProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}

export interface MHeartSystemProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  lang: Lang;
}

export interface LiveSessionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  currentTrackId: string;
  currentTrackTitle: string;
  isPlaying: boolean;
  currentEmotion: string;
}

// ──────────────────────────────────────────────────────────────
// 5.5 AI & Creation Panels
// ──────────────────────────────────────────────────────────────

export interface AILyricsGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrack?: (
    lyrics: string[],
    theme: AILyricsTheme,
    audioBlobUrl?: string,
    compositionParams?: any
  ) => void;
}

export interface CreationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrack?: (
    lyrics: string[],
    theme: string,
    audioBlobUrl?: string,
    compositionParams?: any
  ) => void;
  playlist: Track[];
  currentTrackIndex: number;
  onHaptic?: (pattern: string) => void;
  onShareWork?: (work: CreatedWork) => void;
  onOpenMV?: (workLyrics?: string[]) => void;
  user?: AuthUser | null;
  starPower?: number;
  onStarPowerUpdate?: (sp: number) => void;
}

export interface MVCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
  isPlaying: boolean;
  audioEnergy: number;
  frequencyData: Uint8Array;
  currentTime: number;
  emotion: string;
  customLyrics?: string[] | null;
  onHaptic?: (pattern: string) => void;
}

export interface ShareWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: CreatedWork | null;
  userName?: string;
  userId?: string;
  onShared?: () => void;
}

export interface AIAssistantProps {
  activeTips: AITip[];
  onDismissTip: (id: string) => void;
  onExecuteAction: (actionKey: string) => void;
  isListening: boolean;
  onToggleListening: () => void;
  voiceSupported: boolean;
  voiceFeedback: string;
  voiceHistory: VoiceCommand[];
  sessionInsight: string;
  isPlaying: boolean;
  audioEnergy: number;
  externalExpanded?: boolean;
  onExternalExpandedChange?: (expanded: boolean) => void;
}

// ────────────────────────────────────────���─────────────────────
// 5.6 Data & Analytics Panels
// ──────────────────────────────────────────────────────────────

export interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface LeaderboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack?: (songId: string) => void;
  user?: AuthUser | null;
  starPower?: number;
  onStarPowerUpdate?: (sp: number) => void;
}

export interface RecommendationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onHaptic?: () => void;
}

export interface ListeningStatsProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  lang: Lang;
}

export interface SmartPlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  currentEmotion: string;
  playlist: Array<{
    id: string;
    title: string;
    artist: string;
    albumArt: string;
    color: string;
    lyrics: Array<{ emotion?: string }>;
  }>;
  onApplyQueue: (indices: number[]) => void;
}

// ──────────────────────────────────────────────────────────────
// 5.7 Economy Panels
// ──────────────────────────────────────────────────────────────

export interface StarPowerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
  onOpenShop?: () => void;
}

export interface StarPowerShopProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}

export interface AlbumStoreProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}

export interface SecondaryMarketProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onStarPowerUpdate: (sp: number) => void;
}

// ──────────────────────────────────────────────────────────────
// 5.8 Feature Panels
// ──────────────────────────────────────────────────────────────

export interface SpaceTimePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  currentTrackId?: string;
  currentTrackTitle?: string;
}

export interface ChallengeProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onOpenCreationStudio: () => void;
}

export interface AchievementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower?: number;
}

export interface IPMatrixPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  profile: UserProfileData | null;
  starPower: number;
  onOpenCreationStudio: () => void;
}

export interface CopyrightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

export interface E2EKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  lang?: string;
}

// ──────────────────────────────────────────────────────────────
// 5.9 Mobile & PWA
// ──────────────────────────────────────────────────────────────

export interface MobileDiscoverHubProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  starPower: number;
  onOpenLeaderboard: () => void;
  onOpenRecommendations: () => void;
  onOpenSpaceTime: () => void;
  onOpenStarPower: () => void;
  onOpenIPMatrix: () => void;
  onOpenAchievements: () => void;
  onOpenMVCreator: () => void;
  onOpenCreationStudio: () => void;
  onOpenCommunity: () => void;
  onOpenComments: () => void;
  onOpenCopyright: () => void;
  onOpenShop: () => void;
  onOpenChallenge: () => void;
  onOpenAlbumStore: () => void;
  onOpenE2ESetup?: () => void;
  onOpenSecondaryMarket?: () => void;
}

export interface PWABannerProps {
  show: boolean;
  canInstall: boolean;
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  isOnline: boolean;
}

export interface OfflineIndicatorProps {
  isOnline: boolean;
}

// ──────────────────────────────────────────────────────────────
// 5.10 Settings & Utilities
// ──────────────────────────────────────────────────────────────

export interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  lang: Lang;
}

export interface KeyboardShortcutsProps {
  lang: Lang;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
}


// ════════════════════════════════════════════════════════════════
// §6. HOOK RETURN TYPES
// ════════════════════════════════════════════════════════════════

/** Audio engine configuration */
export interface AudioEngineConfig {
  trackKey?: string;
  duration?: number;
  chordSet?: number;
  audioUrl?: string;
  onTrackEnd?: () => void;
  initialVolume?: number;
}

/** Audio engine return type */
export interface AudioEngineReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  audioEnergy: number;
  bassEnergy: number;
  trebleEnergy: number;
  audioMode: AudioMode;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  loadAudioFile: (file: File) => void;
}

/** PWA state from usePWA hook */
export interface PWAState {
  isStandalone: boolean;
  isOnline: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isMobile: boolean;
  installApp: () => Promise<void>;
  dismissInstall: () => void;
  showInstallHint: boolean;
}

/** AI Assistant configuration */
export interface AIAssistantConfig {
  isPlaying: boolean;
  currentEmotion: Emotion;
  currentTrackId: string;
  currentTrackTitle: string;
  starPower: number;
  isLoggedIn: boolean;
  lang: Lang;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onLike: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
}

/** i18n context value */
export interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}


// ════════════════════════════════════════════════════════════════
// §7. UTILITY TYPES
// ════════════════════════════════════════════════════════════════

/**
 * Make specific keys of T required.
 * @example RequireKeys<User, 'id' | 'email'>
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make all keys optional except specified ones.
 * @example PartialExcept<Track, 'id' | 'title'>
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/**
 * Deep partial — makes all nested properties optional.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the element type from an array type.
 * @example ArrayElement<Track[]> → Track
 */
export type ArrayElement<T extends readonly any[]> =
  T extends readonly (infer U)[] ? U : never;

/**
 * Nullable wrapper — T or null.
 */
export type Nullable<T> = T | null;

/**
 * Ensure a type has an `id` field.
 */
export type WithId<T> = T & { id: string };

/**
 * Timestamp-stamped wrapper — adds `createdAt` and `updatedAt`.
 */
export type Timestamped<T> = T & {
  createdAt: number;
  updatedAt: number;
};

/**
 * Branded type for type-safe nominal typing.
 * @example type UserId = Brand<string, 'UserId'>
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Branded string types for type safety */
export type UserId = Brand<string, 'UserId'>;
export type SongId = Brand<string, 'SongId'>;
export type WorkId = Brand<string, 'WorkId'>;
export type AlbumId = Brand<string, 'AlbumId'>;
export type ListingId = Brand<string, 'ListingId'>;

/**
 * Standard callback for panel close actions.
 */
export type CloseHandler = () => void;

/**
 * Standard callback for value updates.
 */
export type UpdateHandler<T> = (value: T) => void;