/**
 * D-Music $27 -- Media Upload Routes (batch, chunked, lyrics editor)
 *
 * Routes:
 *   POST   /upload/media                    -- Upload audio/video file (single, base64)
 *   POST   /upload/chunk/init               -- Init chunked upload session
 *   POST   /upload/chunk/:sessionId         -- Upload a chunk
 *   POST   /upload/chunk/:sessionId/complete -- Finalize chunked upload
 *   PUT    /upload/media/:mediaId/lyrics    -- Save lyrics for a media item
 *   GET    /upload/media/:mediaId           -- Get media info + signed playback URL
 *   GET    /upload/media                    -- List user's uploaded media
 *   DELETE /upload/media/:mediaId           -- Delete uploaded media
 *
 * Storage:
 *   Bucket: make-f626b673-media (private, auto-created on startup)
 *   Path format: {userId}/{mediaId}.{ext}
 *
 * KV Schema:
 *   media:{mediaId}             -- Media metadata (JSON)
 *   media:user:{userId}         -- Array of mediaIds uploaded by user (JSON)
 *   media:index                 -- Array of all public mediaIds (JSON)
 *   lyrics:{mediaId}            -- Lyrics array (JSON)
 */

import { ROUTE_PREFIX, kv, registerSongId, queryCache, getUserFromRequest } from "./server-utils.ts";
import { rateLimit, RATE_SENSITIVE } from "./rate-limit.ts";
import { validate } from "./validation.ts";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import {
  getMediaById, listUserMediaIds, listPublicMediaIds, upsertMedia, deleteMedia,
} from "./db.ts";
import { apiError, ERROR_CODES, parsePagination, pageMeta } from "./api-contract.ts";

// ==========================================
// Constants
// ==========================================

const MEDIA_BUCKET = 'make-f626b673-media';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const SIGNED_URL_EXPIRY = 3600; // 1 hour
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

/** 媒体播放地址（相对/绝对，由 PUBLIC_BASE_URL 决定） */
function mediaFileUrl(mediaId: string, variant?: 'cover'): string {
  const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
  const suffix = variant === 'cover' ? '?variant=cover' : '';
  return `${base}${ROUTE_PREFIX}/upload/media/${mediaId}/file${suffix}`;
}

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac',
  'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/aac', 'audio/x-m4a',
  'audio/mp4',
];
const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
];
const ALLOWED_TYPES = [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES];

// ==========================================
// Zod Schemas
// ==========================================

const mediaUploadSchema = z.object({
  fileBase64: z.string().min(1, 'File data required'),
  mimeType: z.string().refine(
    t => ALLOWED_TYPES.includes(t),
    { message: `Unsupported file type` }
  ),
  title: z.string().trim().min(1, 'Title required').max(200),
  artist: z.string().trim().max(100).optional().default('Unknown Artist'),
  album: z.string().trim().max(200).optional().default('Unknown Album'),
  genre: z.string().trim().max(50).optional().default('Other'),
  duration: z.number().nonnegative().optional().default(0),
  description: z.string().max(1000).optional().default(''),
  isPublic: z.boolean().optional().default(true),
  coverBase64: z.string().optional(),
  coverMimeType: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional().default([]),
});

const lyricsLineSchema = z.object({
  time: z.number().nonnegative(),
  text: z.string().max(500),
  translation: z.string().max(500).optional().default(''),
  emotion: z.enum(['happy', 'sad', 'energetic', 'calm', 'neutral']).optional().default('neutral'),
});

const saveLyricsSchema = z.object({
  lyrics: z.array(lyricsLineSchema).max(500),
});

const chunkInitSchema = z.object({
  fileName: z.string().min(1).max(300),
  mimeType: z.string().refine(t => ALLOWED_TYPES.includes(t), { message: 'Unsupported file type' }),
  totalChunks: z.number().int().min(1).max(20),
  totalSize: z.number().int().min(1).max(MAX_FILE_SIZE_BYTES),
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(100).optional().default('Unknown Artist'),
  album: z.string().trim().max(200).optional().default('Unknown Album'),
  genre: z.string().trim().max(50).optional().default('Other'),
  duration: z.number().nonnegative().optional().default(0),
  description: z.string().max(1000).optional().default(''),
  isPublic: z.boolean().optional().default(true),
  coverBase64: z.string().optional(),
  coverMimeType: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional().default([]),
});

