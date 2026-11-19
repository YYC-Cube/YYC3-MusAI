// 社区面板子组件 · 时空墙语音录制区块（录音 / 波形 / 试听 / 发送）
import React from 'react';
import { motion } from 'motion/react';
import { Mic, Square, Pause, Play, Trash2, Send } from 'lucide-react';
import type { TranslationKey } from '@yyc3/music-hooks';

interface VoiceRecorderPanelProps {
  voiceSupported: boolean;
  audioBlob: Blob | null;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  recordingDuration: number;
  stopRecording: () => void;
  audioWaveform: number[];
  isPlayingPreview: boolean;
  togglePreview: () => void;
  discardRecording: () => void;
  handleSendVoice: () => Promise<void>;
  sending: boolean;
  t: (key: TranslationKey) => string;
}

export const VoiceRecorderPanel: React.FC<VoiceRecorderPanelProps> = ({
  voiceSupported, audioBlob, isRecording, startRecording, recordingDuration,
  stopRecording, audioWaveform, isPlayingPreview, togglePreview, discardRecording,
  handleSendVoice, sending, t,
}) => {
  return (
    <React.Fragment>
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
    </React.Fragment>
  );
};
