import { useState, useReducer, useRef, useCallback, useEffect, lazy, Suspense, useMemo } from 'react';
import { useSearchParams, RouterProvider, createBrowserRouter } from 'react-router';
import { clsx } from 'clsx';
import { supabase, apiFetch, API_BASE } from '@yyc3/music-utils';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User, Star, Users, UserCircle, BarChart3, Wand2, Trophy, MessageCircle, SkipBack, SkipForward, Globe, Sparkles, Palette, Film, Radio, Bell, GitBranch, Heart, Brain, Disc3, Shield, Upload } from 'lucide-react';
import { useAudioEngine, type Emotion } from '@yyc3/music-hooks';
import { I18nProvider, useI18n } from '@yyc3/music-hooks';
import {
  DEMO_PLAYLIST,
  type Track,
  type UserProfileData,
  type CommunityActivity,
  dMusicLogo,
  dMusicRed,
  dMusicInstruments,
  getFavoriteIds,
  getLocalAudio,
  getSavedPlaylists,
  getSavedQueue,
  deleteLocalAudio,
  pruneLocalAudio,
  saveLocalAudio,
  savePlaylist,
  saveQueue,
  toggleFavorite,
} from '@yyc3/music-data';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Starfield } from './components/Starfield';
import { MediaDisplay } from '@yyc3/music-player';
import { LyricsDisplay, type LyricLine, type EmotionAnnotation } from '@yyc3/music-lyrics';
import { PlayerControls } from '@yyc3/music-player';
import { AuthModal } from './components/AuthModal';
import { PlaylistPanel } from './components/PlaylistPanel';
import { UserProfile } from './components/UserProfile';
import { CommunityFeed } from '@yyc3/music-community';
import { CommentSystem } from '@yyc3/music-community';
import { useSwipeGesture } from '@yyc3/music-hooks';
import { useAIAssistant } from '@yyc3/music-hooks';
import { AIAssistant } from '@yyc3/music-ai';
import { usePWA } from '@yyc3/music-hooks';
import { useHaptics } from '@yyc3/music-hooks';
import { MobileNav } from './components/MobileNav';
import { MobilePlayer } from '@yyc3/music-player';
import { PWABanner } from './components/PWABanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PerfMonitor } from './components/PerfMonitor';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { ListeningStats } from './components/ListeningStats';
import { TimelineComments } from '@yyc3/music-community';
import { EmotionRipple } from '@yyc3/music-lyrics';
import { loadPref, savePref, pullPrefsFromKV } from '@yyc3/music-utils';
import { applyTheme, getTheme, type ThemeId } from '@yyc3/music-design-tokens';

// ==========================================
// Lazy-loaded panels (code splitting for performance — C-2 / L-7)
// These panels are heavy and only rendered when opened.
// ==========================================
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const AILyricsGenerator = lazy(() => import('@yyc3/music-ai').then(m => ({ default: m.AILyricsGenerator })));
const LeaderboardPanel = lazy(() => import('@yyc3/music-growth').then(m => ({ default: m.LeaderboardPanel })));
const RecommendationsPanel = lazy(() => import('./components/RecommendationsPanel').then(m => ({ default: m.RecommendationsPanel })));
const CreationStudio = lazy(() => import('@yyc3/music-ai').then(m => ({ default: m.CreationStudio })));
const ShareWorkModal = lazy(() => import('@yyc3/music-community').then(m => ({ default: m.ShareWorkModal })));
const MVCreator = lazy(() => import('@yyc3/music-ai').then(m => ({ default: m.MVCreator })));
const SpaceTimePanel = lazy(() => import('@yyc3/music-community').then(m => ({ default: m.SpaceTimePanel })));
const StarPowerPanel = lazy(() => import('@yyc3/music-growth').then(m => ({ default: m.StarPowerPanel })));
const IPMatrixPanel = lazy(() => import('@yyc3/music-growth').then(m => ({ default: m.IPMatrixPanel })));
const AchievementsPanel = lazy(() => import('@yyc3/music-growth').then(m => ({ default: m.AchievementsPanel })));
const MobileDiscoverHub = lazy(() => import('./components/MobileDiscoverHub').then(m => ({ default: m.MobileDiscoverHub })));
const CopyrightPanel = lazy(() => import('@yyc3/music-commerce').then(m => ({ default: m.CopyrightPanel })));
const StarPowerShop = lazy(() => import('@yyc3/music-growth').then(m => ({ default: m.StarPowerShop })));
const ChallengePanel = lazy(() => import('@yyc3/music-community').then(m => ({ default: m.ChallengePanel })));
const ForkTree = lazy(() => import('@yyc3/music-community').then(m => ({ default: m.ForkTree })));
const MHeartSystem = lazy(() => import('@yyc3/music-community').then(m => ({ default: m.MHeartSystem })));
const SmartPlaylistPanel = lazy(() => import('./components/SmartPlaylistPanel').then(m => ({ default: m.SmartPlaylistPanel })));
const LiveSessionPanel = lazy(() => import('@yyc3/music-community').then(m => ({ default: m.LiveSessionPanel })));
const DMusicShowcase = lazy(() => import('@yyc3/music-ui').then(m => ({ default: m.DMusicShowcase })));
const AlbumStore = lazy(() => import('@yyc3/music-commerce').then(m => ({ default: m.AlbumStore })));
const E2EKeySetup = lazy(() => import('@yyc3/music-community').then(m => ({ default: m.E2EKeySetup })));
const SecondaryMarket = lazy(() => import('@yyc3/music-commerce').then(m => ({ default: m.SecondaryMarket })));
const UploadPanel = lazy(() => import('@yyc3/music-community').then(m => ({ default: m.UploadPanel })));

