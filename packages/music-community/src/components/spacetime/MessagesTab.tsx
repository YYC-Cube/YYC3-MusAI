// 社区面板子组件 · 时空墙消息 Tab（编写区 + 消息列表）
import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { ComposeMessage } from './ComposeMessage';
import { MessagesList } from './MessagesList';
import type { STMessage, STReply } from './shared';

interface MessagesTabProps {
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
  msgLoading: boolean;
  messages: STMessage[];
  setMessages: Dispatch<SetStateAction<STMessage[]>>;
  expandedReplies: string | null;
  replies: STReply[];
  replyLoading: boolean;
  replyText: string;
  setReplyText: Dispatch<SetStateAction<string>>;
  handleLikeMessage: (msgId: string) => Promise<void>;
  handleToggleReplies: (msgId: string) => Promise<void>;
  handleSendReply: (msgId: string) => Promise<void>;
  t: (key: TranslationKey) => string;
  lang: Lang;
}

export const MessagesTab: React.FC<MessagesTabProps> = (props) => {
  const {
    user, newMsg, setNewMsg, msgEmotion, setMsgEmotion,
    showSchedule, setShowSchedule, scheduleTime, setScheduleTime,
    linkSong, setLinkSong, geoSupported, attachLocation, setAttachLocation,
    requestLocation, userLocation, setUserLocation, geoLoading,
    sttSupported, sttActive, stopSTT, startSTT,
    sttStreamingRef, currentTrackTitle, voiceSupported, audioBlob, isRecording,
    startRecording, recordingDuration, stopRecording, audioWaveform,
    isPlayingPreview, togglePreview, discardRecording, handleSendVoice,
    sending, sentFlash, handleSendMessage, msgLoading, messages, setMessages,
    expandedReplies, replies, replyLoading, replyText, setReplyText,
    handleLikeMessage, handleToggleReplies, handleSendReply, t, lang,
  } = props;
  return (
    <div className="p-4">
      <ComposeMessage
        user={user}
        newMsg={newMsg}
        setNewMsg={setNewMsg}
        msgEmotion={msgEmotion}
        setMsgEmotion={setMsgEmotion}
        showSchedule={showSchedule}
        setShowSchedule={setShowSchedule}
        scheduleTime={scheduleTime}
        setScheduleTime={setScheduleTime}
        linkSong={linkSong}
        setLinkSong={setLinkSong}
        geoSupported={geoSupported}
        attachLocation={attachLocation}
        setAttachLocation={setAttachLocation}
        requestLocation={requestLocation}
        userLocation={userLocation}
        setUserLocation={setUserLocation}
        geoLoading={geoLoading}
        sttSupported={sttSupported}
        sttActive={sttActive}
        stopSTT={stopSTT}
        startSTT={startSTT}
        sttStreamingRef={sttStreamingRef}
        currentTrackTitle={currentTrackTitle}
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
        sentFlash={sentFlash}
        handleSendMessage={handleSendMessage}
        t={t}
        lang={lang}
      />
      <MessagesList
        msgLoading={msgLoading}
        messages={messages}
        setMessages={setMessages}
        user={user}
        lang={lang}
        t={t}
        expandedReplies={expandedReplies}
        replies={replies}
        replyLoading={replyLoading}
        replyText={replyText}
        setReplyText={setReplyText}
        handleLikeMessage={handleLikeMessage}
        handleToggleReplies={handleToggleReplies}
        handleSendReply={handleSendReply}
      />
    </div>
  );
};
