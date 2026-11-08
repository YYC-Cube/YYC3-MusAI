/**
 * D-Music §1.x — Component Showcase / Test Page
 *
 * Renders all D-Music design system components for visual verification.
 * Categories tested:
 *   §1.1 — Buttons, Inputs, Cards, Progress, Feedback, Badges, Tags, Lists
 *   §1.2 — Panel (DPanel)
 *   §1.3 — Charts (StarPower, Emotion, PlayStats, Achievement, Sparkline, StatCard)
 *   §1.4 — Theme integration (all components use CSS custom properties)
 */

import React, { useState } from 'react';
import { Music, Star, Trophy, Users, BarChart3, Download, Search, Heart, Zap } from 'lucide-react';
import {
  DButton, DInput, DCard, DMusicCard, DUserCard, DAchievementCard,
  DProgress, AchievementRing, DFeedback, DSpinner, DBadge, DTag,
  DEmptyState, DList, DListItem, DModal, DTabBar, DBreadcrumb,
} from './DMusicUI';
import {
  StarPowerChart, EmotionPieChart, PlayStatsChart,
  AchievementGrid, SparklineChart, DataExportButton, StatCard,
  RankingList,
} from './DataViz';
import { DPanel } from './DPanel';

// ── Mock Data ──
const STAR_POWER_DATA = [
  { date: '1月', value: 120, earned: 80 },
  { date: '2月', value: 280, earned: 160 },
  { date: '3月', value: 450, earned: 170 },
  { date: '4月', value: 620, earned: 170 },
  { date: '5月', value: 890, earned: 270 },
  { date: '6月', value: 1200, earned: 310 },
];

const EMOTION_DATA = [
  { emotion: 'happy', count: 35, pct: 35 },
  { emotion: 'calm', count: 25, pct: 25 },
  { emotion: 'energetic', count: 20, pct: 20 },
  { emotion: 'sad', count: 12, pct: 12 },
  { emotion: 'romantic', count: 8, pct: 8 },
];

const PLAY_STATS = [
  { name: '周一', plays: 120, likes: 45 },
  { name: '周二', plays: 180, likes: 67 },
  { name: '周三', plays: 95, likes: 38 },
  { name: '周四', plays: 250, likes: 98 },
  { name: '周五', plays: 310, likes: 120 },
  { name: '周六', plays: 420, likes: 180 },
  { name: '周日', plays: 380, likes: 155 },
];

const ACHIEVEMENTS = [
  { id: '1', title: '初次创作', icon: '🎵', progress: 100, color: '#22C55E' },
  { id: '2', title: '社区之星', icon: '⭐', progress: 75, color: '#F59E0B' },
  { id: '3', title: '改编大师', icon: '🎨', progress: 40, color: '#A855F7' },
  { id: '4', title: '灵感喷泉', icon: '💡', progress: 60, color: '#3B82F6' },
  { id: '5', title: '协作先锋', icon: '🤝', progress: 20, color: '#EC4899' },
  { id: '6', title: '挑战冠军', icon: '🏆', progress: 90, color: '#EF4444' },
  { id: '7', title: '每日打卡', icon: '📅', progress: 55, color: '#06B6D4' },
  { id: '8', title: '收藏达人', icon: '❤️', progress: 30, color: '#F43F5E' },
];

interface ShowcaseProps {
  lang?: 'zh' | 'en';
}

