<template>
  <div class="login-shell">
    <section class="brand-panel">
      <div class="brand-inner">
        <img class="logo" src="/D-Music-icons/logo.svg" alt="M98 品牌标识" />
        <p class="eyebrow">M98 · ADMIN CONSOLE</p>
        <h1>董小姐音乐宇宙<br />管理后台</h1>
        <p class="brand-copy">
          作品、粉丝、活动与数据的中枢控制台。当前版本已接入鉴权与总览看板，
          后续逐步开放发布、排期与深度分析。
        </p>
        <img class="banner" src="/D-MusAI.png" alt="M98 音乐宇宙" />
      </div>
    </section>

    <section class="form-panel">
      <form class="login-card" @submit.prevent="submit">
        <header>
          <p class="eyebrow">SECURE ACCESS</p>
          <h2>管理员登录</h2>
          <p class="sub">使用后台账号进入 M98 管理控制台</p>
        </header>

        <label class="field">
          <span>账号</span>
          <input
            v-model.trim="form.username"
            type="text"
            name="username"
            autocomplete="username"
            placeholder="请输入管理员账号"
            required
          />
        </label>

        <label class="field">
          <span>密码</span>
          <input
            v-model="form.password"
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="请输入密码"
            required
          />
        </label>

        <p v-if="auth.error" class="error">{{ auth.error }}</p>

        <button class="submit" type="submit" :disabled="auth.loading">
          {{ auth.loading ? '验证中…' : '进入控制台' }}
        </button>

        <p class="hint">
          开发默认账号：<code>admin</code> / <code>m98-admin-dev</code><br />
          生产环境请通过 <code>ADMIN_USERNAME</code> / <code>ADMIN_PASSWORD</code> 修改。
        </p>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  username: 'admin',
  password: '',
});

const redirect = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/',
);

async function submit(): Promise<void> {
  try {
    await auth.login({ ...form });
    await router.replace(redirect.value);
  } catch {
    // 错误信息由 auth store 统一维护
  }
}
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(380px, 0.9fr);
}

.brand-panel {
  position: relative;
  display: flex;
  align-items: center;
  padding: 56px;
  overflow: hidden;
  border-right: 1px solid var(--border-soft);
  background:
    radial-gradient(circle at 20% 20%, rgba(138, 43, 226, 0.28), transparent 46%),
    radial-gradient(circle at 80% 80%, rgba(255, 107, 107, 0.16), transparent 42%),
    #0a0e15;
}

.brand-inner {
  max-width: 560px;
  position: relative;
  z-index: 2;
}

.logo {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(138, 43, 226, 0.35);
}

.eyebrow {
  margin: 26px 0 10px;
  font-size: 11px;
  letter-spacing: 0.28em;
  color: var(--text-muted);
}

h1 {
  margin: 0 0 16px;
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.18;
  background: linear-gradient(100deg, #f4ecff, #b388ff 55%, #ff9b9b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.brand-copy {
  margin: 0 0 30px;
  max-width: 460px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.8;
}

.banner {
  width: min(100%, 460px);
  opacity: 0.9;
  filter: drop-shadow(0 24px 48px rgba(0, 0, 0, 0.4));
}

.form-panel {
  display: grid;
  place-items: center;
  padding: 40px 24px;
  background: rgba(11, 15, 22, 0.9);
}

.login-card {
  width: min(100%, 400px);
  padding: 32px;
  border-radius: 20px;
  border: 1px solid var(--border-soft);
  background: linear-gradient(165deg, rgba(22, 27, 34, 0.96), rgba(13, 17, 23, 0.9));
  box-shadow: var(--shadow);
}

.login-card header {
  margin-bottom: 24px;
}

.login-card h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.field span {
  font-size: 12px;
  color: var(--text-muted);
}

.field input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 11px;
  border: 1px solid var(--border-soft);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.16);
}

.error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  color: #ffb4b4;
  background: rgba(248, 81, 73, 0.1);
  border: 1px solid rgba(248, 81, 73, 0.28);
}

.submit {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 11px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(100deg, var(--brand), var(--accent));
  box-shadow: 0 14px 30px rgba(138, 43, 226, 0.28);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  margin: 18px 0 0;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text-muted);
}

.hint code {
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(138, 43, 226, 0.14);
  color: #d9c2ff;
}

@media (max-width: 960px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    display: none;
  }
}
</style>
