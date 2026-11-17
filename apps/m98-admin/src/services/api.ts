import http from './http';
import type { DashboardData, LoginPayload, LoginResult } from '@/types';

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const { data } = await http.post<LoginResult>('/api/auth/login', payload);
  return data;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await http.get<{
    success: boolean;
    data: DashboardData;
    message?: string;
  }>('/api/admin/dashboard');

  if (!data.success || !data.data) {
    throw new Error(data.message ?? '仪表盘数据为空');
  }
  return data.data;
}