export const DMusicShowcase: React.FC<ShowcaseProps> = ({ lang = 'zh' }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [feedbackDismissed, setFeedbackDismissed] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [activeTabDefault, setActiveTabDefault] = useState('tab1');
  const [activeTabPills, setActiveTabPills] = useState('tab1');
  const [activeTabUnderline, setActiveTabUnderline] = useState('tab1');

  const SectionTitle: React.FC<{ title: string; section: string }> = ({ title, section }) => (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <h2 className="text-lg font-bold" style={{ color: 'var(--dm-text-primary)' }}>{title}</h2>
      <DBadge variant="accent">{section}</DBadge>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(to right, var(--dm-accent-from), var(--dm-accent-to))' }}
        >
          D-Music 设计系统展示
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--dm-text-tertiary)' }}>
          §1.1 组件库 · §1.2 面板 · §1.3 可视化 · §1.4 主题
        </p>
      </div>

      {/* ════════════ §1.1 Buttons ════════════ */}
      <SectionTitle title="按钮组件" section="§1.1" />
      <DCard padding="md">
        <div className="space-y-4">
          <p className="text-xs font-medium" style={{ color: 'var(--dm-text-secondary)' }}>变体 Variants</p>
          <div className="flex flex-wrap gap-3">
            <DButton variant="primary" icon={<Star className="w-4 h-4" />}>主要按钮</DButton>
            <DButton variant="secondary">次要按钮</DButton>
            <DButton variant="ghost">幽灵按钮</DButton>
            <DButton variant="danger">危险按钮</DButton>
            <DButton variant="accent">强调按钮</DButton>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--dm-text-secondary)' }}>尺寸 Sizes</p>
          <div className="flex flex-wrap items-center gap-3">
            <DButton size="sm">小号 SM</DButton>
            <DButton size="md">中号 MD</DButton>
            <DButton size="lg">大号 LG</DButton>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--dm-text-secondary)' }}>状态 States</p>
          <div className="flex flex-wrap gap-3">
            <DButton loading>加载中</DButton>
            <DButton disabled>禁用</DButton>
            <DButton icon={<Download className="w-4 h-4" />} iconRight={<Zap className="w-3 h-3" />}>双图标</DButton>
            <DButton fullWidth variant="secondary">全宽按钮</DButton>
          </div>
        </div>
      </DCard>

      {/* ════════════ §1.1 Inputs ════════════ */}
      <SectionTitle title="输入框组件" section="§1.1" />
      <DCard padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DInput label="用户名" placeholder="请输入用户名" hint="支持中英文和数字" value={inputVal} onChange={e => setInputVal(e.target.value)} />
          <DInput variant="password" label="密码" placeholder="请输入密码" />
          <DInput variant="search" placeholder="搜索歌曲、艺术家..." />
          <DInput label="邮箱" placeholder="example@dmusic.com" error="邮箱格式不正确" />
          <DInput label="小号输入" inputSize="sm" placeholder="SM size" />
          <DInput label="大号输入" inputSize="lg" placeholder="LG size" leftIcon={<Music className="w-4 h-4" />} />
        </div>
      </DCard>

      {/* ════════════ §1.1 Cards ════════════ */}
      <SectionTitle title="卡片组件" section="§1.1" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DMusicCard title="星际漫游" artist="D-Music Studio" duration="3:42" emotion="calm" isPlaying />
        <DMusicCard title="深空回响" artist="Echo Chamber" duration="4:15" emotion="energetic" />
        <DUserCard name="创作者小星" subtitle="金牌创作者 · 1.2k 粉丝" badge="金牌" />
        <DUserCard name="Echo" subtitle="银牌创作者 · 820 M❤️" badge="银牌" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <DAchievementCard title="灵感喷泉" description="连续7天每日创作" icon="💡" progress={75} unlocked rarity="rare" />
        <DAchievementCard title="改编大师" description="衍生分支作品超5个" icon="🎨" progress={40} rarity="epic" />
      </div>
      <DCard variant="glass" padding="md" className="mt-4">
        <p className="text-sm" style={{ color: 'var(--dm-text-primary)' }}>毛玻璃卡片 (Glass Variant)</p>
        <p className="text-xs mt-1" style={{ color: 'var(--dm-text-tertiary)' }}>使用 backdrop-blur-xl 实现毛玻璃效果</p>
      </DCard>

      {/* ════════════ §1.1 Progress ════════════ */}
      <SectionTitle title="进度指示器" section="§1.1" />
      <DCard padding="md">
        <div className="space-y-4">
          <DProgress value={65} variant="gradient" showLabel aria-label="整体进度" />
          <DProgress value={80} variant="success" showLabel size="lg" />
          <DProgress value={45} variant="warning" showLabel size="sm" />
          <DProgress value={30} variant="error" showLabel />
          <div className="flex gap-6 items-center mt-4">
            <AchievementRing progress={85} size={64} strokeWidth={4} color="#8B5CF6">
              <span className="text-xs font-bold" style={{ color: 'var(--dm-text-primary)' }}>85%</span>
            </AchievementRing>
            <AchievementRing progress={60} size={56} strokeWidth={3} color="#22C55E">
              <span className="text-lg">⭐</span>
            </AchievementRing>
            <AchievementRing progress={100} size={48} strokeWidth={3} color="#F59E0B">
              <span className="text-lg">🏆</span>
            </AchievementRing>
          </div>
        </div>
      </DCard>

      {/* ════════════ §1.1 Feedback ════════════ */}
      <SectionTitle title="反馈组件" section="§1.1" />
      <div className="space-y-3">
        {!feedbackDismissed['loading'] && <DFeedback type="loading" message="正在加载音频数据..." description="请稍候" onDismiss={() => setFeedbackDismissed(p => ({ ...p, loading: true }))} />}
        {!feedbackDismissed['success'] && <DFeedback type="success" message="作品发布成功！" description="已自动同步至社区" onDismiss={() => setFeedbackDismissed(p => ({ ...p, success: true }))} />}
        {!feedbackDismissed['error'] && <DFeedback type="error" message="网络连接失败" description="请检查网络设置后重试" onDismiss={() => setFeedbackDismissed(p => ({ ...p, error: true }))} />}
        {!feedbackDismissed['warning'] && <DFeedback type="warning" message="存储空间不足" description="建议清理缓存或升级套餐" onDismiss={() => setFeedbackDismissed(p => ({ ...p, warning: true }))} />}
        <DFeedback type="info" message="新版本可用 v2.6.0" description="包含 AI 作曲增强和性能优化" />
        <div className="flex items-center gap-4 mt-2">
          <DSpinner size="sm" />
          <DSpinner size="md" />
          <DSpinner size="lg" />
        </div>
      </div>

      {/* ════════════ §1.1 Badges & Tags ════════════ */}
      <SectionTitle title="徽章与标签" section="§1.1" />
      <DCard padding="md">
        <div className="space-y-4">
          <p className="text-xs font-medium" style={{ color: 'var(--dm-text-secondary)' }}>徽章 Badges</p>
          <div className="flex flex-wrap gap-2">
            <DBadge>默认</DBadge>
            <DBadge variant="accent">强调</DBadge>
            <DBadge variant="success" dot>在线</DBadge>
            <DBadge variant="warning">审核中</DBadge>
            <DBadge variant="error">已下架</DBadge>
            <DBadge variant="info">新</DBadge>
            <DBadge variant="accent" size="md">金牌创作者</DBadge>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--dm-text-secondary)' }}>标签 Tags</p>
          <div className="flex flex-wrap gap-2">
            <DTag>电子</DTag>
            <DTag variant="emotion">开心</DTag>
            <DTag variant="outline">流行</DTag>
            <DTag size="xs">摇滚</DTag>
            <DTag size="md" onRemove={() => {}}>可删除标签</DTag>
          </div>
        </div>
      </DCard>

      {/* ════════════ §1.1 List ════════════ */}
      <SectionTitle title="列表组件" section="§1.1" />
      <DCard padding="none">
        <DList label="播放列表">
          <DListItem onClick={() => {}} active>
            <div className="flex items-center gap-3">
              <span className="text-sm" style={{ color: 'var(--dm-text-primary)' }}>🎵 星际漫游 — D-Music Studio</span>
              <DBadge variant="accent" size="sm">播放中</DBadge>
            </div>
          </DListItem>
          <DListItem onClick={() => {}}>
            <span className="text-sm" style={{ color: 'var(--dm-text-primary)' }}>🎵 深空回响 — Echo Chamber</span>
          </DListItem>
          <DListItem onClick={() => {}}>
            <span className="text-sm" style={{ color: 'var(--dm-text-primary)' }}>🎵 极光之舞 — Aurora Beats</span>
          </DListItem>
        </DList>
      </DCard>

      {/* ════════════ §1.1 Empty State ════════════ */}
      <SectionTitle title="空状态" section="§1.1" />
      <DCard padding="none">
        <DEmptyState
          icon="🎧"
          title="暂无播放记录"
          description="播放音乐后，您的收听统计将在这里显示"
          action={<DButton size="sm" icon={<Music className="w-3.5 h-3.5" />}>探索音乐</DButton>}
        />
      </DCard>

      {/* ════════════ §1.1 Modal ════════════ */}
      <SectionTitle title="模态框组件" section="§1.1" />
      <DCard padding="md">
        <DButton onClick={() => setShowModal(true)} icon={<Zap className="w-4 h-4" />}>
          打开模态框
        </DButton>
      </DCard>
      <DModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="确认操作"
        description="这是一个 DModal 模态框示例"
        footer={
          <div className="flex gap-2">
            <DButton variant="secondary" size="sm" onClick={() => setShowModal(false)}>取消</DButton>
            <DButton size="sm" onClick={() => setShowModal(false)}>确认</DButton>
          </div>
        }
      >
        <div className="space-y-3">
          <DFeedback type="warning" message="此操作不可撤销" description="请仔细确认后再继续" />
          <DInput label="输入确认文字" placeholder="请输入 CONFIRM" />
        </div>
      </DModal>

      {/* ════════════ §1.1 TabBar ════════════ */}
      <SectionTitle title="标签导航" section="§1.1" />
      <DCard padding="md">
        <div className="space-y-4">
          <p className="text-xs font-medium" style={{ color: 'var(--dm-text-secondary)' }}>默认样式 Default</p>
          <DTabBar
            tabs={[
              { id: 'tab1', label: '全部', icon: <Music className="w-3 h-3" /> },
              { id: 'tab2', label: '推��', badge: 5 },
              { id: 'tab3', label: '收藏' },
              { id: 'tab4', label: '离线', disabled: true },
            ]}
            activeTab={activeTabDefault}
            onTabChange={setActiveTabDefault}
          />
          <p className="text-xs font-medium" style={{ color: 'var(--dm-text-secondary)' }}>药丸样式 Pills</p>
          <DTabBar
            variant="pills"
            tabs={[
              { id: 'tab1', label: '电子' },
              { id: 'tab2', label: '流行' },
              { id: 'tab3', label: '摇滚' },
              { id: 'tab4', label: '古典' },
            ]}
            activeTab={activeTabPills}
            onTabChange={setActiveTabPills}
          />
          <p className="text-xs font-medium" style={{ color: 'var(--dm-text-secondary)' }}>下划线样式 Underline</p>
          <DTabBar
            variant="underline"
            tabs={[
              { id: 'tab1', label: '歌曲' },
              { id: 'tab2', label: '歌词' },
              { id: 'tab3', label: '评论', badge: 12 },
            ]}
            activeTab={activeTabUnderline}
            onTabChange={setActiveTabUnderline}
          />
        </div>
      </DCard>

      {/* ════════════ §1.1 Breadcrumb ════════════ */}
      <SectionTitle title="��包屑导航" section="§1.1" />
      <DCard padding="md">
        <DBreadcrumb
          items={[
            { label: '首页', onClick: () => {} },
            { label: '社区', onClick: () => {} },
            { label: '创作挑战赛', onClick: () => {} },
            { label: '第 3 期' },
          ]}
        />
      </DCard>

      {/* ════════════ §1.2 Panel ════════════ */}
      <SectionTitle title="面板组件" section="§1.2" />
      <DCard padding="md">
        <p className="text-sm mb-3" style={{ color: 'var(--dm-text-secondary)' }}>
          统一面板壳：支持侧边抽屉/底部抽屉，含头部/内容/底部三段式布局
        </p>
        <DButton onClick={() => setShowPanel(true)} icon={<Users className="w-4 h-4" />}>
          打开示例面板
        </DButton>
      </DCard>

      <DPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        title="示例面板"
        subtitle="§1.2 统一面板组件"
        icon={<Users className="w-4 h-4" />}
        sectionLabel="§1.2 · DPanel"
        footer={
          <div className="flex gap-2">
            <DButton variant="secondary" size="sm" fullWidth onClick={() => setShowPanel(false)}>取消</DButton>
            <DButton size="sm" fullWidth onClick={() => setShowPanel(false)}>确认</DButton>
          </div>
        }
      >
        <div className="p-5 space-y-4">
          <DFeedback type="info" message="这是 DPanel 内的内容区域" />
          <DMusicCard title="面板内音乐卡片" artist="D-Music" duration="3:42" />
          <DProgress value={70} showLabel variant="gradient" />
          <DInput label="面板内输入框" placeholder="输入内容..." />
        </div>
      </DPanel>

      {/* ════════════ §1.3 Star Power Chart ════════════ */}
      <SectionTitle title="星力值增长曲线" section="§1.3" />
      <DCard padding="md">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--dm-text-primary)' }}>星力值趋势</p>
          <DataExportButton data={STAR_POWER_DATA} filename="starpower" label="导出" />
        </div>
        <StarPowerChart data={STAR_POWER_DATA} height={220} lang={lang} />
      </DCard>

      {/* ════════════ §1.3 Emotion Pie ════════════ */}
      <SectionTitle title="情绪分布图" section="§1.3" />
      <DCard padding="md">
        <EmotionPieChart data={EMOTION_DATA} lang={lang} />
      </DCard>

      {/* ════════════ §1.3 Play Stats ════════════ */}
      <SectionTitle title="播放统计" section="§1.3" />
      <DCard padding="md">
        <PlayStatsChart data={PLAY_STATS} height={220} lang={lang} />
      </DCard>

      {/* ════════════ §1.3 Achievement Grid ════════════ */}
      <SectionTitle title="成就进度环网格" section="§1.3" />
      <DCard padding="md">
        <AchievementGrid items={ACHIEVEMENTS} columns={4} />
      </DCard>

      {/* ════════════ §1.3 Stat Cards ════════════ */}
      <SectionTitle title="数据统计卡片" section="§1.3" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="总播放量" value="12.8K" change={15} trend={[80, 90, 85, 110, 130, 120, 150]} icon={<BarChart3 className="w-4 h-4" />} />
        <StatCard label="总收藏" value="3,240" change={8} trend={[40, 55, 50, 65, 70, 68, 80]} icon={<Heart className="w-4 h-4" />} />
        <StatCard label="星力值" value="1,200" change={25} trend={[120, 280, 450, 620, 890, 1200]} icon={<Star className="w-4 h-4" />} />
        <StatCard label="创作数" value="47" change={-3} trend={[12, 15, 10, 8, 6, 5]} icon={<Music className="w-4 h-4" />} />
      </div>

      {/* ════════════ §1.3 Sparkline ════════════ */}
      <SectionTitle title="迷你趋势线" section="§1.3" />
      <DCard padding="md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--dm-text-tertiary)' }}>上升趋势:</span>
            <SparklineChart data={[10, 20, 15, 30, 25, 40, 45]} color="#22C55E" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--dm-text-tertiary)' }}>下降趋势:</span>
            <SparklineChart data={[45, 40, 35, 30, 20, 15, 10]} color="#EF4444" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--dm-text-tertiary)' }}>波动趋势:</span>
            <SparklineChart data={[20, 35, 15, 40, 10, 30, 25]} color="#8B5CF6" />
          </div>
        </div>
      </DCard>

      {/* ════════════ §1.3 Ranking List ════════════ */}
      <SectionTitle title="排行榜列表" section="§1.3" />
      <DCard padding="md">
        <RankingList
          lang={lang}
          valueLabel={lang === 'zh' ? '星力值' : 'SP'}
          items={[
            { rank: 1, name: 'StarGazer_42', score: 12800, change: 'same' },
            { rank: 2, name: 'NebulaDrifter', score: 9650, change: 'up' },
            { rank: 3, name: 'CosmicVoyager', score: 8420, change: 'down' },
            { rank: 4, name: 'PixelDreamer', score: 7100, change: 'new' },
            { rank: 5, name: 'WaveRider', score: 5830, change: 'up', highlight: true },
            { rank: 6, name: 'EchoMaster', score: 4200, change: 'same' },
          ]}
        />
      </DCard>

      {/* Footer */}
      <div className="text-center py-8">
        <p className="text-[10px]" style={{ color: 'var(--dm-text-disabled)' }}>
          D-Music Design System · §1.1 组件库 · §1.2 面板 · §1.3 数据可视化 · §1.4 主题系统 · v1.0.0
        </p>
      </div>
    </div>
  );
};