// 跨域共享基础类型 — 全局枚举（情绪/语言/播放/主题）、i18n 上下文与通用工具类型

/** Core emotion types used across audio engine, annotations, and AI */
export type Emotion = 'happy' | 'sad' | 'energetic' | 'calm' | 'neutral';

/** Extended emotion types (includes AI lyrics themes) */
export type EmotionExtended =
  | Emotion
  | 'love'
  | 'nostalgic'
  | 'hopeful'
  | 'angry'
  | 'romantic';

/** Language codes for i18n */
export type Lang = 'zh' | 'en';

/** Playback repeat modes */
export type RepeatMode = 'off' | 'all' | 'one';

/** Media display modes */
export type MediaMode = 'audio' | 'video';

/** Audio engine source modes */
export type AudioMode = 'file' | 'demo';

/** Theme system identifiers */
export type ThemeId =
  | 'deep-space'
  | 'aurora'
  | 'ocean'
  | 'light'
  | 'midnight'
  | 'custom';

/** i18n context value */
export interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

/**
 * Make specific keys of T required.
 * @example RequireKeys<User, 'id' | 'email'>
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make all keys optional except specified ones.
 * @example PartialExcept<Track, 'id' | 'title'>
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/**
 * Deep partial — makes all nested properties optional.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the element type from an array type.
 * @example ArrayElement<Track[]> → Track
 */
export type ArrayElement<T extends readonly any[]> =
  T extends readonly (infer U)[] ? U : never;

/**
 * Nullable wrapper — T or null.
 */
export type Nullable<T> = T | null;

/**
 * Ensure a type has an `id` field.
 */
export type WithId<T> = T & { id: string };

/**
 * Timestamp-stamped wrapper — adds `createdAt` and `updatedAt`.
 */
export type Timestamped<T> = T & {
  createdAt: number;
  updatedAt: number;
};

/**
 * Branded type for type-safe nominal typing.
 * @example type UserId = Brand<string, 'UserId'>
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Branded string types for type safety */
export type UserId = Brand<string, 'UserId'>;
export type SongId = Brand<string, 'SongId'>;
export type WorkId = Brand<string, 'WorkId'>;
export type AlbumId = Brand<string, 'AlbumId'>;
export type ListingId = Brand<string, 'ListingId'>;

/**
 * Standard callback for panel close actions.
 */
export type CloseHandler = () => void;

/**
 * Standard callback for value updates.
 */
export type UpdateHandler<T> = (value: T) => void;
