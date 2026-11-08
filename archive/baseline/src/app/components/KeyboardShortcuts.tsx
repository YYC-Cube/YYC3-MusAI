import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard } from 'lucide-react';

/**
 * §17.x — Keyboard Shortcuts Panel
 *
 * Toggle with `?` key (Shift+Slash).
 * Self-contained component — no hooks added to App.tsx.
 */

interface ShortcutGroup {
  title: { zh: string; en: string };
  shortcuts: { keys: string[]; desc: { zh: string; en: string } }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: { zh: '播放控制', en: 'Playback' },
    shortcuts: [
      { keys: ['Space'], desc: { zh: '播放 / 暂停', en: 'Play / Pause' } },
      { keys: ['N'], desc: { zh: '下一首', en: 'Next track' } },
      { keys: ['P'], desc: { zh: '上一首', en: 'Previous track' } },
      { keys: ['←'], desc: { zh: '后退 5 秒', en: 'Rewind 5s' } },
      { keys: ['→'], desc: { zh: '前进 5 秒', en: 'Forward 5s' } },
    ],
  },
  {
    title: { zh: '音量控制', en: 'Volume' },
    shortcuts: [
      { keys: ['↑'], desc: { zh: '音量增加', en: 'Volume up' } },
      { keys: ['↓'], desc: { zh: '音量减小', en: 'Volume down' } },
      { keys: ['M'], desc: { zh: '静音 / 恢复', en: 'Mute / Unmute' } },
    ],
  },
  {
    title: { zh: '移动端手势', en: 'Mobile Gestures' },
    shortcuts: [
      { keys: ['←滑动'], desc: { zh: '下一首', en: 'Next track' } },
      { keys: ['→滑动'], desc: { zh: '上一首', en: 'Previous track' } },
    ],
  },
  {
    title: { zh: '开发工具', en: 'Dev Tools' },
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'P'], desc: { zh: '性能监控面板', en: 'Perf monitor' } },
      { keys: ['?'], desc: { zh: '快捷键面板 (此面板)', en: 'This panel' } },
    ],
  },
];

interface KeyboardShortcutsProps {
  lang: 'zh' | 'en';
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ lang }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      // `?` key = Shift + Slash (or Shift + /)
      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[301] md:w-[520px] md:max-h-[75vh] bg-[var(--dm-bg,#0A0E2F)]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-label={lang === 'zh' ? '键盘快捷键' : 'Keyboard Shortcuts'}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-4.5 h-4.5 text-white/40" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white/80">
                  {lang === 'zh' ? '键盘快捷键' : 'Keyboard Shortcuts'}
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                aria-label={lang === 'zh' ? '关闭' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'none' }}>
              {SHORTCUT_GROUPS.map((group, gi) => (
                <div key={gi}>
                  <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2.5">
                    {group.title[lang]}
                  </h3>
                  <div className="space-y-1">
                    {group.shortcuts.map((sc, si) => (
                      <div
                        key={si}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="text-xs text-white/60">
                          {sc.desc[lang]}
                        </span>
                        <div className="flex items-center gap-1">
                          {sc.keys.map((key, ki) => (
                            <React.Fragment key={ki}>
                              {ki > 0 && (
                                <span className="text-[9px] text-white/15">+</span>
                              )}
                              <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[10px] font-mono font-medium text-white/50 bg-white/[0.06] border border-white/[0.08] rounded-md shadow-[0_1px_0_rgba(255,255,255,0.05)]">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-white/[0.04] flex-shrink-0">
              <p className="text-[9px] text-white/15 text-center">
                {lang === 'zh' ? '按 ? 或 Esc 关闭' : 'Press ? or Esc to close'} · §17.x
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
