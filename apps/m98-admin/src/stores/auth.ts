import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { login as loginApi } from '@/services/api';
import { clearAuth, getToken, getUser, setAuth } from '@/utils/authStorage';
import type { AuthUser, LoginPayload } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken());
  const user = ref<AuthUser | null>(getUser());
  const loading = ref(false);
  const error = ref('');

  const isAuthenticated = computed(() => Boolean(token.value));

  async function login(payload: LoginPayload): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      const result = await loginApi(payload);
      token.value = result.token;
      user.value = result.user;
      setAuth(result.token, result.user);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    token.value = '';
    user.value = null;
    clearAuth();
  }

  return { token, user, loading, error, isAuthenticated, login, logout };
});
