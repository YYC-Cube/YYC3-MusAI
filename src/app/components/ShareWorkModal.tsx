import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Download, Copy, Check, Users, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useI18n } from '../hooks/useI18n';
import { apiFetch } from '../lib/supabase';

// ==========================================
// Share Work Modal
// ==========================================
// Generates a visual share card for created works,
// supports sharing to community feed, clipboard copy,
// and image download.

interface ShareWork {
  id: string;
  title: string;
  theme: string;
  lyrics: string[];
  mode: string;
  createdAt: number;
}

interface ShareWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: ShareWork | null;
  userName?: string;
  userId?: string;
  onShared?: () => void;
}

const THEME_GRADIENTS: Record<string, [string, string]> = {
  happy: ['#FFD700', '#FF8C00'],
  sad: ['#6495ED', '#4B0082'],
  energetic: ['#FF4500', '#FF1493'],
  calm: ['#00CED1', '#2E8B57'],
  love: ['#FF69B4', '#DC143C'],
};

const THEME_EMOJIS: Record<string, string> = {
  happy: '🌟',
  sad: '🌊',
  energetic: '⚡',
  calm: '🌙',
  love: '💖',
};

const MODE_LABELS: Record<string, { zh: string; en: string }> = {
  quick: { zh: '极简写歌', en: 'Quick Song' },
  master: { zh: '大师写歌', en: 'Master Mode' },
  remix: { zh: '热歌改编', en: 'Remix' },
};

