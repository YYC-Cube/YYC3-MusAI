/**
 * D-Music P3 §1 — Digital Album Distribution Routes
 *
 * Routes:
 *   GET  /albums                          — List all published albums
 *   GET  /albums/:albumId                 — Get album details
 *   POST /albums                          — Create/publish an album (auth required)
 *   POST /albums/:albumId/purchase        — Purchase an album with Star Power (auth required)
 *   GET  /albums/collection/:userId       — Get user's owned album collection
 *   GET  /albums/creator/:userId          — Get albums by creator
 *   POST /albums/:albumId/like            — Like an album
 *
 * KV Schema:
 *   album:{albumId}                       — Album metadata (JSON)
 *   album-index                           — Array of all albumIds (JSON)
 *   album:ownership:{albumId}:{userId}    — Ownership record (JSON: { purchasedAt, price })
 *   album:collection:{userId}             — Array of owned albumIds (JSON)
 *   album:creator:{userId}                — Array of created albumIds (JSON)
 *   album:likes:{albumId}                 — Like count (number)
 */

import { ROUTE_PREFIX, kv, requireAuth, queryCache } from "./server-utils.ts";
import { rateLimit, RATE_STARPOWER } from "./rate-limit.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { validate, albumCreateSchema, albumPurchaseSchema } from "./validation.ts";

// ==========================================
// Types
// ==========================================

interface Album {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  coverUrl: string;
  genre: string;
  tracks: Array<{
    songId: string;
    title: string;
    artist: string;
    duration: number;
    trackNumber: number;
  }>;
  price: number; // in Star Power
  limitedEdition: boolean;
  maxSupply: number | null;
  circulatingSupply: number;
  releaseDate: number;
  exclusiveContent: Array<{
    type: 'pdf' | 'stem' | 'video' | 'bonus-track';
    label: string;
    labelEn: string;
  }>;
  tags: string[];
  likes: number;
  totalSales: number;
  createdAt: number;
}

interface OwnershipRecord {
  albumId: string;
  userId: string;
  purchasedAt: number;
  price: number;
  edition: number; // e.g., #42 of 100
}

// ==========================================
// Demo Albums (seed data)
// ==========================================

const DEMO_ALBUMS: Album[] = [
  {
    id: 'album-cosmic-dreams',
    creatorId: 'system',
    creatorName: 'D-Music Official',
    title: '宇宙梦境',
    description: '六首融合电子与古典的太空主题原创作品，带你穿越星际。',
    coverUrl: '',
    genre: 'Electronic / Ambient',
    tracks: [
      { songId: 'track-1', title: 'Cosmic Dreams', artist: 'D-Music', duration: 245, trackNumber: 1 },
      { songId: 'track-2', title: 'Neon Horizon', artist: 'D-Music', duration: 198, trackNumber: 2 },
      { songId: 'track-3', title: 'Ocean Lullaby', artist: 'D-Music', duration: 276, trackNumber: 3 },
      { songId: 'track-4', title: 'Aurora Rising', artist: 'D-Music', duration: 212, trackNumber: 4 },
      { songId: 'track-5', title: 'Forest Whispers', artist: 'D-Music', duration: 189, trackNumber: 5 },
      { songId: 'track-6', title: 'Stellar Drift', artist: 'D-Music', duration: 234, trackNumber: 6 },
    ],
    price: 500,
    limitedEdition: true,
    maxSupply: 100,
    circulatingSupply: 0,
    releaseDate: Date.now() - 7 * 86400 * 1000,
    exclusiveContent: [
      { type: 'bonus-track', label: '隐藏曲目：暗物质', labelEn: 'Hidden Track: Dark Matter' },
      { type: 'pdf', label: '创作手记 PDF', labelEn: 'Creator Notes PDF' },
    ],
    tags: ['electronic', 'ambient', 'space', 'original'],
    likes: 42,
    totalSales: 0,
    createdAt: Date.now() - 7 * 86400 * 1000,
  },
  {
    id: 'album-neon-nights',
    creatorId: 'system',
    creatorName: 'D-Music Official',
    title: '霓虹夜曲',
    description: '赛博朋克风格专辑，四首高能电子舞曲，点燃你的夜晚。',
    coverUrl: '',
    genre: 'Synthwave / Cyberpunk',
    tracks: [
      { songId: 'track-2', title: 'Neon Horizon', artist: 'D-Music', duration: 198, trackNumber: 1 },
      { songId: 'track-4', title: 'Aurora Rising', artist: 'D-Music', duration: 212, trackNumber: 2 },
      { songId: 'track-6', title: 'Stellar Drift', artist: 'D-Music', duration: 234, trackNumber: 3 },
      { songId: 'track-1', title: 'Cosmic Dreams (Remix)', artist: 'D-Music', duration: 260, trackNumber: 4 },
    ],
    price: 300,
    limitedEdition: false,
    maxSupply: null,
    circulatingSupply: 0,
    releaseDate: Date.now() - 3 * 86400 * 1000,
    exclusiveContent: [
      { type: 'stem', label: '分轨素材包', labelEn: 'Stem Pack' },
    ],
    tags: ['synthwave', 'cyberpunk', 'dance', 'remix'],
    likes: 28,
    totalSales: 0,
    createdAt: Date.now() - 3 * 86400 * 1000,
  },
  {
    id: 'album-quiet-forest',
    creatorId: 'system',
    creatorName: 'D-Music Official',
    title: '静谧森林',
    description: '纯净的自然声景与钢琴旋律交织，适合冥想和深度放松。',
    coverUrl: '',
    genre: 'Classical / Ambient',
    tracks: [
      { songId: 'track-3', title: 'Ocean Lullaby', artist: 'D-Music', duration: 276, trackNumber: 1 },
      { songId: 'track-5', title: 'Forest Whispers', artist: 'D-Music', duration: 189, trackNumber: 2 },
      { songId: 'track-1', title: 'Cosmic Dreams (Acoustic)', artist: 'D-Music', duration: 230, trackNumber: 3 },
    ],
    price: 200,
    limitedEdition: true,
    maxSupply: 50,
    circulatingSupply: 0,
    releaseDate: Date.now() - 1 * 86400 * 1000,
    exclusiveContent: [
      { type: 'video', label: '录制花絮视频', labelEn: 'Behind-the-Scenes Video' },
    ],
    tags: ['classical', 'ambient', 'relaxation', 'meditation'],
    likes: 15,
    totalSales: 0,
    createdAt: Date.now() - 1 * 86400 * 1000,
  },
];

