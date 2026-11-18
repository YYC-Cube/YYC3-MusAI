// 版权与 IP 域 — 版权认证、IP 矩阵面板与版权申请

import type { AuthUser, UserProfileData } from './user';

/** Copyright certification status */
export type CopyrightStatus = 'pending' | 'certified' | 'rejected';

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

/** Copyright application request */
export interface CopyrightApplyRequest {
  workId: string;
  userId: string;
  userName?: string;
  workTitle: string;
  description?: string;
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