export const ShareWorkModal: React.FC<ShareWorkModalProps> = ({
  isOpen,
  onClose,
  work,
  userName,
  userId,
  onShared,
}) => {
  const { lang } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  // ========== Draw Share Card on Canvas ==========
  const drawCard = useCallback(() => {
    if (!canvasRef.current || !work) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 480;
    const h = 640;
    canvas.width = w;
    canvas.height = h;

    const [c1, c2] = THEME_GRADIENTS[work.theme] || ['#8B5CF6', '#EC4899'];

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0A0E2F');
    bgGrad.addColorStop(0.5, '#0D1235');
    bgGrad.addColorStop(1, '#0A0E2F');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Decorative particles
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 2 + 0.3;
      const alpha = Math.random() * 0.4 + 0.1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    // Accent glow top
    const glowGrad = ctx.createRadialGradient(w / 2, 100, 0, w / 2, 100, 200);
    glowGrad.addColorStop(0, `${c1}33`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Accent glow bottom
    const glow2 = ctx.createRadialGradient(w / 2, h - 80, 0, w / 2, h - 80, 180);
    glow2.addColorStop(0, `${c2}22`);
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, w, h);

    // Border frame
    ctx.strokeStyle = `${c1}40`;
    ctx.lineWidth = 1;
    const inset = 16;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);

    // Top: D-MUSIC brand
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'center';
    ctx.fillText('D - M U S I C', w / 2, 50);

    // Emoji
    ctx.font = '48px serif';
    ctx.fillText(THEME_EMOJIS[work.theme] || '🎵', w / 2, 120);

    // Title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '700 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(work.title, w / 2, 170);

    // Mode badge
    const modeLabel = MODE_LABELS[work.mode]?.[lang] || work.mode;
    ctx.font = '500 11px system-ui, -apple-system, sans-serif';
    const badgeWidth = ctx.measureText(modeLabel).width + 20;
    const badgeX = (w - badgeWidth) / 2;

    ctx.fillStyle = `${c1}20`;
    ctx.beginPath();
    ctx.roundRect(badgeX, 182, badgeWidth, 22, 11);
    ctx.fill();
    ctx.strokeStyle = `${c1}40`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, 182, badgeWidth, 22, 11);
    ctx.stroke();

    ctx.fillStyle = c1;
    ctx.textAlign = 'center';
    ctx.fillText(modeLabel, w / 2, 197);

    // Divider
    const divGrad = ctx.createLinearGradient(60, 0, w - 60, 0);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.3, `${c1}40`);
    divGrad.addColorStop(0.7, `${c2}40`);
    divGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(60, 220);
    ctx.lineTo(w - 60, 220);
    ctx.stroke();

    // Lyrics
    ctx.textAlign = 'left';
    ctx.font = '400 14px system-ui, -apple-system, sans-serif';
    const maxLines = Math.min(work.lyrics.length, 10);
    const lineHeight = 28;
    const startY = 255;
    const lyricsGrad = ctx.createLinearGradient(0, startY, 0, startY + maxLines * lineHeight);
    lyricsGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    lyricsGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.65)');
    lyricsGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

    for (let i = 0; i < maxLines; i++) {
      const line = work.lyrics[i];
      const alpha = i < maxLines - 2 ? 0.7 : 0.7 * (1 - (i - (maxLines - 2)) / 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(alpha, 0.2)})`;
      // Truncate long lines
      let text = line;
      if (ctx.measureText(text).width > w - 80) {
        while (ctx.measureText(text + '...').width > w - 80 && text.length > 0) {
          text = text.slice(0, -1);
        }
        text += '...';
      }
      ctx.fillText(text, 40, startY + i * lineHeight);
    }

    // Author
    if (userName) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '400 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`by ${userName}`, w / 2, h - 80);
    }

    // Bottom: branding
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '400 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      lang === 'zh' ? 'D-Music AI 创作 · 六化一体智能音乐平台' : 'Created with D-Music AI · Next-Gen Music Platform',
      w / 2,
      h - 50
    );

    // Date
    const date = new Date(work.createdAt);
    const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '400 9px system-ui, -apple-system, sans-serif';
    ctx.fillText(dateStr, w / 2, h - 34);
  }, [work, userName, lang]);

  useEffect(() => {
    if (isOpen && work) {
      // Small delay to ensure canvas is mounted
      requestAnimationFrame(() => drawCard());
    }
  }, [isOpen, work, drawCard]);

  // ========== Share to Community ==========
  const handleShareToCommunity = useCallback(async () => {
    if (!work || sharing) return;
    setSharing(true);

    try {
      await apiFetch('/community/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'achievement',
          userId: userId || 'anon',
          userName: userName || 'Creator',
          songId: work.id,
          songTitle: work.title,
          detail: lang === 'zh'
            ? `分享了AI创作「${work.title}」`
            : `shared AI creation "${work.title}"`,
        }),
      });

      // Also store shared work for discovery
      await apiFetch('/shared-works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId: work.id,
          title: work.title,
          theme: work.theme,
          lyrics: work.lyrics,
          mode: work.mode,
          createdAt: work.createdAt,
          userId: userId || 'anon',
          userName: userName || 'Creator',
        }),
      });

      setShared(true);
      onShared?.();
      setTimeout(() => setShared(false), 3000);
      // Track achievement: work created/shared
      if (userId && userId !== 'anon') {
        apiFetch(`/achievements/${userId}/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_work' }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Share to community failed:', err);
    } finally {
      setSharing(false);
    }
  }, [work, sharing, userId, userName, lang, onShared]);

  // ========== Copy Lyrics ==========
  const handleCopyLyrics = useCallback(() => {
    if (!work) return;
    const text = [
      `🎵 ${work.title}`,
      `${THEME_EMOJIS[work.theme] || '🎶'} ${MODE_LABELS[work.mode]?.[lang] || work.mode}`,
      '',
      ...work.lyrics,
      '',
      lang === 'zh' ? '— D-Music AI 创作' : '— Created with D-Music AI',
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [work, lang]);

  // ========== Download Card Image ==========
  const handleDownload = useCallback(() => {
    if (!canvasRef.current || !work) return;
    const link = document.createElement('a');
    link.download = `d-music-${work.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }, [work]);

  if (!work) return null;

  const [c1] = THEME_GRADIENTS[work.theme] || ['#8B5CF6', '#EC4899'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-lg"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-[71] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md max-h-[90vh] bg-[#0B1030]/98 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">
                    {lang === 'zh' ? '分享作品' : 'Share Work'}
                  </h3>
                  <p className="text-white/30 text-xs">
                    {lang === 'zh' ? '让更多人听到你的创作' : 'Let more people hear your creation'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'none' }}>
              {/* Share Card Preview */}
              <div className="flex justify-center">
                <div className="rounded-xl overflow-hidden shadow-2xl border border-white/[0.08]" style={{ maxWidth: 280 }}>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto"
                    style={{ display: 'block' }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                {/* Share to Community */}
                <motion.button
                  onClick={handleShareToCommunity}
                  disabled={sharing || shared}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={clsx(
                    'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2.5 text-sm transition-all',
                    shared
                      ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                  )}
                >
                  {shared ? (
                    <>
                      <Check className="w-4 h-4" />
                      {lang === 'zh' ? '已分享到社区!' : 'Shared to community!'}
                    </>
                  ) : sharing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      {lang === 'zh' ? '分享中...' : 'Sharing...'}
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      {lang === 'zh' ? '分享到社区' : 'Share to Community'}
                    </>
                  )}
                </motion.button>

                {/* Copy & Download row */}
                <div className="flex gap-2.5">
                  <button
                    onClick={handleCopyLyrics}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        {lang === 'zh' ? '已复制' : 'Copied'}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        {lang === 'zh' ? '复制歌词' : 'Copy Lyrics'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {lang === 'zh' ? '保存图片' : 'Save Image'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