const chunkUploadSchema = z.object({
  chunkIndex: z.number().int().nonnegative(),
  chunkBase64: z.string().min(1),
});

// ==========================================
// Types
// ==========================================

interface MediaMeta {
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
}

// ==========================================
// Chunk Session Store (in-memory)
// ==========================================

interface ChunkSession {
  userId: string;
  userName: string;
  meta: z.infer<typeof chunkInitSchema>;
  chunks: (Uint8Array | null)[];
  received: number;
  totalChunks: number;
  totalSize: number;
  createdAt: number;
}

const chunkSessions = new Map<string, ChunkSession>();

// Cleanup stale sessions every 10 min
setInterval(() => {
  const now = Date.now();
  for (const [sid, s] of chunkSessions.entries()) {
    if (now - s.createdAt > 30 * 60 * 1000) {
      chunkSessions.delete(sid);
      console.log(`[Upload] Cleaned up stale chunk session: ${sid}`);
    }
  }
}, 10 * 60 * 1000);

// ==========================================
// Helpers
// ==========================================

let bucketEnsured = false;

async function ensureMediaBucket(): Promise<void> {
  if (bucketEnsured) return;
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`[Upload] Ensured local media dir: ${UPLOAD_DIR}`);
    bucketEnsured = true;
  } catch (err) {
    console.log(`[Upload] Error ensuring media dir: ${err}`);
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav',
    'audio/flac': 'flac', 'audio/ogg': 'ogg', 'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a', 'audio/mp4': 'm4a', 'audio/webm': 'weba',
    'audio/aac': 'aac',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
  };
  return map[mimeType] || 'bin';
}

function isVideoType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

/** P1b: 读取媒体元数据——关系表优先，未命中回退 KV */
async function getMediaMeta(mediaId: string): Promise<MediaMeta | null> {
  const fromDb = await getMediaById(mediaId);
  if (fromDb) return fromDb as MediaMeta;
  const raw = await kv.get(`media:${mediaId}`);
  if (!raw) return null;
  try { return JSON.parse(raw as string) as MediaMeta; } catch { return null; }
}

/** Upload bytes to Storage, store meta in KV, return full media object with signed URLs */
async function finalizeUpload(
  fileBytes: Uint8Array,
  userId: string,
  userName: string,
  opts: {
    mimeType: string; title: string; artist: string; album: string;
    genre: string; duration: number; description: string; isPublic: boolean;
    tags: string[]; coverBase64?: string; coverMimeType?: string;
  }
): Promise<{ media: MediaMeta & { signedUrl: string | null; coverSignedUrl: string | null } }> {
  const mediaId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = getExtension(opts.mimeType);
  const filePath = path.join(UPLOAD_DIR, userId, `${mediaId}.${ext}`);

  // Write to local filesystem
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, fileBytes);
  } catch (err) {
    throw new Error(`Local storage write error: ${err}`);
  }

  // Upload cover if provided
  let coverPath: string | null = null;
  if (opts.coverBase64 && opts.coverMimeType) {
    try {
      const coverBytes = base64ToUint8Array(opts.coverBase64);
      if (coverBytes.length <= 2 * 1024 * 1024) {
        const coverExt = opts.coverMimeType.includes('png') ? 'png' : 'jpg';
        coverPath = path.join(UPLOAD_DIR, userId, `${mediaId}-cover.${coverExt}`);
        fs.writeFileSync(coverPath, coverBytes);
      }
    } catch (err) {
      console.log(`[Upload] Cover upload error (non-fatal):`, err);
    }
  }

  // Build metadata
  const meta: MediaMeta = {
    id: mediaId, userId, userName,
    title: opts.title, artist: opts.artist, album: opts.album,
    genre: opts.genre, duration: opts.duration, description: opts.description,
    mimeType: opts.mimeType, mediaType: isVideoType(opts.mimeType) ? 'video' : 'audio',
    filePath, fileSize: fileBytes.length, coverPath,
    isPublic: opts.isPublic, tags: opts.tags,
    plays: 0, likes: 0, createdAt: Date.now(),
  };

  // KV: store metadata
  await kv.set(`media:${mediaId}`, JSON.stringify(meta));

  // KV: update user's media list
  const userMediaRaw = await kv.get(`media:user:${userId}`);
  const userMedia: string[] = userMediaRaw ? JSON.parse(userMediaRaw as string) : [];
  userMedia.unshift(mediaId);
  await kv.set(`media:user:${userId}`, JSON.stringify(userMedia));

  // KV: update public index
  if (opts.isPublic) {
    const indexRaw = await kv.get('media:index');
    const index: string[] = indexRaw ? JSON.parse(indexRaw as string) : [];
    index.unshift(mediaId);
    if (index.length > 500) index.length = 500;
    await kv.set('media:index', JSON.stringify(index));
  }

  // Register in song index
  await registerSongId(mediaId);

  // P1b: 关系表侧尽力同步元数据
  await upsertMedia(meta);

  // 播放地址（相对/绝对由 PUBLIC_BASE_URL 决定）
  const signedUrl = mediaFileUrl(mediaId);
  const coverSignedUrl: string | null = coverPath ? mediaFileUrl(mediaId, 'cover') : null;

  queryCache.invalidate('cache:song-index');

  console.log(`[Upload] Media uploaded: ${mediaId} (${meta.mediaType}, ${(meta.fileSize / 1024).toFixed(0)}KB) by ${userId}`);

  return {
    media: {
      ...meta,
      signedUrl,
      coverSignedUrl,
    },
  };
}

