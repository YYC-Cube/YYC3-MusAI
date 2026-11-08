/**
 * D-Music §1.1/§1.2/§1.3/§1.4 — Component Library Barrel Export
 *
 * Usage:
 *   import { DButton, DCard, StarPowerChart } from './components/dmusic';
 */

// §1.1 — UI Components
export {
  DButton,
  DInput,
  DCard,
  DMusicCard,
  DUserCard,
  DAchievementCard,
  DProgress,
  AchievementRing,
  DFeedback,
  DSpinner,
  DBadge,
  DTag,
  DEmptyState,
  DList,
  DListItem,
  DModal,
  DTabBar,
  DToast,
  DBreadcrumb,
} from './DMusicUI';

// §1.2 — Panel Component
export { DPanel } from './DPanel';
export type { PanelSize } from './DPanel';

// §1.3 — Data Visualization Components
export {
  DATA_VIZ_PALETTE,
  StarPowerChart,
  EmotionPieChart,
  PlayStatsChart,
  AchievementGrid,
  SparklineChart,
  DataExportButton,
  StatCard,
  RankingList,
} from './DataViz';

// Showcase / Test
export { DMusicShowcase } from './DMusicShowcase';