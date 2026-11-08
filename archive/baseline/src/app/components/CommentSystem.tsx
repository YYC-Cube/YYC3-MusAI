import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Heart, Clock, MessageCircle, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number; // playback seconds
  createdAt: number;
  likes: number;
  likedBy: string[];
}

interface CommentSystemProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  currentTime: number;
  user: any;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  isOpen,
  onClose,
  songId,
  songTitle,
  currentTime,
  user,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachTime, setAttachTime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  // Fetch comments
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    apiFetch<{ comments: Comment[] }>(`/comments/${songId}`).then((data) => {
      if (data?.comments) setComments(data.comments);
      setLoading(false);
    });
  }, [isOpen, songId]);

  const handlePost = useCallback(async () => {
    if (!newComment.trim()) return;
    const userName = user?.email?.split('@')[0] || 'Anonymous';

    const optimistic: Comment = {
      id: `temp-${Date.now()}`,
      userId: user?.id || 'anon',
      userName,
      text: newComment.trim(),
      timestamp: attachTime ? Math.floor(currentTime) : 0,
      createdAt: Date.now(),
      likes: 0,
      likedBy: [],
    };
    setComments((prev) => [optimistic, ...prev]);
    setNewComment('');

    const data = await apiFetch<{ comment: Comment }>(`/comments/${songId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id || 'anon',
        userName,
        text: optimistic.text,
        timestamp: optimistic.timestamp,
      }),
    });
    if (data?.comment) {
      setComments((prev) => prev.map((c) => (c.id === optimistic.id ? data.comment : c)));
    }
  }, [newComment, attachTime, currentTime, songId, user]);

  const handleLikeComment = useCallback(
    async (commentId: string) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          const liked = user?.id && c.likedBy?.includes(user.id);
          return {
            ...c,
            likes: liked ? c.likes - 1 : c.likes + 1,
            likedBy: liked
              ? c.likedBy.filter((id) => id !== user?.id)
              : [...(c.likedBy || []), user?.id || ''],
          };
        })
      );

      await apiFetch(`/comments/${songId}/like/${commentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
    },
    [songId, user]
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('time.justNow');
    if (mins < 60) return `${mins}${t('time.mAgo')}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t('time.hAgo')}`;
    return `${Math.floor(hrs / 24)}${t('time.dAgo')}`;
  };

  const sorted = [...comments].sort((a, b) =>
    sortBy === 'popular' ? b.likes - a.likes : b.createdAt - a.createdAt
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[75vh] bg-[#0D1235]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-md md:rounded-none md:rounded-l-2xl md:border-l md:border-t-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{t('comments.title')}</h3>
                  <p className="text-white/30 text-xs">{songTitle} · {comments.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortBy(sortBy === 'newest' ? 'popular' : 'newest')}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-white/40 hover:text-white/70 border border-white/[0.06] transition-colors"
                >
                  {sortBy === 'newest' ? t('comments.newest') : t('comments.popular')}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">{t('comments.noComments')}</p>
                  <p className="text-white/15 text-xs mt-1">{t('comments.beFirst')}</p>
                </div>
              ) : (
                sorted.map((comment) => {
                  const isLiked = user?.id && comment.likedBy?.includes(user.id);
                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-xs font-bold text-white/70 flex-shrink-0">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-white/80">{comment.userName}</span>
                            {comment.timestamp > 0 && (
                              <span className="text-[10px] text-blue-400/70 bg-blue-400/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTime(comment.timestamp)}
                              </span>
                            )}
                            <span className="text-[10px] text-white/20">{timeAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm text-white/60 leading-relaxed">{comment.text}</p>
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={clsx(
                              'flex items-center gap-1 mt-1.5 text-xs transition-colors',
                              isLiked ? 'text-pink-400' : 'text-white/20 hover:text-pink-400/60'
                            )}
                          >
                            <Heart className={clsx('w-3 h-3', isLiked && 'fill-current')} />
                            {comment.likes > 0 && <span>{comment.likes}</span>}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAttachTime(!attachTime)}
                  className={clsx(
                    'p-2 rounded-lg border transition-colors flex-shrink-0',
                    attachTime
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-white/5 border-white/[0.06] text-white/30'
                  )}
                  title={attachTime ? `Attach at ${formatTime(currentTime)}` : 'No timestamp'}
                >
                  <Clock className="w-4 h-4" />
                </button>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                    placeholder={user ? t('comments.placeholder') : t('comments.signInToComment')}
                    disabled={!user}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 pr-10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 disabled:opacity-40 transition-all"
                  />
                </div>
                <button
                  onClick={handlePost}
                  disabled={!newComment.trim() || !user}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white disabled:opacity-30 transition-opacity flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {attachTime && (
                <p className="text-[10px] text-blue-400/50 mt-1.5 ml-11">
                  {t('comments.timestampAt')} {formatTime(currentTime)}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};