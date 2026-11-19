// 社区面板逻辑层 · 时空墙语音转写 STT（原生 SpeechRecognition + §4.3+ Whisper 流式）
import { useState, useRef, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Lang } from '@yyc3/music-hooks';

interface UseSttParams {
  lang: Lang;
  setNewMsg: Dispatch<SetStateAction<string>>;
}

export function useStt({ lang, setNewMsg }: UseSttParams) {
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
      const { sttApi } = await import('@yyc3/music-utils');
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

  return { sttActive, sttSupported, sttStreamingRef, startSTT, stopSTT };
}
