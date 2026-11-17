import React, { useState } from 'react';
import { apiFetchStrict, ApiError, setSession, type SessionUser } from '@yyc3/music-utils';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const dMusicGold = '/assets/dmusic-gold.png';
import { useI18n } from '@yyc3/music-hooks';

interface SignupResponse {
  success: boolean;
  user?: SessionUser;
  accessToken?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChange: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onUserChange }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        // 服务端尚未提供登录 / 会话签发端点（P1-5 接入）
        throw new Error('账号服务未启用：登录接口尚未开放');
      }

      // 注册走 REST 契约（POST /signup）
      const result = await apiFetchStrict<SignupResponse>('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName: email.split('@')[0] }),
      });

      if (result.accessToken && result.user) {
        setSession({ accessToken: result.accessToken, user: result.user });
        onUserChange(result.user);
        setSuccess('Account created successfully!');
        setTimeout(onClose, 500);
      } else {
        // 注册成功但服务端未签发会话：不伪造登录态
        setSuccess('账号已创建，登录接口接入后即可登录');
        setTimeout(onClose, 1200);
      }
    } catch (err: any) {
      setError(err instanceof ApiError
        ? (err.data?.error ?? err.message)
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          className="bg-[#0D1235] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-[0_0_80px_rgba(102,126,234,0.15)] relative overflow-hidden"
        >
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-1">
            <img src={dMusicGold} alt="D-Music" className="w-10 h-10 object-contain" />
            <h2 className="text-xl font-bold text-white">
              {isLogin ? t('auth.welcomeBack') : t('auth.joinUs')}
            </h2>
          </div>
          <p className="text-white/40 mb-6 text-sm">
            {isLogin
              ? t('auth.signInDesc')
              : t('auth.signUpDesc')}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-white/60 ml-1">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                  placeholder="cosmic@traveler.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/60 ml-1">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            {success && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-400 text-xs bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2"
              >
                {success}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                t('auth.signIn')
              ) : (
                t('auth.createAccount')
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-white/30">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              {isLogin ? t('auth.signUp') : t('auth.signInLink')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};