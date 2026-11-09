import type { ReactNode } from 'react';
import { DButton, DCard, DBadge, StarPowerChart } from '@yyc3/music-ui';
import { XiaoyuCharacter } from '@yyc3/music-emotion';
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
  )
};
