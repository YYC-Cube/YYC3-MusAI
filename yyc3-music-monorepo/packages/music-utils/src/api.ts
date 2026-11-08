/**
 * D-Music API Service Layer
 * Typed, domain-grouped API functions wrapping apiFetch.
 * 闭环架构: UI → api.ts → apiFetch → Supabase Edge Functions
 */
import { apiFetch } from './supabase';

// ============================================================
// Type Definitions
// ============================================================

export interface SongStats {
  likes?: number;
  plays?: number;
  comments?: number;
  shares?: number;
}

export interface AnnotationData {
  annotations?: Record<string, Record<string, number>>;
}

export interface StarPowerData {
  starPower?: number;
  transactions?: any[];
}

export interface UserProfileData {
  id?: string;
  nickname?: string;
  avatar?: string;
  bio?: string;
  favoriteGenres?: string[];
  totalPlays?: number;
  totalLikes?: number;
  joinedAt?: string;
}

export interface CommentItem {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp?: number;
  likes: number;
  createdAt: number;
}

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

export interface RecommendationItem {
  songId: string;
  title: string;
  artist: string;
  score: number;
  reason: string;
}

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
  forkedFrom?: { workId: string; author: string; forkedAt: number } | null;
}

export interface CreatorInfo {
  userName: string;
  userId?: string;
  works: number;
  totalLikes: number;
  latestWork: number;
}

export interface STMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type?: string;
  emotion: string;
  likes: number;
  likedBy: string[];
  replies: number;
  createdAt: number;
  targetLocation?: { lat: number; lng: number; label?: string } | null;
  targetTime?: string | null;
  songId?: string | null;
  songTitle?: string | null;
  audioDuration?: number;
  audioWaveform?: number[];
  audioFilePath?: string;
  audioSignedUrl?: string;
  distance?: number;
}

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

export interface ForkNode {
  workId: string;
  author: string;
  forkedAt: number;
}

// ============================================================
// 1. Core Player & Interaction APIs
// ============================================================

