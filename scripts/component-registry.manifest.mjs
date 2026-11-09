/**
 * @file component-registry.manifest.mjs
 * @description 组件注册表人工维护元数据：描述、示例代码与关键 Props
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 */

/** @typedef {{ name: string, package: string, description: string, props?: string[], example?: string, demo?: string }} CuratedEntry */

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