// ==========================================
// Helpers
// ==========================================

async function ensureDemoAlbums(): Promise<void> {
  const indexRaw = await kv.get('album-index');
  if (indexRaw) return; // Already initialized

  const albumIds: string[] = [];
  for (const album of DEMO_ALBUMS) {
    await kv.set(`album:${album.id}`, JSON.stringify(album));
    albumIds.push(album.id);
    await kv.set(`album:likes:${album.id}`, String(album.likes));
  }
  await kv.set('album-index', JSON.stringify(albumIds));
  await kv.set('album:creator:system', JSON.stringify(albumIds));
  console.log(`[Albums] Initialized ${albumIds.length} demo albums`);
}

async function getAlbumIndex(): Promise<string[]> {
  const raw = await kv.get('album-index');
  if (!raw) return [];
  try { return JSON.parse(raw as string); } catch { return []; }
}

async function getAlbum(albumId: string): Promise<Album | null> {
  const raw = await kv.get(`album:${albumId}`);
  if (!raw) return null;
  try { return JSON.parse(raw as string); } catch { return null; }
}

async function getUserCollection(userId: string): Promise<string[]> {
  const raw = await kv.get(`album:collection:${userId}`);
  if (!raw) return [];
  try { return JSON.parse(raw as string); } catch { return []; }
}

// ==========================================
// Route Registration
// ==========================================