export const playerApi = {
  /** Get song likes */
  getLikes: (songId: string) =>
    apiFetch<{ likes?: number }>(`/likes/${songId}`),

  /** Like a song (increment) */
  likeSong: (songId: string) =>
    apiFetch<{ likes?: number }>(`/likes/${songId}`, { method: 'POST' }),

  /** Record a play event */
  recordPlay: (songId: string) =>
    apiFetch(`/play/${songId}`, { method: 'POST' }),

  /** Get emotion annotations */
  getAnnotations: (songId: string) =>
    apiFetch<AnnotationData>(`/annotations/${songId}`),

  /** Add an emotion annotation */
  addAnnotation: (songId: string, lineIndex: number, emotion: string) =>
    apiFetch<AnnotationData>(`/annotations/${songId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineIndex, emotion }),
    }),

  /** Get song stats */
  getSongStats: (songId: string) =>
    apiFetch<SongStats>(`/song/stats/${songId}`),
};

// ============================================================
// 2. Comment APIs
// ============================================================

export const commentApi = {
  /** Get comments for a song */
  getComments: (songId: string) =>
    apiFetch<{ comments?: CommentItem[] }>(`/comments/${songId}`),

  /** Post a comment */
  postComment: (songId: string, payload: { userId: string; userName: string; content: string; timestamp?: number }) =>
    apiFetch<{ comment?: CommentItem }>(`/comments/${songId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  /** Like a comment */
  likeComment: (songId: string, commentId: string) =>
    apiFetch(`/comments/${songId}/${commentId}/like`, { method: 'POST' }),
};

// ============================================================
// 3. User & Auth APIs
// ============================================================

export const userApi = {
  /** Get user profile */
  getProfile: (userId: string) =>
    apiFetch<{ profile?: UserProfileData }>(`/profile/${userId}`),

  /** Update user profile */
  updateProfile: (userId: string, data: Partial<UserProfileData>) =>
    apiFetch<{ profile?: UserProfileData }>(`/profile/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** Sign up */
  signup: (email: string, password: string, name?: string) =>
    apiFetch<{ success: boolean }>('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    }),
};

// ============================================================
// 4. Star Power Economy APIs
// ============================================================

export const starPowerApi = {
  /** Get star power balance */
  getBalance: (userId: string) =>
    apiFetch<{ starPower?: number }>(`/starpower/${userId}`),

  /** Add star power */
  add: (userId: string, amount: number, reason: string) =>
    apiFetch<{ starPower?: number }>(`/starpower/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason }),
    }),

  /** Consume star power */
  consume: (userId: string, amount: number, reason: string) =>
    apiFetch<{ success?: boolean; starPower?: number }>(`/starpower/${userId}/consume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason }),
    }),
};

// ============================================================
// 5. Leaderboard APIs
// ============================================================

export const leaderboardApi = {
  /** Get leaderboard */
  get: () =>
    apiFetch<{ leaderboard?: LeaderboardEntry[] }>('/leaderboard'),

  /** Boost a song (spend star power) */
  boost: (songId: string, userId: string, starPowerCost: number) =>
    apiFetch<{ success?: boolean }>('/leaderboard/boost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, userId, starPowerCost }),
    }),
};

// ============================================================
// 6. Recommendation APIs
// ============================================================

export const recommendationApi = {
  /** Get personalized recommendations */
  get: (userId: string) =>
    apiFetch<{ recommendations?: RecommendationItem[] }>(`/recommendations/${userId}`),

  /** Get user preferences */
  getPreferences: (userId: string) =>
    apiFetch<{ preferences?: any }>(`/recommendations/${userId}/preferences`),

  /** Get AI-powered preference analysis (GPT insights) */
  getAIAnalysis: (userId: string) =>
    apiFetch<{
      userId: string;
      analysis: {
        insights: string;
        suggestedMoods: string[];
        personalityTag: string;
        personalityTagEn: string;
        engagementLevel: 'casual' | 'regular' | 'enthusiast' | 'power';
        recommendations: Array<{ mood: string; reason: string; reasonZh: string; weight: number }>;
        provider: string;
        cached: boolean;
      };
    }>(`/recommendations/${userId}/ai-analysis`),

  /** Record listening history */
  recordHistory: (data: {
    userId: string; songId: string; songTitle: string;
    emotion: string; listenDuration: number; totalDuration: number;
    completionRate: number; skipped: boolean;
  }) =>
    apiFetch('/listening-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
};

// ============================================================
// 7. AI Creation APIs
// ============================================================

export const aiApi = {
  /** Generate lyrics */
  generateLyrics: (theme: string, mood: string, keywords: string[], lang: string) =>
    apiFetch<{ lyrics?: string[] }>('/ai/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, mood, keywords, lang }),
    }),

  /** Generate composition params */
  compose: (theme: string, mood: string, lang: string) =>
    apiFetch<{ composition?: any }>('/ai/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme, mood, lang }),
    }),
};

// ============================================================
// 8. Social / IP Matrix APIs
// ============================================================

export const socialApi = {
  /** Get shared works */
  getSharedWorks: () =>
    apiFetch<SharedWork[]>('/shared-works'),

  /** Share a work */
  shareWork: (data: any) =>
    apiFetch('/shared-works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** Like a shared work */
  likeWork: (workId: string) =>
    apiFetch(`/shared-works/${workId}/like`, { method: 'POST' }),

  /** Play a shared work */
  playWork: (workId: string) =>
    apiFetch(`/shared-works/${workId}/play`, { method: 'POST' }),

  /** Get creators list */
  getCreators: () =>
    apiFetch<CreatorInfo[]>('/creators'),

  /** Get creator's works */
  getCreatorWorks: (userName: string) =>
    apiFetch<SharedWork[]>(`/creators/${encodeURIComponent(userName)}/works`),

  /** Fork a work */
  forkWork: (data: {
    userId: string; userName: string; originalWorkId: string;
    originalAuthor: string; title: string; theme: string; lyrics: string[];
  }) =>
    apiFetch<{ success: boolean; forkedWork: SharedWork }>('/works/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** Get fork chain */
  getForkChain: (workId: string) =>
    apiFetch<{ forks: ForkNode[]; count: number }>(`/works/${workId}/forks`),
};

// ============================================================
// 9. Space-Time APIs
// ============================================================

export const spaceTimeApi = {
  /** Get messages */
  getMessages: () =>
    apiFetch<{ messages?: STMessage[] }>('/spacetime/messages'),

  /** Send message */
  sendMessage: (data: any) =>
    apiFetch<{ success: boolean; message: STMessage }>('/spacetime/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** Like message */
  likeMessage: (msgId: string, userId: string) =>
    apiFetch(`/spacetime/messages/${msgId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }),

  /** Get replies */
  getReplies: (msgId: string) =>
    apiFetch<{ replies?: any[] }>(`/spacetime/messages/${msgId}/replies`),

  /** Post reply */
  postReply: (msgId: string, data: any) =>
    apiFetch(`/spacetime/messages/${msgId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** Get nearby messages */
  getNearby: (lat: number, lng: number, radius?: number) =>
    apiFetch<{ messages?: STMessage[] }>(
      `/spacetime/messages/nearby?lat=${lat}&lng=${lng}&radius=${radius || 50}`
    ),

  /** Get capsules */
  getCapsules: () =>
    apiFetch<{ capsules?: TimeCapsule[] }>('/spacetime/capsules'),

  /** Create capsule */
  createCapsule: (data: any) =>
    apiFetch<{ success: boolean; capsule: TimeCapsule }>('/spacetime/capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** Like capsule */
  likeCapsule: (capId: string) =>
    apiFetch(`/spacetime/capsules/${capId}/like`, { method: 'POST' }),
};

// ============================================================
// 10. Voice Storage APIs
// ============================================================

export const voiceApi = {
  /** Upload voice to Supabase Storage */
  upload: (userId: string, audioBase64: string, mimeType: string) =>
    apiFetch<{ success: boolean; filePath: string; signedUrl: string }>('/voice/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, audioBase64, mimeType }),
    }),

  /** Get signed URL for voice playback */
  getUrl: (path: string) =>
    apiFetch<{ signedUrl?: string }>(`/voice/url?path=${encodeURIComponent(path)}`),
};

// ============================================================
// 11. Achievement APIs
// ============================================================

export const achievementApi = {
  /** Get achievements for user */
  get: (userId: string) =>
    apiFetch<{
      achievements: AchievementData[];
      stats: AchievementStats;
      totalUnlocked: number;
      totalAchievements: number;
    }>(`/achievements/${userId}`),

  /** Track an achievement action */
  track: (userId: string, action: string, extra?: Record<string, number>) =>
    apiFetch<{ success: boolean; stats: AchievementStats }>(
      `/achievements/${userId}/track`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      }
    ),
};

// ============================================================
// 12. Template / Theme Unlock APIs
// ============================================================

export const themeApi = {
  /** Get unlocked themes */
  getUnlocked: (userId: string) =>
    apiFetch<{ themes?: string[] }>(`/user/${userId}/unlocked-themes`),

  /** Unlock a theme */
  unlock: (userId: string, themeId: string) =>
    apiFetch<{ success: boolean; themes?: string[] }>(`/user/${userId}/unlocked-themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    }),
};

