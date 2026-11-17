import axios from 'axios';
import { clearAuth, getToken } from '@/utils/authStorage';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login';
      }
    }
    const message =
      error.response?.data?.message ?? error.message ?? '请求失败，请稍后重试';
    return Promise.reject(new Error(message));
  },
);

export default http;
