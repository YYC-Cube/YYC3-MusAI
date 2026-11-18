// 通用 UI 域 — PWA 状态、移动发现中心、快捷键与错误边界

import type React from 'react';
import type { Lang } from './common';
import type { AuthUser } from './user';

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

export interface KeyboardShortcutsProps {
  lang: Lang;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
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