// ============================================================
// 13. STT (Speech-to-Text) APIs
// ============================================================

export const sttApi = {
  /** Transcribe audio via Whisper (or template fallback) */
  transcribe: (audio: string, language: string, mimeType?: string) =>
    apiFetch<{ text?: string; fallback?: string; provider?: string; available?: boolean; duration?: number }>('/stt/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, language, mimeType }),
    }),

  /** Stream-transcribe multiple audio chunks (progressive STT) */
  stream: (chunks: Array<{ audioBase64: string; index: number }>, language: string, mimeType?: string, sessionId?: string) =>
    apiFetch<{
      chunks: Array<{ index: number; text: string; isFinal: boolean; language?: string; provider: string }>;
      fullText: string;
      provider: string;
      available: boolean;
      sessionId?: string;
      fallback?: string;
    }>('/stt/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks, language, mimeType, sessionId }),
    }),
};

// ============================================================
// 14. Notification APIs
// ============================================================

export interface NotificationItem {
  id: string;
  type: 'fork' | 'like' | 'comment' | 'achievement';
  fromUser: string;
  workTitle?: string;
  originalWorkId?: string;
  createdAt: number;
  read: boolean;
}

export const notificationApi = {
  /** Get notifications for user (§v11.1: uses userId, not userName) */
  get: (userId: string) =>
    apiFetch<{ notifications?: NotificationItem[] }>(`/notifications/${encodeURIComponent(userId)}`),

  /** Mark all notifications as read */
  markRead: (userId: string) =>
    apiFetch(`/notifications/${encodeURIComponent(userId)}/read`, { method: 'POST' }),
};

// ============================================================
// 15. Digital Album Distribution APIs (P3 §1)
// ============================================================

export interface AlbumTrack {
  songId: string;
  title: string;
  artist: string;
  duration: number;
  trackNumber: number;
}

export interface AlbumExclusiveContent {
  type: 'pdf' | 'stem' | 'video' | 'bonus-track';
  label: string;
  labelEn: string;
}

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

export interface AlbumOwnership {
  albumId: string;
  userId: string;
  purchasedAt: number;
  price: number;
  edition: number;
}

