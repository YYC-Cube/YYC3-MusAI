/**
 * Albums / Market / PKI / Diagnostics / Upload 路由测试
 */
import { assert, assertEquals, assertMatch, assertRejects } from '@std/assert';
import * as fs from 'node:fs';

import { FakeSupabase } from './helpers/fake-supabase.ts';
import {
  createTestApp,
  jsonBody,
  request,
  tokenFor,
} from './helpers/test-app.ts';
import { queryCache } from '../src/services/server-utils.ts';

const fake = new FakeSupabase();
fake.install();
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('KV_DRIVER', 'supabase');
Deno.env.delete('OPENAI_API_KEY');

const app = createTestApp();
const P = '/make-server-f626b673';
const auth = async (id: string) => tokenFor(id);

let customAlbumId = '';
let uploadedMediaId = '';
let uploadedWithCoverId = '';
let chunkSessionId = '';

// ============================================================
// Albums
// ============================================================

Deno.test('albums: 首次访问播种 demo 并列表/缓存', async () => {
  queryCache.clear();
  const first = await request(app, `${P}/albums`);
  assertEquals(first.status, 200);
  const body = await jsonBody(first);
  assertEquals(body.total, 3);
  assertEquals(body.albums.length, 3);
  assert(fake.readJson('album-index').includes('album-cosmic-dreams'));

  const cached = await request(app, `${P}/albums`);
  assertEquals((await jsonBody(cached)).total, 3);

  fake.kvDown = true;
  queryCache.clear();
  const down = await request(app, `${P}/albums`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
  // A4：统一错误体带 code
  assertEquals((await jsonBody(down)).code, 'INTERNAL');
});

Deno.test('albums: 统一分页（page/limit/hasMore）', async () => {
  queryCache.clear();
  await request(app, `${P}/albums`); // 播种

  const firstPage = await request(app, `${P}/albums?page=1&limit=1`);
  const first = await jsonBody(firstPage);
  assertEquals(firstPage.status, 200);
  assertEquals(first.total, 3);
  assertEquals(first.page, 1);
  assertEquals(first.limit, 1);
  assertEquals(first.hasMore, true);
  assertEquals(first.albums.length, 1);

  const lastPage = await jsonBody(await request(app, `${P}/albums?page=3&limit=1`));
  assertEquals(lastPage.albums.length, 1);
  assertEquals(lastPage.hasMore, false);

  // 越界页返回空列表
  const beyond = await jsonBody(await request(app, `${P}/albums?page=9&limit=1`));
  assertEquals(beyond.albums.length, 0);
  assertEquals(beyond.hasMore, false);

  // 非法 limit 回落默认值
  const invalid = await jsonBody(await request(app, `${P}/albums?page=1&limit=abc`));
  assertEquals(invalid.limit, 50);
  assertEquals(invalid.albums.length, 3);
  queryCache.clear();
});

Deno.test('albums: 详情成功/不存在/错误', async () => {
  const ok = await request(app, `${P}/albums/album-cosmic-dreams`);
  assertEquals(ok.status, 200);
  const album = (await jsonBody(ok)).album;
  assertEquals(album.title, '宇宙梦境');
  assert(typeof album.likes === 'number');

  const missing = await request(app, `${P}/albums/no-such-album`);
  assertEquals(missing.status, 404);

  fake.kvDown = true;
  const down = await request(app, `${P}/albums/album-cosmic-dreams`);
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('albums: 创建（鉴权/校验/成功）', async () => {
  const anonymous = await request(app, `${P}/albums`, {
    body: { creatorId: 'artist-m', title: 'X', tracks: [{ title: 't' }] },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/albums`, {
    token: await auth('artist-m'),
    body: { creatorId: 'artist-m', title: '' },
  });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/albums`, {
    token: await auth('artist-m'),
    body: {
      creatorId: 'artist-m', creatorName: 'Artist M', title: '自建专辑',
      genre: 'Pop', tracks: [{ title: 'Track A', duration: 200 }, { songId: 'song-1', title: 'Track B' }],
      price: 200, limitedEdition: true, maxSupply: 10, tags: ['pop'],
    },
  });
  assertEquals(ok.status, 200);
  const album = (await jsonBody(ok)).album;
  customAlbumId = album.id;
  assertMatch(album.id, /^album-\d+-/);
  assertEquals(album.tracks.length, 2);
  assertEquals(album.tracks[0].trackNumber, 1);
  assertEquals(album.tracks[1].songId, 'song-1');
  assertEquals(album.maxSupply, 10);
  assertEquals(fake.readJson('album-index').includes(album.id), true);
  assertEquals(fake.readJson('album:creator:artist-m').includes(album.id), true);

  const broken = await request(app, `${P}/albums`, {
    token: await auth('artist-m'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('albums: 购买各分支', async () => {
  const anonymous = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    body: { userId: 'album-buyer' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: await auth('album-buyer'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  fake.seedJson('album:ownership:album-neon-nights:owned-user', { albumId: 'album-neon-nights' });
  const owned = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: await auth('owned-user'),
    body: { userId: 'owned-user' },
  });
  assertEquals(owned.status, 409);
  assertEquals((await jsonBody(owned)).alreadyOwned, true);

  const missing = await request(app, `${P}/albums/no-album/purchase`, {
    token: await auth('album-buyer'),
    body: { userId: 'album-buyer' },
  });
  assertEquals(missing.status, 404);

  fake.seedJson('album:album-soldout', {
    id: 'album-soldout', creatorId: 'system', title: 'Sold', price: 10,
    limitedEdition: true, maxSupply: 1, circulatingSupply: 1, totalSales: 1,
  });
  const soldOut = await request(app, `${P}/albums/album-soldout/purchase`, {
    token: await auth('album-buyer'),
    body: { userId: 'album-buyer' },
  });
  assertEquals(soldOut.status, 409);
  assertEquals((await jsonBody(soldOut)).soldOut, true);

  fake.seed('user:poor-buyer:starpower', '10');
  const poor = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: await auth('poor-buyer'),
    body: { userId: 'poor-buyer' },
  });
  assertEquals(poor.status, 402);

  // 成功：system 创作者，不产生创作者分成
  fake.seed('user:album-buyer:starpower', '500');
  const ok = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: await auth('album-buyer'),
    body: { userId: 'album-buyer' },
  });
  assertEquals(ok.status, 200);
  const purchase = await jsonBody(ok);
  assertEquals(purchase.starPower, 200);
  assertEquals(purchase.edition, 1);
  assertEquals(fake.read('user:album-buyer:starpower'), '200');
  assertEquals(fake.readJson('album:ownership:album-neon-nights:album-buyer').price, 300);
  assertEquals(fake.readJson('album:collection:album-buyer'), ['album-neon-nights']);
  assertEquals(fake.readJson('user:album-buyer:sp-transactions')[0].amount, -300);
  assertEquals(fake.readJson('album:album-neon-nights').circulatingSupply, 1);

  // 成功：非 system 创作者获得 80%
  fake.seed('user:buyer-art:starpower', '1000');
  fake.seed('user:artist-m:starpower', '0');
  const custom = await request(app, `${P}/albums/${customAlbumId}/purchase`, {
    token: await auth('buyer-art'),
    body: { userId: 'buyer-art' },
  });
  assertEquals(custom.status, 200);
  assertEquals(fake.read('user:artist-m:starpower'), '160');

  // 并发 SP 校验
  fake.seedJson('album:album-race', {
    id: 'album-race', creatorId: 'system', title: 'Race', price: 100,
    limitedEdition: false, maxSupply: null, circulatingSupply: 0, totalSales: 0,
  });
  fake.seed('user:race-buyer:starpower', '500');
  fake.kvSequence.set('user:race-buyer:starpower', ['500', '5']);
  const race = await request(app, `${P}/albums/album-race/purchase`, {
    token: await auth('race-buyer'),
    body: { userId: 'race-buyer' },
  });
  assertEquals(race.status, 402);
  assertMatch((await jsonBody(race)).error, /concurrent/);

  // 并发库存校验
  const raceAlbum = {
    id: 'album-racesold', creatorId: 'system', title: 'Race Sold', price: 100,
    limitedEdition: true, maxSupply: 1, circulatingSupply: 0, totalSales: 0,
  };
  fake.seedJson('album:album-racesold', raceAlbum);
  fake.seed('user:sold-buyer:starpower', '500');
  fake.kvSequence.set('album:album-racesold', [
    JSON.stringify(raceAlbum),
    JSON.stringify({ ...raceAlbum, circulatingSupply: 1 }),
  ]);
  const raceSold = await request(app, `${P}/albums/album-racesold/purchase`, {
    token: await auth('sold-buyer'),
    body: { userId: 'sold-buyer' },
  });
  assertEquals(raceSold.status, 409);
  assertMatch((await jsonBody(raceSold)).error, /concurrent/);

  const broken = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: await auth('album-buyer'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('albums: 收藏/创作者/点赞', async () => {
  const collection = await request(app, `${P}/albums/collection/buyer-art`);
  assertEquals(collection.status, 200);
  const ownedAlbums = (await jsonBody(collection)).collection;
  assertEquals(ownedAlbums.length, 1);
  assertEquals(ownedAlbums[0].id, customAlbumId);
  assert(ownedAlbums[0].ownership);

  fake.seedJson('album:collection:broken-user', ['album-missing', 'album-cosmic-dreams']);
  const partial = await jsonBody(await request(app, `${P}/albums/collection/broken-user`));
  assertEquals(partial.total, 0);

  const creator = await request(app, `${P}/albums/creator/artist-m`);
  assertEquals((await jsonBody(creator)).albums[0].id, customAlbumId);
  const noCreator = await request(app, `${P}/albums/creator/nobody`);
  assertEquals((await jsonBody(noCreator)).total, 0);

  const like = await request(app, `${P}/albums/album-cosmic-dreams/like`, { method: 'POST' });
  assertEquals(like.status, 200);
  assertEquals((await jsonBody(like)).likes, 43);
  const unknownLike = await request(app, `${P}/albums/ghost-album/like`, { method: 'POST' });
  assertEquals((await jsonBody(unknownLike)).likes, 1);

  fake.kvDown = true;
  const downCollection = await request(app, `${P}/albums/collection/buyer-art`);
  const downCreator = await request(app, `${P}/albums/creator/artist-m`);
  const downLike = await request(app, `${P}/albums/album-cosmic-dreams/like`, { method: 'POST' });
  fake.kvDown = false;
  assertEquals(downCollection.status, 500);
  assertEquals(downCreator.status, 500);
  assertEquals(downLike.status, 500);
});

// ============================================================
// Market
// ============================================================

Deno.test('market: 挂单校验/成功/重复', async () => {
  fake.seedJson('album:album-mkt', {
    id: 'album-mkt', creatorId: 'artist-m', creatorName: 'Artist', title: 'Market Album',
    genre: 'Pop', coverUrl: '', maxSupply: null, limitedEdition: false,
  });
  fake.seedJson('album:ownership:album-mkt:seller-1', {
    albumId: 'album-mkt', userId: 'seller-1', purchasedAt: 1, price: 200, edition: 1,
  });
  fake.seed('album:collection:seller-1', JSON.stringify(['album-mkt']));
  fake.seed('user:seller-1:starpower', '0');
  fake.seed('user:artist-m:starpower', '0');
  fake.kv.delete('market:listing-index');

  const anonymous = await request(app, `${P}/market/list`, {
    body: { userId: 'seller-1', albumId: 'album-mkt', price: 100 },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/market/list`, {
    token: await auth('seller-1'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  const notOwned = await request(app, `${P}/market/list`, {
    token: await auth('seller-1'),
    body: { userId: 'seller-1', albumId: 'album-cosmic-dreams', price: 100 },
  });
  assertEquals(notOwned.status, 403);

  const ok = await request(app, `${P}/market/list`, {
    token: await auth('seller-1'),
    body: { userId: 'seller-1', userName: 'Seller', albumId: 'album-mkt', price: 100 },
  });
  assertEquals(ok.status, 200);
  const listing = (await jsonBody(ok)).listing;
  assertMatch(listing.id, /^mkt-/);
  assertEquals(listing.price, 100);
  assertEquals(listing.originalPrice, 200);
  assertEquals(fake.readJson('market:listing-index').length, 1);

  const dup = await request(app, `${P}/market/list`, {
    token: await auth('seller-1'),
    body: { userId: 'seller-1', albumId: 'album-mkt', price: 120 },
  });
  assertEquals(dup.status, 409);
  assertEquals((await jsonBody(dup)).alreadyListed, true);

  // 已售出的挂单不再拦截新挂单
  fake.seedJson('album:album-mkt3', {
    id: 'album-mkt3', creatorId: 'artist-m', title: 'Market Album 3', genre: 'Pop',
    coverUrl: '', maxSupply: null, limitedEdition: false,
  });
  fake.seedJson('album:ownership:album-mkt3:seller-1', {
    albumId: 'album-mkt3', userId: 'seller-1', purchasedAt: 1, price: 200, edition: 1,
  });
  fake.seedJson('market:listing:mkt-old', {
    id: 'mkt-old', albumId: 'album-mkt', sellerId: 'seller-1', status: 'sold', createdAt: 1,
  });
  fake.seedJson('market:listing-index', [listing.id, 'mkt-old']);
  const relist = await request(app, `${P}/market/list`, {
    token: await auth('seller-1'),
    body: { userId: 'seller-1', albumId: 'album-mkt3', price: 130 },
  });
  assertEquals(relist.status, 200);

  const broken = await request(app, `${P}/market/list`, {
    token: await auth('seller-1'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('market: listings 列表/卖家/缓存/错误', async () => {
  queryCache.clear();
  const active = (await jsonBody(await request(app, `${P}/market/listings`))).listings;
  assertEquals(active.length >= 2, true);
  assertEquals(active.every((l: any) => l.status === 'active'), true);

  const cached = await request(app, `${P}/market/listings`);
  assertEquals((await jsonBody(cached)).total, active.length);

  const seller = await request(app, `${P}/market/listings/seller-1`);
  assertEquals((await jsonBody(seller)).listings.length >= 2, true);
  const none = await request(app, `${P}/market/listings/nobody`);
  assertEquals((await jsonBody(none)).total, 0);

  fake.kvDown = true;
  queryCache.clear();
  const downAll = await request(app, `${P}/market/listings`);
  const downSeller = await request(app, `${P}/market/listings/seller-1`);
  fake.kvDown = false;
  assertEquals(downAll.status, 500);
  assertEquals(downSeller.status, 500);
});

Deno.test('market: 购买各分支与收益分配', async () => {
  const listingId = fake.readJson('market:listing-index')
    .map((id: string) => fake.readJson(`market:listing:${id}`))
    .find((l: any) => l && l.status === 'active' && l.sellerId === 'seller-1').id;

  const anonymous = await request(app, `${P}/market/buy/${listingId}`, {
    body: { userId: 'buyer-1' },
  });
  assertEquals(anonymous.status, 401);

  const invalid = await request(app, `${P}/market/buy/${listingId}`, {
    token: await auth('buyer-1'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  const missing = await request(app, `${P}/market/buy/mkt-nope`, {
    token: await auth('buyer-1'),
    body: { userId: 'buyer-1' },
  });
  assertEquals(missing.status, 404);

  const own = await request(app, `${P}/market/buy/${listingId}`, {
    token: await auth('seller-1'),
    body: { userId: 'seller-1' },
  });
  assertEquals(own.status, 400);

  fake.seed('user:buyer-poor:starpower', '1');
  const poor = await request(app, `${P}/market/buy/${listingId}`, {
    token: await auth('buyer-poor'),
    body: { userId: 'buyer-poor' },
  });
  assertEquals(poor.status, 402);

  fake.seed('user:buyer-1:starpower', '500');
  const ok = await request(app, `${P}/market/buy/${listingId}`, {
    token: await auth('buyer-1'),
    body: { userId: 'buyer-1', userName: 'Buyer' },
  });
  assertEquals(ok.status, 200);
  const sale = (await jsonBody(ok)).sale;
  assertEquals(sale.price, 100);
  assertEquals(sale.sellerEarnings, 90);
  assertEquals(sale.creatorRoyalty, 5);
  assertEquals(sale.platformFee, 5);
  assertEquals(fake.read('user:buyer-1:starpower'), '400');
  assertEquals(fake.read('user:seller-1:starpower'), '90');
  assertEquals(fake.read('user:artist-m:starpower'), '5');
  assertEquals(fake.readJson(`market:listing:${listingId}`).status, 'sold');
  assertEquals(fake.readJson('album:ownership:album-mkt:seller-1'), null);
  assertEquals(fake.readJson('album:ownership:album-mkt:buyer-1').source, 'secondary-market');
  assertEquals(fake.readJson('album:collection:seller-1'), []);
  assertEquals(fake.readJson('album:collection:buyer-1'), ['album-mkt']);
  assertEquals(fake.readJson('market:history').length, 1);
  assertEquals(fake.read('market:volume'), '100');

  // 已售出挂单 -> 410
  const soldAgain = await request(app, `${P}/market/buy/${listingId}`, {
    token: await auth('buyer-1'),
    body: { userId: 'buyer-1' },
  });
  assertEquals(soldAgain.status, 410);

  // 并发 SP
  const raceListing = {
    id: 'mkt-race', albumId: 'album-mkt', albumTitle: 'Market Album', sellerId: 'seller-1',
    price: 100, originalPrice: 200, edition: 1, status: 'active', createdAt: 2,
  };
  fake.seedJson('market:listing:mkt-race', raceListing);
  fake.seedJson('market:listing-index', [listingId, 'mkt-race']);
  fake.seed('user:race-market:starpower', '500');
  fake.kvSequence.set('user:race-market:starpower', ['500', '3']);
  const race = await request(app, `${P}/market/buy/mkt-race`, {
    token: await auth('race-market'),
    body: { userId: 'race-market' },
  });
  assertEquals(race.status, 402);
  assertMatch((await jsonBody(race)).error, /concurrent/);

  // 并发挂单状态
  fake.seedJson('market:listing:mkt-race2', { ...raceListing, id: 'mkt-race2', createdAt: 3 });
  fake.seedJson('market:listing-index', [listingId, 'mkt-race2']);
  fake.seed('user:race2-market:starpower', '500');
  fake.kvSequence.set('market:listing:mkt-race2', [
    JSON.stringify({ ...raceListing, id: 'mkt-race2' }),
    JSON.stringify({ ...raceListing, id: 'mkt-race2', status: 'sold' }),
  ]);
  const race2 = await request(app, `${P}/market/buy/mkt-race2`, {
    token: await auth('race2-market'),
    body: { userId: 'race2-market' },
  });
  assertEquals(race2.status, 410);
  assertMatch((await jsonBody(race2)).error, /concurrent/);

  const broken = await request(app, `${P}/market/buy/mkt-race2`, {
    token: await auth('race2-market'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('market: 取消挂单', async () => {
  fake.seedJson('market:listing:mkt-cancel', {
    id: 'mkt-cancel', albumId: 'album-mkt', albumTitle: 'A', sellerId: 'seller-1',
    price: 50, status: 'active', createdAt: 4,
  });
  const missing = await request(app, `${P}/market/cancel/nope`, { method: 'DELETE' });
  assertEquals(missing.status, 404);

  const ok = await request(app, `${P}/market/cancel/mkt-cancel`, { method: 'DELETE' });
  assertEquals(ok.status, 200);
  assertEquals(fake.readJson('market:listing:mkt-cancel').status, 'cancelled');

  const again = await request(app, `${P}/market/cancel/mkt-cancel`, { method: 'DELETE' });
  assertEquals(again.status, 410);

  fake.kvDown = true;
  const down = await request(app, `${P}/market/cancel/mkt-cancel`, { method: 'DELETE' });
  fake.kvDown = false;
  assertEquals(down.status, 500);
});

Deno.test('market: 历史分页与统计', async () => {
  const history = [
    { listingId: 'h1', price: 10 },
    { listingId: 'h2', price: 20 },
    { listingId: 'h3', price: 30 },
  ];
  fake.seedJson('market:history', history);

  const page1 = await jsonBody(await request(app, `${P}/market/history?page=1&limit=2`));
  assertEquals(page1.sales.length, 2);
  assertEquals(page1.pagination.total, 3);
  assertEquals(page1.pagination.totalPages, 2);
  assertEquals(page1.pagination.hasNext, true);
  assertEquals(page1.pagination.hasPrev, false);

  const page2 = await jsonBody(await request(app, `${P}/market/history?page=2&limit=2`));
  assertEquals(page2.sales.length, 1);
  assertEquals(page2.pagination.hasPrev, true);

  fake.kvDown = true;
  const down = await request(app, `${P}/market/history`);
  fake.kvDown = false;
  assertEquals(down.status, 500);

  fake.seedJson('market:listing-index', ['mkt-a', 'mkt-b', 'mkt-c']);
  fake.seedJson('market:listing:mkt-a', {
    id: 'mkt-a', albumId: 'album-mkt', price: 70, status: 'active', createdAt: 1,
  });
  fake.seedJson('market:listing:mkt-b', {
    id: 'mkt-b', albumId: 'album-mkt', price: 60, status: 'active', createdAt: 2,
  });
  fake.seedJson('market:listing:mkt-c', {
    id: 'mkt-c', albumId: 'album-mkt', price: 10, status: 'sold', createdAt: 3,
  });
  fake.seed('market:volume', '999');
  const stats = await jsonBody(await request(app, `${P}/market/stats`));
  assertEquals(stats.activeListings, 2);
  assertEquals(stats.totalListings, 3);
  assertEquals(stats.totalSales, 3);
  assertEquals(stats.totalVolume, 999);
  assertEquals(stats.floorPrices['album-mkt'], 60);
  assertEquals(stats.recentSales.length, 3);

  fake.kvDown = true;
  const downStats = await request(app, `${P}/market/stats`);
  fake.kvDown = false;
  assertEquals(downStats.status, 500);
});

// ============================================================
// PKI
// ============================================================

Deno.test('pki: 公钥上传/更新/查询/删除', async () => {
  const anonymous = await request(app, `${P}/pki/public-key`, { body: {} });
  assertEquals(anonymous.status, 401);

  const mismatched = await request(app, `${P}/pki/public-key`, {
    token: await tokenFor('another-user'),
    body: { userId: 'pki-user', publicKeyJwk: { kty: 'RSA', n: 'n', e: 'AQAB' } },
  });
  assertEquals(mismatched.status, 403);

  const missing = await request(app, `${P}/pki/public-key`, {
    token: await tokenFor('pki-user'),
    body: {},
  });
  assertEquals(missing.status, 400);

  const invalid = await request(app, `${P}/pki/public-key`, {
    token: await tokenFor('pki-user'),
    body: { userId: 'pki-user', publicKeyJwk: { kty: 'RSA' } },
  });
  assertEquals(invalid.status, 400);

  const jwk = {
    kty: 'RSA', n: 'abcdefghijklmnopqrstuvwxyz0123456789ABCD', e: 'AQAB',
  };
  const created = await request(app, `${P}/pki/public-key`, {
    token: await tokenFor('pki-user'),
    body: { userId: 'pki-user', publicKeyJwk: jwk },
  });
  assertEquals(created.status, 200);
  const createdBody = await jsonBody(created);
  assertEquals(createdBody.isNew, true);
  assertMatch(createdBody.fingerprint, /^[A-Z0-9:]+$/);
  assert(fake.readJson('pki:enrollment-log').includes('pki-user'));

  const updated = await request(app, `${P}/pki/public-key`, {
    token: await tokenFor('pki-user'),
    body: { userId: 'pki-user', publicKeyJwk: { ...jwk, n: 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ' } },
  });
  assertEquals((await jsonBody(updated)).isNew, false);
  assertEquals(fake.readJson('pki:enrollment-log').length, 1);

  const fetched = await request(app, `${P}/pki/public-key/pki-user`);
  assertEquals(fetched.status, 200);
  const fetchedBody = await jsonBody(fetched);
  assertEquals(fetchedBody.enrolled, true);
  assertEquals(fetchedBody.publicKeyJwk.e, 'AQAB');

  const notFound = await request(app, `${P}/pki/public-key/none`);
  assertEquals(notFound.status, 404);
  assertEquals((await jsonBody(notFound)).enrolled, false);

  const deleteAnonymous = await request(app, `${P}/pki/public-key/pki-user`, { method: 'DELETE' });
  assertEquals(deleteAnonymous.status, 401);

  const deleteMismatched = await request(app, `${P}/pki/public-key/pki-user`, {
    method: 'DELETE',
    token: await tokenFor('another-user'),
  });
  assertEquals(deleteMismatched.status, 403);

  const deleted = await request(app, `${P}/pki/public-key/pki-user`, {
    method: 'DELETE',
    token: await tokenFor('pki-user'),
  });
  assertEquals(deleted.status, 200);
  assertEquals(fake.read('pki:public-key:pki-user'), undefined);
  assertEquals(fake.readJson('pki:enrollment-log').includes('pki-user'), false);

  // KV 故障段：令牌预先签发（issueAccessToken 需写 KV 会话）
  const pkiToken = await tokenFor('pki-user');
  fake.kvDown = true;
  const downGet = await request(app, `${P}/pki/public-key/pki-user`);
  const downPost = await request(app, `${P}/pki/public-key`, {
    token: pkiToken,
    body: { userId: 'pki-user', publicKeyJwk: jwk },
  });
  const downDelete = await request(app, `${P}/pki/public-key/pki-user`, {
    method: 'DELETE',
    token: pkiToken,
  });
  fake.kvDown = false;
  assertEquals(downGet.status, 500);
  // KV 不可用时鉴权链路抛错，由 Hono 默认错误处理兜底为 500
  assertEquals(downPost.status, 500);
  assertEquals(downDelete.status, 500);

  const broken = await request(app, `${P}/pki/public-key`, {
    token: await tokenFor('pki-user'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

Deno.test('pki: 密钥备份与状态', async () => {
  const anonymous = await request(app, `${P}/pki/key-backup`, { body: { userId: 'bk-user' } });
  assertEquals(anonymous.status, 401);

  const missing = await request(app, `${P}/pki/key-backup`, {
    token: await tokenFor('bk-user'),
    body: { userId: 'bk-user' },
  });
  assertEquals(missing.status, 400);

  const payload = {
    userId: 'bk-user', encryptedPrivateKey: 'cipher', salt: 'salt', iv: 'iv',
    publicKeyJwk: { kty: 'RSA', n: 'n' },
  };
  const created = await request(app, `${P}/pki/key-backup`, {
    token: await tokenFor('bk-user'),
    body: payload,
  });
  assertEquals(created.status, 200);
  assertEquals((await jsonBody(created)).isNew, true);

  const updated = await request(app, `${P}/pki/key-backup`, {
    token: await tokenFor('bk-user'),
    body: payload,
  });
  assertEquals((await jsonBody(updated)).isNew, false);

  const fetchAnonymous = await request(app, `${P}/pki/key-backup/bk-user`);
  assertEquals(fetchAnonymous.status, 401);

  const fetchMismatched = await request(app, `${P}/pki/key-backup/bk-user`, {
    token: await tokenFor('another-user'),
  });
  assertEquals(fetchMismatched.status, 403);

  const fetched = await request(app, `${P}/pki/key-backup/bk-user`, {
    token: await tokenFor('bk-user'),
  });
  assertEquals(fetched.status, 200);
  const backup = await jsonBody(fetched);
  assertEquals(backup.hasBackup, true);
  assertEquals(backup.encryptedPrivateKey, 'cipher');

  const noBackup = await request(app, `${P}/pki/key-backup/none`, {
    token: await tokenFor('none'),
  });
  assertEquals(noBackup.status, 404);

  await request(app, `${P}/pki/public-key`, {
    token: await tokenFor('bk-user'),
    body: { userId: 'bk-user', publicKeyJwk: { kty: 'RSA', n: 'abc', e: 'AQAB' } },
  });
  const status = await jsonBody(await request(app, `${P}/pki/status/bk-user`));
  assertEquals(status.enrolled, true);
  assertEquals(status.hasBackup, true);
  assert(status.fingerprint);
  assert(status.enrolledAt);

  const none = await jsonBody(await request(app, `${P}/pki/status/none`));
  assertEquals(none.enrolled, false);
  assertEquals(none.fingerprint, null);

  const bkToken = await tokenFor('bk-user');
  fake.kvDown = true;
  // 需鉴权的备份读取在 KV 不可用时于会话校验处抛错 → Hono 默认错误处理兜底 500；
  // 公开的状态查询由路由内部 catch 返回 500
  const downBackup = await request(app, `${P}/pki/key-backup/bk-user`, {
    token: bkToken,
  });
  const downStatus = await request(app, `${P}/pki/status/bk-user`);
  fake.kvDown = false;
  assertEquals(downBackup.status, 500);
  assertEquals(downStatus.status, 500);

  const broken = await request(app, `${P}/pki/key-backup`, {
    token: await tokenFor('bk-user'),
    body: '{bad',
  });
  assertEquals(broken.status, 500);
});

// ============================================================
// Diagnostics
// ============================================================

Deno.test('diagnostics: kv-stats 前缀统计', async () => {
  const keys = [
    'user:a', 'user:b', 'prefs:a', 'profile:a', 'song:a', 'song:b',
    'analytics:a', 'shared-work:a', 'shared-work-index', 'community:a',
    'like-dedup:a', 'fork-chain:a', 'copyright:a', 'notifications:a',
    'spacetime:a', 'challenges:a', 'challenge-vote:a', 'challenge-notifications:a',
    'live-session:a', 'timeline-comments:a', 'achievements:a', 'mheart:a',
    'mheart-trend:a', 'album:a', 'album-index', 'market:a', 'pki:a',
    'song-index', 'system:a', 'work:a', 'misc:unknown',
  ];
  for (const k of keys) fake.kv.set(k, '1');

  const res = await request(app, `${P}/diagnostics/kv-stats`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.summary.totalRows, fake.kv.size);
  assertEquals(body.summary.totalPrefixGroups, 28);
  const allKeys = [...fake.kv.keys()];
  const userKeys = allKeys.filter((k) => k.startsWith('user:'));
  assertEquals(body.prefixStats[0].count >= body.prefixStats[body.prefixStats.length - 1].count, true);
  const userGroup = body.prefixStats.find((p: any) => p.prefix === 'user:');
  assertEquals(userGroup.count, userKeys.length);
  assertEquals(body.domainStats.userDomain >= userKeys.length, true);
  assertEquals(body.domainStats.songDomain >= 3, true);
  assertEquals(body.domainStats.spacetimeDomain >= 2, true);
  assertEquals(body.domainStats.economyDomain >= 3, true);
  assertEquals(body.domainStats.systemDomain >= 2, true);
  assertEquals(body.emptyPrefixes.length, 0);
  assert(body.cacheStats);
  assertEquals(body.summary.uncategorizedCount >= body.uncategorizedKeys.length, true);
  // uncategorizedKeys 为前 20 条采样（uncategorizedCount 为全量计数）
  assertEquals(body.uncategorizedKeys.length, Math.min(body.summary.uncategorizedCount, 20));
  assert(body.uncategorizedKeys.every((k: string) => !k.startsWith('user:')));

  // KV 不可用：键枚举失败被路由内部容错吸收，返回空统计而非 500
  fake.kvDown = true;
  const downStats = await request(app, `${P}/diagnostics/kv-stats`);
  fake.kvDown = false;
  assertEquals(downStats.status, 200);
  assertEquals((await jsonBody(downStats)).summary.totalRows, 0);
});

Deno.test('diagnostics: health 检查项', async () => {
  Deno.env.set('OPENAI_API_KEY', 'sk-test-key-1234567890');
  const res = await request(app, `${P}/diagnostics/health`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  // 现行实现为应用层 JWT + KV/关系表：检查项为 kvStore/auth/db/queryCache/openAI
  assertEquals(body.environment.jwtSecret, 'configured');
  assertEquals(body.environment.openAiKey, 'configured');
  assertEquals(body.environment.db, 'missing'); // 测试未配置 PG_HOST
  assertEquals(body.routeModules, 15);
  assertEquals(body.checks.kvStore.status, 'ok');
  assertEquals(body.checks.auth.status, 'ok'); // test-app 注入 JWT_SECRET
  assertEquals(body.checks.openAI.status, 'configured');
  assert(['healthy', 'degraded'].includes(body.status));

  fake.kvDown = true;
  const degraded = await jsonBody(await request(app, `${P}/diagnostics/health`));
  fake.kvDown = false;
  assertEquals(degraded.status, 'degraded');
  assertEquals(degraded.checks.kvStore.status, 'error');
  Deno.env.delete('OPENAI_API_KEY');
});

// ============================================================
// Upload
// ============================================================

Deno.test('upload: 单文件上传校验与成功', async () => {
  const invalid = await request(app, `${P}/upload/media`, { body: {} });
  assertEquals(invalid.status, 400);

  const badMime = await request(app, `${P}/upload/media`, {
    body: { fileBase64: 'AAAA', mimeType: 'text/plain', title: 'x' },
  });
  assertEquals(badMime.status, 400);

  const badBase64 = await request(app, `${P}/upload/media`, {
    body: { fileBase64: '%%%', mimeType: 'audio/mpeg', title: 'x' },
  });
  assertEquals(badBase64.status, 400);

  const ok = await request(app, `${P}/upload/media`, {
    body: {
      fileBase64: 'data:audio/mpeg;base64,AAAA', mimeType: 'audio/mpeg',
      title: 'My Song', artist: 'Me', userId: 'media-user', userName: 'Media',
      genre: 'Pop', duration: 120, isPublic: true, tags: ['tag'],
      coverBase64: 'AAAA', coverMimeType: 'image/png',
    },
  });
  assertEquals(ok.status, 200);
  const media = (await jsonBody(ok)).media;
  uploadedWithCoverId = media.id;
  assertMatch(media.id, /^upload-\d+-/);
  assertEquals(media.mediaType, 'audio');
  assertEquals(media.fileSize, 3);
  assertEquals(media.coverPath.endsWith('-cover.png'), true);
  assert(media.signedUrl);
  assert(media.coverSignedUrl);
  // 现行实现为本地文件存储：媒体文件直接落盘（uploads/{userId}/）
  assert(fs.existsSync(media.filePath));
  assert(fake.readJson('media:user:media-user').includes(media.id));
  assert(fake.readJson('media:index').includes(media.id));

  const privateMedia = await request(app, `${P}/upload/media`, {
    body: {
      fileBase64: 'AAAA', mimeType: 'video/mp4', title: 'Private',
      userId: 'media-user', isPublic: false,
    },
  });
  const privateBody = (await jsonBody(privateMedia)).media;
  uploadedMediaId = privateBody.id;
  assertEquals(privateBody.mediaType, 'video');
  assertEquals(fake.readJson('media:index').includes(privateBody.id), false);

  const invalidCover = await request(app, `${P}/upload/media`, {
    body: {
      fileBase64: 'AAAA', mimeType: 'audio/wav', title: 'Bad Cover',
      userId: 'media-user', coverBase64: '%%%', coverMimeType: 'image/png',
    },
  });
  assertEquals(invalidCover.status, 200);
  assertEquals((await jsonBody(invalidCover)).media.coverPath, null);

  // 恶意 userId（含 NUL 字节的路径穿越尝试）→ 入口 400 拒绝（W8 安全加固：
  // 此前依赖写盘失败兜底 500，现于路由入口校验 [A-Za-z0-9_-]{1,64} 提前拒绝）
  const uploadFail = await request(app, `${P}/upload/media`, {
    body: { fileBase64: 'AAAA', mimeType: 'audio/mpeg', title: 'Fail', userId: 'bad\u0000user' },
  });
  assertEquals(uploadFail.status, 400);
  assertMatch((await jsonBody(uploadFail)).error, /Invalid userId/);

  const tooLarge = await request(app, `${P}/upload/media`, {
    body: {
      fileBase64: 'A'.repeat(14_000_000), mimeType: 'audio/mpeg',
      title: 'Huge', userId: 'media-user',
    },
  });
  assertEquals(tooLarge.status, 400);
  assertMatch((await jsonBody(tooLarge)).error, /too large/);

  const broken = await request(app, `${P}/upload/media`, { body: '{bad' });
  assertEquals(broken.status, 500);
});

Deno.test('upload: 分片上传全流程', async () => {
  const invalid = await request(app, `${P}/upload/chunk/init`, { body: {} });
  assertEquals(invalid.status, 400);

  const init = await request(app, `${P}/upload/chunk/init`, {
    body: {
      fileName: 'big.mp3', mimeType: 'audio/mpeg', totalChunks: 2,
      totalSize: 6, title: 'Chunked', userId: 'chunk-user', userName: 'Chunker',
    },
  });
  assertEquals(init.status, 200);
  const initBody = await jsonBody(init);
  chunkSessionId = initBody.sessionId;
  assertMatch(chunkSessionId, /^cs-\d+-/);
  assertEquals(initBody.totalChunks, 2);

  const missingSession = await request(app, `${P}/upload/chunk/cs-none`, {
    body: { chunkIndex: 0, chunkBase64: 'AAAA' },
  });
  assertEquals(missingSession.status, 404);

  const invalidChunk = await request(app, `${P}/upload/chunk/${chunkSessionId}`, { body: {} });
  assertEquals(invalidChunk.status, 400);

  const outOfRange = await request(app, `${P}/upload/chunk/${chunkSessionId}`, {
    body: { chunkIndex: 5, chunkBase64: 'AAAA' },
  });
  assertEquals(outOfRange.status, 400);

  const badBase64 = await request(app, `${P}/upload/chunk/${chunkSessionId}`, {
    body: { chunkIndex: 0, chunkBase64: '%%%' },
  });
  assertEquals(badBase64.status, 400);

  const first = await request(app, `${P}/upload/chunk/${chunkSessionId}`, {
    body: { chunkIndex: 0, chunkBase64: 'AAAA' },
  });
  const firstBody = await jsonBody(first);
  assertEquals(firstBody.received, 1);
  assertEquals(firstBody.progress, 50);

  const duplicate = await request(app, `${P}/upload/chunk/${chunkSessionId}`, {
    body: { chunkIndex: 0, chunkBase64: 'AAAA' },
  });
  assertEquals((await jsonBody(duplicate)).received, 1);

  const incomplete = await request(app, `${P}/upload/chunk/${chunkSessionId}/complete`, {
    method: 'POST',
  });
  assertEquals(incomplete.status, 400);
  assertMatch((await jsonBody(incomplete)).error, /Missing chunks/);

  const second = await request(app, `${P}/upload/chunk/${chunkSessionId}`, {
    body: { chunkIndex: 1, chunkBase64: 'BBBB' },
  });
  assertEquals((await jsonBody(second)).progress, 100);

  const complete = await request(app, `${P}/upload/chunk/${chunkSessionId}/complete`, {
    method: 'POST',
  });
  assertEquals(complete.status, 200);
  const chunkedMedia = (await jsonBody(complete)).media;
  assertEquals(chunkedMedia.title, 'Chunked');
  assertEquals(chunkedMedia.fileSize, 6);
  assertEquals(fake.readJson('media:user:chunk-user').includes(chunkedMedia.id), true);

  const missingComplete = await request(app, `${P}/upload/chunk/cs-none/complete`, {
    method: 'POST',
  });
  assertEquals(missingComplete.status, 404);

  // 恶意 userId 的分片会话创建 → 入口 400 拒绝（W8 安全加固：路径穿越尝试提前拦截，
  // 不再依赖 finalize 阶段写盘失败兜底 500）
  const badInit = await request(app, `${P}/upload/chunk/init`, {
    body: {
      fileName: 'fail.mp3', mimeType: 'audio/mpeg', totalChunks: 1,
      totalSize: 3, title: 'Fail', userId: 'bad\u0000chunker',
    },
  });
  assertEquals(badInit.status, 400);
  assertMatch((await jsonBody(badInit)).error, /Invalid userId/);
});

Deno.test('upload: 歌词保存/读取', async () => {
  const missing = await request(app, `${P}/upload/media/nope/lyrics`, {
    method: 'PUT',
    body: { lyrics: [] },
  });
  assertEquals(missing.status, 404);

  const invalid = await request(app, `${P}/upload/media/${uploadedWithCoverId}/lyrics`, {
    method: 'PUT',
    body: { lyrics: [{ text: 'no time' }] },
  });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/upload/media/${uploadedWithCoverId}/lyrics`, {
    method: 'PUT',
    body: {
      lyrics: [
        { time: 5, text: 'second', emotion: 'happy' },
        { time: 1, text: 'first' },
      ],
    },
  });
  assertEquals(ok.status, 200);
  assertEquals((await jsonBody(ok)).lyricsCount, 2);
  const stored = fake.readJson(`lyrics:${uploadedWithCoverId}`);
  assertEquals(stored[0].text, 'first');
  assertEquals(stored[1].emotion, 'happy');

  const get = await request(app, `${P}/upload/media/${uploadedWithCoverId}/lyrics`);
  assertEquals((await jsonBody(get)).lyrics.length, 2);

  fake.kvDown = true;
  const downPut = await request(app, `${P}/upload/media/${uploadedWithCoverId}/lyrics`, {
    method: 'PUT',
    body: { lyrics: [] },
  });
  const downGet = await request(app, `${P}/upload/media/${uploadedWithCoverId}/lyrics`);
  fake.kvDown = false;
  assertEquals(downPut.status, 500);
  assertEquals(downGet.status, 500);
});

Deno.test('upload: 列表与详情', async () => {
  const byUser = await request(app, `${P}/upload/media?userId=media-user`);
  assertEquals(byUser.status, 200);
  const userMedia = await jsonBody(byUser);
  assertEquals(userMedia.total, 3);
  assert(userMedia.media.every((m: any) => m.userId === 'media-user'));

  const pub = await jsonBody(await request(app, `${P}/upload/media`));
  assertEquals(pub.total, fake.readJson('media:index').length);
  assert(pub.media.every((m: any) => m.userId));

  const lyricsRoute = await request(app, `${P}/upload/media/lyrics`);
  assertEquals(lyricsRoute.status, 404);

  const missing = await request(app, `${P}/upload/media/nope`);
  assertEquals(missing.status, 404);

  const detail = await request(app, `${P}/upload/media/${uploadedWithCoverId}`);
  assertEquals(detail.status, 200);
  const detailMedia = (await jsonBody(detail)).media;
  assert(detailMedia.signedUrl);
  assert(detailMedia.coverSignedUrl);
  assertEquals(detailMedia.lyrics.length, 2);

  // KV 不可用时：媒体列表/详情均无法读取（媒体元数据的键读取无关系表兜底）→ 500
  fake.kvDown = true;
  const downList = await request(app, `${P}/upload/media?userId=media-user`);
  const downDetail = await request(app, `${P}/upload/media/${uploadedWithCoverId}`);
  fake.kvDown = false;
  assertEquals(downList.status, 500);
  assertEquals(downDetail.status, 500);
});

Deno.test('upload: 公开索引截断到 500', async () => {
  fake.seedJson('media:index', Array.from({ length: 500 }, (_, i) => `filler-${i}`));
  const res = await request(app, `${P}/upload/media`, {
    body: {
      fileBase64: 'AAAA', mimeType: 'audio/mpeg', title: 'Cap',
      userId: 'cap-user', isPublic: true,
    },
  });
  assertEquals(res.status, 200);
  assertEquals(fake.readJson('media:index').length, 500);
  assertEquals(fake.readJson('media:index')[0].startsWith('upload-'), true);
});

Deno.test('upload: 删除成功/不存在/错误', async () => {
  const missing = await request(app, `${P}/upload/media/nope`, { method: 'DELETE' });
  assertEquals(missing.status, 404);

  const beforeUser = fake.readJson('media:user:media-user');
  const beforeIndex = fake.readJson('media:index');
  assert(beforeUser.includes(uploadedWithCoverId));

  const ok = await request(app, `${P}/upload/media/${uploadedWithCoverId}`, {
    method: 'DELETE',
  });
  assertEquals(ok.status, 200);
  assertEquals((await jsonBody(ok)).deletedId, uploadedWithCoverId);
  assertEquals(fake.read(`media:${uploadedWithCoverId}`), undefined);
  assertEquals(fake.read(`lyrics:${uploadedWithCoverId}`), undefined);
  assertEquals(fake.readJson('media:user:media-user').includes(uploadedWithCoverId), false);
  if (beforeIndex.includes(uploadedWithCoverId)) {
    assertEquals(fake.readJson('media:index').includes(uploadedWithCoverId), false);
  }

  fake.kvDown = true;
  const down = await request(app, `${P}/upload/media/${uploadedMediaId}`, {
    method: 'DELETE',
  });
  fake.kvDown = false;
  assertEquals(down.status, 500);
});
