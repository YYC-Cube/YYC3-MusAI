import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Send, Clock, Lock, Unlock, Heart, MessageCircle,
  Music, Calendar, Sparkles, Radio, Timer, Package,
  RefreshCw, ChevronDown, ChevronUp, Mic, Square, Trash2, Play, Pause,
  MapPin, Navigation, Compass, Type, Shield, ShieldCheck, KeyRound,
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';
import { DEMO_PLAYLIST } from '../playlistData';

interface SpaceTimePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentTrackId?: string;
  currentTrackTitle?: string;
}

interface STMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: string;
  targetTime: string | null;
  targetLocation?: { lat: number; lng: number; label?: string } | null;
  songId: string | null;
  songTitle: string | null;
  emotion: string;
  likes: number;
  likedBy: string[];
  replies: number;
  createdAt: number;
  status: string;
  distance?: number;
  // Voice message fields
  audioDuration?: number;
  audioWaveform?: number[];
  audioFilePath?: string;
  audioSignedUrl?: string;
  audioData?: string;
  transcript?: string;
}

interface STReply {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

interface STCapsule {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  unlockAt: string;
  unlockTs: number;
  songId: string | null;
  songTitle: string | null;
  emotion: string;
  recipientName: string | null;
  isUnlocked: boolean;
  likes: number;
  createdAt: number;
  // E2EE fields (P3 §2 integration)
  encrypted?: boolean;
  encryptedContent?: string;
  encryptedSessionKey?: string;
  encryptionIv?: string;
  senderFingerprint?: string;
  recipientUserId?: string;
  // Client-side decrypted content cache
  _decryptedContent?: string;
  _decryptError?: boolean;
}

const EMOTIONS = [
  { key: 'happy', emoji: '😊', zh: '快乐', en: 'Happy', color: 'text-yellow-400' },
  { key: 'sad', emoji: '😢', zh: '忧伤', en: 'Sad', color: 'text-blue-400' },
  { key: 'energetic', emoji: '⚡', zh: '活力', en: 'Energetic', color: 'text-orange-400' },
  { key: 'calm', emoji: '🌙', zh: '宁静', en: 'Calm', color: 'text-cyan-400' },
  { key: 'love', emoji: '❤️', zh: '爱情', en: 'Love', color: 'text-pink-400' },
  { key: 'neutral', emoji: '🌟', zh: '中性', en: 'Neutral', color: 'text-white/50' },
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
}

function timeUntil(ts: number): { value: number; unit: string } {
  const diff = ts - Date.now();
  if (diff <= 0) return { value: 0, unit: 'now' };
  if (diff < 3600000) return { value: Math.ceil(diff / 60000), unit: 'min' };
  if (diff < 86400000) return { value: Math.ceil(diff / 3600000), unit: 'h' };
  return { value: Math.ceil(diff / 86400000), unit: 'd' };
}

export const SpaceTimePanel: React.FC<SpaceTimePanelProps> = ({
  isOpen, onClose, user, currentTrackId, currentTrackTitle,
}) => {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<'messages' | 'capsules' | 'nearby'>('messages');

  // Messages state
  const [messages, setMessages] = useState<STMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [msgEmotion, setMsgEmotion] = useState('neutral');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [linkSong, setLinkSong] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentFlash, setSentFlash] = useState(false);