export const albumApi = {
  /** List all published albums */
  list: () =>
    apiFetch<{ albums: Album[]; total: number }>('/albums'),

  /** Get album details */
  get: (albumId: string) =>
    apiFetch<{ album: Album }>(`/albums/${albumId}`),

  /** Purchase an album with Star Power */
  purchase: (albumId: string, userId: string) =>
    apiFetch<{
      success: boolean;
      ownership: AlbumOwnership;
      starPower: number;
      edition: number;
      maxSupply: number | null;
    }>(`/albums/${albumId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }),

  /** Get user's album collection */
  getCollection: (userId: string) =>
    apiFetch<{ collection: Array<Album & { ownership: AlbumOwnership }>; total: number }>(
      `/albums/collection/${userId}`
    ),

  /** Get albums by creator */
  getByCreator: (userId: string) =>
    apiFetch<{ albums: Album[]; total: number }>(`/albums/creator/${userId}`),

  /** Like an album */
  like: (albumId: string) =>
    apiFetch<{ likes: number }>(`/albums/${albumId}/like`, { method: 'POST' }),

  /** Create/publish an album */
  create: (data: {
    creatorId: string;
    creatorName: string;
    title: string;
    description?: string;
    genre?: string;
    tracks: Array<{ songId?: string; title: string; artist?: string; duration?: number }>;
    price?: number;
    limitedEdition?: boolean;
    maxSupply?: number;
    tags?: string[];
  }) =>
    apiFetch<{ success: boolean; album: Album }>('/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
};

// ============================================================
// 16. PKI (Public Key Infrastructure) APIs (P3 §2)
// ============================================================

export interface PkiStatusResponse {
  enrolled: boolean;
  hasBackup: boolean;
  fingerprint: string | null;
  enrolledAt: number | null;
}

export interface PkiPublicKeyResponse {
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
  algorithm: string;
  createdAt: number;
  updatedAt: number;
  enrolled: boolean;
}

export interface PkiKeyBackupResponse {
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  publicKeyJwk: JsonWebKey;
  createdAt: number;
  hasBackup: boolean;
}

export const pkiApi = {
  /** Upload/update a user's public key */
  uploadPublicKey: (userId: string, publicKeyJwk: JsonWebKey) =>
    apiFetch<{ success: boolean; fingerprint: string; isNew: boolean }>('/pki/public-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, publicKeyJwk }),
    }),

  /** Fetch a user's public key */
  getPublicKey: (userId: string) =>
    apiFetch<PkiPublicKeyResponse>(`/pki/public-key/${userId}`),

  /** Delete a user's public key (key rotation) */
  deletePublicKey: (userId: string) =>
    apiFetch<{ success: boolean }>(`/pki/public-key/${userId}`, { method: 'DELETE' }),

  /** Store encrypted key backup on server */
  storeKeyBackup: (data: {
    userId: string;
    encryptedPrivateKey: string;
    salt: string;
    iv: string;
    publicKeyJwk?: JsonWebKey;
  }) =>
    apiFetch<{ success: boolean; isNew: boolean }>('/pki/key-backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** Retrieve encrypted key backup */
  getKeyBackup: (userId: string) =>
    apiFetch<PkiKeyBackupResponse>(`/pki/key-backup/${userId}`),

  /** Check E2EE enrollment status */
  getStatus: (userId: string) =>
    apiFetch<PkiStatusResponse>(`/pki/status/${userId}`),
};

// ============================================================
// 17. Secondary Market APIs (P3 §3)
// ============================================================

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
  status: 'active' | 'sold' | 'cancelled';
}

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

export interface MarketStats {
  activeListings: number;
  totalListings: number;
  totalSales: number;
  totalVolume: number;
  floorPrices: Record<string, number>;
  recentSales: MarketSale[];
}

export const marketApi = {
  /** Browse active resale listings */
  getListings: () =>
    apiFetch<{ listings: MarketListing[]; total: number }>('/market/listings'),

  /** Get listings by a specific seller */
  getSellerListings: (userId: string) =>
    apiFetch<{ listings: MarketListing[]; total: number }>(`/market/listings/${userId}`),

  /** Create a resale listing */
  createListing: (data: { userId: string; userName: string; albumId: string; price: number }) =>
    apiFetch<{ success: boolean; listing: MarketListing }>('/market/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** Purchase a listing (transfer ownership) */
  buyListing: (listingId: string, userId: string, userName: string) =>
    apiFetch<{ success: boolean; sale: MarketSale; buyerStarPower: number }>(
      `/market/buy/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName }),
      }
    ),

  /** Cancel a listing */
  cancelListing: (listingId: string) =>
    apiFetch<{ success: boolean }>(`/market/cancel/${listingId}`, { method: 'DELETE' }),

  /** Recent completed sales */
  getHistory: () =>
    apiFetch<{ sales: MarketSale[]; total: number }>('/market/history'),

  /** Market statistics */
  getStats: () =>
    apiFetch<MarketStats>('/market/stats'),
};