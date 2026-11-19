// D-Music 设计层 · 组件桶文件（barrel）— 实现已按单一职责 / 原子分层拆分至 ./ui/ 单组件文件

/**
 * D-Music §1.1 — Component Library
 *
 * Material Design 3.0 inspired, adapted for D-Music's deep-space aesthetic.
 * All components:
 *   - Use CSS custom properties from §1.4 Theme System
 *   - WCAG 2.1 AA compliant (aria-*, focus-visible, contrast ratios)
 *   - Support keyboard navigation
 *   - 60fps animations (GPU-accelerated transform/opacity)
 *   - Responsive (mobile/tablet/desktop)
 *
 * Component Categories:
 *   1. DButton — Primary/Secondary/Ghost/Danger variants
 *   2. DInput — Text/Password/Search inputs
 *   3. DCard — Music/User/Achievement cards
 *   4. DProgress — Linear and ring progress indicators
 *   5. DFeedback — Loading/Success/Error/Warning states
 *   6. DBadge — Status/count badges
 *   7. DTooltip — Accessible tooltip wrapper
 *   8. DTag — Genre/mood/status tags
 */

export { DButton } from './ui/DButton';
export { DInput } from './ui/DInput';
export { DCard } from './ui/DCard';
export { DMusicCard } from './ui/DMusicCard';
export { DUserCard } from './ui/DUserCard';
export { DAchievementCard } from './ui/DAchievementCard';
export { DProgress } from './ui/DProgress';
export { AchievementRing } from './ui/AchievementRing';
export { DFeedback } from './ui/DFeedback';
export { DSpinner } from './ui/DSpinner';
export { DBadge } from './ui/DBadge';
export { DTag } from './ui/DTag';
export { DEmptyState } from './ui/DEmptyState';
export { DList } from './ui/DList';
export { DListItem } from './ui/DListItem';
export { DModal } from './ui/DModal';
export { DTabBar } from './ui/DTabBar';
export { DToast } from './ui/DToast';
export { DBreadcrumb } from './ui/DBreadcrumb';