// ==========================================
// §7.x — Global unhandled error/rejection reporting (outside component tree)
// Singleton guard prevents double-registration on HMR.
// ==========================================
if (typeof window !== 'undefined' && !(window as any).__dmusic_global_error_handler__) {
  (window as any).__dmusic_global_error_handler__ = true;

  const _reportGlobalError = (payload: Record<string, any>) => {
    try {
      fetch(`${API_BASE}/error-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch { /* never throw from global handler */ }
  };

  window.addEventListener('error', (e) => {
    _reportGlobalError({
      message: e.message || 'Unknown error',
      stack: e.error?.stack || '',
      url: e.filename || window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      source: 'window.onerror',
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    _reportGlobalError({
      message: reason?.message || String(reason) || 'Unhandled promise rejection',
      stack: reason?.stack || '',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      source: 'unhandledrejection',
    });
  });
}

// ==========================================
// Demo Community Activities
// ==========================================
const DEMO_COMMUNITY_ACTIVITIES: CommunityActivity[] = [
  { id: 'demo-1', type: 'annotation', userId: 'u1', userName: 'StarGazer_42', songId: 'track-1', songTitle: 'Cosmic Dreams', detail: 'calm', timestamp: Date.now() - 1000 * 60 * 3 },
  { id: 'demo-2', type: 'like', userId: 'u2', userName: 'NebulaDrifter', songId: 'track-4', songTitle: 'Aurora Rising', detail: '', timestamp: Date.now() - 1000 * 60 * 7 },
  { id: 'demo-3', type: 'play', userId: 'u3', userName: 'CosmicVoyager', songId: 'track-2', songTitle: 'Neon Horizon', detail: '', timestamp: Date.now() - 1000 * 60 * 12 },
  { id: 'demo-4', type: 'annotation', userId: 'u4', userName: 'PixelDreamer', songId: 'track-3', songTitle: 'Ocean Lullaby', detail: 'sad', timestamp: Date.now() - 1000 * 60 * 18 },
  { id: 'demo-5', type: 'achievement', userId: 'u5', userName: 'WaveRider', songId: 'track-1', songTitle: 'Cosmic Dreams', detail: 'First Note', timestamp: Date.now() - 1000 * 60 * 25 },
  { id: 'demo-6', type: 'like', userId: 'u1', userName: 'StarGazer_42', songId: 'track-5', songTitle: 'Forest Whispers', detail: '', timestamp: Date.now() - 1000 * 60 * 32 },
  { id: 'demo-7', type: 'annotation', userId: 'u3', userName: 'CosmicVoyager', songId: 'track-6', songTitle: 'Stellar Drift', detail: 'energetic', timestamp: Date.now() - 1000 * 60 * 40 },
  { id: 'demo-8', type: 'play', userId: 'u4', userName: 'PixelDreamer', songId: 'track-1', songTitle: 'Cosmic Dreams', detail: '', timestamp: Date.now() - 1000 * 60 * 55 },
];

// ==========================================
// App Component
// ==========================================
/** 刷新后 blob URL 失效：用 IndexedDB 中保存的原始文件重建音频地址，取不到则丢弃该曲目 */
async function reviveBlobTracks(tracks: Track[]): Promise<Track[]> {
  const revived = await Promise.all(
    tracks.map(async (track) => {
      if (typeof track.audioUrl !== 'string' || !track.audioUrl.startsWith('blob:')) return track;
      const stored = await getLocalAudio(track.id);
      return stored ? { ...track, audioUrl: URL.createObjectURL(stored.blob) } : null;
    })
  );
  return revived.filter((track): track is Track => Boolean(track));
}

export function AppInner() {
  // ==========================================
  // i18n
  // ==========================================
  const { t, toggleLang, lang } = useI18n();

  // ==========================================
  // Playlist State
  // ==========================================
  const [playlist, setPlaylist] = useState<Track[]>(DEMO_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [shuffleEnabled, setShuffleEnabled] = useState(() => loadPref('shuffleEnabled'));
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(() => loadPref('repeatMode'));
  const shouldAutoPlayRef = useRef(false);

  /** 收藏曲目 id 集合，启动时从本地缓存恢复 */
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  /** 全局提示：当前用于本地存储配额不足等不可静默的失败 */
  const [notice, setNotice] = useState<string | null>(null);
  /** 队列快照恢复完成前不写回，避免 DEMO_PLAYLIST 覆盖已存数据 */
  const queueHydratedRef = useRef(false);

  // 启动时恢复播放队列；快照为空则保留演示歌单
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await getSavedQueue<Track>();
      if (cancelled) return;
      const playable = saved.length > 0 ? await reviveBlobTracks(saved) : [];
      if (cancelled) return;
      if (playable.length > 0) setPlaylist(playable);
      queueHydratedRef.current = true;
      // 回收孤儿音频：队列与已保存歌单都不再引用的文件从 IndexedDB 删除
      const playlists = await getSavedPlaylists();
      const keep = new Set([
        ...playable.map((track) => track.id),
        ...playlists.flatMap((item) => item.trackIds),
      ]);
      void pruneLocalAudio(keep);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 队列变化时落本地缓存（仅在 playlist 引用变化时触发）
  useEffect(() => {
    if (!queueHydratedRef.current) return;
    void saveQueue(playlist);
  }, [playlist]);

  // 恢复收藏状态
  useEffect(() => {
    let cancelled = false;
    void getFavoriteIds().then((ids) => {
      if (!cancelled) setLikedIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 全局提示自动消失
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const currentTrack = playlist[currentTrackIndex];

  // 保存当前队列为本地歌单：同名覆盖，重复保存不会产生副本
  const handleSaveQueue = useCallback(async () => {
    await savePlaylist('当前队列', playlist.map((track) => track.id));
  }, [playlist]);

  // 加载已保存歌单：优先用当前队列中的曲目，其次回退演示曲库，
  // 本地导入的曲目从 IndexedDB 取回原始文件重建地址
  const handleLoadSavedPlaylist = useCallback(
    async (trackIds: string[]) => {
      const byId = new Map(playlist.map((track) => [track.id, track]));
      const resolved = await Promise.all(
        trackIds.map(async (id) => {
          const known = byId.get(id) ?? DEMO_PLAYLIST.find((track) => track.id === id);
          if (known) return known;
          // 本地导入的曲目：从 IndexedDB 取回文件，重建可用地址
          const stored = await getLocalAudio(id);
          if (!stored) return null;
          return {
            ...(stored.meta as Partial<Track>),
            id,
            audioUrl: URL.createObjectURL(stored.blob),
          } as Track;
        })
      );
      const playable = resolved.filter((track): track is Track => Boolean(track));
      if (playable.length === 0) return;
      setPlaylist(playable);
      setCurrentTrackIndex(0);
    },
    [playlist]
  );

  // 从队列移除曲目；本地导入的文件在无人引用时一并删除
  const handleRemoveTrack = useCallback(
    async (index: number) => {
      const removed = playlist[index];
      if (!removed) return;
      const next = playlist.filter((_, position) => position !== index);
      setPlaylist(next);
      setCurrentTrackIndex((prev) => {
        const adjusted = prev > index ? prev - 1 : prev;
        return Math.min(adjusted, Math.max(next.length - 1, 0));
      });
      if (!removed.id.startsWith('custom-')) return;
      const playlists = await getSavedPlaylists();
      const stillUsed =
        next.some((track) => track.id === removed.id) ||
        playlists.some((item) => item.trackIds.includes(removed.id));
      if (!stillUsed) await deleteLocalAudio(removed.id);
    },
    [playlist]
  );

  // ==========================================
  // Track Navigation
  // ==========================================
  const getNextTrackIndex = useCallback(() => {
    if (shuffleEnabled) {
      let next = Math.floor(Math.random() * playlist.length);
      while (next === currentTrackIndex && playlist.length > 1) {
        next = Math.floor(Math.random() * playlist.length);
      }
      return next;
    }
    return (currentTrackIndex + 1) % playlist.length;
  }, [shuffleEnabled, currentTrackIndex, playlist.length]);

  const handleTrackEnd = useCallback(() => {
    if (repeatMode === 'one') {
      shouldAutoPlayRef.current = true;
      setTimeout(() => {
        audioRef.current?.seek(0);
        audioRef.current?.play();
      }, 100);
      return;
    }
    if (repeatMode === 'off' && currentTrackIndex === playlist.length - 1 && !shuffleEnabled) {
      return;
    }
    shouldAutoPlayRef.current = true;
    setCurrentTrackIndex(getNextTrackIndex());
  }, [repeatMode, currentTrackIndex, playlist.length, shuffleEnabled, getNextTrackIndex]);

  const handleNextTrack = useCallback(() => {
    shouldAutoPlayRef.current = true;
    setCurrentTrackIndex(getNextTrackIndex());
  }, [getNextTrackIndex]);

  const handlePrevTrack = useCallback(() => {
    shouldAutoPlayRef.current = true;
    if (currentTrackIndex === 0) {
      setCurrentTrackIndex(playlist.length - 1);
    } else {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  }, [currentTrackIndex, playlist.length]);

  // ==========================================
  // Audio Engine
  // ==========================================
  const audio = useAudioEngine({
    trackKey: currentTrack.id,
    duration: currentTrack.duration,
    chordSet: currentTrack.chordSet,
    audioUrl: currentTrack.audioUrl,
    onTrackEnd: handleTrackEnd,
    initialVolume: loadPref('volume'), // §13.x — persisted volume restoration
  });

  const audioRef = useRef(audio);
  audioRef.current = audio;

  const handleSelectTrack = useCallback(
    (index: number) => {
      if (index === currentTrackIndex) {
        audioRef.current.togglePlayPause();
        return;
      }
      shouldAutoPlayRef.current = true;
      setCurrentTrackIndex(index);
    },
    [currentTrackIndex]
  );

  // Auto-play after track change
  useEffect(() => {
    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;
      const timer = setTimeout(() => {
        audioRef.current.play();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentTrackIndex]);

  // ==========================================
  // UI State
  // ==========================================
  const [mode, setMode] = useState<'audio' | 'video'>(() => loadPref('mode'));
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    const t = loadPref('theme') as ThemeId;
    applyTheme(t); // §16.x — apply CSS vars on init
    return t;
  });
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [mValue, setMValue] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [annotations, setAnnotations] = useState<EmotionAnnotation>({});
  const [starPower, setStarPower] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeEmotionFilter, setActiveEmotionFilter] = useState<Emotion | null>(null);
  const [showAIExpanded, setShowAIExpanded] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // ==========================================
  // Panel State — §2.1 useReducer refactor (per Guidelines spec)
  // Uses useReducer for single-source panel management.
  // Enforces mutual exclusion: only one panel open at a time.
  // Actions: OPEN_PANEL, CLOSE_PANEL, TOGGLE_PANEL
  // ==========================================
  type PanelType =
    | 'playlist' | 'profile' | 'community' | 'comments' | 'analytics'
    | 'ai-lyrics' | 'leaderboard' | 'recommendations' | 'creation-studio'
    | 'share-work' | 'mv-creator' | 'space-time' | 'star-power'
    | 'ip-matrix' | 'achievements' | 'discover-hub' | 'copyright'
    | 'shop' | 'challenge' | 'listening-stats' | 'fork-tree' | 'mheart'
    | 'smart-playlist' | 'live-session' | 'showcase' | 'album-store' | 'e2ee-setup' | 'secondary-market' | 'upload';

  type PanelAction =
    | { type: 'OPEN_PANEL'; panel: PanelType }
    | { type: 'CLOSE_PANEL' }
    | { type: 'TOGGLE_PANEL'; panel: PanelType };

  const panelReducer = (state: PanelType | null, action: PanelAction): PanelType | null => {
    switch (action.type) {
      case 'OPEN_PANEL': return action.panel;
      case 'CLOSE_PANEL': return null;
      case 'TOGGLE_PANEL': return state === action.panel ? null : action.panel;
      default: return state;
    }
  };

  // §2.3 — React Router URL sync: panel state ↔ ?panel= search param
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPanel = searchParams.get('panel') as PanelType | null;

  const [activePanel, dispatchPanel] = useReducer(panelReducer, urlPanel);

  // Sync: URL → panel state (browser back/forward)
  useEffect(() => {
    if (urlPanel !== activePanel) {
      if (urlPanel) {
        dispatchPanel({ type: 'OPEN_PANEL', panel: urlPanel });
      } else {
        dispatchPanel({ type: 'CLOSE_PANEL' });
      }
    }
  }, [urlPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPanel = useCallback((p: PanelType) => {
    dispatchPanel({ type: 'OPEN_PANEL', panel: p });
    setSearchParams({ panel: p }, { replace: false });
  }, [setSearchParams]);

  const closePanel = useCallback(() => {
    dispatchPanel({ type: 'CLOSE_PANEL' });
    setSearchParams({}, { replace: false });
  }, [setSearchParams]);

  const showPlaylist = activePanel === 'playlist';
  const showProfile = activePanel === 'profile';
  const showCommunity = activePanel === 'community';
  const showComments = activePanel === 'comments';
  const showAnalytics = activePanel === 'analytics';
  const showAILyrics = activePanel === 'ai-lyrics';
  const showLeaderboard = activePanel === 'leaderboard';
  const showRecommendations = activePanel === 'recommendations';
  const showCreationStudio = activePanel === 'creation-studio';
  const showShareWorkModal = activePanel === 'share-work';
  const showMVCreator = activePanel === 'mv-creator';
  const showSpaceTime = activePanel === 'space-time';
  const showStarPower = activePanel === 'star-power';
  const showIPMatrix = activePanel === 'ip-matrix';
  const showAchievements = activePanel === 'achievements';
  const showDiscoverHub = activePanel === 'discover-hub';
  const showCopyright = activePanel === 'copyright';
  const showShop = activePanel === 'shop';
  const showChallenge = activePanel === 'challenge';
  const showListeningStats = activePanel === 'listening-stats';
  const showForkTree = activePanel === 'fork-tree';
  const showMHeart = activePanel === 'mheart';
  const showSmartPlaylist = activePanel === 'smart-playlist';
  const showLiveSession = activePanel === 'live-session';
  const showShowcase = activePanel === 'showcase';
  const showAlbumStore = activePanel === 'album-store';
  const showE2ESetup = activePanel === 'e2ee-setup';
  const showSecondaryMarket = activePanel === 'secondary-market';
  const showUpload = activePanel === 'upload';

  // Panel-associated data (kept as separate state)
  const [mvCustomLyrics, setMvCustomLyrics] = useState<string[] | null>(null);
  const [shareWorkData, setShareWorkData] = useState<{ id: string; title: string; theme: string; lyrics: string[]; mode: string; createdAt: number } | null>(null);

  // Mobile state
  const [mobileTab, setMobileTab] = useState('player');
  const [showMobilePlayer, setShowMobilePlayer] = useState(false);

  // Community & Profile
  const [communityActivities, setCommunityActivities] = useState<CommunityActivity[]>(
    DEMO_COMMUNITY_ACTIVITIES
  );
  const [communityLoading, setCommunityLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  // ==========================================
  // Auth
  // ==========================================
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        // §13.x — Pull remote preferences on login
        pullPrefsFromKV(apiFetch, data.user.id).then((prefs) => {
          setShuffleEnabled(prefs.shuffleEnabled);
          setRepeatMode(prefs.repeatMode);
          setMode(prefs.mode);
          audio.setVolume(prefs.volume);
          if (prefs.theme) { setCurrentTheme(prefs.theme as ThemeId); applyTheme(prefs.theme as ThemeId); }
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowUserMenu(false);
    setUserProfile(null);
  };

  // ==========================================
  // Fetch Data from Backend
  // ==========================================

  useEffect(() => {
    apiFetch<{ likes?: number }>(`/likes/${currentTrack.id}`).then((data) => {
      if (data?.likes !== undefined) setMValue(data.likes);
    });
  }, [currentTrack.id]);

  useEffect(() => {
    apiFetch<{ annotations?: Record<string, Record<string, number>> }>(
      `/annotations/${currentTrack.id}`
    ).then((data) => {
      if (data?.annotations) {
        const parsed: EmotionAnnotation = {};
        Object.entries(data.annotations).forEach(([key, val]) => {
          parsed[parseInt(key)] = val as Record<string, number>;
        });
        setAnnotations(parsed);
      } else {
        setAnnotations({});
      }
    });
  }, [currentTrack.id]);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ starPower?: number }>(`/starpower/${user.id}`).then((data) => {
      if (data?.starPower !== undefined) setStarPower(data.starPower);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ profile?: UserProfileData }>(`/profile/${user.id}`).then((data) => {
      if (data?.profile) setUserProfile(data.profile);
    });
  }, [user]);

  // Fetch notifications + 60s polling
  useEffect(() => {
    if (!user) return;
    // §v11.1 — Use userId (stable) instead of userName for notification key
    const userId = user.id;
    if (!userId) return;
    const fetchNotifs = () => {
      apiFetch<{ notifications?: any[] }>(`/notifications/${encodeURIComponent(userId)}`).then((data) => {
        if (data?.notifications) setNotifications(data.notifications);
      });
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // ==========================================
  // §9.1 + §9.2 Memoized current lyric line & Emotion Tracking
  // currentLyricLine recomputes only when lyrics array or currentTime change,
  // but emotion useEffect fires only on lyric-line transitions (~every 5-15s)
  // instead of every audio frame (~60fps).
  // ==========================================
  const currentLyricLine = useMemo(() => {
    return [...currentTrack.lyrics].reverse().find(l => l.time <= audio.currentTime) || null;
  }, [currentTrack.lyrics, audio.currentTime]);

  useEffect(() => {
    if (currentLyricLine?.emotion) {
      setEmotion(currentLyricLine.emotion as Emotion);
    }
  }, [currentLyricLine]);

  // ==========================================
  // Track Play Tracking for Wilson Score
  // ==========================================
  const hasTrackedPlayRef = useRef<string | null>(null);
  useEffect(() => {
    // Track a play event once per track when playback starts
    if (audio.isPlaying && hasTrackedPlayRef.current !== currentTrack.id) {
      hasTrackedPlayRef.current = currentTrack.id;
      apiFetch(`/play/${currentTrack.id}`, { method: 'POST' }).catch((err) =>
        console.error('Error tracking play:', err)
      );
    }
  }, [audio.isPlaying, currentTrack.id]);

  // ==========================================
  // Haptic Feedback Integration
  // ==========================================
  const haptics = useHaptics();

  // ==========================================
  // Listening History (feeds recommendation engine)
  // ==========================================
  const listeningStartRef = useRef<{ trackId: string; startTime: number } | null>(null);

  // Track when playback starts for a song
  useEffect(() => {
    if (audio.isPlaying && (!listeningStartRef.current || listeningStartRef.current.trackId !== currentTrack.id)) {
      listeningStartRef.current = { trackId: currentTrack.id, startTime: Date.now() };
    }
  }, [audio.isPlaying, currentTrack.id]);

  // Send listening history when track changes or stops
  useEffect(() => {
    const prev = listeningStartRef.current;
    if (!prev || prev.trackId === currentTrack.id) return;

    const listenDuration = Math.round((Date.now() - prev.startTime) / 1000);
    const prevTrack = playlist.find(t => t.id === prev.trackId);
    if (listenDuration >= 5 && prevTrack) {
      apiFetch('/listening-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'anon',
          songId: prev.trackId,
          songTitle: prevTrack.title,
          emotion,
          listenDuration,
          totalDuration: prevTrack.duration,
          completionRate: Math.min(listenDuration / prevTrack.duration, 1),
          skipped: listenDuration < 15,
        }),
      }).catch(err => console.error('Listening history error:', err));
    }
    listeningStartRef.current = null;
  }, [currentTrack.id, user, playlist, emotion]);

  // ==========================================
  // §13.x — Auto-persist preferences on change (merged single useEffect)
  // Skips initial render to avoid overwriting remote KV prefs
  // before pullPrefsFromKV completes for logged-in users.
  // ==========================================
  const prefsInitRef = useRef(false);
  useEffect(() => {
    if (!prefsInitRef.current) { prefsInitRef.current = true; return; }
    const kvSync = user ? { apiFetch, userId: user.id } : undefined;
    savePref('shuffleEnabled', shuffleEnabled, kvSync);
    savePref('repeatMode', repeatMode, kvSync);
    savePref('mode', mode, kvSync);
    savePref('volume', audio.volume, kvSync);
    savePref('theme', currentTheme, kvSync);
  }, [shuffleEnabled, repeatMode, mode, audio.volume, currentTheme, user]);

  // ==========================================
  // §16.x — Theme change handler
  // ==========================================
  const handleThemeChange = useCallback((id: ThemeId) => {
    setCurrentTheme(id);
    applyTheme(id);
  }, []);

  // ==========================================
  // Actions
  // ==========================================
  const handleLike = useCallback(async () => {
    haptics.trigger('success');
    setMValue((prev) => prev + 1);
    // 本地即真：先落收藏缓存，再尝试同步远端计数（无后端时静默失败）
    const liked = await toggleFavorite(currentTrack.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.add(currentTrack.id);
      else next.delete(currentTrack.id);
      return next;
    });
    try {
      const data = await apiFetch<{ likes?: number }>(`/likes/${currentTrack.id}`, {
        method: 'POST',
      });
      if (data?.likes !== undefined) setMValue(data.likes);
      if (user) {
        const activity: CommunityActivity = {
          id: `real-like-${Date.now()}`,
          type: 'like',
          userId: user.id,
          userName: user.email?.split('@')[0] || 'You',
          songId: currentTrack.id,
          songTitle: currentTrack.title,
          detail: '',
          timestamp: Date.now(),
        };
        setCommunityActivities((prev) => [activity, ...prev]);
        apiFetch<{ starPower?: number }>(`/starpower/${user.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 2, reason: 'like' }),
        }).then((d) => {
          if (d?.starPower !== undefined) setStarPower(d.starPower);
        });
      }
    } catch (err) {
      console.error('Error liking song:', err);
      setMValue((prev) => prev - 1);
    }
  }, [currentTrack.id, currentTrack.title, user]);

  const handleAnnotate = useCallback(
    async (lineIndex: number, emo: Emotion) => {
      haptics.trigger('light');
      setAnnotations((prev) => {
        const copy = { ...prev };
        if (!copy[lineIndex]) copy[lineIndex] = {};
        copy[lineIndex] = { ...copy[lineIndex] };
        copy[lineIndex][emo] = (copy[lineIndex][emo] || 0) + 1;
        return copy;
      });
      try {
        const data = await apiFetch<{ annotations?: Record<string, Record<string, number>> }>(
          `/annotations/${currentTrack.id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineIndex, emotion: emo }),
          }
        );
        if (data?.annotations) {
          const parsed: EmotionAnnotation = {};
          Object.entries(data.annotations).forEach(([key, val]) => {
            parsed[parseInt(key)] = val as Record<string, number>;
          });
          setAnnotations(parsed);
        }
        if (user) {
          const activity: CommunityActivity = {
            id: `real-anno-${Date.now()}`,
            type: 'annotation',
            userId: user.id,
            userName: user.email?.split('@')[0] || 'You',
            songId: currentTrack.id,
            songTitle: currentTrack.title,
            detail: emo,
            timestamp: Date.now(),
          };
          setCommunityActivities((prev) => [activity, ...prev]);
          apiFetch<{ starPower?: number }>(`/starpower/${user.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 5, reason: 'annotation' }),
          }).then((d) => {
            if (d?.starPower !== undefined) setStarPower(d.starPower);
          });
        }
      } catch (err) {
        console.error('Error annotating lyric:', err);
      }
    },
    [currentTrack.id, currentTrack.title, user]
  );

  // ==========================================
  // Playlist Management
  // ==========================================
  const handleAddTrackFromFile = useCallback(
    (file: File) => {
      const blobUrl = URL.createObjectURL(file);
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const newTrack: Track = {
        id: `custom-${Date.now()}`,
        title: fileName,
        artist: 'Local File',
        album: 'My Collection',
        duration: 300,
        albumArt: playlist[Math.floor(Math.random() * playlist.length)].albumArt,
        audioUrl: blobUrl,
        lyrics: [
          { time: 0, text: '\u266A  \u266A  \u266A', translation: 'Playing your music', emotion: 'happy' as Emotion },
          { time: 30, text: 'Your music, your way', translation: '\u4F60\u7684\u97F3\u4E50\uFF0C\u4F60\u7684\u65B9\u5F0F', emotion: 'energetic' as Emotion },
          { time: 60, text: 'Let the rhythm flow', translation: '\u8BA9\u8282\u594F\u6D41\u6DCC', emotion: 'happy' as Emotion },
          { time: 90, text: 'Feel every beat', translation: '\u611F\u53D7\u6BCF\u4E00\u4E2A\u8282\u62CD', emotion: 'energetic' as Emotion },
          { time: 120, text: 'Music speaks louder', translation: '\u97F3\u4E50\u66F4\u54CD\u4EAE', emotion: 'calm' as Emotion },
        ],
        chordSet: Math.floor(Math.random() * 4),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      };
      setPlaylist((prev) => [...prev, newTrack]);
      // 原始文件入 IndexedDB：blob URL 刷新后失效，恢复时用它重建
      const { audioUrl: _blobUrl, ...trackMeta } = newTrack;
      void saveLocalAudio(newTrack.id, file, trackMeta as Record<string, unknown>).then((saved) => {
        if (!saved) setNotice('本地存储空间不足，导入的音频刷新后将无法恢复');
      });
      shouldAutoPlayRef.current = true;
      setCurrentTrackIndex(playlist.length);
      // §8.1: Register new song in dynamic index
      apiFetch('/songs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: newTrack.id }),
      }).catch(err => console.error('[SongIndex] Register custom track error:', err));
    },
    [playlist]
  );

  const handleAddTrackFromUrl = useCallback(
    (url: string, title?: string) => {
      const newTrack: Track = {
        id: `url-${Date.now()}`,
        title: title || 'Remote Track',
        artist: 'External Source',
        album: 'Stream',
        duration: 300,
        albumArt: playlist[Math.floor(Math.random() * playlist.length)].albumArt,
        audioUrl: url,
        lyrics: [
          { time: 0, text: '\u266A  \u266A  \u266A', translation: 'Streaming audio', emotion: 'neutral' as Emotion },
          { time: 30, text: 'Connected to the stream', translation: '\u8FDE\u63A5\u5230\u97F3\u6D41', emotion: 'calm' as Emotion },
        ],
        chordSet: Math.floor(Math.random() * 4),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      };
      setPlaylist((prev) => [...prev, newTrack]);
      shouldAutoPlayRef.current = true;
      setCurrentTrackIndex(playlist.length);
      // §8.1: Register new song in dynamic index
      apiFetch('/songs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: newTrack.id }),
      }).catch(err => console.error('[SongIndex] Register URL track error:', err));
    },
    [playlist]
  );

  // ==========================================
  // §25.x — Smart Playlist queue apply (plain fn, no hook to preserve hook count)
  // ==========================================
  const handleApplySmartQueue = (indices: number[]) => {
    const reordered = indices.map(i => playlist[i]).filter(Boolean);
    const remaining = playlist.filter((_, i) => !indices.includes(i));
    setPlaylist([...reordered, ...remaining]);
    setCurrentTrackIndex(0);
  };

  // ==========================================
  // Community Feed
  // ==========================================
  const handleRefreshCommunity = useCallback(() => {
    setCommunityLoading(true);
    setTimeout(() => {
      setCommunityLoading(false);
    }, 800);
  }, []);

  // ==========================================
  // AI Lyrics → Track Creation Pipeline
  // ==========================================
  const THEME_TO_EMOTION: Record<string, Emotion> = {
    happy: 'happy',
    sad: 'sad',
    energetic: 'energetic',
    calm: 'calm',
    love: 'happy',
  };

  const THEME_TO_CHORD: Record<string, number> = {
    happy: 1,
    sad: 2,
    energetic: 3,
    calm: 0,
    love: 2,
  };

  const THEME_COLORS: Record<string, string> = {
    happy: '#FFD700',
    sad: '#6495ED',
    energetic: '#FF4500',
    calm: '#00CED1',
    love: '#FF69B4',
  };

  const THEME_ART: Record<string, string> = {
    happy: dMusicInstruments,
    sad: dMusicLogo,
    energetic: dMusicRed,
    calm: dMusicLogo,
    love: dMusicRed,
  };

  const handleCreateTrackFromLyrics = useCallback(
    (lyrics: string[], theme: string, audioBlobUrl?: string, compositionParams?: any) => {
      const emotion = THEME_TO_EMOTION[theme] || 'neutral';
      const secondsPerLine = 12;
      const totalDuration = compositionParams?.duration || (lyrics.length * secondsPerLine + 10);

      const lyricLines: LyricLine[] = [
        { time: 0, text: '\u266A  \u266A  \u266A', translation: 'AI 创作 · ' + theme, emotion: 'neutral' as Emotion },
        ...lyrics.map((line, i) => ({
          time: (i + 1) * secondsPerLine,
          text: line,
          translation: '',
          emotion: emotion as Emotion,
        })),
      ];

      const newTrack: Track = {
        id: `ai-${Date.now()}`,
        title: `AI · ${theme.charAt(0).toUpperCase() + theme.slice(1)} Song`,
        artist: 'D-Music AI',
        album: 'AI Generated',
        duration: totalDuration,
        albumArt: THEME_ART[theme] || dMusicInstruments,
        audioUrl: audioBlobUrl, // Real synthesized audio if available
        lyrics: lyricLines,
        chordSet: THEME_TO_CHORD[theme] ?? 0,
        color: THEME_COLORS[theme] || '#9370DB',
      };

      setPlaylist((prev) => [...prev, newTrack]);
      shouldAutoPlayRef.current = true;
      setCurrentTrackIndex(playlist.length);
      closePanel();
      // §8.1: Register new song in dynamic index
      apiFetch('/songs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: newTrack.id }),
      }).catch(err => console.error('[SongIndex] Register AI track error:', err));
    },
    [playlist.length, closePanel]
  );

  // ==========================================
  // Mobile Swipe Gestures
  // ==========================================
  const anyPanelOpen = activePanel !== null || showAuthModal || showMobilePlayer;

  const swipeState = useSwipeGesture({
    onSwipeLeft: handleNextTrack,
    onSwipeRight: handlePrevTrack,
    threshold: 80,
    enabled: !anyPanelOpen,
  });

  // ==========================================
  // Keyboard Shortcuts
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          audio.togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          audio.seek(Math.max(0, audio.currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          audio.seek(Math.min(audio.duration, audio.currentTime + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          audio.setVolume(Math.min(1, audio.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          audio.setVolume(Math.max(0, audio.volume - 0.1));
          break;
        case 'KeyM':
          audio.setVolume(audio.volume === 0 ? 0.7 : 0);
          break;
        case 'KeyN':
          handleNextTrack();
          break;
        case 'KeyP':
          handlePrevTrack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audio, handleNextTrack, handlePrevTrack]);

  // ==========================================
  // AI Assistant (Voice + Proactive Tips + Prediction)
  // ==========================================
  const aiAssistant = useAIAssistant({
    isPlaying: audio.isPlaying,
    currentEmotion: emotion,
    currentTrackId: currentTrack.id,
    currentTrackTitle: currentTrack.title,
    starPower,
    isLoggedIn: !!user,
    lang,
    onPlay: audio.play,
    onPause: audio.pause,
    onNext: handleNextTrack,
    onPrev: handlePrevTrack,
    onShuffleToggle: () => setShuffleEnabled(p => !p),
    onVolumeUp: () => audio.setVolume(Math.min(1, audio.volume + 0.1)),
    onVolumeDown: () => audio.setVolume(Math.max(0, audio.volume - 0.1)),
    onMute: () => audio.setVolume(audio.volume === 0 ? 0.7 : 0),
    onOpenPlaylist: () => openPanel('playlist'),
    onOpenAILyrics: () => openPanel('ai-lyrics'),
    onOpenLeaderboard: () => openPanel('leaderboard'),
    onOpenComments: () => openPanel('comments'),
    onOpenCommunity: () => openPanel('community'),
    onOpenAnalytics: () => openPanel('analytics'),
    onOpenProfile: () => openPanel('profile'),
    onLike: handleLike,
  });

  // ==========================================
  // PWA
  // ==========================================
  const pwa = usePWA();

  // ==========================================
  // Render
  // ==========================================
  return (
    <div
      className={clsx(
        'relative w-full h-screen overflow-hidden text-white transition-all duration-700',
        !audio.isPlaying && 'saturate-[0.7]'
      )}
      style={{
        backgroundColor: `var(--dm-bg, #0A0E2F)`,
        color: `var(--dm-text-primary, rgba(255,255,255,0.95))`,
        // @ts-ignore -- selection color via CSS var
        '--tw-ring-color': `var(--dm-accent-from, #8B5CF6)`,
      } as React.CSSProperties}
    >
      {/* §1.1 WCAG 2.1 AA — Skip to main content link for screen readers */}
      <a href="#main-content" className="dm-skip-link">
        {lang === 'zh' ? '跳至主要内容' : 'Skip to main content'}
      </a>
      {/* Breathing ambient glow when playing — §16.x theme-aware */}
      <AnimatePresence>
        {audio.isPlaying && (() => {
          const glowRgb = getTheme(currentTheme).glowRgb;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="fixed inset-0 pointer-events-none z-[1]"
            >
              <motion.div
                className="absolute inset-0"
                animate={{
                  background: [
                    `radial-gradient(ellipse at 50% 50%, rgba(${glowRgb},0.03) 0%, transparent 70%)`,
                    `radial-gradient(ellipse at 50% 50%, rgba(${glowRgb},0.06) 0%, transparent 70%)`,
                    `radial-gradient(ellipse at 50% 50%, rgba(${glowRgb},0.03) 0%, transparent 70%)`,
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onUserChange={setUser}
      />

      {/* Playlist Panel (Right Slide) */}
      <PlaylistPanel
        isOpen={showPlaylist}
        onClose={closePanel}
        playlist={playlist}
        currentTrackIndex={currentTrackIndex}
        isPlaying={audio.isPlaying}
        onSelectTrack={handleSelectTrack}
        onAddTrackFromFile={handleAddTrackFromFile}
        onAddTrackFromUrl={handleAddTrackFromUrl}
        onSaveQueue={handleSaveQueue}
        onLoadPlaylist={handleLoadSavedPlaylist}
        onRemoveTrack={handleRemoveTrack}
        audioMode={audio.audioMode}
      />

      {notice && (
        <div
          role="alert"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] max-w-[92vw] rounded-xl border border-amber-400/30 bg-[#2a1d0a]/95 px-4 py-3 text-sm text-amber-200 shadow-xl backdrop-blur"
        >
          {notice}
        </div>
      )}

      {/* User Profile (Center Modal) */}
      <UserProfile
        isOpen={showProfile}
        onClose={closePanel}
        user={user}
        profile={userProfile}
        starPower={starPower}
      />

      {/* Community Feed (Left Slide) */}
      <CommunityFeed
        isOpen={showCommunity}
        onClose={closePanel}
        activities={communityActivities}
        onRefresh={handleRefreshCommunity}
        isLoading={communityLoading}
      />

      {/* Comment System */}
      <CommentSystem
        isOpen={showComments}
        onClose={closePanel}
        songId={currentTrack.id}
        songTitle={currentTrack.title}
        currentTime={audio.currentTime}
        user={user}
      />

      {/* ========== Lazy-loaded Panels — §9.1 Conditional mount ========== */}
      {/* Only mount when activePanel matches, preventing unnecessary chunk loading */}
      <Suspense fallback={null}>
      {showAnalytics && (
        <AnalyticsDashboard isOpen onClose={closePanel} />
      )}

      {showAILyrics && (
        <AILyricsGenerator isOpen onClose={closePanel} onCreateTrack={handleCreateTrackFromLyrics} />
      )}

      {showLeaderboard && (
        <LeaderboardPanel
          isOpen onClose={closePanel}
          onSelectTrack={(songId) => {
            const idx = playlist.findIndex((t) => t.id === songId);
            if (idx >= 0) { handleSelectTrack(idx); closePanel(); }
          }}
          user={user} starPower={starPower} onStarPowerUpdate={setStarPower}
        />
      )}

      {showRecommendations && (
        <RecommendationsPanel
          isOpen onClose={closePanel}
          userId={user?.id} playlist={playlist} currentTrackIndex={currentTrackIndex} isPlaying={audio.isPlaying}
          onSelectTrack={(idx) => { handleSelectTrack(idx); haptics.trigger('selection'); closePanel(); }}
          onHaptic={() => haptics.trigger('light')}
        />
      )}

      {showCreationStudio && (
        <CreationStudio
          isOpen onClose={closePanel}
          onCreateTrack={handleCreateTrackFromLyrics} playlist={playlist} currentTrackIndex={currentTrackIndex}
          onHaptic={(pattern: string) => haptics.trigger(pattern as any)}
          onShareWork={(work) => { setShareWorkData(work); openPanel('share-work'); }}
          onOpenMV={(workLyrics) => { setMvCustomLyrics(workLyrics || null); openPanel('mv-creator'); }}
          user={user} starPower={starPower} onStarPowerUpdate={setStarPower}
        />
      )}

      {showShareWorkModal && (
        <ShareWorkModal
          isOpen onClose={() => { closePanel(); setShareWorkData(null); }}
          work={shareWorkData} userName={user?.email?.split('@')[0]} userId={user?.id}
          onShared={() => haptics.trigger('success')}
        />
      )}

      {showMVCreator && (
        <MVCreator
          isOpen onClose={() => { closePanel(); setMvCustomLyrics(null); }}
          track={currentTrack} isPlaying={audio.isPlaying} audioEnergy={audio.audioEnergy}
          frequencyData={audio.frequencyData} currentTime={audio.currentTime} emotion={emotion}
          customLyrics={mvCustomLyrics} onHaptic={(pattern) => haptics.trigger(pattern as any)}
        />
      )}

      {showSpaceTime && (
        <SpaceTimePanel isOpen onClose={closePanel} user={user} currentTrackId={currentTrack.id} currentTrackTitle={currentTrack.title} />
      )}

      {showStarPower && (
        <StarPowerPanel isOpen onClose={closePanel} user={user} starPower={starPower} onStarPowerUpdate={setStarPower} />
      )}

      {showIPMatrix && (
        <IPMatrixPanel isOpen onClose={closePanel} user={user} profile={userProfile} starPower={starPower} onOpenCreationStudio={() => openPanel('creation-studio')} />
      )}

      {showAchievements && (
        <AchievementsPanel isOpen onClose={closePanel} user={user} starPower={starPower} />
      )}

      {showCopyright && (
        <CopyrightPanel isOpen onClose={closePanel} user={user} />
      )}

      {showShop && (
        <StarPowerShop isOpen onClose={closePanel} user={user} starPower={starPower} onStarPowerUpdate={setStarPower} />
      )}

      {showChallenge && (
        <ChallengePanel isOpen onClose={closePanel} user={user} onOpenCreationStudio={() => openPanel('creation-studio')} />
      )}

      {showSmartPlaylist && (
        <SmartPlaylistPanel
          isOpen onClose={closePanel}
          userId={user?.id}
          currentEmotion={emotion}
          playlist={playlist}
          onApplyQueue={handleApplySmartQueue}
        />
      )}

      {showLiveSession && (
        <LiveSessionPanel
          isOpen onClose={closePanel}
          userId={user?.id}
          userName={user?.email?.split('@')[0]}
          currentTrackId={currentTrack.id}
          currentTrackTitle={currentTrack.title}
          isPlaying={audio.isPlaying}
          currentEmotion={emotion}
        />
      )}

      {showShowcase && (
        <div className="fixed inset-0 z-[70] overflow-y-auto" style={{ background: 'var(--dm-bg)' }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3" style={{ background: 'var(--dm-bg-panel)', borderBottom: '1px solid var(--dm-border-subtle)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--dm-text-primary)' }}>D-Music 设计系统展示</span>
            <button onClick={closePanel} className="px-3 py-1 rounded-lg text-xs dm-focus-ring" style={{ color: 'var(--dm-text-secondary)', background: 'var(--dm-hover-bg)' }}>关闭</button>
          </div>
          <DMusicShowcase lang={lang} />
        </div>
      )}

      {showAlbumStore && (
        <AlbumStore
          isOpen
          onClose={closePanel}
          user={user}
          starPower={starPower}
          onStarPowerUpdate={setStarPower}
        />
      )}

      {showE2ESetup && (
        <E2EKeySetup
          isOpen
          onClose={closePanel}
          user={user}
          lang={lang}
        />
      )}

      {showSecondaryMarket && (
        <SecondaryMarket
          isOpen
          onClose={closePanel}
          user={user}
          starPower={starPower}
          onStarPowerUpdate={setStarPower}
        />
      )}

      {showUpload && (
        <UploadPanel
          onClose={closePanel}
          userId={user?.id || 'anon'}
          userName={user?.user_metadata?.name || 'Anonymous'}
          lang={lang}
          onUploadComplete={(media) => {
            console.log('[Upload] Media uploaded:', media.id, media.title);
            if (media.signedUrl && media.mediaType === 'audio') {
              const newTrack: Track = {
                id: media.id,
                title: media.title,
                artist: media.artist,
                album: media.album,
                duration: media.duration || 300,
                albumArt: media.coverSignedUrl || playlist[0]?.albumArt || '',
                audioUrl: media.signedUrl,
                lyrics: [
                  { time: 0, text: '\u266B \u266B \u266B', translation: media.title, emotion: 'happy' as Emotion },
                  { time: 30, text: media.artist, translation: media.album, emotion: 'calm' as Emotion },
                ],
                chordSet: Math.floor(Math.random() * 4),
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
              };
              setPlaylist((prev) => [...prev, newTrack]);
              shouldAutoPlayRef.current = true;
              setCurrentTrackIndex(playlist.length);
            }
          }}
        />
      )}
      </Suspense>

      {/* Layer 1: Background Particle Field */}
      <Starfield
        emotion={emotion}
        isPlaying={audio.isPlaying}
        audioEnergy={audio.audioEnergy}
        bassEnergy={audio.bassEnergy}
      />

      {/* Layer 2 & 3: Content + Controls */}
      <div className="flex flex-col h-full relative z-10 pb-[108px] md:pb-0">
        {/* ========== Header ========== */}
        <header
          className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center flex-shrink-0 relative z-20"
          style={{ background: `linear-gradient(to bottom, var(--dm-bg, #0A0E2F), var(--dm-header-via, rgba(10,14,47,0.8)), transparent)` }}
        >
          {/* Left: Logo + Community */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <motion.button
                onClick={() => setShowAIExpanded(p => !p)}
                className="w-9 h-9 rounded-full overflow-hidden shadow-lg flex-shrink-0 relative cursor-pointer"
                whileTap={{ scale: 0.9 }}
                style={
                  audio.isPlaying
                    ? {
                        boxShadow: `0 0 ${8 + audio.audioEnergy * 20}px rgba(139,92,246,0.5)`,
                      }
                    : undefined
                }
                title={lang === 'zh' ? 'AI 助手' : 'AI Assistant'}
              >
                <img src={dMusicLogo} alt="D-Music" className="w-full h-full object-cover" />
                {/* AI tip badge on logo */}
                {aiAssistant.activeTips.length > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-pink-500 text-white text-[8px] font-bold flex items-center justify-center border border-[#0A0E2F]"
                  >
                    {aiAssistant.activeTips.length}
                  </motion.div>
                )}
              </motion.button>
              <div className="flex flex-col">
                <span
                  className="font-bold text-sm tracking-[0.15em] text-transparent bg-clip-text"
                  style={{ backgroundImage: `linear-gradient(to right, var(--dm-brand-from, #FCD34D), var(--dm-brand-via, #FDE68A), var(--dm-brand-to, #FBBF24))` }}
                >
                  {t('brand.name')}
                </span>
                <span className="text-[9px] text-white/30 tracking-wider -mt-0.5 hidden md:block">
                  {t('brand.subtitle')}
                </span>
              </div>
            </div>

            <button
              onClick={() => openPanel('community')}
              className="hidden md:flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5 rounded-full border border-white/[0.06]"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">{t('header.community')}</span>
              <div className="relative ml-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 absolute inset-0 animate-ping opacity-40" />
              </div>
            </button>

            {/* Quick access buttons */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => openPanel('leaderboard')}
                className="flex items-center gap-1 text-white/25 hover:text-yellow-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={t('player.leaderboard')}
              >
                <Trophy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openPanel('analytics')}
                className="flex items-center gap-1 text-white/25 hover:text-blue-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={t('player.analytics')}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openPanel('ai-lyrics')}
                className="flex items-center gap-1 text-white/25 hover:text-purple-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={t('player.aiLyrics')}
              >
                <Wand2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('creation-studio'); haptics.trigger('light'); }}
                className="flex items-center gap-1 text-white/25 hover:text-emerald-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? 'AI 创作工坊' : 'Creation Studio'}
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setMvCustomLyrics(null); openPanel('mv-creator'); haptics.trigger('light'); }}
                className="flex items-center gap-1 text-white/25 hover:text-cyan-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? 'MV 创作' : 'MV Creator'}
              >
                <Film className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('recommendations'); haptics.trigger('light'); }}
                className="flex items-center gap-1 text-white/25 hover:text-indigo-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '为你推荐' : 'For You'}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openPanel('comments')}
                className="flex items-center gap-1 text-white/25 hover:text-pink-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={t('player.comments')}
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('space-time'); haptics.trigger('light'); }}
                className="flex items-center gap-1 text-white/25 hover:text-purple-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '时空喊话' : 'Space-Time Call'}
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('achievements'); haptics.trigger('light'); }}
                className="flex items-center gap-1 text-white/25 hover:text-yellow-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '成就徽章' : 'Achievements'}
              >
                <Trophy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('challenge'); haptics.trigger('light'); }}
                className="hidden md:flex items-center gap-1 text-white/25 hover:text-red-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '创作挑战赛' : 'Challenge'}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('smart-playlist'); haptics.trigger('light'); }}
                className="hidden md:flex items-center gap-1 text-white/25 hover:text-indigo-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '智能歌单' : 'Smart Playlist'}
              >
                <Brain className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('live-session'); haptics.trigger('light'); }}
                className="hidden md:flex items-center gap-1 text-white/25 hover:text-green-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '实时互动' : 'Live Session'}
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('album-store'); haptics.trigger('light'); }}
                className="hidden md:flex items-center gap-1 text-white/25 hover:text-purple-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '数字专辑' : 'Digital Albums'}
              >
                <Disc3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('secondary-market'); haptics.trigger('light'); }}
                className="hidden md:flex items-center gap-1 text-white/25 hover:text-orange-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '二级市场' : 'Secondary Market'}
                aria-label="Secondary Market"
              >
                <Star className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { openPanel('upload'); haptics.trigger('light'); }}
                className="hidden md:flex items-center gap-1 text-white/25 hover:text-cyan-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? '上传音乐/视频' : 'Upload Music/Video'}
                aria-label="Upload"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              {user && (
                <button
                  onClick={() => { openPanel('e2ee-setup'); haptics.trigger('light'); }}
                  className="hidden md:flex items-center gap-1 text-white/25 hover:text-emerald-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                  title={lang === 'zh' ? '端到端加密' : 'E2E Encryption'}
                  aria-label="E2EE Setup"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Center: Now Playing indicator */}
          <AnimatePresence>
            {audio.isPlaying && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2"
              >
                <div className="flex items-end gap-[2px] h-3">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-[2px] rounded-full bg-gradient-to-t from-blue-500 to-purple-400"
                      animate={{ height: ['3px', '12px', '5px', '10px', '3px'] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.12,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest">{t('header.playing')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right: Star Power + User */}
          <div className="flex gap-3 items-center">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors bg-white/[0.03] hover:bg-white/[0.06] px-2.5 py-1 rounded-full border border-white/[0.06] text-xs"
              title={t('header.language')}
            >
              <Globe className="w-3 h-3" />
              <span>{t('header.language')}</span>
            </button>

            {/* §16.x Theme Switcher */}
            <ThemeSwitcher currentTheme={currentTheme} onThemeChange={handleThemeChange} lang={lang} />

            {/* §1.x Design System Showcase */}
            <button
              onClick={() => openPanel('showcase')}
              className="hidden md:flex items-center gap-1 text-white/25 hover:text-pink-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04] text-xs"
              title={lang === 'zh' ? '设计系统' : 'Design System'}
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {/* §18.x Listening Stats */}
            <button
              onClick={() => openPanel('listening-stats')}
              className="hidden md:flex items-center gap-1 text-white/25 hover:text-indigo-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
              title={lang === 'zh' ? '收听统计' : 'Listening Stats'}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>

            {/* §20.x Fork Tree */}
            <button
              onClick={() => openPanel('fork-tree')}
              className="hidden md:flex items-center gap-1 text-white/25 hover:text-cyan-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
              title={lang === 'zh' ? '协作分支树' : 'Fork Tree'}
            >
              <GitBranch className="w-3.5 h-3.5" />
            </button>

            {/* §21.x M❤️值 */}
            {user && (
              <button
                onClick={() => openPanel('mheart')}
                className="hidden md:flex items-center gap-1 text-white/25 hover:text-pink-400/70 transition-colors px-2 py-1.5 rounded-full hover:bg-white/[0.04]"
                title={lang === 'zh' ? 'M❤️值' : 'M❤️ Score'}
              >
                <Heart className="w-3.5 h-3.5" />
              </button>
            )}

            {user && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 px-3 py-1 rounded-full cursor-pointer hover:border-yellow-500/40 transition-colors"
                onClick={() => {
                  if (user) openPanel('star-power');
                }}
              >
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-200 text-xs">{starPower} {t('header.starPower')}</span>
              </motion.div>
            )}

            {/* Notification Bell */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifPanel(p => !p)}
                  className="relative p-2 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                  title={lang === 'zh' ? '通知' : 'Notifications'}
                >
                  <Bell className="w-4 h-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-pink-500 text-white text-[8px] font-bold flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifPanel && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-72 bg-[#0D1235]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/70">{lang === 'zh' ? '通知' : 'Notifications'}</span>
                        {notifications.some(n => !n.read) && (
                          <button
                            onClick={() => {
                              // §v11.1 — Use userId for notification mark-read
                              const notifUserId = user?.id || '';
                              apiFetch(`/notifications/${encodeURIComponent(notifUserId)}/read`, { method: 'POST' });
                              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            }}
                            className="text-[10px] text-purple-400/60 hover:text-purple-400 transition-colors"
                          >
                            {lang === 'zh' ? '全部已读' : 'Mark all read'}
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-white/20 text-xs">
                            {lang === 'zh' ? '暂无通知' : 'No notifications'}
                          </div>
                        ) : (
                          notifications.slice(0, 20).map(n => (
                            <div
                              key={n.id}
                              className={clsx(
                                'px-4 py-2.5 border-b border-white/[0.04] transition-colors',
                                !n.read && 'bg-purple-500/[0.04]'
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-sm flex-shrink-0 mt-0.5">
                                  {n.type === 'fork' ? '🔀' : n.type === 'like' ? '❤️' : '🔔'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-white/70 leading-relaxed">
                                    <span className="font-medium text-white/90">{n.fromUser}</span>
                                    {' '}
                                    {n.type === 'fork'
                                      ? (lang === 'zh' ? '改编了你的作品' : 'forked your work')
                                      : n.type === 'like'
                                        ? (lang === 'zh' ? '喜欢了你的作品' : 'liked your work')
                                        : (lang === 'zh' ? '与你互动了' : 'interacted with you')}
                                    {n.workTitle && (
                                      <span className="text-purple-400/70"> "{n.workTitle}"</span>
                                    )}
                                  </p>
                                  <p className="text-[9px] text-white/20 mt-0.5">
                                    {new Date(n.createdAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 mt-1.5" />}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-full pl-3 pr-1 py-1 transition-colors"
                >
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-white/80 font-medium leading-tight">
                      {user.email?.split('@')[0]}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-2 min-w-[180px] shadow-2xl"
                    >
                      <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <p className="text-xs text-white/50">{t('header.signedAs')}</p>
                        <p className="text-sm text-white font-medium truncate">{user.email}</p>
                      </div>
                      <div className="md:hidden px-3 py-2 flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-200 text-xs">{starPower} {t('header.starPower')}</span>
                      </div>
                      <button
                        onClick={() => {
                          openPanel('profile');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <UserCircle className="w-4 h-4" />
                        {t('header.myProfile')}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('header.signOut')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/[0.08]"
              >
                {t('header.signIn')}
              </button>
            )}
          </div>
        </header>

        {/* ========== Main Content: Media + Lyrics ========== */}
        <div id="main-content" className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative" role="main">
          {/* §19.x — Timeline Comments (弹幕式时间锚点评论) */}
          <TimelineComments
            songId={currentTrack.id}
            currentTime={audio.currentTime}
            duration={audio.duration}
            isPlaying={audio.isPlaying}
            user={user}
            lang={lang}
          />
          {/* Left: Media Display */}
          <div
            className={clsx(
              'transition-all duration-700 ease-in-out relative flex-shrink-0',
              mode === 'video'
                ? 'md:w-[70%] h-[28%] md:h-full'
                : 'md:w-[40%] h-[30%] md:h-full'
            )}
          >
            <MediaDisplay
              mode={mode}
              isPlaying={audio.isPlaying}
              albumArtUrl={currentTrack.albumArt}
              frequencyData={audio.frequencyData}
              emotion={emotion}
              audioEnergy={audio.audioEnergy}
              songTitle={currentTrack.title}
              artist={currentTrack.artist}
              videoUrl={currentTrack.videoUrl}
            />
            {/* §22.x — Emotion Ripple Visualization + §23.x Beat Detection */}
            <EmotionRipple
              emotion={emotion}
              audioEnergy={audio.audioEnergy}
              isPlaying={audio.isPlaying}
              frequencyData={audio.frequencyData}
            />
          </div>

          {/* Right: Lyrics */}
          <div
            className={clsx(
              'transition-all duration-700 ease-in-out relative flex-1 min-h-0',
              mode === 'video'
                ? 'md:w-[30%] border-l border-white/5'
                : 'md:w-[60%]'
            )}
          >
            <LyricsDisplay
              currentTime={audio.currentTime}
              lyrics={currentTrack.lyrics as LyricLine[]}
              onLineClick={audio.seek}
              annotations={annotations}
              onAnnotate={handleAnnotate}
              isPlaying={audio.isPlaying}
            />
          </div>
        </div>

        {/* ========== Bottom Controls (Glass Layer) ========== */}
        <PlayerControls
          isPlaying={audio.isPlaying}
          onPlayPause={() => { audio.togglePlayPause(); haptics.trigger('light'); }}
          progress={audio.currentTime}
          duration={audio.duration}
          onSeek={audio.seek}
          mode={mode}
          onToggleMode={() => setMode(mode === 'audio' ? 'video' : 'audio')}
          mValue={mValue}
          onLike={handleLike}
          liked={likedIds.has(currentTrack.id)}
          volume={audio.volume}
          onVolumeChange={audio.setVolume}
          songTitle={currentTrack.title}
          artist={currentTrack.artist}
          audioEnergy={audio.audioEnergy}
          onPrev={() => { handlePrevTrack(); haptics.trigger('medium'); }}
          onNext={() => { handleNextTrack(); haptics.trigger('medium'); }}
          onPlaylistToggle={() => openPanel('playlist')}
          onCommunityToggle={() => openPanel('community')}
          onCommentsToggle={() => openPanel('comments')}
          onAILyricsToggle={() => openPanel('ai-lyrics')}
          onLeaderboardToggle={() => openPanel('leaderboard')}
          onAnalyticsToggle={() => openPanel('analytics')}
          shuffleEnabled={shuffleEnabled}
          onShuffleToggle={() => setShuffleEnabled((prev) => !prev)}
          repeatMode={repeatMode}
          onRepeatCycle={() =>
            setRepeatMode((prev) =>
              prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
            )
          }
          audioMode={audio.audioMode}
          albumArt={currentTrack.albumArt}
          emotion={emotion}
          onEmotionFilter={setActiveEmotionFilter}
          activeEmotionFilter={activeEmotionFilter}
          lyrics={currentTrack.lyrics as LyricLine[]}
        />
      </div>

      {/* M❤️ floating indicator (top-right) */}
      <motion.div
        className="fixed top-16 right-4 z-[5] hidden md:block pointer-events-none"
        initial={false}
        animate={{
          scale: mValue > 0 ? [1, 1.2, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-black/40 backdrop-blur-xl rounded-full px-3 py-1.5 border border-pink-500/20 flex items-center gap-1.5 shadow-lg">
          <motion.span
            className="text-lg"
            animate={audio.isPlaying ? { scale: [1, 1.15, 1] } : {}}
            transition={audio.isPlaying ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
          >
            ❤️
          </motion.span>
          <span className="text-pink-200 text-sm font-mono tabular-nums font-semibold">{mValue}</span>
        </div>
      </motion.div>

      {/* Click outside to close user menu / notification panel */}
      {(showUserMenu || showNotifPanel) && (
        <div
          className="fixed inset-0 z-[9]"
          onClick={() => { setShowUserMenu(false); setShowNotifPanel(false); }}
        />
      )}

      {/* Mobile Swipe Gesture Visual Feedback */}
      <AnimatePresence>
        {swipeState.isSwiping && swipeState.direction && (
          <motion.div
            key="swipe-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] pointer-events-none md:hidden flex items-center justify-center"
          >
            {/* Direction edge glow */}
            <motion.div
              className="absolute inset-y-0 w-24"
              style={{
                [swipeState.direction === 'left' ? 'right' : 'left']: 0,
                background: swipeState.direction === 'left'
                  ? 'linear-gradient(to left, rgba(139,92,246,0.15), transparent)'
                  : 'linear-gradient(to right, rgba(139,92,246,0.15), transparent)',
              }}
              animate={{ opacity: Math.min(swipeState.distance / 120, 1) }}
            />

            {/* Center icon indicator */}
            {swipeState.distance >= 40 && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                  scale: swipeState.distance >= 80 ? 1.1 : 0.85,
                  opacity: Math.min(swipeState.distance / 80, 1),
                }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={clsx(
                    'w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-xl border transition-colors',
                    swipeState.distance >= 80
                      ? 'bg-purple-500/30 border-purple-400/50 shadow-lg shadow-purple-500/30'
                      : 'bg-white/10 border-white/20'
                  )}
                >
                  {swipeState.direction === 'left' ? (
                    <SkipForward className={clsx('w-7 h-7', swipeState.distance >= 80 ? 'text-purple-300' : 'text-white/50')} />
                  ) : (
                    <SkipBack className={clsx('w-7 h-7', swipeState.distance >= 80 ? 'text-purple-300' : 'text-white/50')} />
                  )}
                </div>
                <span
                  className={clsx(
                    'text-xs font-medium tracking-wider',
                    swipeState.distance >= 80 ? 'text-purple-300' : 'text-white/40'
                  )}
                >
                  {swipeState.direction === 'left' ? t('gesture.swipeNext') : t('gesture.swipePrev')}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant (Logo-triggered + Tips + Voice) */}
      <AIAssistant
        activeTips={aiAssistant.activeTips}
        onDismissTip={aiAssistant.dismissTip}
        onExecuteAction={aiAssistant.executeTipAction}
        isListening={aiAssistant.isListening}
        onToggleListening={aiAssistant.toggleListening}
        voiceSupported={aiAssistant.voiceSupported}
        voiceFeedback={aiAssistant.voiceFeedback}
        voiceHistory={aiAssistant.voiceHistory}
        sessionInsight={aiAssistant.sessionInsight}
        isPlaying={audio.isPlaying}
        audioEnergy={audio.audioEnergy}
        externalExpanded={showAIExpanded}
        onExternalExpandedChange={setShowAIExpanded}
      />

      {/* Mobile Discover Hub — §9.1 Conditional mount */}
      <Suspense fallback={null}>
      {showDiscoverHub && (
      <MobileDiscoverHub
        isOpen
        onClose={closePanel}
        user={user}
        starPower={starPower}
        onOpenLeaderboard={() => openPanel('leaderboard')}
        onOpenRecommendations={() => openPanel('recommendations')}
        onOpenSpaceTime={() => openPanel('space-time')}
        onOpenStarPower={() => openPanel('star-power')}
        onOpenIPMatrix={() => openPanel('ip-matrix')}
        onOpenAchievements={() => openPanel('achievements')}
        onOpenMVCreator={() => { setMvCustomLyrics(null); openPanel('mv-creator'); }}
        onOpenCreationStudio={() => openPanel('creation-studio')}
        onOpenCommunity={() => openPanel('community')}
        onOpenComments={() => openPanel('comments')}
        onOpenCopyright={() => openPanel('copyright')}
        onOpenShop={() => openPanel('shop')}
        onOpenChallenge={() => openPanel('challenge')}
        onOpenAlbumStore={() => openPanel('album-store')}
        onOpenE2ESetup={() => openPanel('e2ee-setup')}
        onOpenSecondaryMarket={() => openPanel('secondary-market')}
        onOpenUpload={() => openPanel('upload')}
      />
      )}
      </Suspense>

      {/* Mobile Mini-Player (above bottom nav) */}
      <div className="md:hidden fixed inset-x-0 z-[51]"
        style={{ bottom: 'calc(52px + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={() => setShowMobilePlayer(true)}
          className="w-full bg-[#0D1235]/95 backdrop-blur-2xl border-t border-white/[0.06] px-4 py-2 flex items-center gap-3 active:bg-white/5 transition-colors"
        >
          {/* Mini album art */}
          <motion.div
            className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-md"
            animate={audio.isPlaying ? { scale: [1, 1.03, 1] } : {}}
            transition={audio.isPlaying ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
          >
            <img src={currentTrack.albumArt} alt="" className="w-full h-full object-cover" />
          </motion.div>

          {/* Song info + lyric */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-white/40 text-xs truncate">{currentTrack.artist}</p>
          </div>

          {/* Mini like */}
          <motion.div
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            whileTap={{ scale: 0.8 }}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <span className="text-base">❤️</span>
          </motion.div>

          {/* Mini play/pause */}
          <motion.div
            onClick={(e) => { e.stopPropagation(); audio.togglePlayPause(); }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
          >
            {audio.isPlaying ? (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            )}
          </motion.div>

          {/* Mini progress */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06]">
            <motion.div
              className="h-full"
              style={{
                width: `${audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0}%`,
                backgroundImage: `linear-gradient(to right, var(--dm-accent-from, #8B5CF6), var(--dm-accent-to, #EC4899))`,
              }}
            />
          </div>
        </button>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={mobileTab}
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === 'player') setShowMobilePlayer(true);
          else if (tab === 'community') openPanel('community');
          else if (tab === 'create') openPanel('creation-studio');
          else if (tab === 'discover') openPanel('discover-hub');
          else if (tab === 'me') {
            if (user) openPanel('profile');
            else setShowAuthModal(true);
          }
        }}
        isPlaying={audio.isPlaying}
        audioEnergy={audio.audioEnergy}
        hasUser={!!user}
        onMicTap={aiAssistant.toggleListening}
        isListening={aiAssistant.isListening}
        unreadNotifications={notifications.filter(n => !n.read).length}
        onOpenForkTree={() => openPanel('fork-tree')}
        onOpenMHeart={() => openPanel('mheart')}
        onOpenSmartPlaylist={() => openPanel('smart-playlist')}
        onOpenLiveSession={() => openPanel('live-session')}
      />

      {/* Mobile Full-Screen Player */}
      <MobilePlayer
        isOpen={showMobilePlayer}
        onClose={() => setShowMobilePlayer(false)}
        isPlaying={audio.isPlaying}
        onPlayPause={audio.togglePlayPause}
        progress={audio.currentTime}
        duration={audio.duration}
        onSeek={audio.seek}
        volume={audio.volume}
        onVolumeChange={audio.setVolume}
        songTitle={currentTrack.title}
        artist={currentTrack.artist}
        albumArt={currentTrack.albumArt}
        audioEnergy={audio.audioEnergy}
        emotion={emotion}
        mValue={mValue}
        onLike={handleLike}
        liked={likedIds.has(currentTrack.id)}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        shuffleEnabled={shuffleEnabled}
        onShuffleToggle={() => setShuffleEnabled(p => !p)}
        repeatMode={repeatMode}
        onRepeatCycle={() => setRepeatMode(p => p === 'off' ? 'all' : p === 'all' ? 'one' : 'off')}
        audioMode={audio.audioMode}
        onPlaylistToggle={() => openPanel('playlist')}
        onCommentsToggle={() => openPanel('comments')}
        onAILyricsToggle={() => openPanel('ai-lyrics')}
        onLeaderboardToggle={() => openPanel('leaderboard')}
        onAnalyticsToggle={() => openPanel('analytics')}
        onMicToggle={aiAssistant.toggleListening}
        isListening={aiAssistant.isListening}
        currentLyricText={currentLyricLine?.text || ''}
        currentLyricTranslation={currentLyricLine?.translation || ''}
        frequencyData={audio.frequencyData}
      />

      {/* PWA Banner */}
      <PWABanner
        show={pwa.showInstallHint}
        canInstall={pwa.canInstall}
        isIOS={pwa.isIOS}
        onInstall={pwa.installApp}
        onDismiss={pwa.dismissInstall}
        isOnline={pwa.isOnline}
      />

      {/* §14.x — Offline Indicator (non-intrusive banner) */}
      <OfflineIndicator isOnline={pwa.isOnline} />

      {/* §15.x — Performance Monitor (Dev Tool: Ctrl+Shift+P to toggle) */}
      <PerfMonitor />

      {/* §17.x — Keyboard Shortcuts Panel (? key to toggle) */}
      <KeyboardShortcuts lang={lang} />

      {/* §18.x — Listening Stats Dashboard */}
      <ListeningStats
        isOpen={showListeningStats}
        onClose={closePanel}
        userId={user?.id}
        lang={lang}
      />

      {/* §20.x — Fork Tree (创作协作分支树) */}
      <Suspense fallback={null}>
        {showForkTree && (
          <ForkTree
            isOpen={showForkTree}
            onClose={closePanel}
            lang={lang}
          />
        )}
      </Suspense>

      {/* §21.x — M❤️值 Dynamic Growth System */}
      <Suspense fallback={null}>
        {showMHeart && (
          <MHeartSystem
            isOpen={showMHeart}
            onClose={closePanel}
            userId={user?.id}
            lang={lang}
          />
        )}
      </Suspense>
    </div>
  );
}

// ==========================================
// §2.3 — React Router Data Mode (inline router to avoid circular deps)
// Root route renders I18nProvider + AppInner; panel state syncs with ?panel= URL param.
// ==========================================
function AppRoot() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

// Lazy-create router to avoid top-level window access during module evaluation
let _router: ReturnType<typeof createBrowserRouter> | null = null;
function getRouter() {
  if (!_router) {
    _router = createBrowserRouter([
      {
        path: '/',
        Component: AppRoot,
        children: [
          { index: true, Component: () => null },
          { path: '*', Component: () => null },
        ],
      },
    ]);
  }
  return _router;
}

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={getRouter()} />
    </ErrorBoundary>
  );
}
