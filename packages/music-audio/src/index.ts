// YYC³ music-audio — engines/（无头播放引擎）+ ui/（情感音频与文档交互组件）分层
// 公开导出面与平铺时期完全一致，统一从此 barrel 出口。
export * from './engines/AdvancedPlayer.js';
export * from './engines/WebAudioPlayer.js';
export * from './engines/SoundResourceManager.js';
export * from './ui/PlayerUI.js';
export * from './engines/PageFlipInteraction.js';
export * from './ui/EmotionAudioPlayer';
export * from './ui/EmotionDetector';
export * from './ui/SmartTip';
export * from './ui/InteractiveCodeBlock';
export * from './ui/InteractiveMindMap';
