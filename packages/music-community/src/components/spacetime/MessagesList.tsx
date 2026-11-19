// 社区面板子组件 · 时空墙消息列表（加载 / 空态 / 列表）
import React from 'react';
import { Radio } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { TranslationKey, Lang } from '@yyc3/music-hooks';
import { MessageCard } from './MessageCard';
import type { STMessage, STReply } from './shared';

interface MessagesListProps {
  msgLoading: boolean;
  messages: STMessage[];
  setMessages: Dispatch<SetStateAction<STMessage[]>>;
  user: any;
  lang: Lang;
  t: (key: TranslationKey) => string;
  expandedReplies: string | null;
  replies: STReply[];
  replyLoading: boolean;
  replyText: string;
  setReplyText: Dispatch<SetStateAction<string>>;
  handleLikeMessage: (msgId: string) => Promise<void>;
  handleToggleReplies: (msgId: string) => Promise<void>;
  handleSendReply: (msgId: string) => Promise<void>;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  msgLoading, messages, setMessages, user, lang, t,
  expandedReplies, replies, replyLoading, replyText, setReplyText,
  handleLikeMessage, handleToggleReplies, handleSendReply,
}) => {
  return (
    <React.Fragment>
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
          {messages.map(msg => (
            <MessageCard
              key={msg.id}
              msg={msg}
              user={user}
              lang={lang}
              t={t}
              expandedReplies={expandedReplies}
              replies={replies}
              replyLoading={replyLoading}
              replyText={replyText}
              setReplyText={setReplyText}
              setMessages={setMessages}
              handleLikeMessage={handleLikeMessage}
              handleToggleReplies={handleToggleReplies}
              handleSendReply={handleSendReply}
            />
          ))}
        </div>
      )}
    </React.Fragment>
  );
};
