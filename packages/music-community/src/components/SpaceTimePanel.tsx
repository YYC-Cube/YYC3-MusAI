// 社区面板 · 时空墙面板（组装层：状态编排 + 区块装配；子组件 / 逻辑 / 类型见 ./spacetime/）
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '@yyc3/music-utils';
import { useI18n } from '@yyc3/music-hooks';
import { useStt } from './spacetime/useStt';
import { useSpaceGeo } from './spacetime/useSpaceGeo';
import { useVoiceRecorder } from './spacetime/useVoiceRecorder';
import { useCapsules } from './spacetime/useCapsules';
import { PanelHeader } from './spacetime/PanelHeader';
import { PanelTabBar } from './spacetime/PanelTabBar';
import { MessagesTab } from './spacetime/MessagesTab';
import { CapsulesTab } from './spacetime/CapsulesTab';
import { NearbyTab } from './spacetime/NearbyTab';
import { PanelFooter } from './spacetime/PanelFooter';
import type { STMessage, STReply } from './spacetime/shared';

interface SpaceTimePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentTrackId?: string;
  currentTrackTitle?: string;
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

  const {
    sttActive, sttSupported, sttStreamingRef, startSTT, stopSTT,
  } = useStt({ lang, setNewMsg });

  const {
    attachLocation, setAttachLocation, userLocation, setUserLocation,
    geoLoading, geoSupported,
    nearbyMessages, setNearbyMessages, nearbyLoading,
    requestLocation, fetchNearby,
  } = useSpaceGeo();

  const {
    isRecording, recordingDuration, audioBlob, audioWaveform,
    isPlayingPreview, voiceSupported,
    startRecording, stopRecording, discardRecording, togglePreview,
  } = useVoiceRecorder();

  const {
    capsules, capLoading,
    capTitle, setCapTitle,
    capContent, setCapContent,
    capUnlockAt, setCapUnlockAt,
    capEmotion, setCapEmotion,
    capRecipient, setCapRecipient,
    capLinkSong, setCapLinkSong,
    capCreating, capCreatedFlash,
    capEncrypt, setCapEncrypt,
    capRecipientId, setCapRecipientId,
    e2eeReady, e2eeChecked, e2eePromptVisible, setE2eePromptVisible,
    fetchCapsules, handleCreateCapsule, handleLikeCapsule, handleDecryptCapsule,
  } = useCapsules({ isOpen, tab, user, currentTrackId, currentTrackTitle });

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

  // ======== Fetch Messages ========
  const fetchMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const data = await apiFetch<{ messages: STMessage[] }>('/spacetime/messages');
      if (data?.messages) setMessages(data.messages);
    } catch (err) { console.error('SpaceTime messages fetch error:', err); }
    finally { setMsgLoading(false); }
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
            <PanelHeader t={t} onClose={onClose} />

            {/* Tab bar */}
            <PanelTabBar
              tab={tab}
              setTab={setTab}
              geoSupported={geoSupported}
              nearbyMessages={nearbyMessages}
              fetchNearby={fetchNearby}
              t={t}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {tab === 'messages' ? (
                <MessagesTab
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
                  msgLoading={msgLoading}
                  messages={messages}
                  setMessages={setMessages}
                  expandedReplies={expandedReplies}
                  replies={replies}
                  replyLoading={replyLoading}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  handleLikeMessage={handleLikeMessage}
                  handleToggleReplies={handleToggleReplies}
                  handleSendReply={handleSendReply}
                  t={t}
                  lang={lang}
                />
              ) : (
                <CapsulesTab
                  user={user}
                  capTitle={capTitle}
                  setCapTitle={setCapTitle}
                  capContent={capContent}
                  setCapContent={setCapContent}
                  capUnlockAt={capUnlockAt}
                  setCapUnlockAt={setCapUnlockAt}
                  capRecipient={capRecipient}
                  setCapRecipient={setCapRecipient}
                  capEmotion={capEmotion}
                  setCapEmotion={setCapEmotion}
                  capLinkSong={capLinkSong}
                  setCapLinkSong={setCapLinkSong}
                  currentTrackTitle={currentTrackTitle}
                  capEncrypt={capEncrypt}
                  setCapEncrypt={setCapEncrypt}
                  capRecipientId={capRecipientId}
                  setCapRecipientId={setCapRecipientId}
                  e2eeReady={e2eeReady}
                  e2eeChecked={e2eeChecked}
                  e2eePromptVisible={e2eePromptVisible}
                  setE2eePromptVisible={setE2eePromptVisible}
                  capCreatedFlash={capCreatedFlash}
                  capCreating={capCreating}
                  handleCreateCapsule={handleCreateCapsule}
                  capLoading={capLoading}
                  capsules={capsules}
                  handleDecryptCapsule={handleDecryptCapsule}
                  handleLikeCapsule={handleLikeCapsule}
                  t={t}
                  lang={lang}
                />
              )}
            </div>

            {/* Nearby Tab Content */}
            {tab === 'nearby' && (
              <NearbyTab
                userLocation={userLocation}
                nearbyLoading={nearbyLoading}
                geoLoading={geoLoading}
                nearbyMessages={nearbyMessages}
                fetchNearby={fetchNearby}
                t={t}
                lang={lang}
              />
            )}

            {/* Footer */}
            <PanelFooter
              tab={tab}
              fetchMessages={fetchMessages}
              fetchCapsules={fetchCapsules}
              fetchNearby={fetchNearby}
              t={t}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
