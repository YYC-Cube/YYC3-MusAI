"use client";

/**
 * YYC³ music-live · LiveRoom 直播间主组件（W3 补流媒体）
 *
 * 集成：HLS 播放（Video.js/hls.js）、弹幕看板、表情、礼物、在线人数、审核面板。
 * 前端通过 LiveClient 与 music-server /ws/live 通信；播放地址来自 /live/stream/:id。
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DEFAULT_GIFTS } from './types';
import type { LiveRoom as LiveRoomType, LiveUser, GiftItem } from './types';
import { LiveClient } from './LiveClient';
import { DanmakuBoard } from './DanmakuBoard';
import { GiftPanel } from './GiftPanel';
import { EmojiPanel } from './EmojiPanel';
import { ViewerCount } from './ViewerCount';
import { ModerationPanel } from './ModerationPanel';

interface LiveRoomProps {
  /** 直播间信息（来自 /live/stream/:id） */
  room: LiveRoomType;
  /** 当前用户 */
  user: LiveUser;
  /** WebSocket URL（含 token） */
  wsUrl: string;
  /** 自定义播放器渲染（接收 HLS 地址与直播状态）；不传则用内置占位播放区 */
  renderPlayer?: (hlsUrl: string | null, live: boolean) => React.ReactNode;
  /** 礼物清单；不传用 DEFAULT_GIFTS（修复前固定空数组，礼物按钮 UI 上不可达） */
  gifts?: GiftItem[];
}

export const LiveRoom: React.FC<LiveRoomProps> = ({ room, user, wsUrl, renderPlayer, gifts = DEFAULT_GIFTS }) => {
  const clientRef = useRef<InstanceType<typeof LiveClient> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(room.viewerCount);

  // 初始化 WebSocket 客户端
  useEffect(() => {
    const client = new LiveClient({
      url: wsUrl,
      room: room.id,
      onOpen: () => {
        setIsConnected(true);
        client.requestViewerCount();
      },
      onClose: () => setIsConnected(false),
      onError: (err) => {
        console.error('[LiveClient] WS error:', err);
        toast.error('直播间连接异常');
      },
      onMessage: (msg) => {
        switch (msg.type) {
          case 'viewer_count':
            setViewerCount(msg.count ?? 0);
            break;
          case 'welcome':
          case 'joined':
          case 'room_info':
            break;
          case 'moderated':
            toast.error(msg.reason ?? '消息被拦截');
            break;
          default:
            // danmaku / emoji / gift / moderation 由子组件自行处理状态
            break;
        }
      },
    });
    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, [wsUrl, room.id]);

  const sendEmoji = useCallback((emoji: string) => {
    clientRef.current?.sendEmoji(emoji);
  }, [clientRef]);

  const sendGift = useCallback((gift: GiftItem) => {
    clientRef.current?.sendGift(gift.id, 1);
    toast.success(`赠送 ${gift.label} ×1`);
  }, []);

  const onModerate = useCallback((action: 'mute' | 'unmute' | 'kick' | 'delete', targetUser: string) => {
    clientRef.current?.moderate(action, targetUser);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-black text-white">
      {/* 视频区域（HLS 播放，前端用 Video.js/hls.js 使用 room.hlsPlayUrl） */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {renderPlayer ? (
          renderPlayer(room.hlsPlayUrl || null, room.status === 'live')
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">{room.name}</div>
                <div className="text-xs text-gray-400">
                  HLS 播放地址：{room.hlsPlayUrl}
                </div>
                <div className="mt-4 text-lg">
                  {isConnected ? (
                    <span className="text-green-400">● 已连接直播间</span>
                  ) : (
                    <span className="text-red-400">⚠ 连接中断</span>
                  )}
                </div>
              </div>
            </div>
            {/* 占位：实际集成时替换为 <Video> 或 hls.js 播放器 */}
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-2xl">📺</div>
              <div className="text-white/50 text-sm">HLS 流媒体播放区</div>
            </div>
          </>
        )}
      </div>

      {/* 底部交互栏 */}
      <div className="h-20 bg-black/80 border-t border-white/10 flex items-center gap-4 px-4">
        <ViewerCount count={viewerCount} />

        <div className="flex-1 flex justify-center">
          <EmojiPanel onEmoji={sendEmoji} />
        </div>

        <GiftPanel gifts={gifts} onGift={sendGift} isModerator={user.isModerator} />

        {user.isModerator && (
          <ModerationPanel onModerate={onModerate} isModerator={true} />
        )}
      </div>

      {/* 弹幕看板（覆盖在视频上方） */}
      <DanmakuBoard className="absolute inset-0 pointer-events-none" />
    </div>
  );
};

export default LiveRoom;
