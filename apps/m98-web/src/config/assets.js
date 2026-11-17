/**
 * file: assets.js
 * description: 全局资产清单 · 统一引用 logo、封面、海报与音频
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [config],[asset],[media]
 *
 * brief: 聚合 public/ 下的品牌、视觉与音乐资产，前后端全端唯一引用入口
 *
 * details:
 * - 资产根目录统一取自 process.env.PUBLIC_URL（兼容 CRA 子路径部署）
 * - 音频文件名含中文与空格，统一通过 encodeURIComponent 编码
 * - 封面与海报按序号循环分配，避免空图与 404
 *
 * dependencies: Create React App PUBLIC_URL
 * exports: ASSETS, resolveCover, resolvePoster
 */

const PUBLIC = process.env.PUBLIC_URL || '';

const withPublic = (path) => `${PUBLIC}${path}`;

const coverFiles = [
  'D-cover-01.jpg',
  'D-cover-02.jpg',
  'D-cover-03.jpg',
  'D-cover-04.jpg',
  'D-cover-05.jpg',
  'D-cover-06.jpg',
  'D-cover-07.jpg',
  'D-cover-08.jpg',
];

const posterFiles = [
  'D-poster-01.jpg',
  'D-poster-02.jpg',
  'D-poster-03.jpg',
  'D-poster-04.jpg',
  'D-poster-05.jpg',
  'D-poster-06.jpg',
];

const trackFiles = [
  { file: '董小姐 & 沫言 - 奉陪.mp3', title: '奉陪', artist: '董小姐 & 沫言' },
  { file: '董小姐 & 沫言 - 时光.mp3', title: '时光', artist: '董小姐 & 沫言' },
  { file: '董小姐 & 沫言 - 浮生如渡.mp3', title: '浮生如渡', artist: '董小姐 & 沫言' },
  { file: '董小姐 & 沫言 - 渡心时序.mp3', title: '渡心时序', artist: '董小姐 & 沫言' },
  { file: '董小姐 & 沫言 - 岁月如歌.mp3', title: '岁月如歌', artist: '董小姐 & 沫言' },
  { file: '董小姐 - 岁月如歌.mp3', title: '岁月如歌', artist: '董小姐' },
  { file: '董小姐 - 我是渡船也是过客.mp3', title: '我是渡船也是过客', artist: '董小姐' },
  { file: '董小姐 - 我的宝贝.mp3', title: '我的宝贝', artist: '董小姐' },
  { file: '董小姐 - 秋风不问梧桐意.mp3', title: '秋风不问梧桐意', artist: '董小姐' },
  { file: '董小姐 - 过客.mp3', title: '过客', artist: '董小姐' },
  { file: '董小姐 - 除了你.mp3', title: '除了你', artist: '董小姐' },
];

const covers = coverFiles.map((name) => withPublic(`/D-cover/${name}`));
const posters = posterFiles.map((name) => withPublic(`/D-poster/${name}`));

const tracks = trackFiles.map((track, index) => ({
  id: `m98-track-${index + 1}`,
  title: track.title,
  artist: track.artist,
  genre: '东方电子',
  coverArt: covers[index % covers.length],
  streamUrl: withPublic(`/D-Music/${encodeURIComponent(track.file)}`),
}));

export const ASSETS = {
  brand: {
    logo: withPublic('/D-Music-icons/logo.svg'),
    banner: withPublic('/D-MusAI.png'),
    wordmark: withPublic('/D-music.png'),
    emblem: withPublic('/music.png'),
    ogImage: withPublic('/D-MusAI.png'),
    appleTouchIcon: withPublic('/D-Music-icons/ios/AppIcon.appiconset/Icon-App-60x60@3x.png'),
    favicon: withPublic('/D-Music-icons/logo.svg'),
  },
  icons: {
    android: withPublic('/D-Music-icons/android/mipmap-xxxhdpi/ic_launcher.png'),
    playStore: withPublic('/D-Music-icons/android/playstore-icon.png'),
    ios: withPublic('/D-Music-icons/ios/AppIcon.appiconset/Icon-App-1024x1024@1x.png'),
    macos: withPublic('/D-Music-icons/macos/AppIcon.iconset/icon_512x512.png'),
  },
  covers,
  posters,
  tracks,
};

export const resolveCover = (index = 0) => covers[index % covers.length];

export const resolvePoster = (index = 0) => posters[index % posters.length];

export default ASSETS;
