/**
 * YYC³ music-mv · MV 类型定义（W4 适用选配）
 *
 * 借鉴 revideo (Apache-2.0) 的代码驱动视频编辑模型，
 * 不引入 Remotion (Commercial)，替代为 Apache-2.0 的 revideo。
 */

export type MvTheme = 'starfield' | 'neonPulse' | 'aurora' | 'inkWash' | 'cyberCity';

export interface MvTrack {
  /** 曲目 ID */
  id: string;
  /** 曲目标题 */
  title: string;
  /** 音频 URL */
  audioUrl: string;
  /** 专辑封面 URL */
  coverUrl: string;
  /** 色调 */
  color: string;
  /** 歌词行 */
  lyrics: Array<{ time: number; text: string }>;
}

export interface MvConfig {
  /** MV 主题 */
  theme: MvTheme;
  /** 时长（秒） */
  duration: number;
  /** 分辨率宽 */
  width: number;
  /** 分辨率高 */
  height: number;
  /** 帧率 */
  fps: number;
  /** 曲目 */
  track: MvTrack;
}