export function registerAlbumRoutes(app: any) {
  // Seed demo data on first request
  let seeded = false;
  const ensureSeed = async () => {
    if (!seeded) { await ensureDemoAlbums(); seeded = true; }
  };

  // ---- GET /albums — List all published albums ----
  app.get(`${ROUTE_PREFIX}/albums`, async (c: any) => {
    try {
      await ensureSeed();
      const cached = queryCache.get<Album[]>('albums:list');
      if (cached) return c.json({ albums: cached, total: cached.length });

      const albumIds = await getAlbumIndex();
      const albums: Album[] = [];
      for (const id of albumIds) {
        const album = await getAlbum(id);
        if (album) {
          // Refresh likes count
          const likesRaw = await kv.get(`album:likes:${album.id}`);
          album.likes = likesRaw ? parseInt(likesRaw as string) : 0;
          albums.push(album);
        }
      }
      // Sort by release date descending
      albums.sort((a, b) => b.releaseDate - a.releaseDate);
      queryCache.set('albums:list', albums, 30_000); // 30s cache
      return c.json({ albums, total: albums.length });
    } catch (error) {
      console.log(`[Albums] Error listing albums:`, error);
      return c.json({ error: 'Failed to list albums', detail: String(error) }, 500);
    }
  });

  // ---- GET /albums/:albumId — Get album details ----
  app.get(`${ROUTE_PREFIX}/albums/:albumId`, async (c: any) => {
    const albumId = c.req.param('albumId');
    try {
      await ensureSeed();
      const album = await getAlbum(albumId);
      if (!album) return c.json({ error: 'Album not found' }, 404);

      const likesRaw = await kv.get(`album:likes:${albumId}`);
      album.likes = likesRaw ? parseInt(likesRaw as string) : 0;

      return c.json({ album });
    } catch (error) {
      console.log(`[Albums] Error fetching album ${albumId}:`, error);
      return c.json({ error: 'Failed to fetch album', detail: String(error) }, 500);
    }
  });

  // ---- POST /albums — Create/publish a new album (auth required) ----
  app.post(`${ROUTE_PREFIX}/albums`, requireAuth, async (c: any) => {
    try {
      await ensureSeed();
      const body = await c.req.json();
      const parsed = validate(albumCreateSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { creatorId, creatorName, title, description, genre, tracks, price, limitedEdition, maxSupply, tags } = parsed.data;

      const albumId = `album-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const album: Album = {
        id: albumId,
        creatorId,
        creatorName: creatorName || 'Anonymous',
        title,
        description: description || '',
        coverUrl: '',
        genre: genre || 'Other',
        tracks: (tracks as any[]).map((t: any, i: number) => ({
          songId: t.songId || `track-${i}`,
          title: t.title || `Track ${i + 1}`,
          artist: t.artist || creatorName || 'Unknown',
          duration: t.duration || 180,
          trackNumber: i + 1,
        })),
        price: Math.max(0, Math.round(price || 100)),
        limitedEdition: !!limitedEdition,
        maxSupply: limitedEdition ? Math.max(1, maxSupply || 100) : null,
        circulatingSupply: 0,
        releaseDate: Date.now(),
        exclusiveContent: [],
        tags: tags || [],
        likes: 0,
        totalSales: 0,
        createdAt: Date.now(),
      };

      // Save album
      await kv.set(`album:${albumId}`, JSON.stringify(album));
      await kv.set(`album:likes:${albumId}`, '0');

      // Update album index
      const albumIds = await getAlbumIndex();
      albumIds.push(albumId);
      await kv.set('album-index', JSON.stringify(albumIds));

      // Update creator index
      const creatorRaw = await kv.get(`album:creator:${creatorId}`);
      const creatorAlbums: string[] = creatorRaw ? JSON.parse(creatorRaw as string) : [];
      creatorAlbums.push(albumId);
      await kv.set(`album:creator:${creatorId}`, JSON.stringify(creatorAlbums));

      queryCache.invalidatePrefix('albums:');
      return c.json({ success: true, album });
    } catch (error) {
      console.log(`[Albums] Error creating album:`, error);
      return c.json({ error: 'Failed to create album', detail: String(error) }, 500);
    }
  });

  // ---- POST /albums/:albumId/purchase — Purchase with Star Power ----
  app.post(`${ROUTE_PREFIX}/albums/:albumId/purchase`, requireAuth, rateLimit(RATE_STARPOWER), async (c: any) => {
    const albumId = c.req.param('albumId');
    try {
      await ensureSeed();
      const body = await c.req.json();
      const parsed = validate(albumPurchaseSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId } = parsed.data;

      // Check if already owned
      const ownershipRaw = await kv.get(`album:ownership:${albumId}:${userId}`);
      if (ownershipRaw) {
        return c.json({ error: 'Album already owned', alreadyOwned: true }, 409);
      }

      // Get album
      const album = await getAlbum(albumId);
      if (!album) return c.json({ error: 'Album not found' }, 404);

      // Check supply
      if (album.limitedEdition && album.maxSupply && album.circulatingSupply >= album.maxSupply) {
        return c.json({ error: 'Album sold out', soldOut: true }, 409);
      }

      // Check Star Power balance
      const spRaw = await kv.get(`user:${userId}:starpower`);
      const currentSP = spRaw ? parseInt(spRaw as string) : 0;
      if (currentSP < album.price) {
        return c.json({
          error: 'Insufficient Star Power',
          required: album.price,
          current: currentSP,
          insufficientFunds: true,
        }, 402);
      }

      // §v11.1 — Optimistic concurrency: re-read SP right before deduction to prevent race
      const spRecheck = await kv.get(`user:${userId}:starpower`);
      const verifiedSP = spRecheck ? parseInt(spRecheck as string) : 0;
      if (verifiedSP < album.price) {
        return c.json({
          error: 'Insufficient Star Power (concurrent modification detected)',
          required: album.price,
          current: verifiedSP,
          insufficientFunds: true,
        }, 402);
      }

      // §v11.1 — Re-verify supply hasn't changed (prevent oversell for limited editions)
      if (album.limitedEdition && album.maxSupply) {
        const albumRecheck = await getAlbum(albumId);
        if (albumRecheck && albumRecheck.circulatingSupply >= album.maxSupply) {
          return c.json({ error: 'Album sold out (concurrent purchase detected)', soldOut: true }, 409);
        }
      }

      // Deduct Star Power
      const newSP = verifiedSP - album.price;
      await kv.set(`user:${userId}:starpower`, String(newSP));

      // Record transaction
      const txRaw = await kv.get(`user:${userId}:sp-transactions`);
      const transactions: any[] = txRaw ? JSON.parse(txRaw as string) : [];
      transactions.unshift({
        id: `tx-album-${Date.now()}`,
        amount: -album.price,
        reason: `购买专辑: ${album.title}`,
        reasonEn: `Album purchase: ${album.title}`,
        timestamp: Date.now(),
      });
      await kv.set(`user:${userId}:sp-transactions`, JSON.stringify(transactions.slice(0, 200)));

      // Update supply
      album.circulatingSupply += 1;
      album.totalSales += 1;
      await kv.set(`album:${albumId}`, JSON.stringify(album));

      // Create ownership record
      const ownership: OwnershipRecord = {
        albumId,
        userId,
        purchasedAt: Date.now(),
        price: album.price,
        edition: album.circulatingSupply, // e.g., #3 of 100
      };
      await kv.set(`album:ownership:${albumId}:${userId}`, JSON.stringify(ownership));

      // Update user collection
      const collection = await getUserCollection(userId);
      collection.push(albumId);
      await kv.set(`album:collection:${userId}`, JSON.stringify(collection));

      // Give Star Power to creator (80% of price)
      if (album.creatorId !== 'system') {
        const creatorSpRaw = await kv.get(`user:${album.creatorId}:starpower`);
        const creatorSP = creatorSpRaw ? parseInt(creatorSpRaw as string) : 0;
        const creatorEarnings = Math.floor(album.price * 0.8);
        await kv.set(`user:${album.creatorId}:starpower`, String(creatorSP + creatorEarnings));
      }

      queryCache.invalidatePrefix('albums:');

      return c.json({
        success: true,
        ownership,
        starPower: newSP,
        edition: ownership.edition,
        maxSupply: album.maxSupply,
      });
    } catch (error) {
      console.log(`[Albums] Error purchasing album ${albumId}:`, error);
      return c.json({ error: 'Failed to purchase album', detail: String(error) }, 500);
    }
  });

  // ---- GET /albums/collection/:userId — Get user's owned albums ----
  app.get(`${ROUTE_PREFIX}/albums/collection/:userId`, async (c: any) => {
    const userId = c.req.param('userId');
    try {
      await ensureSeed();
      const albumIds = await getUserCollection(userId);
      const albums: Array<Album & { ownership: OwnershipRecord }> = [];

      for (const id of albumIds) {
        const album = await getAlbum(id);
        const ownershipRaw = await kv.get(`album:ownership:${id}:${userId}`);
        if (album && ownershipRaw) {
          const ownership = JSON.parse(ownershipRaw as string);
          albums.push({ ...album, ownership });
        }
      }

      return c.json({ collection: albums, total: albums.length });
    } catch (error) {
      console.log(`[Albums] Error fetching collection for ${userId}:`, error);
      return c.json({ error: 'Failed to fetch collection', detail: String(error) }, 500);
    }
  });

  // ---- GET /albums/creator/:userId — Get albums by a creator ----
  app.get(`${ROUTE_PREFIX}/albums/creator/:userId`, async (c: any) => {
    const userId = c.req.param('userId');
    try {
      await ensureSeed();
      const creatorRaw = await kv.get(`album:creator:${userId}`);
      const albumIds: string[] = creatorRaw ? JSON.parse(creatorRaw as string) : [];
      const albums: Album[] = [];
      for (const id of albumIds) {
        const album = await getAlbum(id);
        if (album) albums.push(album);
      }
      return c.json({ albums, total: albums.length });
    } catch (error) {
      console.log(`[Albums] Error fetching creator albums for ${userId}:`, error);
      return c.json({ error: 'Failed to fetch creator albums', detail: String(error) }, 500);
    }
  });

  // ---- POST /albums/:albumId/like ----
  app.post(`${ROUTE_PREFIX}/albums/:albumId/like`, async (c: any) => {
    const albumId = c.req.param('albumId');
    try {
      await ensureSeed();
      const likesRaw = await kv.get(`album:likes:${albumId}`);
      const likes = (likesRaw ? parseInt(likesRaw as string) : 0) + 1;
      await kv.set(`album:likes:${albumId}`, String(likes));

      // Update album object
      const album = await getAlbum(albumId);
      if (album) {
        album.likes = likes;
        await kv.set(`album:${albumId}`, JSON.stringify(album));
      }

      queryCache.invalidatePrefix('albums:');
      return c.json({ likes });
    } catch (error) {
      console.log(`[Albums] Error liking album ${albumId}:`, error);
      return c.json({ error: 'Failed to like album', detail: String(error) }, 500);
    }
  });
}