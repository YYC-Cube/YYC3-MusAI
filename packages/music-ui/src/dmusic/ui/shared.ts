// D-Music 设计层 · dmusic/ui 共享层 — 被多个组件复用的纯类型与常量

import React from 'react';
import {
  Loader2, CheckCircle2, AlertCircle, AlertTriangle, Info,
} from 'lucide-react';

/** 按钮尺寸档位 — DButton / DInput 共用 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** 反馈类型 — DFeedback / DToast 共用 */
export type FeedbackType = 'loading' | 'success' | 'error' | 'warning' | 'info';

export const feedbackConfig: Record<FeedbackType, { Icon: React.FC<any>; colorVar: string }> = {
  loading: { Icon: Loader2, colorVar: '--dm-info' },
  success: { Icon: CheckCircle2, colorVar: '--dm-success' },
  error: { Icon: AlertCircle, colorVar: '--dm-error' },
  warning: { Icon: AlertTriangle, colorVar: '--dm-warning' },
  info: { Icon: Info, colorVar: '--dm-info' },
};
