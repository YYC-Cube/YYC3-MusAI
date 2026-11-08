import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageCircle, Heart, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';

/**
 * §19.x — Timeline Comments (弹幕式时间锚点评论系统)
 *
 * Danmaku-style comments anchored to playback timestamps.
 * Features:
 *   - Floating barrage comments that appear at their anchored time
 *   - Semi-transparent overlay (non-intrusive)
 *   - Submit with auto-attached timestamp
 *   - Collision-free lane allocation
 *   - Toggle visibility
 */

interface TimelineComment {
  id: string;
  text: string;
  timestamp: number; // seconds in playback
  userName: string;
  color: string;
  createdAt: number;
  likes: number;
}

interface TimelineCommentsProps {
  songId: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  user: any;
  lang: 'zh' | 'en';
}

// Danmaku colors
const DANMAKU_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

// How many seconds around currentTime to show a comment
const TIME_WINDOW = 5;
// How many lanes for danmaku
const MAX_LANES = 5;

export const TimelineComments: React.FC<TimelineCommentsProps> = ({
  songId,
  currentTime,
  duration,
  isPlaying,
  user,
  lang,
}) => {
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [newText, setNewText] = useState('');
  const [visible, setVisible] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track which comments have been shown to avoid re-animating
  const shownRef = useRef<Set<string>>(new Set());

  // Fetch comments
  useEffect(() => {
    apiFetch<{ comments: TimelineComment[] }>(`/timeline-comments/${songId}`)
      .then((data) => {
        if (data?.comments) setComments(data.comments);
      })
      .catch((err) => console.error('[TimelineComments] Fetch error:', err));
    shownRef.current.clear();
  }, [songId]);

  // Get active comments (within time window)
  const activeComments = useMemo(() => {
    if (!visible) return [];
    return comments.filter(
      (c) => c.timestamp >= currentTime - 1 && c.timestamp <= currentTime + TIME_WINDOW
    );
  }, [comments, currentTime, visible]);

  // Assign lanes to avoid collision
  const laneAssignments = useMemo(() => {
    const lanes: Map<string, number> = new Map();
    const laneUsage: number[] = new Array(MAX_LANES).fill(0);

    for (const c of activeComments) {
      // Find lane with earliest availability
      let bestLane = 0;
      let minTime = Infinity;
      for (let i = 0; i < MAX_LANES; i++) {
        if (laneUsage[i] < minTime) {
          minTime = laneUsage[i];
          bestLane = i;
        }
      }
      lanes.set(c.id, bestLane);
      laneUsage[bestLane] = c.timestamp + 3; // reserve lane for 3s
    }
    return lanes;
  }, [activeComments]);

  // Submit comment
  const handleSubmit = useCallback(async () => {
    if (!newText.trim() || !user || sending) return;
    setSending(true);
    try {
      const color = DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)];
      const data = await apiFetch<{ comment: TimelineComment }>(`/timeline-comments/${songId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newText.trim(),
          timestamp: Math.floor(currentTime),
          userName: user.email?.split('@')[0] || 'User',
          color,
        }),
      });
      if (data?.comment) {
        setComments((prev) => [...prev, data.comment]);
      }
      setNewText('');
      setShowInput(false);
    } catch (err) {
      console.error('[TimelineComments] Submit error:', err);
    } finally {
      setSending(false);
    }
  }, [newText, user, songId, currentTime, sending]);

  // Like a comment
  const handleLike = useCallback(
    async (commentId: string) => {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
      );
      apiFetch(`/timeline-comments/${songId}/like/${commentId}`, { method: 'POST' }).catch(() => {});
    },
    [songId]
  );

  const t = lang === 'zh'
    ? {
        danmaku: '弹幕',
        send: '发送',
        placeholder: '发一条弹幕...',
        total: '条弹幕',
        show: '显示弹幕',
        hide: '隐藏弹幕',
        loginHint: '登录后发送弹幕',
      }
    : {
        danmaku: 'Danmaku',
        send: 'Send',
        placeholder: 'Send a comment...',
        total: 'comments',
        show: 'Show danmaku',
        hide: 'Hide danmaku',
        loginHint: 'Login to send danmaku',
      };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Danmaku overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
        <AnimatePresence>
          {activeComments.map((c) => {
            const lane = laneAssignments.get(c.id) || 0;
            const topPercent = 8 + lane * 7; // 8%~43% vertical range
            const delay = (c.timestamp - currentTime + 1) * 0.2;

            return (
              <motion.div
                key={c.id}
                initial={{ x: '110%', opacity: 0 }}
                animate={{ x: '-110%', opacity: 0.85 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 8, delay: Math.max(0, delay), ease: 'linear' }}
                className="absolute whitespace-nowrap pointer-events-auto cursor-pointer group"
                style={{ top: `${topPercent}%` }}
                onClick={() => handleLike(c.id)}
              >
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10"
                  style={{
                    color: c.color,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    textShadow: `0 0 8px ${c.color}40`,
                  }}
                >
                  {c.text}
                  {c.likes > 0 && (
                    <span className="ml-1 text-[10px] opacity-60">
                      <Heart className="inline w-2.5 h-2.5 -mt-0.5" /> {c.likes}
                    </span>
                  )}
                </span>
                <span className="hidden group-hover:inline text-[9px] ml-1 text-white/30">
                  {c.userName} · {formatTime(c.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-[6] flex items-center gap-2">
        {/* Toggle button */}
        <button
          onClick={() => setVisible(!visible)}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-all border',
            visible
              ? 'bg-white/10 text-white/60 border-white/10'
              : 'bg-white/5 text-white/30 border-white/5'
          )}
          title={visible ? t.hide : t.show}
        >
          {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span className="hidden sm:inline">{t.danmaku}</span>
          <span className="text-white/30">{comments.length}</span>
        </button>

        {/* Send button */}
        {user && (
          <AnimatePresence>
            {showInput ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-1 overflow-hidden"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={t.placeholder}
                  maxLength={100}
                  className="bg-white/10 border border-white/10 rounded-full px-3 py-1 text-[10px] text-white placeholder-white/30 outline-none focus:border-white/30 w-40 sm:w-52"
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={sending || !newText.trim()}
                  className="p-1 rounded-full bg-indigo-500/60 hover:bg-indigo-500/80 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-3 h-3 text-white" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  setShowInput(true);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white/60 transition-all"
              >
                <MessageCircle className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </>
  );
};
