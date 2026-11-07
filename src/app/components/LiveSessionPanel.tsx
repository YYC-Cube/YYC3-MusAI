import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Radio, Users, Send, Music, Wifi, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';

/**
 * §26.x — Live Session Panel (实时互动)
 *
 * Polling-based real-time interaction:
 *   - Presence heartbeat (15s intervals)
 *   - Live danmaku feed (5s polling)
 *   - Online listeners count + avatars
 *   - Send live messages
 */

interface LiveSessionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  currentTrackId: string;
  currentTrackTitle: string;
  isPlaying: boolean;
  currentEmotion: string;
}

interface Listener {
  userId: string;
  userName: string;
  trackTitle: string;
  emotion: string;
  lastSeen: number;
}

interface LiveMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  trackId: string;
  timestamp: number;
  color: string;
}

const DANMAKU_COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6',
  '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#818CF8',
];

export const LiveSessionPanel: React.FC<LiveSessionPanelProps> = ({
  isOpen, onClose, userId, userName, currentTrackId, currentTrackTitle,
  isPlaying, currentEmotion,
}) => {
  const { lang } = useI18n();
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userColorRef = useRef(DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)]);

  // Join session + heartbeat
  useEffect(() => {
    if (!isOpen || !userId) return;
    setConnected(true);

    const sendHeartbeat = () => {
      apiFetch('/live-session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName: userName || 'Listener',
          trackId: currentTrackId,
          trackTitle: currentTrackTitle,
          emotion: currentEmotion,
          isPlaying,
        }),
      }).catch(err => console.error('Heartbeat error:', err));
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);

    return () => {
      clearInterval(interval);
      // Leave session
      apiFetch('/live-session/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
      setConnected(false);
    };
  }, [isOpen, userId, currentTrackId, currentTrackTitle, currentEmotion, isPlaying, userName]);

  // Poll presence
  useEffect(() => {
    if (!isOpen) return;

    const fetchPresence = () => {
      apiFetch<{ listeners: Listener[] }>('/live-session/presence')
        .then(data => {
          if (data?.listeners) setListeners(data.listeners);
        })
        .catch(() => {});
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Poll danmaku
  useEffect(() => {
    if (!isOpen) return;

    const fetchMessages = () => {
      apiFetch<{ messages: LiveMessage[] }>('/live-session/danmaku')
        .then(data => {
          if (data?.messages) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = data.messages.filter(m => !existingIds.has(m.id));
              const combined = [...prev, ...newMsgs];
              return combined.slice(-100); // Keep last 100
            });
          }
        })
        .catch(() => {});
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !userId || sending) return;
    setSending(true);
    try {
      await apiFetch('/live-session/danmaku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName: userName || 'User',
          text: inputText.trim(),
          trackId: currentTrackId,
          color: userColorRef.current,
        }),
      });
      setInputText('');
    } catch (err) {
      console.error('Send danmaku error:', err);
    } finally {
      setSending(false);
    }
  };

  const onlineCount = listeners.filter(l => Date.now() - l.lastSeen < 30000).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-sm bg-[#0D1235]/98 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center relative">
                  <Radio className="w-4 h-4 text-green-400" />
                  {connected && (
                    <motion.div
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {lang === 'zh' ? '实时互动' : 'Live Session'}
                  </h2>
                  <p className="text-[10px] text-white/30">
                    {connected
                      ? (lang === 'zh' ? `${onlineCount} 人在线` : `${onlineCount} online`)
                      : (lang === 'zh' ? '未连接' : 'Disconnected')}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>

            {/* Online Listeners */}
            {listeners.length > 0 && (
              <div className="px-5 py-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3 h-3 text-white/30" />
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">
                    {lang === 'zh' ? '在线听众' : 'Listeners'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listeners.filter(l => Date.now() - l.lastSeen < 30000).slice(0, 12).map(l => (
                    <div
                      key={l.userId}
                      className={clsx(
                        'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] border transition-colors',
                        l.userId === userId
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="truncate max-w-[60px]">{l.userName}</span>
                      {l.isPlaying !== undefined && (
                        <Music className="w-2.5 h-2.5 text-white/20" />
                      )}
                    </div>
                  ))}
                  {listeners.length > 12 && (
                    <span className="text-[10px] text-white/15 self-center">
                      +{listeners.length - 12}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                    <Radio className="w-8 h-8 text-white/10" />
                  </div>
                  <p className="text-sm text-white/25">
                    {lang === 'zh' ? '发送第一条弹幕吧!' : 'Send the first message!'}
                  </p>
                  <p className="text-[10px] text-white/10">
                    {lang === 'zh' ? '与其他听众实时互动' : 'Interact with other listeners in real-time'}
                  </p>
                </div>
              ) : messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${msg.color}20`, color: msg.color }}
                  >
                    {msg.userName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-medium" style={{ color: msg.color }}>
                        {msg.userName}
                      </span>
                      <span className="text-[8px] text-white/15">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 break-words">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {userId ? (
              <div className="px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={lang === 'zh' ? '发送弹幕...' : 'Send message...'}
                    maxLength={100}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-green-500/30 transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || sending}
                    className={clsx(
                      'w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                      inputText.trim()
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-white/5 text-white/15'
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-3 border-t border-white/[0.06] text-center">
                <p className="text-xs text-white/25">
                  {lang === 'zh' ? '登录后可发送弹幕' : 'Sign in to send messages'}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
