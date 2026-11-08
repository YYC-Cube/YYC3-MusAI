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

import { ROUTE_PREFIX, kv, registerSongId, queryCache, createAdminClient } from "./server-utils.ts";
import { rateLimit, RATE_SENSITIVE } from "./rate-limit.ts";
import { validate } from "./validation.ts";
import { z } from "npm:zod@3.23.8";

// ==========================================
// Constants
// ==========================================

const MEDIA_BUCKET = 'make-f626b673-media';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const SIGNED_URL_EXPIRY = 3600; // 1 hour

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
    const sb = createAdminClient();
    const { data: buckets } = await sb.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.name === MEDIA_BUCKET);
    if (!exists) {
      await sb.storage.createBucket(MEDIA_BUCKET, { public: false });
      console.log(`[Upload] Created media bucket: ${MEDIA_BUCKET}`);
    }
    bucketEnsured = true;
  } catch (err) {
    console.log(`[Upload] Error ensuring bucket: ${err}`);
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
  const sb = createAdminClient();
  const mediaId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = getExtension(opts.mimeType);
  const filePath = `${userId}/${mediaId}.${ext}`;

  // Upload to Storage
  const { error: uploadErr } = await sb.storage
    .from(MEDIA_BUCKET)
    .upload(filePath, fileBytes, { contentType: opts.mimeType, upsert: false });

  if (uploadErr) {
    throw new Error(`Storage upload error: ${uploadErr.message}`);
  }

  // Upload cover if provided
  let coverPath: string | null = null;
  if (opts.coverBase64 && opts.coverMimeType) {
    try {
      const coverBytes = base64ToUint8Array(opts.coverBase64);
      if (coverBytes.length <= 2 * 1024 * 1024) {
        const coverExt = opts.coverMimeType.includes('png') ? 'png' : 'jpg';
        coverPath = `${userId}/${mediaId}-cover.${coverExt}`;
        await sb.storage
          .from(MEDIA_BUCKET)
          .upload(coverPath, coverBytes, { contentType: opts.coverMimeType, upsert: false });
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

  // Generate signed URLs
  const { data: signedData } = await sb.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  let coverSignedUrl: string | null = null;
  if (coverPath) {
    const { data: coverSigned } = await sb.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(coverPath, SIGNED_URL_EXPIRY);
    coverSignedUrl = coverSigned?.signedUrl || null;
  }

  queryCache.invalidate('cache:song-index');

  console.log(`[Upload] Media uploaded: ${mediaId} (${meta.mediaType}, ${(meta.fileSize / 1024).toFixed(0)}KB) by ${userId}`);

  return {
    media: {
      ...meta,
      signedUrl: signedData?.signedUrl || null,
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
      const metaRaw = await kv.get(`media:${mediaId}`);
      if (!metaRaw) {
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

  // ---- GET /upload/media/:mediaId -- Get media info + signed URL ----
  app.get(`${ROUTE_PREFIX}/upload/media/:mediaId`, async (c: any) => {
    const mediaId = c.req.param('mediaId');
    // Exclude lyrics sub-routes
    if (mediaId === 'lyrics') return;
    try {
      const raw = await kv.get(`media:${mediaId}`);
      if (!raw) {
        return c.json({ error: 'Media not found' }, 404);
      }
      const meta: MediaMeta = JSON.parse(raw as string);

      const sb = createAdminClient();
      const { data: signedData, error } = await sb.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(meta.filePath, SIGNED_URL_EXPIRY);

      if (error) {
        console.log(`[Upload] Signed URL error for ${mediaId}:`, error);
        return c.json({ error: 'Failed to generate playback URL' }, 500);
      }

      let coverSignedUrl = null;
      if (meta.coverPath) {
        const { data: coverSigned } = await sb.storage
          .from(MEDIA_BUCKET)
          .createSignedUrl(meta.coverPath, SIGNED_URL_EXPIRY);
        coverSignedUrl = coverSigned?.signedUrl || null;
      }

      // Also include lyrics if available
      const lyricsRaw = await kv.get(`lyrics:${mediaId}`);
      const lyrics = lyricsRaw ? JSON.parse(lyricsRaw as string) : [];

      return c.json({
        media: {
          ...meta,
          signedUrl: signedData?.signedUrl || null,
          coverSignedUrl,
          lyrics,
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
        const raw = await kv.get(`media:user:${userId}`);
        mediaIds = raw ? JSON.parse(raw as string) : [];
      } else {
        const raw = await kv.get('media:index');
        mediaIds = raw ? JSON.parse(raw as string) : [];
      }

      // Fetch metadata for each (limited to 50)
      const limited = mediaIds.slice(0, 50);
      const sb = createAdminClient();
      const mediaList: any[] = [];

      for (const id of limited) {
        const raw = await kv.get(`media:${id}`);
        if (raw) {
          const meta: MediaMeta = JSON.parse(raw as string);
          const { data: signedData } = await sb.storage
            .from(MEDIA_BUCKET)
            .createSignedUrl(meta.filePath, SIGNED_URL_EXPIRY);

          let coverSignedUrl = null;
          if (meta.coverPath) {
            const { data: coverSigned } = await sb.storage
              .from(MEDIA_BUCKET)
              .createSignedUrl(meta.coverPath, SIGNED_URL_EXPIRY);
            coverSignedUrl = coverSigned?.signedUrl || null;
          }

          mediaList.push({
            ...meta,
            signedUrl: signedData?.signedUrl || null,
            coverSignedUrl,
          });
        }
      }

      return c.json({ media: mediaList, total: mediaIds.length });

    } catch (error) {
      console.log(`[Upload] Error listing media:`, error);
      return c.json({ error: `Failed to list media: ${error}` }, 500);
    }
  });

  // ---- DELETE /upload/media/:mediaId -- Delete uploaded media ----
  app.delete(`${ROUTE_PREFIX}/upload/media/:mediaId`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    const mediaId = c.req.param('mediaId');
    try {
      const raw = await kv.get(`media:${mediaId}`);
      if (!raw) {
        return c.json({ error: 'Media not found' }, 404);
      }
      const meta: MediaMeta = JSON.parse(raw as string);

      // Delete from Storage
      const sb = createAdminClient();
      await sb.storage.from(MEDIA_BUCKET).remove([meta.filePath]);
      if (meta.coverPath) {
        await sb.storage.from(MEDIA_BUCKET).remove([meta.coverPath]);
      }

      // Delete KV metadata + lyrics
      await kv.del(`media:${mediaId}`);
      await kv.del(`lyrics:${mediaId}`);

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
