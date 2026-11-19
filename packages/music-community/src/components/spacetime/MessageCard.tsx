// 社区面板子组件 · 时空墙单条消息卡片（语音播放 / 转写 / 点赞 / 回复）
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, MessageCircle, ChevronDown, ChevronUp,
  Play, Mic, Type, Music, MapPin, Send,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '@yyc3/music-utils';
import type { Dispatch, SetStateAction } from 'react';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { emotionOf, timeAgo } from './shared';
import type { STMessage, STReply } from './shared';

interface MessageCardProps {
  msg: STMessage;
  user: any;
  lang: Lang;
  t: (key: TranslationKey) => string;
  expandedReplies: string | null;
  replies: STReply[];
  replyLoading: boolean;
  replyText: string;
  setReplyText: Dispatch<SetStateAction<string>>;
  setMessages: Dispatch<SetStateAction<STMessage[]>>;
  handleLikeMessage: (msgId: string) => Promise<void>;
  handleToggleReplies: (msgId: string) => Promise<void>;
  handleSendReply: (msgId: string) => Promise<void>;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  msg, user, lang, t, expandedReplies, replies, replyLoading, replyText,
  setReplyText, setMessages, handleLikeMessage, handleToggleReplies, handleSendReply,
}) => {
  const emo = emotionOf(msg.emotion);
  const isLiked = user && msg.likedBy?.includes(user.id);
  const showingReplies = expandedReplies === msg.id;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0 text-xs text-white/60">
          {msg.userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white/70">{msg.userName}</span>
            <span className={clsx('text-[10px]', emo.color)}>{emo.emoji}</span>
            <span className="text-[10px] text-white/15 ml-auto">{timeAgo(msg.createdAt)}</span>
          </div>
          {msg.type === 'voice' && msg.audioWaveform ? (
            <div className="mt-1.5 flex items-center gap-2">
              <button
                onClick={async () => {
                  let url = msg.audioSignedUrl || msg.audioData;
                  if (!url && msg.audioFilePath) {
                    try {
                      const r = await apiFetch<{ signedUrl: string }>(`/voice/url?path=${encodeURIComponent(msg.audioFilePath)}`);
                      if (r?.signedUrl) url = r.signedUrl;
                    } catch { /* 签名地址获取失败时回退使用原始音频 */ }
                  }
                  if (url) { const a = new Audio(url); a.play().catch(() => {}); }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/15 hover:bg-purple-500/20 transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 text-purple-400 flex-shrink-0" />
                <Mic className="w-3 h-3 text-purple-400" />
                <div className="flex items-end gap-[1px] h-4">
                  {(msg.audioWaveform || []).map((v: number, i: number) => (
                    <div key={i} className="w-[2px] rounded-full bg-purple-400/50" style={{ height: `${Math.max(v * 100, 10)}%` }} />
                  ))}
                </div>
                <span className="text-[10px] text-purple-300/60 font-mono ml-1">{msg.audioDuration || 0}s</span>
              </button>
              {/* Transcript display or transcribe button */}
              {msg.transcript ? (
                <div className="mt-1.5 flex items-start gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <Type className="w-3 h-3 text-cyan-400/50 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/60 leading-relaxed italic">{msg.transcript}</p>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    let audioBase64 = msg.audioData;
                    // Fetch from storage if no inline data
                    if (!audioBase64 && (msg.audioSignedUrl || msg.audioFilePath)) {
                      try {
                        let url = msg.audioSignedUrl;
                        if (!url && msg.audioFilePath) {
                          const r = await apiFetch<{ signedUrl: string }>(`/voice/url?path=${encodeURIComponent(msg.audioFilePath)}`);
                          if (r?.signedUrl) url = r.signedUrl;
                        }
                        if (url) {
                          const blobResp = await fetch(url);
                          const blob = await blobResp.blob();
                          audioBase64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                          });
                        }
                      } catch { /* continue */ }
                    }
                    if (audioBase64) {
                      try {
                        const resp = await apiFetch<{ text?: string; fallback?: string }>('/stt/transcribe', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ audioBase64: audioBase64.slice(0, 500000), language: lang }),
                        });
                        if (resp?.text) {
                          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, transcript: resp.text } : m));
                          return;
                        }
                      } catch { /* fall through */ }
                    }
                    const hint = msg.content?.replace(/\[.*?\]\s*/, '') || '';
                    setMessages(prev => prev.map(m => m.id === msg.id ? {
                      ...m,
                      transcript: hint || (lang === 'zh' ? '(语音转写暂不可用)' : '(Transcription unavailable)')
                    } : m));
                  }}
                  className="mt-1 flex items-center gap-1 text-[10px] text-white/20 hover:text-cyan-400/60 transition-colors"
                >
                  <Type className="w-2.5 h-2.5" />
                  {lang === 'zh' ? '转文字' : 'Transcribe'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/80 mt-1 leading-relaxed">{msg.content}</p>
          )}
          {msg.songTitle && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-cyan-400/50">
              <Music className="w-2.5 h-2.5" />
              {msg.songTitle}
            </div>
          )}
          {msg.targetLocation && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-green-400/40">
              <MapPin className="w-2.5 h-2.5" />
              {msg.targetLocation.label || `${msg.targetLocation.lat?.toFixed(3)}, ${msg.targetLocation.lng?.toFixed(3)}`}
            </div>
          )}
          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => handleLikeMessage(msg.id)}
              className={clsx(
                'flex items-center gap-1 text-[11px] transition-colors',
                isLiked ? 'text-pink-400' : 'text-white/20 hover:text-pink-400/60'
              )}
            >
              <Heart className={clsx('w-3 h-3', isLiked && 'fill-current')} />
              {msg.likes > 0 && msg.likes}
            </button>
            <button
              onClick={() => handleToggleReplies(msg.id)}
              className="flex items-center gap-1 text-[11px] text-white/20 hover:text-white/40 transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              {msg.replies > 0 && <span>{msg.replies}</span>}
              {showingReplies ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          </div>
          {/* Replies */}
          <AnimatePresence>
            {showingReplies && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2 border-t border-white/[0.04] pt-2"
              >
                {replyLoading ? (
                  <div className="flex justify-center py-2">
                    <div className="w-4 h-4 border border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {replies.map(r => (
                      <div key={r.id} className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-white/40 font-medium flex-shrink-0">{r.userName}:</span>
                        <span className="text-white/50">{r.content}</span>
                      </div>
                    ))}
                  </div>
                )}
                {user && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={t('spacetime.replyPlaceholder')}
                      maxLength={200}
                      className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-[11px] text-white/70 outline-none placeholder:text-white/15"
                      onKeyDown={e => { if (e.key === 'Enter') handleSendReply(msg.id); }}
                    />
                    <button
                      onClick={() => handleSendReply(msg.id)}
                      disabled={!replyText.trim()}
                      className="p-1 text-purple-400/60 hover:text-purple-400 disabled:opacity-20 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
