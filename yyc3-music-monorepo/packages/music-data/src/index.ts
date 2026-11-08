// YYC³ music-data — 数据层（全局类型 + 演示歌单数据）
// 类型以 types.ts（v148 规范层）为准；playlistData 内的同名历史接口不再导出，
// 仅导出运行时数据（TD-11 见拆分规划卷 08）。
export * from './types';
export {
  dMusicLogo,
  dMusicGold,
  dMusicInstruments,
  dMusicRed,
  artistWarm,
  artistBlue,
  ACHIEVEMENTS,
  DEMO_PLAYLIST,
} from './playlistData';
