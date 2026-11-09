import type { ReactNode } from 'react';
import {
  DButton, DCard, DBadge, StarPowerChart, DProgress, DInput, DSpinner,
  DEmptyState, DAchievementCard, AchievementRing, StatCard, SparklineChart
} from '@yyc3/music-ui';
import { XiaoyuCharacter, XiaoyuBubble } from '@yyc3/music-emotion';
import { LyricsDisplay, EmotionRipple } from '@yyc3/music-lyrics';
import { AudioVisualizer } from '@yyc3/music-player';

const lyrics = [
  { time: 0, text: '前奏', translation: 'Intro' },
  { time: 5, text: '等待星辰对齐', translation: 'Wait for the stars to align' },
  { time: 9, text: '漂流在无尽的夜', translation: 'Drifting through the endless night' }
];

export const demos: Record<string, () => ReactNode> = {
  DButton: () => (
    <div className="flex flex-wrap items-center gap-3">
      <DButton variant="primary">主要按钮</DButton>
      <DButton variant="secondary">次要按钮</DButton>
      <DButton variant="ghost">幽灵按钮</DButton>
      <DButton loading>加载中</DButton>
    </div>
  ),
  DCard: () => (
    <DCard variant="glass" padding="md" className="max-w-sm">
      <h3 className="text-lg font-semibold">夜航</h3>
      <p className="mt-1 text-sm text-white/50">YYC³ · MusAI</p>
    </DCard>
  ),
  DBadge: () => (
    <div className="flex flex-wrap gap-2">
      <DBadge variant="accent">Pro</DBadge>
      <DBadge>New</DBadge>
    </div>
  ),
  StarPowerChart: () => (
    <div className="h-64 w-full max-w-xl">
      <StarPowerChart
        data={[
          { date: 'Mon', value: 12 },
          { date: 'Tue', value: 18 },
          { date: 'Wed', value: 15 },
          { date: 'Thu', value: 24 },
          { date: 'Fri', value: 21 }
        ]}
      />
    </div>
  ),
  XiaoyuCharacter: () => (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
      小语角色以固定定位渲染在视口右下角，可直接拖拽；此处仅触发渲染。
      <XiaoyuCharacter userEmotion="happy" />
    </div>
  ),
  LyricsDisplay: () => (
    <div className="h-64 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <LyricsDisplay currentTime={5} lyrics={lyrics} isPlaying={false} />
    </div>
  ),
  EmotionRipple: () => (
    <div className="relative h-40 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <EmotionRipple emotion="calm" audioEnergy={0.6} isPlaying={false} />
    </div>
  ),
  AudioVisualizer: () => (
    <div className="flex items-end justify-center rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <AudioVisualizer
        frequencyData={Uint8Array.from({ length: 32 }, (_, i) => 40 + (i % 8) * 20)}
        emotion="calm"
        isPlaying={false}
        size={180}
        mode="circular"
      />
    </div>
  ),
  DProgress: () => (
    <div className="w-full max-w-md space-y-3">
      <DProgress value={68} showLabel />
      <DProgress value={42} variant="success" />
    </div>
  ),
  DInput: () => (
    <div className="w-full max-w-xs space-y-3">
      <DInput label="搜索" placeholder="歌曲 / 歌手" />
      <DInput label="邮箱" hint="用于接收更新通知" placeholder="you@example.com" />
    </div>
  ),
  DSpinner: () => (
    <div className="flex items-center gap-4">
      <DSpinner size="sm" />
      <DSpinner />
      <DSpinner size="lg" />
    </div>
  ),
  DEmptyState: () => (
    <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.02]">
      <DEmptyState title="暂无收藏" description="喜欢这首歌就加入收藏吧" />
    </div>
  ),
  DAchievementCard: () => (
    <div className="w-full max-w-sm space-y-3">
      <DAchievementCard title="夜行者" description="连续 7 天收听" icon="🌙" progress={70} rarity="rare" />
      <DAchievementCard title="星尘收藏家" description="收藏 100 首歌曲" icon="⭐" progress={100} unlocked rarity="legendary" />
    </div>
  ),
  AchievementRing: () => (
    <div className="flex items-center gap-6">
      <AchievementRing progress={72} size={72} />
      <AchievementRing progress={100} size={72} color="#34D399" />
    </div>
  ),
  StatCard: () => (
    <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
      <StatCard label="本周播放" value={128} change={12.5} trend={[3, 6, 4, 9, 7, 12]} />
      <StatCard label="新增收藏" value={36} change={-4.2} trend={[8, 6, 7, 4, 5, 3]} />
    </div>
  ),
  SparklineChart: () => (
    <div className="flex items-center gap-6">
      <SparklineChart data={[3, 6, 4, 9, 7, 12, 10]} width={160} height={40} />
      <SparklineChart data={[9, 7, 8, 4, 5, 3, 2]} width={160} height={40} color="#F87171" />
    </div>
  ),
  XiaoyuBubble: () => (
    <div className="relative h-40 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <XiaoyuBubble text="今天也一起听歌吧！" emotion="happy" isVisible />
    </div>
  )
};
