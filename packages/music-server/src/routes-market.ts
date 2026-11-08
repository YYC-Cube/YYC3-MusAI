/**
 * D-Music P3 §3 — Secondary Market (二级市场) Routes
 *
 * Enables album owners to resell their digital albums to other users.
 *
 * Routes:
 *   GET    /market/listings                — Browse active resale listings
 *   GET    /market/listings/:userId        — Get listings by a specific seller
 *   POST   /market/list                    — Create a resale listing (owner only)
 *   POST   /market/buy/:listingId          — Purchase a listing (transfers ownership)
 *   DELETE /market/cancel/:listingId       — Cancel a listing (seller only)
 *   GET    /market/history                 — Recent completed sales
 *   GET    /market/stats                   — Market statistics (volume, floor prices)
 *
 * KV Schema:
 *   market:listing:{listingId}             — Listing record (JSON)
 *   market:listing-index                   — Array of active listingIds (JSON)
 *   market:history                         — Array of completed sales (JSON, max 200)
 *   market:volume                          — Total SP volume traded (number)
 *
 * Economics:
 *   - Seller receives 90% of sale price
 *   - Creator receives 5% royalty
 *   - Platform retains 5%
 */

import { ROUTE_PREFIX, kv, requireAuth, queryCache } from "./server-utils.ts";
import { rateLimit, RATE_STARPOWER, RATE_SENSITIVE } from "./rate-limit.ts";
import { validate, marketListSchema, marketBuySchema } from "./validation.ts";

// ==========================================
// Types
// ==========================================

interface MarketListing {
  id: string;
  albumId: string;
  albumTitle: string;
  albumGenre: string;
  albumCoverUrl: string;
  sellerId: string;
  sellerName: string;
  price: number;             // asking price in Star Power
  originalPrice: number;     // price paid by seller
  edition: number;           // edition # e.g. #3 of 100
  maxSupply: number | null;
  limitedEdition: boolean;
  createdAt: number;
  status: 'active' | 'sold' | 'cancelled';
}

interface MarketSale {
  listingId: string;
  albumId: string;
  albumTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  price: number;
  sellerEarnings: number;    // 90%
  creatorRoyalty: number;    // 5%
  platformFee: number;       // 5%
  edition: number;
  soldAt: number;
}

// ==========================================
// Helpers
// ==========================================

async function getListingIndex(): Promise<string[]> {
  const raw = await kv.get('market:listing-index');
  if (!raw) return [];
  try { return JSON.parse(raw as string); } catch { return []; }
}

async function getListing(listingId: string): Promise<MarketListing | null> {
  const raw = await kv.get(`market:listing:${listingId}`);
  if (!raw) return null;
  try { return JSON.parse(raw as string); } catch { return null; }
}

async function getMarketHistory(): Promise<MarketSale[]> {
  const raw = await kv.get('market:history');
  if (!raw) return [];
  try { return JSON.parse(raw as string); } catch { return []; }
}

// ==========================================
// Route Registration
// ==========================================