// ==========================================
// Route Registration
// ==========================================

export function registerUploadRoutes(app: any) {

  // ---- POST /upload/media -- Single file upload (base64) ----
  app.post(`${ROUTE_PREFIX}/upload/media`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    try {
      await ensureMediaBucket();
      const body = await c.req.json();

      const parsed = validate(mediaUploadSchema, body);
      if (!parsed.success) {
        return c.json({ error: parsed.error }, 400);
      }
      const data = parsed.data;

      let fileBytes: Uint8Array;
      try {
        fileBytes = base64ToUint8Array(data.fileBase64);
      } catch (_err) {
        return c.json({ error: 'Invalid base64 file data' }, 400);
      }

      if (fileBytes.length > MAX_FILE_SIZE_BYTES) {
        return c.json({
          error: `File too large. Max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB, got ${(fileBytes.length / 1024 / 1024).toFixed(1)}MB`
        }, 400);
      }

      const userId = body.userId || 'anon';
      const userName = body.userName || 'Anonymous';

      const result = await finalizeUpload(fileBytes, userId, userName, {
        mimeType: data.mimeType, title: data.title, artist: data.artist,
        album: data.album, genre: data.genre, duration: data.duration,
        description: data.description, isPublic: data.isPublic, tags: data.tags,
        coverBase64: data.coverBase64, coverMimeType: data.coverMimeType,
      });

      return c.json({ success: true, ...result });

    } catch (error) {
      console.log(`[Upload] Error:`, error);
      return c.json({ error: `Upload failed: ${error}` }, 500);
    }
  });

  // ---- POST /upload/chunk/init -- Initialize chunked upload ----
  app.post(`${ROUTE_PREFIX}/upload/chunk/init`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(chunkInitSchema, body);
      if (!parsed.success) {
        return c.json({ error: parsed.error }, 400);
      }
      const data = parsed.data;
      const userId = body.userId || 'anon';
      const userName = body.userName || 'Anonymous';

      const sessionId = `cs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      chunkSessions.set(sessionId, {
        userId, userName, meta: data,
        chunks: new Array(data.totalChunks).fill(null),
        received: 0,
        totalChunks: data.totalChunks,
        totalSize: data.totalSize,
        createdAt: Date.now(),
      });

      console.log(`[Upload] Chunk session started: ${sessionId} (${data.totalChunks} chunks, ${(data.totalSize / 1024).toFixed(0)}KB)`);
      return c.json({ success: true, sessionId, totalChunks: data.totalChunks });

    } catch (error) {
      console.log(`[Upload] Chunk init error:`, error);
      return c.json({ error: `Chunk init failed: ${error}` }, 500);
    }
  });

  // ---- POST /upload/chunk/:sessionId -- Upload a single chunk ----
  app.post(`${ROUTE_PREFIX}/upload/chunk/:sessionId`, async (c: any) => {
    try {
      const sessionId = c.req.param('sessionId');
      const session = chunkSessions.get(sessionId);
      if (!session) {
        return c.json({ error: 'Session not found or expired' }, 404);
      }

      const body = await c.req.json();
      const parsed = validate(chunkUploadSchema, body);
      if (!parsed.success) {
        return c.json({ error: parsed.error }, 400);
      }
      const { chunkIndex, chunkBase64 } = parsed.data;

      if (chunkIndex >= session.totalChunks) {
        return c.json({ error: 'Chunk index out of range' }, 400);
      }

      let chunkBytes: Uint8Array;
      try {
        chunkBytes = base64ToUint8Array(chunkBase64);
      } catch (_err) {
        return c.json({ error: 'Invalid base64 chunk data' }, 400);
      }

      // Store chunk
      if (!session.chunks[chunkIndex]) {
        session.received++;
      }
      session.chunks[chunkIndex] = chunkBytes;

      console.log(`[Upload] Chunk ${chunkIndex + 1}/${session.totalChunks} received for ${sessionId}`);
      return c.json({
        success: true,
        chunkIndex,
        received: session.received,
        totalChunks: session.totalChunks,
        progress: Math.round((session.received / session.totalChunks) * 100),
      });

    } catch (error) {
      console.log(`[Upload] Chunk upload error:`, error);
      return c.json({ error: `Chunk upload failed: ${error}` }, 500);
    }
  });

  // ---- POST /upload/chunk/:sessionId/complete -- Finalize chunked upload ----
  app.post(`${ROUTE_PREFIX}/upload/chunk/:sessionId/complete`, async (c: any) => {
    try {
      await ensureMediaBucket();
      const sessionId = c.req.param('sessionId');
      const session = chunkSessions.get(sessionId);
      if (!session) {
        return c.json({ error: 'Session not found or expired' }, 404);
      }

      // Verify all chunks received
      if (session.received < session.totalChunks) {
        return c.json({
          error: `Missing chunks: received ${session.received}/${session.totalChunks}`,
          received: session.received,
          totalChunks: session.totalChunks,
        }, 400);
      }

      // Assemble chunks
      let totalLen = 0;
      for (const chunk of session.chunks) {
        if (!chunk) {
          return c.json({ error: 'Missing chunk data' }, 400);
        }
        totalLen += chunk.length;
      }

      const assembled = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of session.chunks) {
        assembled.set(chunk!, offset);
        offset += chunk!.length;
      }

      if (assembled.length > MAX_FILE_SIZE_BYTES) {
        chunkSessions.delete(sessionId);
        return c.json({ error: `Assembled file too large: ${(assembled.length / 1024 / 1024).toFixed(1)}MB` }, 400);
      }

      const m = session.meta;
      const result = await finalizeUpload(assembled, session.userId, session.userName, {
        mimeType: m.mimeType, title: m.title, artist: m.artist,
        album: m.album, genre: m.genre, duration: m.duration,
        description: m.description, isPublic: m.isPublic, tags: m.tags,
        coverBase64: m.coverBase64, coverMimeType: m.coverMimeType,
      });

      // Clean up session
      chunkSessions.delete(sessionId);

      console.log(`[Upload] Chunked upload finalized: ${sessionId} -> ${result.media.id}`);
      return c.json({ success: true, ...result });

    } catch (error) {
      console.log(`[Upload] Chunk complete error:`, error);
      return c.json({ error: `Chunk finalization failed: ${error}` }, 500);
    }
  });

  // ---- PUT /upload/media/:mediaId/lyrics -- Save lyrics ----
  app.put(`${ROUTE_PREFIX}/upload/media/:mediaId/lyrics`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    try {
      const mediaId = c.req.param('mediaId');
      // P1b: 存在性校验走统一读取（关系表优先，回退 KV）
      const meta = await getMediaMeta(mediaId);
      if (!meta) {
        return c.json({ error: 'Media not found' }, 404);
      }

      const body = await c.req.json();
      const parsed = validate(saveLyricsSchema, body);
      if (!parsed.success) {
        return c.json({ error: parsed.error }, 400);
      }

      // Sort by time
      const sorted = parsed.data.lyrics.sort((a: any, b: any) => a.time - b.time);
      await kv.set(`lyrics:${mediaId}`, JSON.stringify(sorted));

      console.log(`[Upload] Lyrics saved for ${mediaId}: ${sorted.length} lines`);
      return c.json({ success: true, mediaId, lyricsCount: sorted.length });

    } catch (error) {
      console.log(`[Upload] Save lyrics error:`, error);
      return c.json({ error: `Failed to save lyrics: ${error}` }, 500);
    }
  });

  // ---- GET /upload/media/:mediaId/lyrics -- Get lyrics ----
  app.get(`${ROUTE_PREFIX}/upload/media/:mediaId/lyrics`, async (c: any) => {
    try {
      const mediaId = c.req.param('mediaId');
      const raw = await kv.get(`lyrics:${mediaId}`);
      const lyrics = raw ? JSON.parse(raw as string) : [];
      return c.json({ lyrics, mediaId });
    } catch (error) {
      console.log(`[Upload] Get lyrics error:`, error);
      return c.json({ error: `Failed to get lyrics: ${error}` }, 500);
    }
  });

  // ---- GET /upload/media/:mediaId/file -- 流式播放（支持 Range）----
  app.get(`${ROUTE_PREFIX}/upload/media/:mediaId/file`, async (c: any) => {
    const mediaId = c.req.param('mediaId');
    try {
      const meta = await getMediaMeta(mediaId);
      if (!meta) return apiError(c, 404, 'Media not found', undefined, ERROR_CODES.NOT_FOUND);

      const user = await getUserFromRequest(c);
      if (!meta.isPublic && user?.id !== meta.userId) {
        return apiError(c, 403, '无权访问该媒体', undefined, ERROR_CODES.FORBIDDEN);
      }

      const variant = c.req.query('variant');
      const isCover = variant === 'cover';
      const filePath = isCover ? meta.coverPath : meta.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        return apiError(c, 404, 'Media file not found', undefined, ERROR_CODES.NOT_FOUND);
      }

      const stat = fs.statSync(filePath);
      const contentType = isCover
        ? (filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
        : (meta.mimeType || 'application/octet-stream');

      c.header('Content-Type', contentType);
      c.header('Accept-Ranges', 'bytes');
      c.header('Cache-Control', 'private, max-age=3600');

      const range = c.req.header('range');
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        if (m) {
          const start = m[1] ? parseInt(m[1], 10) : 0;
          const end = m[2] ? Math.min(parseInt(m[2], 10), stat.size - 1) : stat.size - 1;
          if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
            c.status(416);
            c.header('Content-Range', `bytes */${stat.size}`);
            return c.body(null);
          }
          c.status(206);
          c.header('Content-Range', `bytes ${start}-${end}/${stat.size}`);
          c.header('Content-Length', String(end - start + 1));
          return c.body(Readable.toWeb(fs.createReadStream(filePath, { start, end })) as any);
        }
      }

      c.header('Content-Length', String(stat.size));
      return c.body(Readable.toWeb(fs.createReadStream(filePath)) as any);
    } catch (error) {
      console.log(`[Upload] Stream error ${mediaId}:`, error);
      return apiError(c, 500, '读取媒体失败', { detail: String(error) }, ERROR_CODES.INTERNAL);
    }
  });

  // ---- GET /upload/media/:mediaId -- Get media info + signed URL ----
  app.get(`${ROUTE_PREFIX}/upload/media/:mediaId`, async (c: any) => {
    const mediaId = c.req.param('mediaId');
    // Exclude lyrics sub-routes
    if (mediaId === 'lyrics') return c.json({ error: 'Media not found' }, 404);
    try {
      // P1b: 关系表优先，未命中回退 KV
      const meta = await getMediaMeta(mediaId);
      if (!meta) {
        return c.json({ error: 'Media not found' }, 404);
      }

      // 播放地址
      const signedUrl = mediaFileUrl(mediaId);
      const coverSignedUrl = meta.coverPath ? mediaFileUrl(mediaId, 'cover') : null;

      // Also include lyrics if available
      const lyricsRaw = await kv.get(`lyrics:${mediaId}`);
      const lyrics = lyricsRaw ? JSON.parse(lyricsRaw as string) : [];

      return c.json({
        media: {
          ...meta,
          signedUrl,
          coverSignedUrl,
          lyrics,
          // W3-1: Range/206 由 Supabase Storage 端原生支持（签名 URL 直连），
          // 服务端不做流代理，避免带宽放大与 SSRF 面。
          streaming: {
            range: true,
            strategy: 'signed-url',
          },
        },
      });

    } catch (error) {
      console.log(`[Upload] Error fetching media ${mediaId}:`, error);
      return c.json({ error: `Failed to fetch media: ${error}` }, 500);
    }
  });

  // ---- GET /upload/media -- List uploaded media ----
  app.get(`${ROUTE_PREFIX}/upload/media`, async (c: any) => {
    try {
      const userId = c.req.query('userId');
      let mediaIds: string[];

      if (userId) {
        // P1b: 用户列表读优先关系表，空则回退 KV
        const dbIds = await listUserMediaIds(userId, 50);
        if (dbIds.length > 0) {
          mediaIds = dbIds;
        } else {
          const raw = await kv.get(`media:user:${userId}`);
          mediaIds = raw ? JSON.parse(raw as string) : [];
        }
      } else {
        const dbIds = await listPublicMediaIds(50);
        if (dbIds.length > 0) {
          mediaIds = dbIds;
        } else {
          const raw = await kv.get('media:index');
          mediaIds = raw ? JSON.parse(raw as string) : [];
        }
      }

      // Fetch metadata for each (A3：统一分页)
      const pager = parsePagination(c, { defaultLimit: 50, maxLimit: 100 });
      const limited = mediaIds.slice(pager.offset, pager.offset + pager.limit);
      const mediaList: any[] = [];

      for (const id of limited) {
        const meta = await getMediaMeta(id);
        if (meta) {
          mediaList.push({
            ...meta,
            signedUrl: mediaFileUrl(meta.id),
            coverSignedUrl: meta.coverPath ? mediaFileUrl(meta.id, 'cover') : null,
          });
        }
      }

      return c.json({ media: mediaList, ...pageMeta(mediaIds.length, pager) });

    } catch (error) {
      console.log(`[Upload] Error listing media:`, error);
      return apiError(c, 500, 'Failed to list media', { detail: String(error) });
    }
  });

  // ---- DELETE /upload/media/:mediaId -- Delete uploaded media ----
  app.delete(`${ROUTE_PREFIX}/upload/media/:mediaId`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    const mediaId = c.req.param('mediaId');
    try {
      // P1b: 关系表优先，未命中回退 KV
      const meta = await getMediaMeta(mediaId);
      if (!meta) {
        return c.json({ error: 'Media not found' }, 404);
      }

      // Delete from local filesystem
      try {
        if (meta.filePath) fs.unlinkSync(meta.filePath);
        if (meta.coverPath) fs.unlinkSync(meta.coverPath);
      } catch {
        // file may already be absent; ignore
      }

      // Delete KV metadata + lyrics
      await kv.del(`media:${mediaId}`);
      await kv.del(`lyrics:${mediaId}`);

      // P1b: 关系表侧尽力同步删除
      await deleteMedia(mediaId);

      // Remove from user's list
      const userRaw = await kv.get(`media:user:${meta.userId}`);
      if (userRaw) {
        const userMedia: string[] = JSON.parse(userRaw as string);
        const filtered = userMedia.filter(id => id !== mediaId);
        await kv.set(`media:user:${meta.userId}`, JSON.stringify(filtered));
      }

      // Remove from public index
      const indexRaw = await kv.get('media:index');
      if (indexRaw) {
        const index: string[] = JSON.parse(indexRaw as string);
        const filtered = index.filter(id => id !== mediaId);
        await kv.set('media:index', JSON.stringify(filtered));
      }

      queryCache.invalidate('cache:song-index');

      console.log(`[Upload] Media deleted: ${mediaId}`);
      return c.json({ success: true, deletedId: mediaId });

    } catch (error) {
      console.log(`[Upload] Error deleting media ${mediaId}:`, error);
      return c.json({ error: `Failed to delete: ${error}` }, 500);
    }
  });
}
