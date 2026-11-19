import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Radio, Users, Send, Music } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch, API_BASE } from '@yyc3/music-utils';
import { useI18n } from '@yyc3/music-hooks';

/**
 * §26.x — Live Session Panel (实时互动)
 *
 * 双通道实时策略：
 *   1. 显式传入 wsUrl 时走外部 WebSocket 直播间（与 music-server /ws/live 对齐）：
 *      welcome / joined / room_info / viewer_count
 *      danmaku / emoji / gift / moderation / moderated / pong
 *   2. 未传 wsUrl 时按 API_BASE 自动推导直播间（/live/ws：聊天 + 表情 + 审核 + 房间），
 *      连接失败或环境不支持时自动回退到轮询模式：
 *       - Presence heartbeat (15s intervals)
 *       - Live danmaku feed (5s polling)
 *       - Online listeners count + avatars
 *       - Send live messages
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
  /** WebSocket 地址（含 token），如 wss://host:port/ws/live?token=xxx */
  wsUrl?: string;
  /** 房间 ID，默认当前曲目（外部通道）；自动推导通道默认 main */
  roomId?: string;
}

interface Listener {
  userId: string;
  userName: string;
  trackTitle: string;
  emotion: string;
  lastSeen: number;
  isPlaying?: boolean;
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

/** 按用户名稳定选色（非加密用途的简单字符串哈希） */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export const LiveSessionPanel: React.FC<LiveSessionPanelProps> = ({
  isOpen, onClose, userId, userName, currentTrackId, currentTrackTitle,
  isPlaying, currentEmotion, wsUrl, roomId,
}) => {
  const { lang } = useI18n();
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  // W3 — WebSocket 直播间状态
  const [wsConnected, setWsConnected] = useState(false);
  const [wsOnlineCount, setWsOnlineCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const roomRef = useRef(roomId ?? currentTrackId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userColorRef = useRef(DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)]);

  // 乐观上屏记录：服务器回显/轮询拉取时按「userId+文本」短窗去重，避免消息重复显示
  const recentSentRef = useRef<{ text: string; at: number }[]>([]);
  const noteSent = useCallback((text: string) => {
    const now = Date.now();
    recentSentRef.current = [
      ...recentSentRef.current.filter(s => now - s.at < 15000),
      { text, at: now },
    ];
  }, []);
  const consumeOwnEcho = useCallback((uid: string, text: string) => {
    if (uid !== userId) return false;
    const now = Date.now();
    const idx = recentSentRef.current.findIndex(s => s.text === text && now - s.at < 15000);
    if (idx < 0) return false;
    recentSentRef.current.splice(idx, 1);
    return true;
  }, [userId]);

  // ==========================================
  // W3 补流媒体：外部 WebSocket 直播间（显式传入 wsUrl 时启用）
  // ==========================================
  useEffect(() => {
    if (!isOpen || !userId || !wsUrl) {
      // 无显式 wsUrl 时走下方自动推导通道 + HTTP 轮询兜底
      return;
    }

    let closedByUs = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      return;
    }
    wsRef.current = ws;
    setWsConnected(true);

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: 'join', room: roomRef.current }));
      ws.send(JSON.stringify({ type: 'viewer_count_request' }));
    };

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data as string); } catch { return; }

      switch (msg.type) {
        case 'welcome':
        case 'joined':
          setWsConnected(true);
          break;
        case 'room_info':
          setWsConnected(true);
          setListeners(prev => {
            const existing = prev.find(l => l.userId === msg.user);
            if (!existing && msg.user) {
              return [...prev, {
                userId: msg.user,
                userName: userName || 'Listener',
                trackTitle: currentTrackTitle,
                emotion: currentEmotion,
                lastSeen: Date.now(),
                isPlaying,
              }];
            }
            return prev;
          });
          break;
        case 'viewer_count':
          if (typeof msg.count === 'number') setWsOnlineCount(msg.count);
          break;
        case 'danmaku':
        case 'emoji':
        case 'gift':
        case 'moderation': {
          const id = `${msg.type}-${msg.ts}-${Math.random().toString(36).slice(2, 6)}`;
          let text = '';
          if (msg.type === 'danmaku') text = msg.text ?? '';
          else if (msg.type === 'emoji') text = msg.emoji ?? '';
          else if (msg.type === 'gift') text = `🎁 ${msg.giftId} ×${msg.count}`;
          else if (msg.type === 'moderation') text = `⚡ [管理] ${msg.action} → ${msg.targetUser}`;

          // 自己刚发送的弹幕已被乐观上屏，跳过回显避免重复
          if (msg.type === 'danmaku' && consumeOwnEcho(String(msg.user ?? ''), text)) break;

          setMessages(prev => {
            const exists = prev.some(m => m.id === id);
            if (exists) return prev;
            return [...prev, {
              id,
              userId: msg.user ?? 'system',
              userName: msg.user ? `用户${String(msg.user).slice(-4)}` : '系统',
              text,
              trackId: currentTrackId,
              timestamp: msg.ts ?? Date.now(),
              color: DANMAKU_COLORS[Math.abs(hashString(String(msg.user))) % DANMAKU_COLORS.length],
            }].slice(-100);
          });
          break;
        }
        case 'moderated':
          break;
        case 'pong':
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      if (!closedByUs) setWsConnected(false);
      wsRef.current = null;
    };

    ws.onerror = () => setWsConnected(false);

    return () => {
      closedByUs = true;
      try { ws.close(); } catch { /* 已关闭 */ }
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [isOpen, userId, wsUrl, roomId, currentTrackId, currentTrackTitle, currentEmotion, isPlaying, userName, consumeOwnEcho]);

  // ── W3: 自动推导 WebSocket 直播间（聊天/表情/房间），失败回退轮询 ──
  useEffect(() => {
    if (!isOpen || !userId || wsUrl) return;

    // API_BASE 为 https，转换为 ws/wss
    let autoWsUrl: string;
    try {
      const base = new URL(API_BASE);
      base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
      base.pathname = `${base.pathname.replace(/\/$/, '')}/live/ws`;
      base.search = `roomId=${encodeURIComponent(roomId || 'main')}&userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName || 'User')}`;
      autoWsUrl = base.toString();
    } catch {
      return; // API_BASE 非法时直接走轮询
    }

    let closedByUs = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(autoWsUrl);
    } catch {
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);

    ws.onmessage = (event) => {
      let data: any;
      try {
        data = JSON.parse(event.data as string);
      } catch {
        return;
      }
      switch (data.type) {
        case 'room:joined':
          setWsOnlineCount(data.onlineCount || 0);
          if (Array.isArray(data.recent)) {
            setMessages(prev => {
              const ids = new Set(prev.map(m => m.id));
              const incoming = data.recent
                .filter((m: any) => m.id && !ids.has(m.id))
                .map((m: any) => ({
                  id: m.id, userId: m.userId, userName: m.userName, text: m.text,
                  trackId: '', timestamp: m.timestamp, color: DANMAKU_COLORS[Math.abs(hashString(m.userId || '')) % DANMAKU_COLORS.length],
                }));
              return [...prev, ...incoming].slice(-100);
            });
          }
          break;
        case 'chat': {
          // 自己刚发送的弹幕已被乐观上屏，跳过回显避免重复
          if (consumeOwnEcho(data.userId, data.text)) break;
          const liveMsg: LiveMessage = {
            id: data.id,
            userId: data.userId,
            userName: data.userName,
            text: data.text,
            trackId: '',
            timestamp: data.timestamp,
            color: DANMAKU_COLORS[Math.abs(hashString(data.userId || '')) % DANMAKU_COLORS.length],
          };
          setMessages(prev => [...prev, liveMsg].slice(-100));
          break;
        }
        case 'reaction':
          // 表情反应：气泡动效由上层 music-live 包处理，此处仅计入在线数
          break;
        case 'presence:join':
        case 'presence:leave':
          setWsOnlineCount(data.onlineCount || 0);
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      if (!closedByUs) setWsConnected(false);
      wsRef.current = null;
    };
    ws.onerror = () => setWsConnected(false);

    return () => {
      closedByUs = true;
      try { ws.close(); } catch { /* 已关闭 */ }
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [isOpen, userId, userName, wsUrl, roomId, consumeOwnEcho]);

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
          if (!data?.messages) return;
          // 先按乐观上屏记录过滤自己的回显，再按 id 去重合并
          const incoming = data.messages.filter(m => !consumeOwnEcho(m.userId, m.text));
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = incoming.filter(m => !existingIds.has(m.id));
            const combined = [...prev, ...newMsgs];
            return combined.slice(-100); // Keep last 100
          });
        })
        .catch(() => {});
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [isOpen, consumeOwnEcho]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==========================================
  // 发送弹幕（WebSocket 优先，HTTP 兜底，乐观上屏）
  // ==========================================
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !userId || sending) return;
    setSending(true);

    const text = inputText.trim();
    const id = `danmaku-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 立即本地乐观显示
    const optimistic: LiveMessage = {
      id,
      userId,
      userName: userName || 'User',
      text,
      trackId: currentTrackId,
      timestamp: Date.now(),
      color: userColorRef.current,
    };
    setMessages(prev => [...prev, optimistic].slice(-100));
    setInputText('');
    noteSent(text);

    // WebSocket 已连接时直接走直播间通道，未连接回退 HTTP danmaku 接口
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (wsUrl) {
        // 外部通道协议（music-server /ws/live）
        wsRef.current.send(JSON.stringify({
          type: 'danmaku',
          room: roomRef.current,
          text,
        }));
      } else {
        // 自动推导通道协议（/live/ws）
        wsRef.current.send(JSON.stringify({
          type: 'chat',
          text,
          emotion: currentEmotion,
        }));
      }
      setSending(false);
      return;
    }

    try {
      await apiFetch('/live-session/danmaku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName: userName || 'User',
          text,
          trackId: currentTrackId,
          color: userColorRef.current,
        }),
      });
    } catch (err) {
      console.error('Send danmaku error:', err);
    } finally {
      setSending(false);
    }
  }, [inputText, userId, userName, currentTrackId, currentEmotion, sending, wsUrl, noteSent]);

  // WS 在线数与轮询在线数取较大者
  const onlineCount = Math.max(
    wsOnlineCount,
    listeners.filter(l => Date.now() - l.lastSeen < 30000).length,
  );

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
                  {(connected || wsConnected) && (
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
                    {(connected || wsConnected)
                      ? (lang === 'zh' ? `${onlineCount} 人在线${wsConnected ? ' · 实时' : ''}` : `${onlineCount} online${wsConnected ? ' · realtime' : ''}`)
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