export function registerMarketRoutes(app: any) {

  // ---- GET /market/listings — Browse active resale listings ----
  app.get(`${ROUTE_PREFIX}/market/listings`, async (c: any) => {
    try {
      const cached = queryCache.get<MarketListing[]>('market:listings');
      if (cached) return c.json({ listings: cached, total: cached.length });

      const ids = await getListingIndex();
      const listings: MarketListing[] = [];
      for (const id of ids) {
        const listing = await getListing(id);
        if (listing && listing.status === 'active') {
          listings.push(listing);
        }
      }
      // Sort by newest first
      listings.sort((a, b) => b.createdAt - a.createdAt);
      queryCache.set('market:listings', listings, 15_000);
      return c.json({ listings, total: listings.length });
    } catch (error) {
      console.log(`[Market] Error listing active listings:`, error);
      return c.json({ error: 'Failed to fetch listings', detail: String(error) }, 500);
    }
  });

  // ---- GET /market/listings/:userId — Get listings by seller ----
  app.get(`${ROUTE_PREFIX}/market/listings/:userId`, async (c: any) => {
    const userId = c.req.param('userId');
    try {
      const ids = await getListingIndex();
      const listings: MarketListing[] = [];
      for (const id of ids) {
        const listing = await getListing(id);
        if (listing && listing.sellerId === userId) listings.push(listing);
      }
      listings.sort((a, b) => b.createdAt - a.createdAt);
      return c.json({ listings, total: listings.length });
    } catch (error) {
      console.log(`[Market] Error fetching seller listings for ${userId}:`, error);
      return c.json({ error: 'Failed to fetch seller listings', detail: String(error) }, 500);
    }
  });

  // ---- POST /market/list — Create a resale listing ----
  app.post(`${ROUTE_PREFIX}/market/list`, requireAuth, rateLimit(RATE_SENSITIVE), async (c: any) => {
    try {
      const body = await c.req.json();
      const parsed = validate(marketListSchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName, albumId, price } = parsed.data;

      if (!userId || !albumId || !price) {
        return c.json({ error: 'Missing required fields: userId, albumId, price' }, 400);
      }
      if (typeof price !== 'number' || price < 1) {
        return c.json({ error: 'Price must be a positive number' }, 400);
      }

      // Verify ownership
      const ownershipRaw = await kv.get(`album:ownership:${albumId}:${userId}`);
      if (!ownershipRaw) {
        return c.json({ error: 'You do not own this album', notOwned: true }, 403);
      }
      const ownership = JSON.parse(ownershipRaw as string);

      // Check not already listed
      const ids = await getListingIndex();
      for (const id of ids) {
        const existing = await getListing(id);
        if (existing && existing.albumId === albumId && existing.sellerId === userId && existing.status === 'active') {
          return c.json({ error: 'Album already listed', alreadyListed: true }, 409);
        }
      }

      // Get album metadata
      const albumRaw = await kv.get(`album:${albumId}`);
      if (!albumRaw) return c.json({ error: 'Album not found' }, 404);
      const album = JSON.parse(albumRaw as string);

      const listingId = `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const listing: MarketListing = {
        id: listingId,
        albumId,
        albumTitle: album.title,
        albumGenre: album.genre || 'Other',
        albumCoverUrl: album.coverUrl || '',
        sellerId: userId,
        sellerName: userName || 'Anonymous',
        price: Math.round(price),
        originalPrice: ownership.price,
        edition: ownership.edition,
        maxSupply: album.maxSupply || null,
        limitedEdition: album.limitedEdition || false,
        createdAt: Date.now(),
        status: 'active',
      };

      await kv.set(`market:listing:${listingId}`, JSON.stringify(listing));
      ids.push(listingId);
      await kv.set('market:listing-index', JSON.stringify(ids));

      queryCache.invalidatePrefix('market:');
      console.log(`[Market] Listing created: ${album.title} by ${userName} for ${price} SP`);

      return c.json({ success: true, listing });
    } catch (error) {
      console.log(`[Market] Error creating listing:`, error);
      return c.json({ error: 'Failed to create listing', detail: String(error) }, 500);
    }
  });

  // ---- POST /market/buy/:listingId — Purchase a listing ----
  app.post(`${ROUTE_PREFIX}/market/buy/:listingId`, requireAuth, rateLimit(RATE_STARPOWER), async (c: any) => {
    const listingId = c.req.param('listingId');
    try {
      const body = await c.req.json();
      const parsed = validate(marketBuySchema, body);
      if (!parsed.success) return c.json({ error: parsed.error }, 400);
      const { userId, userName } = parsed.data;
      if (!userId) return c.json({ error: 'Missing userId' }, 400);

      // Get listing
      const listing = await getListing(listingId);
      if (!listing) return c.json({ error: 'Listing not found' }, 404);
      if (listing.status !== 'active') return c.json({ error: 'Listing no longer active' }, 410);
      if (listing.sellerId === userId) return c.json({ error: 'Cannot buy your own listing' }, 400);

      // Check buyer's Star Power
      const buyerSpRaw = await kv.get(`user:${userId}:starpower`);
      const buyerSP = buyerSpRaw ? parseInt(buyerSpRaw as string) : 0;
      if (buyerSP < listing.price) {
        return c.json({
          error: 'Insufficient Star Power',
          required: listing.price,
          current: buyerSP,
          insufficientFunds: true,
        }, 402);
      }

      // Calculate earnings distribution
      const sellerEarnings = Math.floor(listing.price * 0.90);
      const creatorRoyalty = Math.floor(listing.price * 0.05);
      const platformFee = listing.price - sellerEarnings - creatorRoyalty;

      // --- Transactional operations ---

      // §v11.1 — Optimistic concurrency: re-read listing status right before mutation
      const listingRecheck = await getListing(listingId);
      if (!listingRecheck || listingRecheck.status !== 'active') {
        return c.json({ error: 'Listing no longer active (concurrent purchase detected)' }, 410);
      }

      // §v11.1 — Re-read buyer SP to prevent race condition double-spend
      const buyerSpRecheck = await kv.get(`user:${userId}:starpower`);
      const verifiedBuyerSP = buyerSpRecheck ? parseInt(buyerSpRecheck as string) : 0;
      if (verifiedBuyerSP < listing.price) {
        return c.json({
          error: 'Insufficient Star Power (concurrent modification detected)',
          required: listing.price,
          current: verifiedBuyerSP,
          insufficientFunds: true,
        }, 402);
      }

      // 1. Deduct buyer's SP (using verified amount)
      const newBuyerSP = verifiedBuyerSP - listing.price;
      await kv.set(`user:${userId}:starpower`, String(newBuyerSP));

      // 2. Credit seller's SP
      const sellerSpRaw = await kv.get(`user:${listing.sellerId}:starpower`);
      const sellerSP = sellerSpRaw ? parseInt(sellerSpRaw as string) : 0;
      await kv.set(`user:${listing.sellerId}:starpower`, String(sellerSP + sellerEarnings));

      // 3. Credit creator royalty (if creator is not 'system')
      const albumRaw = await kv.get(`album:${listing.albumId}`);
      if (albumRaw) {
        const album = JSON.parse(albumRaw as string);
        if (album.creatorId && album.creatorId !== 'system') {
          const creatorSpRaw = await kv.get(`user:${album.creatorId}:starpower`);
          const creatorSP = creatorSpRaw ? parseInt(creatorSpRaw as string) : 0;
          await kv.set(`user:${album.creatorId}:starpower`, String(creatorSP + creatorRoyalty));
        }
      }

      // 4. Transfer ownership: remove from seller, add to buyer
      await kv.del(`album:ownership:${listing.albumId}:${listing.sellerId}`);
      const buyerOwnership = {
        albumId: listing.albumId,
        userId,
        purchasedAt: Date.now(),
        price: listing.price,
        edition: listing.edition,
        source: 'secondary-market',
        listingId,
      };
      await kv.set(`album:ownership:${listing.albumId}:${userId}`, JSON.stringify(buyerOwnership));

      // 5. Update collection indexes
      const sellerCollRaw = await kv.get(`album:collection:${listing.sellerId}`);
      let sellerColl: string[] = sellerCollRaw ? JSON.parse(sellerCollRaw as string) : [];
      sellerColl = sellerColl.filter(id => id !== listing.albumId);
      await kv.set(`album:collection:${listing.sellerId}`, JSON.stringify(sellerColl));

      const buyerCollRaw = await kv.get(`album:collection:${userId}`);
      const buyerColl: string[] = buyerCollRaw ? JSON.parse(buyerCollRaw as string) : [];
      if (!buyerColl.includes(listing.albumId)) {
        buyerColl.push(listing.albumId);
        await kv.set(`album:collection:${userId}`, JSON.stringify(buyerColl));
      }

      // 6. Mark listing as sold
      listing.status = 'sold';
      await kv.set(`market:listing:${listingId}`, JSON.stringify(listing));

      // 7. Record SP transactions
      for (const [uid, amount, reasonZh, reasonEn] of [
        [userId, -listing.price, `二级市场购买: ${listing.albumTitle}`, `Secondary market: ${listing.albumTitle}`],
        [listing.sellerId, sellerEarnings, `二级市场出售: ${listing.albumTitle} (90%)`, `Market sale: ${listing.albumTitle} (90%)`],
      ] as [string, number, string, string][]) {
        const txRaw = await kv.get(`user:${uid}:sp-transactions`);
        const txs: any[] = txRaw ? JSON.parse(txRaw as string) : [];
        txs.unshift({ id: `tx-mkt-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`, amount, reason: reasonZh, reasonEn, timestamp: Date.now() });
        await kv.set(`user:${uid}:sp-transactions`, JSON.stringify(txs.slice(0, 200)));
      }

      // 8. Record in market history
      const sale: MarketSale = {
        listingId,
        albumId: listing.albumId,
        albumTitle: listing.albumTitle,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        buyerId: userId,
        buyerName: userName || 'Anonymous',
        price: listing.price,
        sellerEarnings,
        creatorRoyalty,
        platformFee,
        edition: listing.edition,
        soldAt: Date.now(),
      };
      const history = await getMarketHistory();
      history.unshift(sale);
      await kv.set('market:history', JSON.stringify(history.slice(0, 200)));

      // 9. Update volume
      const volRaw = await kv.get('market:volume');
      const vol = volRaw ? parseInt(volRaw as string) : 0;
      await kv.set('market:volume', String(vol + listing.price));

      queryCache.invalidatePrefix('market:');
      queryCache.invalidatePrefix('albums:');

      console.log(`[Market] Sale completed: ${listing.albumTitle} #${listing.edition} — ${listing.sellerName} → ${userName || userId} for ${listing.price} SP`);

      return c.json({
        success: true,
        sale,
        buyerStarPower: newBuyerSP,
      });
    } catch (error) {
      console.log(`[Market] Error purchasing listing ${listingId}:`, error);
      return c.json({ error: 'Failed to complete purchase', detail: String(error) }, 500);
    }
  });

  // ---- DELETE /market/cancel/:listingId — Cancel a listing ----
  app.delete(`${ROUTE_PREFIX}/market/cancel/:listingId`, rateLimit(RATE_SENSITIVE), async (c: any) => {
    const listingId = c.req.param('listingId');
    try {
      const listing = await getListing(listingId);
      if (!listing) return c.json({ error: 'Listing not found' }, 404);
      if (listing.status !== 'active') return c.json({ error: 'Listing not active' }, 410);

      // Note: in production, would verify userId from auth token
      listing.status = 'cancelled';
      await kv.set(`market:listing:${listingId}`, JSON.stringify(listing));

      queryCache.invalidatePrefix('market:');
      console.log(`[Market] Listing cancelled: ${listing.albumTitle} by ${listing.sellerName}`);

      return c.json({ success: true });
    } catch (error) {
      console.log(`[Market] Error cancelling listing ${listingId}:`, error);
      return c.json({ error: 'Failed to cancel listing', detail: String(error) }, 500);
    }
  });

  // ---- GET /market/history — Recent completed sales ----
  app.get(`${ROUTE_PREFIX}/market/history`, async (c: any) => {
    try {
      // §L-5 — Proper pagination for market history
      const page = Math.max(1, parseInt(c.req.query('page') || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
      const offset = (page - 1) * limit;

      const history = await getMarketHistory();
      const total = history.length;
      const sales = history.slice(offset, offset + limit);
      const totalPages = Math.ceil(total / limit);

      return c.json({
        sales,
        pagination: {
          page, limit, total, totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.log(`[Market] Error fetching history:`, error);
      return c.json({ error: 'Failed to fetch history', detail: String(error) }, 500);
    }
  });

  // ---- GET /market/stats — Market statistics ----
  app.get(`${ROUTE_PREFIX}/market/stats`, async (c: any) => {
    try {
      const ids = await getListingIndex();
      let activeListings = 0;
      let totalListings = 0;
      const floorPrices: Record<string, number> = {};

      for (const id of ids) {
        const listing = await getListing(id);
        if (!listing) continue;
        totalListings++;
        if (listing.status === 'active') {
          activeListings++;
          if (!floorPrices[listing.albumId] || listing.price < floorPrices[listing.albumId]) {
            floorPrices[listing.albumId] = listing.price;
          }
        }
      }

      const history = await getMarketHistory();
      const volRaw = await kv.get('market:volume');
      const totalVolume = volRaw ? parseInt(volRaw as string) : 0;

      return c.json({
        activeListings,
        totalListings,
        totalSales: history.length,
        totalVolume,
        floorPrices,
        recentSales: history.slice(0, 5),
      });
    } catch (error) {
      console.log(`[Market] Error fetching stats:`, error);
      return c.json({ error: 'Failed to fetch market stats', detail: String(error) }, 500);
    }
  });
}