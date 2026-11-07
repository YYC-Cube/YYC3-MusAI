import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Smartphone, Share, Plus } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface PWABannerProps {
  show: boolean;
  canInstall: boolean;
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  isOnline: boolean;
}

export const PWABanner: React.FC<PWABannerProps> = ({
  show,
  canInstall,
  isIOS,
  onInstall,
  onDismiss,
  isOnline,
}) => {
  const { lang } = useI18n();

  return (
    <>
      {/* Offline indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed top-0 inset-x-0 z-[100] bg-yellow-600/90 backdrop-blur-lg text-center py-1.5 text-xs text-white font-medium"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            {lang === 'zh' ? '📡 离线模式 — 部分功能受限' : '📡 Offline — some features limited'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install banner */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-16 inset-x-4 z-[90] bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur-2xl rounded-2xl border border-purple-500/20 p-4 shadow-2xl shadow-purple-500/20 md:hidden"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 p-1 text-white/30 hover:text-white/60"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-semibold text-sm">
                  {lang === 'zh' ? '安装 D-Music' : 'Install D-Music'}
                </h4>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                  {lang === 'zh'
                    ? '添加到主屏幕，享受沉浸式全屏音乐体验'
                    : 'Add to home screen for an immersive full-screen experience'}
                </p>

                {canInstall ? (
                  <button
                    onClick={onInstall}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#0A0E2F] text-xs font-semibold active:scale-95 transition-transform"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {lang === 'zh' ? '立即安装' : 'Install Now'}
                  </button>
                ) : isIOS ? (
                  <div className="mt-3 flex items-center gap-2 text-white/50 text-[11px]">
                    <Share className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {lang === 'zh'
                        ? '点击 分享 → 添加到主屏幕'
                        : 'Tap Share → Add to Home Screen'}
                    </span>
                    <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
