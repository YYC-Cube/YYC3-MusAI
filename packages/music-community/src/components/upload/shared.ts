// 社区面板共享层 · 上传面板类型 / 常量 / i18n / 工具函数

// ==========================================
// Types
// ==========================================

export interface UploadedMedia {
  id: string;
  userId: string;
  userName: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  description: string;
  mimeType: string;
  mediaType: 'audio' | 'video';
  filePath: string;
  fileSize: number;
  coverPath: string | null;
  isPublic: boolean;
  tags: string[];
  plays: number;
  likes: number;
  createdAt: number;
  signedUrl: string | null;
  coverSignedUrl: string | null;
}

export interface LyricLine {
  time: number;
  text: string;
  translation: string;
  emotion: 'happy' | 'sad' | 'energetic' | 'calm' | 'neutral';
}

/** Single file in the batch queue */
export interface BatchFileItem {
  id: string;
  file: File;
  title: string;
  artist: string;
  album: string;
  genre: string;
  tags: string;
  description: string;
  isPublic: boolean;
  coverFile: File | null;
  coverPreview: string | null;
  duration: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number; // 0-100
  error: string;
  result: UploadedMedia | null;
  expanded: boolean; // metadata form expanded
}

// ==========================================
// Constants
// ==========================================

export const ACCEPT_AUDIO = '.mp3,.wav,.flac,.ogg,.m4a,.webm,.aac';
export const ACCEPT_VIDEO = '.mp4,.webm,.mov';
export const ACCEPT_ALL = `${ACCEPT_AUDIO},${ACCEPT_VIDEO}`;
export const ACCEPT_IMAGE = '.jpg,.jpeg,.png,.webp';
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_COVER_SIZE = 2 * 1024 * 1024;
export const CHUNK_SIZE_BYTES = 512 * 1024; // 512KB per chunk
export const MAX_BATCH = 20;

export const GENRES = [
  'Electronic', 'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Jazz', 'Classical',
  'Folk', 'Metal', 'Indie', 'Ambient', 'Lo-Fi', 'Synthwave', 'Other',
];

export const EMOTIONS: Array<{ value: LyricLine['emotion']; label: { zh: string; en: string } }> = [
  { value: 'happy', label: { zh: '快乐', en: 'Happy' } },
  { value: 'sad', label: { zh: '悲伤', en: 'Sad' } },
  { value: 'energetic', label: { zh: '激情', en: 'Energetic' } },
  { value: 'calm', label: { zh: '平静', en: 'Calm' } },
  { value: 'neutral', label: { zh: '中性', en: 'Neutral' } },
];

// ==========================================
// i18n
// ==========================================

export const T = {
  'upload.title': { zh: '上传音乐/视频', en: 'Upload Music / Video' },
  'upload.dragDrop': { zh: '将文件拖拽到这里（支持批量）', en: 'Drag & drop files here (batch supported)' },
  'upload.or': { zh: '或', en: 'or' },
  'upload.browse': { zh: '浏览文件', en: 'Browse Files' },
  'upload.formats': { zh: '支持 MP3、WAV、FLAC、OGG、M4A、MP4、WebM', en: 'MP3, WAV, FLAC, OGG, M4A, MP4, WebM' },
  'upload.maxSize': { zh: '单文件最大 10MB，批量最多 20 个', en: 'Max 10MB/file, up to 20 files' },
  'upload.songTitle': { zh: '标题', en: 'Title' },
  'upload.artist': { zh: '艺术家', en: 'Artist' },
  'upload.album': { zh: '专辑', en: 'Album' },
  'upload.genre': { zh: '流派', en: 'Genre' },
  'upload.description': { zh: '描述', en: 'Description' },
  'upload.tags': { zh: '标签（逗号分隔）', en: 'Tags (comma sep.)' },
  'upload.cover': { zh: '封面', en: 'Cover' },
  'upload.public': { zh: '公开', en: 'Public' },
  'upload.private': { zh: '私密', en: 'Private' },
  'upload.submit': { zh: '开始上传', en: 'Start Upload' },
  'upload.uploading': { zh: '上传中', en: 'Uploading' },
  'upload.success': { zh: '上传成功', en: 'Upload successful' },
  'upload.error': { zh: '上传失败', en: 'Upload failed' },
  'upload.myUploads': { zh: '我的上传', en: 'My Uploads' },
  'upload.noUploads': { zh: '暂无上传', en: 'No uploads yet' },
  'upload.delete': { zh: '删除', en: 'Delete' },
  'upload.fileTooLarge': { zh: '文件过大（最大 10MB）', en: 'File too large (max 10MB)' },
  'upload.invalidType': { zh: '不支持的格式', en: 'Unsupported format' },
  'upload.selectCover': { zh: '选择封面', en: 'Select Cover' },
  'upload.loading': { zh: '加载中...', en: 'Loading...' },
  'upload.batchQueue': { zh: '上传队列', en: 'Upload Queue' },
  'upload.clearQueue': { zh: '清空队列', en: 'Clear Queue' },
  'upload.removeFile': { zh: '移除', en: 'Remove' },
  'upload.editMeta': { zh: '编辑信息', en: 'Edit Info' },
  'upload.filesReady': { zh: '个文件就绪', en: 'file(s) ready' },
  'upload.allDone': { zh: '全部完成', en: 'All done' },
  'upload.lyrics': { zh: '歌词编辑', en: 'Lyrics Editor' },
  'upload.lyricsTab': { zh: '歌词', en: 'Lyrics' },
  'upload.addLine': { zh: '添加一行', en: 'Add Line' },
  'upload.saveLyrics': { zh: '保存歌词', en: 'Save Lyrics' },
  'upload.lyricsSaved': { zh: '歌词已保存', en: 'Lyrics saved' },
  'upload.lyricsTime': { zh: '时间(秒)', en: 'Time(s)' },
  'upload.lyricsText': { zh: '歌词文本', en: 'Lyric text' },
  'upload.lyricsTranslation': { zh: '翻译', en: 'Translation' },
  'upload.lyricsEmotion': { zh: '情感', en: 'Emotion' },
  'upload.parseLrc': { zh: '导入LRC', en: 'Import LRC' },
  'upload.noLyrics': { zh: '暂无歌词，点击添加', en: 'No lyrics yet, click to add' },
  'upload.uploadAll': { zh: '全部上传', en: 'Upload All' },
} as const;

// ==========================================
// Utility
// ==========================================

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Read a slice of a file as base64 */
export function fileSliceToBase64(file: File, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = file.slice(start, end);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = file.type.startsWith('video/')
      ? document.createElement('video')
      : document.createElement('audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      resolve(el.duration || 0);
      URL.revokeObjectURL(url);
    };
    el.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
    el.src = url;
  });
}

export function isValidMediaFile(file: File): boolean {
  const validTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac',
    'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/aac',
    'audio/x-m4a', 'audio/mp4',
    'video/mp4', 'video/webm', 'video/quicktime',
  ];
  return validTypes.includes(file.type) || /\.(mp3|wav|flac|ogg|m4a|webm|aac|mp4|mov)$/i.test(file.name);
}

/** Parse LRC format lyrics into structured lines */
export function parseLRC(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const line of lrcText.split('\n')) {
    const match = line.trim().match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3], 10);
      const time = minutes * 60 + seconds + ms / (match[3].length === 3 ? 1000 : 100);
      const text = match[4].trim();
      if (text) {
        lines.push({ time, text, translation: '', emotion: 'neutral' });
      }
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
