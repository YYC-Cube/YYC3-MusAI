// 社区面板子组件 · 时空墙胶囊 Tab（创建表单 + 胶囊列表）
import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { CreateCapsuleForm } from './CreateCapsuleForm';
import { CapsuleList } from './CapsuleList';
import type { STCapsule } from './shared';

interface CapsulesTabProps {
  user: any;
  capTitle: string;
  setCapTitle: Dispatch<SetStateAction<string>>;
  capContent: string;
  setCapContent: Dispatch<SetStateAction<string>>;
  capUnlockAt: string;
  setCapUnlockAt: Dispatch<SetStateAction<string>>;
  capRecipient: string;
  setCapRecipient: Dispatch<SetStateAction<string>>;
  capEmotion: string;
  setCapEmotion: Dispatch<SetStateAction<string>>;
  capLinkSong: boolean;
  setCapLinkSong: Dispatch<SetStateAction<boolean>>;
  currentTrackTitle?: string;
  capEncrypt: boolean;
  setCapEncrypt: Dispatch<SetStateAction<boolean>>;
  capRecipientId: string;
  setCapRecipientId: Dispatch<SetStateAction<string>>;
  e2eeReady: boolean;
  e2eeChecked: boolean;
  e2eePromptVisible: boolean;
  setE2eePromptVisible: Dispatch<SetStateAction<boolean>>;
  capCreatedFlash: boolean;
  capCreating: boolean;
  handleCreateCapsule: () => Promise<void>;
  capLoading: boolean;
  capsules: STCapsule[];
  handleDecryptCapsule: React.MutableRefObject<(cap: STCapsule) => Promise<void>>;
  handleLikeCapsule: (capId: string) => Promise<void>;
  t: (key: TranslationKey) => string;
  lang: Lang;
}

export const CapsulesTab: React.FC<CapsulesTabProps> = ({
  user, capTitle, setCapTitle, capContent, setCapContent,
  capUnlockAt, setCapUnlockAt, capRecipient, setCapRecipient,
  capEmotion, setCapEmotion, capLinkSong, setCapLinkSong,
  currentTrackTitle, capEncrypt, setCapEncrypt, capRecipientId,
  setCapRecipientId, e2eeReady, e2eeChecked, e2eePromptVisible,
  setE2eePromptVisible, capCreatedFlash, capCreating, handleCreateCapsule,
  capLoading, capsules, handleDecryptCapsule, handleLikeCapsule, t, lang,
}) => {
  return (
    <div className="p-4">
      <CreateCapsuleForm
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
        t={t}
        lang={lang}
      />
      <CapsuleList
        capLoading={capLoading}
        capsules={capsules}
        user={user}
        lang={lang}
        t={t}
        handleDecryptCapsule={handleDecryptCapsule}
        handleLikeCapsule={handleLikeCapsule}
      />
    </div>
  );
};