  // Replies state
  const [expandedReplies, setExpandedReplies] = useState<string | null>(null);
  const [replies, setReplies] = useState<STReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Capsules state
  const [capsules, setCapsules] = useState<STCapsule[]>([]);
  const [capLoading, setCapLoading] = useState(false);
  const [capTitle, setCapTitle] = useState('');
  const [capContent, setCapContent] = useState('');
  const [capUnlockAt, setCapUnlockAt] = useState('');
  const [capEmotion, setCapEmotion] = useState('neutral');
  const [capRecipient, setCapRecipient] = useState('');
  const [capLinkSong, setCapLinkSong] = useState(false);
  const [capCreating, setCapCreating] = useState(false);
  const [capCreatedFlash, setCapCreatedFlash] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioWaveform, setAudioWaveform] = useState<number[]>([]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Location state
  const [attachLocation, setAttachLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSupported] = useState(() => 'geolocation' in navigator);
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyMessages, setNearbyMessages] = useState<STMessage[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  // STT (Speech-to-Text) state — §4.3 Whisper fallback + §4.3+ Streaming
  const [sttActive, setSttActive] = useState(false);
  const [sttSupported] = useState(() => {
    const hasNative = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    return hasNative || hasMediaRecorder;
  });
  const sttRef = useRef<any>(null);
  const sttStreamChunksRef = useRef<Array<{ audioBase64: string; index: number }>>([]);
  const sttStreamIndexRef = useRef(0);
  const sttStreamTimerRef = useRef<any>(null);
  const sttSessionIdRef = useRef<string>('');
  const sttStreamingRef = useRef(false);

  // E2EE capsule state (P3 §2 integration — no new hooks, uses existing state slots)
  const [capEncrypt, setCapEncrypt] = useState(false);
  const [capRecipientId, setCapRecipientId] = useState('');
  const [e2eeReady, setE2eeReady] = useState(false);
  const [e2eeChecked, setE2eeChecked] = useState(false);
  const e2eeCryptoRef = useRef<any>(null);
  const e2eePkiRef = useRef<any>(null);
  const autoDecryptedRef = useRef<Set<string>>(new Set());
  const [e2eePromptVisible, setE2eePromptVisible] = useState(false);

  /** Convert a Blob to base64 (ref-based helper — no hook) */
  const blobToBase64Fn = useRef((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  });

  /** §4.3+ Stream: flush accumulated chunks (ref-based — no useCallback) */
  const flushStreamChunksFn = useRef(async (currentLang: string) => {
    const chunks = sttStreamChunksRef.current;
    if (chunks.length === 0) return;
    const batch = chunks.splice(0, 5);
    sttStreamChunksRef.current = chunks;
    try {
      const { sttApi } = await import('../lib/api');
      const result = await sttApi.stream(
        batch, currentLang === 'zh' ? 'zh' : 'en', 'audio/webm', sttSessionIdRef.current,
      );
      if (result?.fullText) {
        const trimmed = result.fullText.trim();
        if (trimmed) {
          setNewMsg((prev: string) => prev ? `${prev} ${trimmed}` : trimmed);
        }
        sttStreamingRef.current = true;
      }
      if (result && !result.available) {
        console.log('[STT Stream] Backend unavailable:', result.fallback);
      }
    } catch (err) {
      console.error('[STT Stream] Flush error:', err);
    }
  });

  const startSTT = useCallback(() => {
    if (!sttSupported || sttActive) return;

    // Try native SpeechRecognition first (real-time, zero latency)
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
        setNewMsg(transcript);
      };
      recognition.onerror = () => setSttActive(false);
      recognition.onend = () => setSttActive(false);
      recognition.start();
      sttRef.current = { type: 'native', recognition };
      setSttActive(true);
      return;
    }

    // §4.3+ Streaming Whisper: Record with timeslice → send chunks to /stt/stream
    if (typeof MediaRecorder !== 'undefined') {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType });

        // Reset streaming state
        sttStreamChunksRef.current = [];
        sttStreamIndexRef.current = 0;
        sttSessionIdRef.current = `stt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        sttStreamingRef.current = false;

        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0) {
            try {
              const base64 = await blobToBase64Fn.current(e.data);
              if (base64) {
                sttStreamChunksRef.current.push({
                  audioBase64: base64,
                  index: sttStreamIndexRef.current++,
                });
              }
            } catch (err) {
              console.error('[STT Stream] Chunk encode error:', err);
            }
          }
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          if (sttStreamTimerRef.current) {
            clearInterval(sttStreamTimerRef.current);
            sttStreamTimerRef.current = null;
          }
          // Final flush
          await flushStreamChunksFn.current(lang);
          sttStreamingRef.current = false;
        };

        // Start recording with 3-second timeslice for streaming chunks
        recorder.start(3000);

        // Periodically flush accumulated chunks every 4 seconds
        const currentLang = lang;
        sttStreamTimerRef.current = setInterval(() => {
          flushStreamChunksFn.current(currentLang);
        }, 4000);

        sttRef.current = { type: 'whisper-stream', recorder, stream };
        setSttActive(true);
      }).catch((err) => {
        console.error('[STT] Microphone access denied:', err);
        setSttActive(false);
      });
    }
  }, [sttSupported, sttActive, lang]);

  const stopSTT = useCallback(() => {
    if (sttRef.current) {
      if (sttRef.current.type === 'native') {
        sttRef.current.recognition.stop();
      } else if (sttRef.current.type === 'whisper-stream') {
        sttRef.current.recorder.stop();
      }
      sttRef.current = null;
    }
    if (sttStreamTimerRef.current) {
      clearInterval(sttStreamTimerRef.current);
      sttStreamTimerRef.current = null;
    }
    setSttActive(false);
  }, []);

  const requestLocation = useCallback(async () => {
    if (!geoSupported) return;
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false })
      );
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}` };
      setUserLocation(loc);
      setAttachLocation(true);
    } catch (err) {
      console.error('Geolocation error:', err);
      setAttachLocation(false);
    }
    finally { setGeoLoading(false); }
  }, [geoSupported]);

  const fetchNearby = useCallback(async () => {
    if (!userLocation) {
      // Try to get location first
      if (!geoSupported) return;
      setGeoLoading(true);
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false })
        );
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}` };
        setUserLocation(loc);
        setNearbyLoading(true);
        const data = await apiFetch<{ messages: STMessage[] }>(`/spacetime/messages/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=50`);
        if (data?.messages) setNearbyMessages(data.messages);
      } catch { /* ignore */ }
      finally { setGeoLoading(false); setNearbyLoading(false); }
      return;
    }
    setNearbyLoading(true);
    try {
      const data = await apiFetch<{ messages: STMessage[] }>(`/spacetime/messages/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=50`);
      if (data?.messages) setNearbyMessages(data.messages);
    } catch (err) { console.error('Nearby fetch error:', err); }
    finally { setNearbyLoading(false); }
  }, [userLocation, geoSupported]);

  // Check voice support
  useEffect(() => {
    setVoiceSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);

  // E2EE: Check if user has local keys (ref-based, runs once)
  useEffect(() => {
    if (!user?.id || e2eeChecked) return;
    setE2eeChecked(true);
    (async () => {
      try {
        const crypto = await import('../lib/crypto');
        e2eeCryptoRef.current = crypto;
        const { pkiApi } = await import('../lib/api');
        e2eePkiRef.current = pkiApi;
        const hasKeys = await crypto.hasLocalKeyPair(user.id);
        setE2eeReady(hasKeys && crypto.isE2EESupported());
      } catch { setE2eeReady(false); }
    })();
  }, [user?.id, e2eeChecked]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        generateWaveform(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      setVoiceSupported(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioWaveform([]);
    setRecordingDuration(0);
    setIsPlayingPreview(false);
    if (audioPreviewRef.current) { audioPreviewRef.current.pause(); audioPreviewRef.current = null; }
  };

  const togglePreview = () => {
    if (!audioUrl) return;
    if (isPlayingPreview && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      const a = new Audio(audioUrl);
      a.onended = () => setIsPlayingPreview(false);
      a.play();
      audioPreviewRef.current = a;
      setIsPlayingPreview(true);
    }
  };

  const generateWaveform = async (blob: Blob) => {
    try {
      const audioCtx = new AudioContext();
      const buf = await blob.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(buf);
      const raw = decoded.getChannelData(0);
      const samples = 40;
      const block = Math.floor(raw.length / samples);
      const wf: number[] = [];
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < block; j++) sum += Math.abs(raw[i * block + j]);
        wf.push(sum / block);
      }
      const max = Math.max(...wf, 0.001);
      setAudioWaveform(wf.map(v => v / max));
      audioCtx.close();
    } catch { setAudioWaveform(Array(40).fill(0.3)); }
  };

  const handleSendVoice = async () => {
    if (!audioBlob || !user) return;
    setSending(true);
    try {
      // Upload voice to Supabase Storage instead of base64 in KV
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });
      const audioDataUri = await base64Promise;

      let voiceFilePath: string | null = null;
      let voiceSignedUrl: string | null = null;
      try {
        const uploadResult = await apiFetch<{ success: boolean; filePath: string; signedUrl: string }>('/voice/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, audioBase64: audioDataUri, mimeType: audioBlob.type || 'audio/webm' }),
        });
        if (uploadResult?.success) {
          voiceFilePath = uploadResult.filePath;
          voiceSignedUrl = uploadResult.signedUrl;
        }
      } catch (err) { console.warn('Voice storage upload failed, falling back:', err); }

      const payload: any = {
        userId: user.id,
        userName: user.email?.split('@')[0] || 'User',
        content: `[${lang === 'zh' ? '语音消息' : 'Voice Message'}] ${recordingDuration}s`,
        type: 'voice',
        emotion: msgEmotion,
        audioDuration: recordingDuration,
        audioFilePath: voiceFilePath,
        audioSignedUrl: voiceSignedUrl,
        audioData: voiceFilePath ? undefined : audioDataUri.slice(0, 500000),
        audioWaveform: audioWaveform,
      };
      if (linkSong && currentTrackId) {
        payload.songId = currentTrackId;
        payload.songTitle = currentTrackTitle || '';
      }
      if (attachLocation && userLocation) {
        payload.targetLocation = userLocation;
      }
      const result = await apiFetch<{ success: boolean; message: STMessage }>('/spacetime/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result?.success && result.message) {
        setMessages(prev => [result.message, ...prev]);
        discardRecording();
        setSentFlash(true);
        setTimeout(() => setSentFlash(false), 2000);
        // Track achievements: voice + optional location
        apiFetch(`/achievements/${user.id}/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send_voice' }),
        }).catch(() => {});
        apiFetch(`/achievements/${user.id}/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send_message' }),
        }).catch(() => {});
        if (attachLocation && userLocation) {
          apiFetch(`/achievements/${user.id}/track`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send_location' }),
          }).catch(() => {});
        }
      }
    } catch (err) { console.error('Send voice error:', err); }
    finally { setSending(false); }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ======== Fetch Messages ========
  const fetchMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const data = await apiFetch<{ messages: STMessage[] }>('/spacetime/messages');
      if (data?.messages) setMessages(data.messages);
    } catch (err) { console.error('SpaceTime messages fetch error:', err); }
    finally { setMsgLoading(false); }
  }, []);

  // ======== Fetch Capsules ========
  const fetchCapsules = useCallback(async () => {
    setCapLoading(true);
    try {
      const data = await apiFetch<{ capsules: STCapsule[] }>('/spacetime/capsules');
      if (data?.capsules) setCapsules(data.capsules);
    } catch (err) { console.error('SpaceTime capsules fetch error:', err); }
    finally { setCapLoading(false); }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (tab === 'messages') fetchMessages();
      else fetchCapsules();
    }
  }, [isOpen, tab, fetchMessages, fetchCapsules]);

  // ======== Send Message ========
  const handleSendMessage = async () => {
    if (!newMsg.trim() || !user) return;
    setSending(true);
    try {
      const payload: any = {
        userId: user.id,
        userName: user.email?.split('@')[0] || 'User',
        content: newMsg.trim(),
        emotion: msgEmotion,
      };
      if (showSchedule && scheduleTime) {
        payload.targetTime = new Date(scheduleTime).toISOString();
      }
      if (linkSong && currentTrackId) {
        payload.songId = currentTrackId;
        payload.songTitle = currentTrackTitle || '';
      }
      if (attachLocation && userLocation) {
        payload.targetLocation = userLocation;
      }
      const result = await apiFetch<{ success: boolean; message: STMessage }>('/spacetime/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result?.success && result.message) {
        // Only add to list if not scheduled
        if (!payload.targetTime) {
          setMessages(prev => [result.message, ...prev]);
        }
        setNewMsg('');
        setMsgEmotion('neutral');
        setShowSchedule(false);
        setScheduleTime('');
        setLinkSong(false);
        setSentFlash(true);
        setTimeout(() => setSentFlash(false), 2000);
        // Track achievement: message sent
        apiFetch(`/achievements/${user.id}/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send_message' }),
        }).catch(() => {});
        if (attachLocation && userLocation) {
          apiFetch(`/achievements/${user.id}/track`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send_location' }),
          }).catch(() => {});
        }
      }
    } catch (err) { console.error('Send message error:', err); }
    finally { setSending(false); }
  };

  // ======== Like Message ========
  const handleLikeMessage = async (msgId: string) => {
    if (!user) return;
    try {
      await apiFetch(`/spacetime/messages/${msgId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const liked = m.likedBy?.includes(user.id);
        return {
          ...m,
          likes: liked ? m.likes - 1 : m.likes + 1,
          likedBy: liked ? m.likedBy.filter(id => id !== user.id) : [...(m.likedBy || []), user.id],
        };
      }));
    } catch (err) { console.error('Like message error:', err); }
  };

  // ======== Replies ========
  const handleToggleReplies = async (msgId: string) => {
    if (expandedReplies === msgId) {
      setExpandedReplies(null);
      return;
    }
    setExpandedReplies(msgId);
    setReplyLoading(true);
    try {
      const data = await apiFetch<{ replies: STReply[] }>(`/spacetime/messages/${msgId}/replies`);
      if (data?.replies) setReplies(data.replies);
      else setReplies([]);
    } catch { setReplies([]); }
    finally { setReplyLoading(false); }
  };

  const handleSendReply = async (msgId: string) => {
    if (!replyText.trim() || !user) return;
    try {
      const result = await apiFetch<{ success: boolean; reply: STReply }>(`/spacetime/messages/${msgId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.email?.split('@')[0] || 'User',
          content: replyText.trim(),
        }),
      });
      if (result?.success && result.reply) {
        setReplies(prev => [result.reply, ...prev]);
        setReplyText('');
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, replies: (m.replies || 0) + 1 } : m));
      }
    } catch (err) { console.error('Reply error:', err); }
  };

  // ======== Create Capsule (with optional E2EE) ========
  const handleCreateCapsule = async () => {
    if (!capTitle.trim() || !capContent.trim() || !capUnlockAt || !user) return;
    setCapCreating(true);
    try {
      const plainContent = capContent.trim();
      const payload: any = {
        userId: user.id,
        userName: user.email?.split('@')[0] || 'User',
        title: capTitle.trim(),
        content: plainContent,
        unlockAt: new Date(capUnlockAt).toISOString(),
        emotion: capEmotion,
      };
      if (capRecipient.trim()) payload.recipientName = capRecipient.trim();
      if (capLinkSong && currentTrackId) {
        payload.songId = currentTrackId;
        payload.songTitle = currentTrackTitle || '';
      }

      // E2EE: Encrypt capsule content if toggle is on and recipient ID is set
      if (capEncrypt && capRecipientId.trim() && e2eeCryptoRef.current && e2eePkiRef.current) {
        try {
          // Fetch recipient's public key from PKI
          const recipientPkiRes = await e2eePkiRef.current.getPublicKey(capRecipientId.trim());
          if (recipientPkiRes?.publicKeyJwk) {
            const recipientPubKey = await e2eeCryptoRef.current.importPublicKey(recipientPkiRes.publicKeyJwk);
            const encrypted = await e2eeCryptoRef.current.encryptMessage(plainContent, recipientPubKey, user.id);
            payload.encrypted = true;
            payload.encryptedContent = encrypted.ciphertext;
            payload.encryptedSessionKey = encrypted.encryptedSessionKey;
            payload.encryptionIv = encrypted.iv;
            payload.senderFingerprint = encrypted.senderId;
            payload.recipientUserId = capRecipientId.trim();
            console.log('[E2EE] Capsule encrypted for recipient:', capRecipientId.trim());
          } else {
            console.warn('[E2EE] Recipient has no public key, sending unencrypted');
          }
        } catch (e2eeErr) {
          console.error('[E2EE] Encryption failed, sending unencrypted:', e2eeErr);
        }
      }

      const result = await apiFetch<{ success: boolean; capsule: STCapsule }>('/spacetime/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result?.success && result.capsule) {
        setCapsules(prev => [result.capsule, ...prev]);
        setCapTitle('');
        setCapContent('');
        setCapUnlockAt('');
        setCapEmotion('neutral');
        setCapRecipient('');
        setCapLinkSong(false);
        setCapEncrypt(false);
        setCapRecipientId('');
        setCapCreatedFlash(true);
        setTimeout(() => setCapCreatedFlash(false), 2000);
        // Track achievement: capsule created
        apiFetch(`/achievements/${user.id}/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_capsule' }),
        }).catch(() => {});
      }
    } catch (err) { console.error('Create capsule error:', err); }
    finally { setCapCreating(false); }
  };

  // ======== Decrypt Capsule (client-side, ref-based) ========
  const handleDecryptCapsule = useRef(async (cap: STCapsule) => {
    if (!cap.encrypted || !cap.encryptedContent || !cap.encryptedSessionKey || !cap.encryptionIv) return;
    if (!user?.id || !e2eeCryptoRef.current) return;
    try {
      const privateKey = await e2eeCryptoRef.current.loadPrivateKey(user.id);
      if (!privateKey) {
        setCapsules(prev => prev.map(c => c.id === cap.id ? { ...c, _decryptError: true } : c));
        return;
      }
      const decrypted = await e2eeCryptoRef.current.decryptMessage({
        ciphertext: cap.encryptedContent,
        encryptedSessionKey: cap.encryptedSessionKey,
        iv: cap.encryptionIv,
        senderId: cap.senderFingerprint || '',
        algorithm: 'RSA-OAEP+AES-GCM-256' as const,
        encryptedAt: cap.createdAt,
      }, privateKey);
      setCapsules(prev => prev.map(c => c.id === cap.id ? { ...c, _decryptedContent: decrypted } : c));
    } catch (err) {
      console.error('[E2EE] Decryption failed:', err);
      setCapsules(prev => prev.map(c => c.id === cap.id ? { ...c, _decryptError: true } : c));
    }
  });

  // ======== Auto-decrypt capsules for current user (ref-based, no new hooks) ========
  const autoDecryptCapsulesFn = useRef(async (capList: STCapsule[], userId: string) => {
    if (!e2eeCryptoRef.current || !userId) return;
    for (const cap of capList) {
      if (!cap.encrypted || !cap.isUnlocked) continue;
      if (cap._decryptedContent || cap._decryptError) continue;
      if (cap.recipientUserId !== userId && cap.userId !== userId) continue;
      if (autoDecryptedRef.current.has(cap.id)) continue;
      autoDecryptedRef.current.add(cap.id);
      handleDecryptCapsule.current(cap);
    }
  });

  // Trigger auto-decrypt when capsules load (ref-based effect inside existing useEffect)
  useEffect(() => {
    if (isOpen && tab === 'capsules' && capsules.length > 0 && e2eeReady && user?.id) {
      autoDecryptCapsulesFn.current(capsules, user.id);
    }
  }, [isOpen, tab, capsules, e2eeReady, user?.id]);

  // ======== Like Capsule ========
  const handleLikeCapsule = async (capId: string) => {
    try {
      await apiFetch(`/spacetime/capsules/${capId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setCapsules(prev => prev.map(c => c.id === capId ? { ...c, likes: c.likes + 1 } : c));
    } catch (err) { console.error('Like capsule error:', err); }
  };

  const emotionOf = (key: string) => EMOTIONS.find(e => e.key === key) || EMOTIONS[5];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-lg bg-[#0D1235]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                  <Radio className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{t('spacetime.title')}</h3>
                  <p className="text-white/30 text-xs">{t('spacetime.subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex p-2 mx-4 mt-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setTab('messages')}
                className={clsx(
                  'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                  tab === 'messages' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' : 'text-white/40 hover:text-white/60'
                )}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {t('spacetime.messages')}
              </button>
              <button
                onClick={() => setTab('capsules')}
                className={clsx(
                  'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                  tab === 'capsules' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20' : 'text-white/40 hover:text-white/60'
                )}
              >
                <Package className="w-3.5 h-3.5" />
                {t('spacetime.capsules')}
              </button>
              {geoSupported && (
                <button
                  onClick={() => { setTab('nearby'); if (nearbyMessages.length === 0) fetchNearby(); }}
                  className={clsx(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                    tab === 'nearby' ? 'bg-green-500/20 text-green-300 border border-green-500/20' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  <Compass className="w-3.5 h-3.5" />
                  {t('spacetime.nearby')}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {tab === 'messages' ? (
                <div className="p-4">
                  {/* Compose Message */}
                  {user ? (
                    <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <textarea
                        value={newMsg}
                        onChange={e => setNewMsg(e.target.value)}
                        placeholder={t('spacetime.writeMessage')}
                        maxLength={500}
                        rows={2}
                        className="w-full bg-transparent text-white text-sm placeholder:text-white/20 resize-none outline-none"
                      />
                      {/* Emotion selector */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {EMOTIONS.map(emo => (
                          <button
                            key={emo.key}
                            onClick={() => setMsgEmotion(emo.key)}
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-[10px] border transition-all',
                              msgEmotion === emo.key
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'border-transparent text-white/30 hover:text-white/50'
                            )}
                          >
                            {emo.emoji} {lang === 'zh' ? emo.zh : emo.en}
                          </button>
                        ))}
                      </div>
                      {/* Options row */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setShowSchedule(!showSchedule)}
                          className={clsx(
                            'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all',
                            showSchedule ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'border-white/[0.06] text-white/25 hover:text-white/40'
                          )}
                        >
                          <Timer className="w-3 h-3" />
                          {t('spacetime.scheduleTime')}
                        </button>
                        <button
                          onClick={() => setLinkSong(!linkSong)}
                          className={clsx(
                            'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all',
                            linkSong ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'border-white/[0.06] text-white/25 hover:text-white/40'
                          )}
                        >
                          <Music className="w-3 h-3" />
                          {t('spacetime.linkSong')}
                        </button>
                        {geoSupported && (
                          <button
                            onClick={() => {
                              if (!attachLocation) requestLocation();
                              else { setAttachLocation(false); setUserLocation(null); }
                            }}
                            disabled={geoLoading}
                            className={clsx(
                              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all',
                              attachLocation ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'border-white/[0.06] text-white/25 hover:text-white/40'
                            )}
                          >
                            {geoLoading ? <Navigation className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                            {t('spacetime.attachLocation')}
                          </button>
                        )}
                        {sttSupported && (
                          <button
                            onClick={() => sttActive ? stopSTT() : startSTT()}
                            className={clsx(
                              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all',
                              sttActive
                                ? sttStreamingRef.current
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 animate-pulse'
                                  : 'bg-orange-500/10 border-orange-500/20 text-orange-300 animate-pulse'
                                : 'border-white/[0.06] text-white/25 hover:text-white/40'
                            )}
                          >
                            <Type className="w-3 h-3" />
                            {sttActive
                              ? sttStreamingRef.current
                                ? (lang === 'zh' ? '流式转录中...' : 'Streaming...')
                                : t('spacetime.sttListening')
                              : t('spacetime.sttButton')}
                          </button>
                        )}
                        <span className="text-[10px] text-white/15 ml-auto">{newMsg.length}/500</span>
                      </div>
                      {showSchedule && (
                        <input
                          type="datetime-local"
                          value={scheduleTime}
                          onChange={e => setScheduleTime(e.target.value)}
                          className="mt-2 w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none"
                        />
                      )}
                      {linkSong && currentTrackTitle && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-cyan-300/60">
                          <Music className="w-3 h-3" />
                          {currentTrackTitle}
                        </div>
                      )}
                      {attachLocation && userLocation && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-green-300/60">
                          <MapPin className="w-3 h-3" />
                          {userLocation.label || `${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}`}
                        </div>
                      )}
                      {/* Voice Recording UI */}
                      {voiceSupported && (
                        <div className="mt-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          {!audioBlob && !isRecording && (
                            <button
                              onClick={startRecording}
                              className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-red-400 transition-colors"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              {t('spacetime.voiceRecord')}
                            </button>
                          )}
                          {isRecording && (
                            <div className="flex items-center gap-3">
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="w-3 h-3 rounded-full bg-red-500"
                              />
                              <span className="text-xs text-red-300 font-mono tabular-nums">{recordingDuration}s</span>
                              <span className="text-[10px] text-white/30">{t('spacetime.voiceRecording')}</span>
                              <button
                                onClick={stopRecording}
                                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-300 text-[10px] border border-red-500/20 hover:bg-red-500/30 transition-all"
                              >
                                <Square className="w-3 h-3" />
                                {t('spacetime.voiceStop')}
                              </button>
                            </div>
                          )}
                          {audioBlob && !isRecording && (
                            <div className="space-y-2">
                              {/* Waveform visualization */}
                              <div className="flex items-end gap-[2px] h-6 px-1">
                                {audioWaveform.map((v, i) => (
                                  <div
                                    key={i}
                                    className="flex-1 rounded-full bg-gradient-to-t from-purple-500/50 to-cyan-400/50"
                                    style={{ height: `${Math.max(v * 100, 8)}%` }}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={togglePreview} className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition-colors">
                                  {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                </button>
                                <span className="text-[10px] text-white/30 font-mono tabular-nums">{recordingDuration}s</span>
                                <div className="flex items-center gap-1 ml-auto">
                                  <button
                                    onClick={discardRecording}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/25 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 transition-all"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    {t('spacetime.voiceDiscard')}
                                  </button>
                                  <button
                                    onClick={handleSendVoice}
                                    disabled={sending}
                                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 disabled:opacity-30 transition-all"
                                  >
                                    <Send className="w-2.5 h-2.5" />
                                    {t('spacetime.voiceSend')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Send text button */}
                      {!audioBlob && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={handleSendMessage}
                            disabled={!newMsg.trim() || sending}
                            className={clsx(
                              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                              sentFlash
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 disabled:opacity-30'
                            )}
                          >
                            {sentFlash ? <Sparkles className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                            {sentFlash ? t('spacetime.sent') : sending ? t('spacetime.sending') : t('spacetime.send')}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                      <p className="text-xs text-white/30">{t('spacetime.signInRequired')}</p>
                    </div>
                  )}

                  {/* Message List */}
                  {msgLoading && messages.length === 0 ? (
                    <div className="flex justify-center py-12">
                      <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <Radio className="w-10 h-10 text-white/10 mx-auto mb-3" />
                      <p className="text-white/30 text-sm">{t('spacetime.noMessages')}</p>
                      <p className="text-white/15 text-xs mt-1">{t('spacetime.beFirstMessage')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map(msg => {
                        const emo = emotionOf(msg.emotion);
                        const isLiked = user && msg.likedBy?.includes(user.id);
                        const showingReplies = expandedReplies === msg.id;
                        return (
                          <motion.div
                            key={msg.id}
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
                                          } catch {}
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
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* ======== CAPSULES TAB ======== */
                <div className="p-4">
                  {/* Create Capsule Form */}
                  {user ? (
                    <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <input
                        value={capTitle}
                        onChange={e => setCapTitle(e.target.value)}
                        placeholder={t('spacetime.capsuleTitle')}
                        maxLength={100}
                        className="w-full bg-transparent text-white text-sm placeholder:text-white/20 outline-none mb-2"
                      />
                      <textarea
                        value={capContent}
                        onChange={e => setCapContent(e.target.value)}
                        placeholder={t('spacetime.capsuleContent')}
                        maxLength={1000}
                        rows={3}
                        className="w-full bg-transparent text-white/80 text-xs placeholder:text-white/15 resize-none outline-none border-t border-white/[0.04] pt-2"
                      />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="text-[10px] text-white/25 mb-1 block">{t('spacetime.capsuleUnlockAt')}</label>
                          <input
                            type="datetime-local"
                            value={capUnlockAt}
                            onChange={e => setCapUnlockAt(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-white/70 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/25 mb-1 block">{t('spacetime.capsuleRecipient')}</label>
                          <input
                            value={capRecipient}
                            onChange={e => setCapRecipient(e.target.value)}
                            placeholder={t('spacetime.capsuleRecipient')}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-white/70 outline-none placeholder:text-white/15"
                          />
                        </div>
                      </div>
                      {/* Emotion + Link Song */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {EMOTIONS.slice(0, 5).map(emo => (
                          <button
                            key={emo.key}
                            onClick={() => setCapEmotion(emo.key)}
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-[10px] border transition-all',
                              capEmotion === emo.key
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'border-transparent text-white/30 hover:text-white/50'
                            )}
                          >
                            {emo.emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setCapLinkSong(!capLinkSong)}
                          className={clsx(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ml-auto',
                            capLinkSong ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'border-white/[0.06] text-white/25 hover:text-white/40'
                          )}
                        >
                          <Music className="w-2.5 h-2.5" />
                          {t('spacetime.linkSong')}
                        </button>
                      </div>
                      {capLinkSong && currentTrackTitle && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-cyan-300/60">
                          <Music className="w-2.5 h-2.5" />
                          {currentTrackTitle}
                        </div>
                      )}
                      {/* E2EE Encryption Toggle */}
                      {e2eeReady ? (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                          <button
                            onClick={() => setCapEncrypt(!capEncrypt)}
                            className={clsx(
                              'flex items-center gap-1.5 text-[10px] transition-all w-full',
                              capEncrypt ? 'text-emerald-300' : 'text-white/30 hover:text-emerald-300/60'
                            )}
                          >
                            {capEncrypt ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                            {lang === 'zh' ? (capEncrypt ? '端到端加密已开启' : '开启端到端加密') : (capEncrypt ? 'E2EE Enabled' : 'Enable E2E Encryption')}
                          </button>
                          {capEncrypt && (
                            <div className="mt-1.5">
                              <input
                                value={capRecipientId}
                                onChange={e => setCapRecipientId(e.target.value)}
                                placeholder={lang === 'zh' ? '接收者用户ID (必填)' : 'Recipient User ID (required)'}
                                className="w-full bg-white/[0.04] border border-emerald-500/15 rounded-lg px-2 py-1 text-[10px] text-white/70 outline-none placeholder:text-white/15"
                              />
                              <p className="text-[9px] text-emerald-300/30 mt-1">
                                {lang === 'zh'
                                  ? '内容将使用RSA-OAEP + AES-GCM-256加密，仅接收者可解密'
                                  : 'Content encrypted with RSA-OAEP + AES-GCM-256, only recipient can decrypt'}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : e2eeChecked && user ? (
                        <div className="mt-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <button
                            onClick={() => setE2eePromptVisible(true)}
                            className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-emerald-300/50 transition-all w-full"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {lang === 'zh' ? '设置E2EE密钥以启用加密胶囊' : 'Set up E2EE keys to enable encrypted capsules'}
                          </button>
                          <AnimatePresence>
                            {e2eePromptVisible && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <p className="text-[9px] text-white/20 mt-1.5 leading-relaxed">
                                  {lang === 'zh'
                                    ? '你尚未设置端到端加密密钥。请通过侧边栏菜单打开「E2EE密钥设置」面板完成配置，然后即可发送加密胶囊消息。'
                                    : 'You have not set up E2EE keys yet. Open the "E2EE Key Setup" panel from the sidebar menu to complete configuration, then you can send encrypted capsule messages.'}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : null}
                      {/* Create button */}
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={handleCreateCapsule}
                          disabled={!capTitle.trim() || !capContent.trim() || !capUnlockAt || capCreating}
                          className={clsx(
                            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                            capCreatedFlash
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-30'
                          )}
                        >
                          {capCreatedFlash ? <Sparkles className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                          {capCreatedFlash ? t('spacetime.capsuleCreated') : capCreating ? t('spacetime.creating') : t('spacetime.createCapsule')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                      <p className="text-xs text-white/30">{t('spacetime.signInRequired')}</p>
                    </div>
                  )}

                  {/* Capsule List */}
                  {capLoading && capsules.length === 0 ? (
                    <div className="flex justify-center py-12">
                      <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                  ) : capsules.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-10 h-10 text-white/10 mx-auto mb-3" />
                      <p className="text-white/30 text-sm">{t('spacetime.noCapsules')}</p>
                      <p className="text-white/15 text-xs mt-1">{t('spacetime.beFirstCapsule')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {capsules.map(cap => {
                        const emo = emotionOf(cap.emotion);
                        const countdown = timeUntil(cap.unlockTs);
                        return (
                          <motion.div
                            key={cap.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={clsx(
                              'p-3 rounded-xl border transition-colors',
                              cap.isUnlocked
                                ? 'bg-white/[0.03] border-cyan-500/15 hover:bg-white/[0.05]'
                                : 'bg-white/[0.01] border-white/[0.04]'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {cap.isUnlocked ? (
                                  <Unlock className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5 text-white/20" />
                                )}
                                <span className="text-sm font-medium text-white/80">{cap.title}</span>
                                {cap.encrypted && <Shield className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />}
                                <span className={clsx('text-xs', emo.color)}>{emo.emoji}</span>
                              </div>
                              {/* Status badge */}
                              {cap.isUnlocked ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                                  {t('spacetime.unlocked')}
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/30 border border-white/[0.06]">
                                  {countdown.value > 0
                                    ? `${t('spacetime.unlocksIn')} ${countdown.value}${countdown.unit}`
                                    : t('spacetime.justUnlocked')}
                                </span>
                              )}
                            </div>
                            {cap.isUnlocked ? (
                              <>
                                {/* E2EE Encrypted capsule */}
                                {cap.encrypted ? (
                                  cap._decryptedContent ? (
                                    <div className="mb-2">
                                      <div className="flex items-center gap-1 mb-1">
                                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                        <span className="text-[9px] text-emerald-300/50">{lang === 'zh' ? '端到端加密 · 已解密' : 'E2EE · Decrypted'}</span>
                                        {cap.senderFingerprint && (
                                          <span className="text-[8px] text-emerald-300/25 ml-1 font-mono" title={lang === 'zh' ? `发送者指纹: ${cap.senderFingerprint}` : `Sender fingerprint: ${cap.senderFingerprint}`}>
                                            🔑 {cap.senderFingerprint.slice(0, 8)}…
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-white/60 leading-relaxed">{cap._decryptedContent}</p>
                                    </div>
                                  ) : cap._decryptError ? (
                                    <div className="mb-2 p-2 rounded-lg bg-red-500/[0.05] border border-red-500/10">
                                      <div className="flex items-center gap-1">
                                        <KeyRound className="w-3 h-3 text-red-400/50" />
                                        <span className="text-[10px] text-red-300/50">{lang === 'zh' ? '解密失败 — 你可能不是指定接收者' : 'Decryption failed — you may not be the recipient'}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[10px] text-emerald-300/50">
                                          <Shield className="w-3 h-3" />
                                          {lang === 'zh' ? '端到端加密内容' : 'E2EE Encrypted Content'}
                                        </div>
                                        {user && (cap.recipientUserId === user.id || cap.userId === user.id) && (
                                          <button
                                            onClick={() => handleDecryptCapsule.current(cap)}
                                            className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all"
                                          >
                                            {lang === 'zh' ? '解密' : 'Decrypt'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <p className="text-xs text-white/60 leading-relaxed mb-2">{cap.content}</p>
                                )}
                                {cap.recipientName && (
                                  <p className="text-[10px] text-purple-300/50 mb-1">
                                    {t('spacetime.to')} {cap.recipientName}
                                  </p>
                                )}
                                {cap.songTitle && (
                                  <div className="flex items-center gap-1 text-[10px] text-cyan-400/50 mb-1.5">
                                    <Music className="w-2.5 h-2.5" />
                                    {cap.songTitle}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center justify-center py-4">
                                <div className="text-center">
                                  <Lock className="w-6 h-6 text-white/10 mx-auto mb-1" />
                                  <p className="text-[10px] text-white/15">{t('spacetime.locked')}</p>
                                </div>
                              </div>
                            )}
                            {/* Footer */}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-white/15">{cap.userName} · {timeAgo(cap.createdAt)}</span>
                              {cap.isUnlocked && (
                                <button
                                  onClick={() => handleLikeCapsule(cap.id)}
                                  className="flex items-center gap-1 text-[11px] text-white/20 hover:text-pink-400/60 transition-colors"
                                >
                                  <Heart className="w-3 h-3" />
                                  {cap.likes > 0 && cap.likes}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nearby Tab Content */}
            {tab === 'nearby' && (
              <div className="p-4">
                {/* Location info bar */}
                <div className="mb-4 p-3 rounded-xl bg-green-500/[0.04] border border-green-500/10">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-green-300/80">{t('spacetime.nearbyTitle')}</p>
                      {userLocation ? (
                        <p className="text-[10px] text-green-300/40 mt-0.5 truncate">
                          {userLocation.label} · {lang === 'zh' ? '50km范围' : '50km radius'}
                        </p>
                      ) : (
                        <p className="text-[10px] text-white/25 mt-0.5">{t('spacetime.nearbyHint')}</p>
                      )}
                    </div>
                    <button
                      onClick={fetchNearby}
                      disabled={nearbyLoading || geoLoading}
                      className="px-2.5 py-1 rounded-lg text-[10px] bg-green-500/15 text-green-300 border border-green-500/15 hover:bg-green-500/25 disabled:opacity-30 transition-all"
                    >
                      {nearbyLoading || geoLoading ? <Navigation className="w-3 h-3 animate-spin" /> : t('spacetime.nearbyRefresh')}
                    </button>
                  </div>
                </div>

                {/* Nearby messages list */}
                {nearbyLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                  </div>
                ) : nearbyMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">{t('spacetime.nearbyEmpty')}</p>
                    <p className="text-white/15 text-xs mt-1">{t('spacetime.nearbyEmptyHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nearbyMessages.map(msg => {
                      const emo = emotionOf(msg.emotion);
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-green-500/30 to-cyan-500/30 flex items-center justify-center flex-shrink-0 text-xs text-white/60">
                              {msg.userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-white/70">{msg.userName}</span>
                                <span className={clsx('text-[10px]', emo.color)}>{emo.emoji}</span>
                                <span className="text-[10px] text-white/15 ml-auto">{timeAgo(msg.createdAt)}</span>
                              </div>
                              <p className="text-sm text-white/80 mt-1 leading-relaxed">{msg.content}</p>
                              {msg.targetLocation && (
                                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-green-400/50">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {msg.targetLocation.label || `${msg.targetLocation.lat.toFixed(3)}, ${msg.targetLocation.lng.toFixed(3)}`}
                                  {msg.distance != null && (
                                    <span className="text-white/20 ml-1">
                                      ({msg.distance < 1 ? `${(msg.distance * 1000).toFixed(0)}m` : `${msg.distance.toFixed(1)}km`})
                                    </span>
                                  )}
                                </div>
                              )}
                              {msg.songTitle && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-cyan-400/50">
                                  <Music className="w-2.5 h-2.5" />{msg.songTitle}
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="flex items-center gap-1 text-[11px] text-white/20">
                                  <Heart className="w-3 h-3" /> {msg.likes > 0 && msg.likes}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-3 border-t border-white/[0.06] flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white/15">
                <Sparkles className="w-3 h-3" />
                <span className="text-[10px]">{t('spacetime.subtitle')}</span>
              </div>
              <button
                onClick={() => { if (tab === 'messages') fetchMessages(); else if (tab === 'capsules') fetchCapsules(); else fetchNearby(); }}
                className="p-1.5 rounded-lg text-white/25 hover:text-white/50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
