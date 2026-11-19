/**
 * D-Music — Global TypeScript Type Definitions (Barrel)
 * ==============================================================
 *
 * 类型已按领域拆分至 ./types/ 目录（单一职责），本文件为纯 barrel：
 * 仅逐名 re-export 各域类型（全部为纯类型，无运行时值）。
 * 导出名集合与拆分前完全一致，`from './types'` /
 * `from './types.js'` 等既有导入路径零改动。
 *
 * @module types
 * @version 12.0.0
 * @date 2026-11-18
 */

export type {
  Emotion,
  EmotionExtended,
  Lang,
  RepeatMode,
  MediaMode,
  AudioMode,
  ThemeId,
  I18nContextType,
  RequireKeys,
  PartialExcept,
  DeepPartial,
  ArrayElement,
  Nullable,
  WithId,
  Timestamped,
  Brand,
  UserId,
  SongId,
  WorkId,
  AlbumId,
  ListingId,
  CloseHandler,
  UpdateHandler
} from './types/common';

export type {
  ApiResponse,
  PaginatedResponse,
  HealthResponse,
  KVStatsResponse,
  DiagnosticsHealthResponse,
  RateLimitTier
} from './types/api-common';

export type {
  LyricLine,
  Track,
  SongStats,
  EmotionAnnotation,
  AnnotationData,
  AudioEngineConfig,
  AudioEngineReturn,
  StarfieldProps,
  MediaDisplayProps,
  AudioVisualizerProps,
  LyricsDisplayProps,
  PlayerControlsProps,
  EmotionRippleProps,
  AnnotationRequest
} from './types/track';

export type {
  PlaylistPanelProps,
  MobileNavProps,
  MobilePlayerProps,
  MoodAnalysis,
  SmartPlaylistPanelProps
} from './types/playlist';

export type {
  UserRole,
  AuthUser,
  UserProfileData,
  UserProfileAPI,
  UserPreferences,
  ProfileUpdateRequest,
  AuthModalProps,
  UserProfileProps
} from './types/user';

export type {
  CommunityActivityType,
  NotificationType,
  CommunityActivity,
  CommentItem,
  CommentModel,
  TimelineComment,
  NotificationItem,
  CommentRequest,
  TimelineCommentRequest,
  CommunityFeedProps,
  CommentSystemProps,
  TimelineCommentsProps
} from './types/social';

export type {
  CreationMode,
  MVTheme,
  SharedWork,
  ForkOrigin,
  ForkNode,
  ForkWork,
  ForkTreeNode,
  CreatedWork,
  CreatorInfo,
  ShareWorkRequest,
  ForkWorkRequest,
  CreationStudioProps,
  MVCreatorProps,
  ShareWorkModalProps,
  ForkTreeProps
} from './types/creation';

export type {
  ShopItemRarity,
  ShopItemCategory,
  StarPowerData,
  StarPowerTransaction,
  VIPLevel,
  ShopItem,
  StarPowerAddRequest,
  StarPowerConsumeRequest,
  ShopPurchaseRequest,
  StarPowerPanelProps,
  StarPowerShopProps
} from './types/economy';

export type {
  AlbumViewMode,
  MarketViewMode,
  MarketListingStatus,
  ExclusiveContentType,
  AlbumTrack,
  AlbumExclusiveContent,
  Album,
  AlbumOwnership,
  MarketListing,
  MarketSale,
  MarketStats,
  AlbumCreateRequest,
  MarketListRequest,
  MarketBuyRequest,
  AlbumPurchaseResponse,
  MarketBuyResponse,
  AlbumStoreProps,
  SecondaryMarketProps
} from './types/album';

export type {
  LeaderboardEntry,
  RankingEntry,
  RecommendationItem,
  Recommendation,
  ListeningHistoryEntry,
  AnalyticsData,
  LeaderboardBoostRequest,
  ListeningHistoryRequest,
  AnalyticsDashboardProps,
  LeaderboardPanelProps,
  RecommendationsPanelProps,
  ListeningStatsProps
} from './types/analytics';

export type {
  AchievementCategory,
  Achievement,
  AchievementData,
  AchievementStats,
  MHeartData,
  MHeartTrendPoint,
  AchievementTrackRequest,
  AchievementListResponse,
  AchievementsPanelProps,
  MHeartSystemProps
} from './types/gamification';

export type {
  SpaceTimeMessageType,
  GeoLocation,
  STMessage,
  TimeCapsule,
  SpaceTimeMessageRequest,
  SpaceTimeReplyRequest,
  TimeCapsuleRequest,
  VoiceUploadRequest,
  VoiceUploadResponse,
  SpaceTimePanelProps
} from './types/spacetime';

export type {
  LiveListener,
  DanmakuMessage,
  LiveHeartbeatRequest,
  DanmakuRequest,
  LiveSessionPanelProps
} from './types/live';

export type {
  E2ESetupStep,
  E2EKeyPair,
  EncryptedPayload,
  KeyBackup,
  PkiStatus,
  PkiPublicKeyRecord,
  PkiUploadKeyRequest,
  PkiKeyBackupRequest,
  E2EKeySetupProps
} from './types/e2ee';

export type {
  Challenge,
  ChallengeEntry,
  ChallengeChampion,
  ChallengeSubmitRequest,
  ChallengeVoteRequest,
  ChallengeProps
} from './types/challenge';

export type {
  AILyricsTheme,
  AIProvider,
  AITipPriority,
  AITipCategory,
  EngagementLevel,
  AITip,
  VoiceCommand,
  BehaviorSnapshot,
  AILyricsRequest,
  AIComposeRequest,
  STTTranscribeRequest,
  AILyricsResponse,
  AIPreferenceAnalysis,
  STTTranscribeResponse,
  STTStreamResponse,
  AILyricsGeneratorProps,
  AIAssistantProps,
  AIAssistantConfig
} from './types/ai';

export type {
  ThemeDefinition,
  CustomThemeConfig,
  ThemeSwitcherProps
} from './types/theme';

export type {
  CopyrightStatus,
  CopyrightCert,
  CopyrightApplyRequest,
  CopyrightPanelProps,
  IPMatrixPanelProps
} from './types/copyright';

export type {
  MobileDiscoverHubProps,
  PWABannerProps,
  OfflineIndicatorProps,
  PWAState,
  KeyboardShortcutsProps,
  ErrorBoundaryProps
} from './types/ui';
