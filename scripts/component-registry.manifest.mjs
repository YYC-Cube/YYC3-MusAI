/**
 * @file component-registry.manifest.mjs
 * @description 组件注册表人工维护元数据：描述、示例代码与关键 Props
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 */

/** @typedef {{ name: string, package: string, description: string, props?: string[], example?: string, demo?: string, category?: string }} CuratedEntry */

/** @type {CuratedEntry[]} */
export const curatedComponents = [
  {
    name: 'DButton',
    package: '@yyc3/music-ui',
    description: '主操作按钮，支持 primary / secondary / ghost / danger 与加载态、图标和全宽。',
    props: ['variant', 'size', 'loading', 'icon', 'iconRight', 'fullWidth', 'disabled', 'children'],
    demo: 'DButton',
    example: `<DButton variant="primary" onClick={() => console.log('play')}>
  开始播放
</DButton>`
  },
  {
    name: 'DCard',
    package: '@yyc3/music-ui',
    description: '玻璃拟态卡片容器，支持 interactive、glowColor 与三档内边距。',
    props: ['variant', 'padding', 'interactive', 'glowColor', 'onClick', 'children'],
    demo: 'DCard',
    example: `<DCard variant="glass" padding="md">
  <h3>夜航</h3>
  <p>YYC³ · MusAI</p>
</DCard>`
  },
  {
    name: 'DBadge',
    package: '@yyc3/music-ui',
    description: '状态徽标，用于情绪、等级与标签展示。',
    props: ['variant', 'size', 'children'],
    demo: 'DBadge',
    example: `<DBadge variant="accent" size="sm">Pro</DBadge>`
  },
  {
    name: 'StarPowerChart',
    package: '@yyc3/music-ui',
    description: '星力趋势图，基于 Recharts，接收 name/value 序列。',
    props: ['data'],
    demo: 'StarPowerChart',
    example: `<StarPowerChart
  data={[
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 18 },
    { name: 'Wed', value: 15 },
  ]}
/>`
  },
  {
    name: 'XiaoyuCharacter',
    package: '@yyc3/music-emotion',
    description: '小语角色组件，按情绪切换动画，支持拖拽与自定义动画数据。',
    props: ['userEmotion', 'animationData', 'animationSrc'],
    demo: 'XiaoyuCharacter',
    example: `<XiaoyuCharacter userEmotion="happy" />`
  },
  {
    name: 'LyricsDisplay',
    package: '@yyc3/music-lyrics',
    description: '逐行歌词展示，支持当前行高亮、点击跳转与双语翻译。',
    props: ['currentTime', 'lyrics', 'onLineClick', 'annotations', 'onAnnotate', 'isPlaying'],
    demo: 'LyricsDisplay',
    example: `<LyricsDisplay
  currentTime={5}
  isPlaying={false}
  lyrics={[
    { time: 0, text: '前奏', translation: 'Intro' },
    { time: 5, text: '等待星辰对齐', translation: 'Wait for the stars to align' },
  ]}
/>`
  },
  {
    name: 'EmotionRipple',
    package: '@yyc3/music-lyrics',
    description: '情绪涟漪 Canvas 可视化，随音频能量变化。',
    props: ['emotion', 'audioEnergy', 'isPlaying', 'frequencyData', 'className'],
    demo: 'EmotionRipple',
    example: `<EmotionRipple emotion="calm" audioEnergy={0.6} isPlaying />`
  },
  {
    name: 'AudioVisualizer',
    package: '@yyc3/music-player',
    description: '音频频谱可视化，支持圆形与柱状两种模式。',
    props: ['frequencyData', 'emotion', 'isPlaying', 'size', 'mode'],
    demo: 'AudioVisualizer',
    example: `<AudioVisualizer
  frequencyData={new Uint8Array(32).fill(80)}
  emotion="calm"
  isPlaying
  size={180}
  mode="circular"
/>`
  },
  {
    name: 'CoverFlow',
    package: '@yyc3/music-player',
    category: '播放器',
    description: '3D 封面流：拖拽惯性、键盘导航、封面倒影与高光，支持受控/非受控选中。',
    props: [
      'tracks', 'onSelect', 'selectedId', 'selectedIndex', 'defaultSelectedIndex',
      'getCover', 'isLoading', 'itemSize', 'spacing', 'height', 'showReflection',
      'showGloss', 'showFloorGlow', 'enableKeyboard', 'enableDrag', 'emptyText',
      'className', 'style'
    ],
    demo: 'CoverFlow',
    example: `<CoverFlow
  tracks={[
    { id: '1', title: '星轨', artist: 'YYC³', cover: '/covers/1.jpg' },
    { id: '2', title: '夜航', artist: 'YYC³', cover: '/covers/2.jpg' },
    { id: '3', title: '回声', artist: 'YYC³' },
  ]}
  defaultSelectedIndex={1}
  onSelect={(track, index) => console.log(index, track.title)}
/>`
  },
  {
    name: 'DProgress',
    package: '@yyc3/music-ui',
    description: '进度条，支持渐变/成功/警告变体与百分比标签。',
    props: ['value', 'size', 'variant', 'showLabel'],
    demo: 'DProgress',
    example: '<DProgress value={68} showLabel />'
  },
  {
    name: 'DInput',
    package: '@yyc3/music-ui',
    description: '带标签、提示与错误态的输入框，支持前后缀图标与密码可见切换。',
    props: ['variant', 'label', 'error', 'hint', 'inputSize', 'leftIcon'],
    demo: 'DInput',
    example: '<DInput label="搜索" placeholder="歌曲 / 歌手" />'
  },
  {
    name: 'DSpinner',
    package: '@yyc3/music-ui',
    description: '加载指示器，三档尺寸。',
    props: ['size'],
    demo: 'DSpinner',
    example: '<DSpinner size="lg" />'
  },
  {
    name: 'DEmptyState',
    package: '@yyc3/music-ui',
    description: '空状态占位，支持图标、标题、描述与操作区。',
    props: ['icon', 'title', 'description', 'action'],
    demo: 'DEmptyState',
    example: '<DEmptyState title="暂无收藏" description="喜欢这首歌就加入收藏吧" />'
  },
  {
    name: 'DAchievementCard',
    package: '@yyc3/music-ui',
    description: '成就卡片，展示稀有度、进度与解锁状态。',
    props: ['title', 'description', 'icon', 'progress', 'unlocked', 'rarity'],
    demo: 'DAchievementCard',
    example: '<DAchievementCard title="夜行者" description="连续 7 天收听" icon="🌙" progress={70} rarity="rare" />'
  },
  {
    name: 'AchievementRing',
    package: '@yyc3/music-ui',
    description: '环形进度，用于成就完成度与专注计时。',
    props: ['progress', 'size', 'strokeWidth', 'color', 'bgColor'],
    demo: 'AchievementRing',
    example: '<AchievementRing progress={72} size={72} />'
  },
  {
    name: 'StatCard',
    package: '@yyc3/music-ui',
    description: '指标卡，展示数值、环比与趋势线。',
    props: ['label', 'value', 'change', 'trend', 'icon'],
    demo: 'StatCard',
    example: '<StatCard label="本周播放" value={128} change={12.5} trend={[3, 6, 4, 9, 7, 12]} />'
  },
  {
    name: 'SparklineChart',
    package: '@yyc3/music-ui',
    description: '迷你趋势折线，适合表格与指标卡内嵌。',
    props: ['data', 'width', 'height', 'color', 'showDot'],
    demo: 'SparklineChart',
    example: '<SparklineChart data={[3, 6, 4, 9, 7, 12, 10]} width={160} height={40} />'
  },
  {
    name: 'XiaoyuBubble',
    package: '@yyc3/music-emotion',
    description: '小语气泡，按情绪切换配色，可关闭。',
    props: ['text', 'emotion', 'isVisible', 'onClose'],
    demo: 'XiaoyuBubble',
    example: '<XiaoyuBubble text="今天也一起听歌吧！" emotion="happy" isVisible />'
  }
];

/** 组件分类（未命中时回退到包名） */
export const categoryByPackage = {
  '@yyc3/music-ui': 'UI 基础',
  '@yyc3/music-data': '数据契约',
  '@yyc3/music-design-tokens': '设计令牌',
  '@yyc3/music-hooks': '交互逻辑',
  '@yyc3/music-player': '播放器',
  '@yyc3/music-lyrics': '歌词',
  '@yyc3/music-ai': 'AI 创作',
  '@yyc3/music-community': '社区',
  '@yyc3/music-commerce': '商业',
  '@yyc3/music-growth': '成长体系',
  '@yyc3/music-audio': '音效与文档',
  '@yyc3/music-emotion': '情感角色',
  '@yyc3/music-voice': '语音交互',
  '@yyc3/music-utils': '基础工具',
  '@yyc3/music-testing': '测试工具'
};
