/**
 * YYC³ music-community — ReactionBar 表情反应
 *
 * 参考 Misskey 的表情反应交互范式（仅借鉴交互，不引入 AGPL 代码）：
 * - 可自定义 emoji 集合（宿主传入，Misskey 的自定义 emoji 语义）；
 * - 点击已选反应再次点击即取消（toggle）；
 * - 受控组件：计数与"我的反应"由宿主持有，本组件只发回调，
 *   持久化（KV/API）由调用方决定，便于复用于信息流与直播间。
 *
 * 许可：MIT
 */

import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';
import React, { useState } from 'react';

export interface ReactionBarProps {
  /** emoji → 计数（宿主持有） */
  reactions: Record<string, number>;
  /** 当前用户已选的反应 emoji 列表 */
  myReactions: string[];
  /** 可选 emoji 集合（Misskey 自定义表情语义），默认内置一套 */
  availableEmojis?: string[];
  /** 反应/取消反应回调（toggle 语义由内部处理后区分触发） */
  onReact?: (emoji: string) => void;
  onUnreact?: (emoji: string) => void;
  /** 只读展示模式 */
  readOnly?: boolean;
  className?: string;
}

const DEFAULT_EMOJIS = ['❤️', '👏', '🎵', '🔥', '😍', '😢'];

export const ReactionBar: React.FC<ReactionBarProps> = ({
  reactions,
  myReactions,
  availableEmojis,
  onReact,
  onUnreact,
  readOnly = false,
  className,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const emojis = availableEmojis || DEFAULT_EMOJIS;
  const active = Object.entries(reactions).filter(([, count]) => count > 0);
  const mySet = new Set(myReactions);

  const toggle = (emoji: string) => {
    if (readOnly) return;
    if (mySet.has(emoji)) onUnreact?.(emoji);
    else onReact?.(emoji);
  };

  return (
    <div className={clsx('relative flex items-center gap-1.5 flex-wrap', className)} data-slot="reaction-bar">
      {/* 已有反应（含计数） */}
      {active.map(([emoji, count]) => {
        const isMine = mySet.has(emoji);
        return (
          <motion.button
            key={emoji}
            layout
            whileTap={{ scale: 0.85 }}
            onClick={() => toggle(emoji)}
            disabled={readOnly}
            className={clsx(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
              isMine
                ? 'bg-pink-500/15 border-pink-500/40 text-pink-300'
                : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]',
              readOnly && 'cursor-default',
            )}
            aria-label={`${emoji} ${count} 次${isMine ? '，点击取消' : ''}`}
            aria-pressed={isMine}
          >
            <span>{emoji}</span>
            <span className="tabular-nums font-medium">{count}</span>
            {isMine && (
              <motion.span
                layoutId={`reaction-glow-${emoji}`}
                className="absolute inset-0 rounded-full -z-10"
                style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.15), transparent 70%)' }}
              />
            )}
          </motion.button>
        );
      })}

      {/* 添加反应入口 + 选择器 */}
      {!readOnly && (
        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] hover:text-white/70 transition-colors flex items-center justify-center text-xs"
            aria-label="添加表情反应"
            aria-expanded={pickerOpen}
          >
            ＋
          </button>

          <AnimatePresence>
            {pickerOpen && (
              <>
                {/* 点击外部关闭 */}
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.92 }}
                  transition={{ duration: 0.15 }}
                  className={clsx(
                    'absolute bottom-full left-0 mb-2 z-50 flex gap-1 bg-[#111640]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl',
                  )}
                  role="menu"
                >
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        toggle(emoji);
                        setPickerOpen(false);
                      }}
                      className="w-9 h-9 rounded-xl hover:bg-white/10 transition-colors text-lg flex items-center justify-center"
                      role="menuitem"
                      aria-label={`反应 ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
