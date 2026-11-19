// 社区面板子组件 · 时空墙消息编写区（文本 / 情绪 / 定时 / 关联歌曲 / 定位 / STT / 语音 / 发送）
import React from 'react';
import {
  Timer, Music, Navigation, MapPin, Type,
  Sparkles, Send,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Dispatch, SetStateAction } from 'react';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { EMOTIONS } from './shared';
import { VoiceRecorderPanel } from './VoiceRecorderPanel';

interface ComposeMessageProps {
  user: any;
  newMsg: string;
  setNewMsg: Dispatch<SetStateAction<string>>;
  msgEmotion: string;
  setMsgEmotion: Dispatch<SetStateAction<string>>;
  showSchedule: boolean;
  setShowSchedule: Dispatch<SetStateAction<boolean>>;
  scheduleTime: string;
  setScheduleTime: Dispatch<SetStateAction<string>>;
  linkSong: boolean;
  setLinkSong: Dispatch<SetStateAction<boolean>>;
  geoSupported: boolean;
  attachLocation: boolean;
  setAttachLocation: Dispatch<SetStateAction<boolean>>;
  requestLocation: () => Promise<void>;
  userLocation: { lat: number; lng: number; label?: string } | null;
  setUserLocation: Dispatch<SetStateAction<{ lat: number; lng: number; label?: string } | null>>;
  geoLoading: boolean;
  sttSupported: boolean;
  sttActive: boolean;
  stopSTT: () => void;
  startSTT: () => void;
  sttStreamingRef: React.MutableRefObject<boolean>;
  currentTrackTitle?: string;
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
  sentFlash: boolean;
  handleSendMessage: () => Promise<void>;
  t: (key: TranslationKey) => string;
  lang: Lang;
}

export const ComposeMessage: React.FC<ComposeMessageProps> = ({
  user, newMsg, setNewMsg, msgEmotion, setMsgEmotion,
  showSchedule, setShowSchedule, scheduleTime, setScheduleTime,
  linkSong, setLinkSong, geoSupported, attachLocation, setAttachLocation,
  requestLocation, userLocation, setUserLocation, geoLoading,
  sttSupported, sttActive, stopSTT, startSTT,
  sttStreamingRef, currentTrackTitle, voiceSupported, audioBlob, isRecording,
  startRecording, recordingDuration, stopRecording, audioWaveform,
  isPlayingPreview, togglePreview, discardRecording, handleSendVoice,
  sending, sentFlash, handleSendMessage, t, lang,
}) => {
  return (
    <React.Fragment>
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
          <VoiceRecorderPanel
            voiceSupported={voiceSupported}
            audioBlob={audioBlob}
            isRecording={isRecording}
            startRecording={startRecording}
            recordingDuration={recordingDuration}
            stopRecording={stopRecording}
            audioWaveform={audioWaveform}
            isPlayingPreview={isPlayingPreview}
            togglePreview={togglePreview}
            discardRecording={discardRecording}
            handleSendVoice={handleSendVoice}
            sending={sending}
            t={t}
          />
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
    </React.Fragment>
  );
};
