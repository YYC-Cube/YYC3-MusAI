export interface AuthUser {
  name: string;
  role: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export type KpiIcon = 'play' | 'users' | 'interaction' | 'revenue' | 'music';

export interface DashboardKpi {
  id: string;
  title: string;
  value: string;
  icon: KpiIcon;
  trend?: 'up' | 'down' | 'flat';
  hint?: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ActivityItem {
  id: string | number;
  platform: string;
  content: string;
  timestamp: string;
  likes?: number;
  comments?: number;
  type?: string;
}

export interface DashboardData {
  kpis: DashboardKpi[];
  playTrend: ChartPoint[];
  activities: ActivityItem[];
  updatedAt: string;
}
