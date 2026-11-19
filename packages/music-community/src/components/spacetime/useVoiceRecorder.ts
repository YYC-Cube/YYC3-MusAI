// 社区面板逻辑层 · 时空墙语音录制（MediaRecorder 录音 / 波形 / 试听）
import { useState, useEffect, useRef } from 'react';
import { getSharedAudioContext } from '@yyc3/music-utils';

export function useVoiceRecorder() {
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

  // Check voice support
  useEffect(() => {
    setVoiceSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);

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
      // 复用全应用共享 AudioContext，仅做解码，不创建/关闭独立上下文
      const audioCtx = getSharedAudioContext();
      if (!audioCtx) throw new Error('WebAudio 不可用');
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
    } catch { setAudioWaveform(Array(40).fill(0.3)); }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return {
    isRecording, recordingDuration,
    audioBlob, audioUrl, audioWaveform,
    isPlayingPreview, voiceSupported,
    startRecording, stopRecording,
    discardRecording, togglePreview,
  };
}
