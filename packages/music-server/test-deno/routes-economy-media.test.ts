/**
 * Albums / Market / PKI / Diagnostics / Upload 路由测试
 */
import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1';

import { FakeSupabase } from './helpers/fake-supabase.ts';
import {
  createTestApp,
  jsonBody,
  request,
  tokenFor,
} from './helpers/test-app.ts';
import { queryCache } from '../src/server-utils.ts';

const fake = new FakeSupabase();
fake.install();
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.delete('OPENAI_API_KEY');

const app = createTestApp();
const P = '/make-server-f626b673';
const auth = (id: string) => tokenFor(id);

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
    token: auth('artist-m'),
    body: { creatorId: 'artist-m', title: '' },
  });
  assertEquals(invalid.status, 400);

  const ok = await request(app, `${P}/albums`, {
    token: auth('artist-m'),
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
    token: auth('artist-m'),
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
    token: auth('album-buyer'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  fake.seedJson('album:ownership:album-neon-nights:owned-user', { albumId: 'album-neon-nights' });
  const owned = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: auth('owned-user'),
    body: { userId: 'owned-user' },
  });
  assertEquals(owned.status, 409);
  assertEquals((await jsonBody(owned)).alreadyOwned, true);

  const missing = await request(app, `${P}/albums/no-album/purchase`, {
    token: auth('album-buyer'),
    body: { userId: 'album-buyer' },
  });
  assertEquals(missing.status, 404);

  fake.seedJson('album:album-soldout', {
    id: 'album-soldout', creatorId: 'system', title: 'Sold', price: 10,
    limitedEdition: true, maxSupply: 1, circulatingSupply: 1, totalSales: 1,
  });
  const soldOut = await request(app, `${P}/albums/album-soldout/purchase`, {
    token: auth('album-buyer'),
    body: { userId: 'album-buyer' },
  });
  assertEquals(soldOut.status, 409);
  assertEquals((await jsonBody(soldOut)).soldOut, true);

  fake.seed('user:poor-buyer:starpower', '10');
  const poor = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: auth('poor-buyer'),
    body: { userId: 'poor-buyer' },
  });
  assertEquals(poor.status, 402);

  // 成功：system 创作者，不产生创作者分成
  fake.seed('user:album-buyer:starpower', '500');
  const ok = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: auth('album-buyer'),
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
    token: auth('buyer-art'),
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
    token: auth('race-buyer'),
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
    token: auth('sold-buyer'),
    body: { userId: 'sold-buyer' },
  });
  assertEquals(raceSold.status, 409);
  assertMatch((await jsonBody(raceSold)).error, /concurrent/);

  const broken = await request(app, `${P}/albums/album-neon-nights/purchase`, {
    token: auth('album-buyer'),
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
    token: auth('seller-1'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  const notOwned = await request(app, `${P}/market/list`, {
    token: auth('seller-1'),
    body: { userId: 'seller-1', albumId: 'album-cosmic-dreams', price: 100 },
  });
  assertEquals(notOwned.status, 403);

  const ok = await request(app, `${P}/market/list`, {
    token: auth('seller-1'),
    body: { userId: 'seller-1', userName: 'Seller', albumId: 'album-mkt', price: 100 },
  });
  assertEquals(ok.status, 200);
  const listing = (await jsonBody(ok)).listing;
  assertMatch(listing.id, /^mkt-/);
  assertEquals(listing.price, 100);
  assertEquals(listing.originalPrice, 200);
  assertEquals(fake.readJson('market:listing-index').length, 1);

  const dup = await request(app, `${P}/market/list`, {
    token: auth('seller-1'),
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
    token: auth('seller-1'),
    body: { userId: 'seller-1', albumId: 'album-mkt3', price: 130 },
  });
  assertEquals(relist.status, 200);

  const broken = await request(app, `${P}/market/list`, {
    token: auth('seller-1'),
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
    token: auth('buyer-1'),
    body: {},
  });
  assertEquals(invalid.status, 400);

  const missing = await request(app, `${P}/market/buy/mkt-nope`, {
    token: auth('buyer-1'),
    body: { userId: 'buyer-1' },
  });
  assertEquals(missing.status, 404);

  const own = await request(app, `${P}/market/buy/${listingId}`, {
    token: auth('seller-1'),
    body: { userId: 'seller-1' },
  });
  assertEquals(own.status, 400);

  fake.seed('user:buyer-poor:starpower', '1');
  const poor = await request(app, `${P}/market/buy/${listingId}`, {
    token: auth('buyer-poor'),
    body: { userId: 'buyer-poor' },
  });
  assertEquals(poor.status, 402);

  fake.seed('user:buyer-1:starpower', '500');
  const ok = await request(app, `${P}/market/buy/${listingId}`, {
    token: auth('buyer-1'),
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
    token: auth('buyer-1'),
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
    token: auth('race-market'),
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
    token: auth('race2-market'),
    body: { userId: 'race2-market' },
  });
  assertEquals(race2.status, 410);
  assertMatch((await jsonBody(race2)).error, /concurrent/);

  const broken = await request(app, `${P}/market/buy/mkt-race2`, {
    token: auth('race2-market'),
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
  const missing = await request(app, `${P}/pki/public-key`, { body: {} });
  assertEquals(missing.status, 400);

  const invalid = await request(app, `${P}/pki/public-key`, {
    body: { userId: 'pki-user', publicKeyJwk: { kty: 'RSA' } },
  });
  assertEquals(invalid.status, 400);

  const jwk = {
    kty: 'RSA', n: 'abcdefghijklmnopqrstuvwxyz0123456789ABCD', e: 'AQAB',
  };
  const created = await request(app, `${P}/pki/public-key`, {
    body: { userId: 'pki-user', publicKeyJwk: jwk },
  });
  assertEquals(created.status, 200);
  const createdBody = await jsonBody(created);
  assertEquals(createdBody.isNew, true);
  assertMatch(createdBody.fingerprint, /^[A-Z0-9:]+$/);
  assert(fake.readJson('pki:enrollment-log').includes('pki-user'));

  const updated = await request(app, `${P}/pki/public-key`, {
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

  const deleted = await request(app, `${P}/pki/public-key/pki-user`, { method: 'DELETE' });
  assertEquals(deleted.status, 200);
  assertEquals(fake.read('pki:public-key:pki-user'), undefined);
  assertEquals(fake.readJson('pki:enrollment-log').includes('pki-user'), false);

  fake.kvDown = true;
  const downGet = await request(app, `${P}/pki/public-key/pki-user`);
  const downPost = await request(app, `${P}/pki/public-key`, {
    body: { userId: 'pki-user', publicKeyJwk: jwk },
  });
  const downDelete = await request(app, `${P}/pki/public-key/pki-user`, { method: 'DELETE' });
  fake.kvDown = false;
  assertEquals(downGet.status, 500);
  assertEquals(downPost.status, 500);
  assertEquals(downDelete.status, 500);

  const broken = await request(app, `${P}/pki/public-key`, { body: '{bad' });
  assertEquals(broken.status, 500);
});

Deno.test('pki: 密钥备份与状态', async () => {
  const missing = await request(app, `${P}/pki/key-backup`, { body: { userId: 'bk-user' } });
  assertEquals(missing.status, 400);

  const payload = {
    userId: 'bk-user', encryptedPrivateKey: 'cipher', salt: 'salt', iv: 'iv',
    publicKeyJwk: { kty: 'RSA', n: 'n' },
  };
  const created = await request(app, `${P}/pki/key-backup`, { body: payload });
  assertEquals(created.status, 200);
  assertEquals((await jsonBody(created)).isNew, true);

  const updated = await request(app, `${P}/pki/key-backup`, { body: payload });
  assertEquals((await jsonBody(updated)).isNew, false);

  const fetched = await request(app, `${P}/pki/key-backup/bk-user`);
  assertEquals(fetched.status, 200);
  const backup = await jsonBody(fetched);
  assertEquals(backup.hasBackup, true);
  assertEquals(backup.encryptedPrivateKey, 'cipher');

  const noBackup = await request(app, `${P}/pki/key-backup/none`);
  assertEquals(noBackup.status, 404);

  await request(app, `${P}/pki/public-key`, {
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

  fake.kvDown = true;
  const downBackup = await request(app, `${P}/pki/key-backup/bk-user`);
  const downStatus = await request(app, `${P}/pki/status/bk-user`);
  fake.kvDown = false;
  assertEquals(downBackup.status, 500);
  assertEquals(downStatus.status, 500);

  const broken = await request(app, `${P}/pki/key-backup`, { body: '{bad' });
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
  assertEquals(body.summary.uncategorizedCount, body.uncategorizedKeys.length);
  assertEquals(body.uncategorizedKeys.includes('misc:unknown'), true);
  assertEquals(body.domainStats.userDomain >= userKeys.length, true);
  assertEquals(body.domainStats.songDomain >= 3, true);
  assertEquals(body.domainStats.spacetimeDomain >= 2, true);
  assertEquals(body.domainStats.economyDomain >= 3, true);
  assertEquals(body.domainStats.systemDomain >= 2, true);
  assertEquals(body.emptyPrefixes.length, 0);
  assert(body.cacheStats);

  fake.countError = true;
  const countFail = await request(app, `${P}/diagnostics/kv-stats`);
  fake.countError = false;
  assertEquals(countFail.status, 500);
  assertMatch((await jsonBody(countFail)).error, /count rows/);

  fake.keysError = true;
  const keysFail = await request(app, `${P}/diagnostics/kv-stats`);
  fake.keysError = false;
  assertEquals(keysFail.status, 500);
  assertMatch((await jsonBody(keysFail)).error, /fetch keys/);

  Deno.env.delete('SUPABASE_URL');
  const catchFail = await request(app, `${P}/diagnostics/kv-stats`);
  Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
  assertEquals(catchFail.status, 500);
  assertMatch((await jsonBody(catchFail)).error, /Diagnostics failed/);
});

Deno.test('diagnostics: health 检查项', async () => {
  Deno.env.set('OPENAI_API_KEY', 'sk-test-key-1234567890');
  const res = await request(app, `${P}/diagnostics/health`);
  assertEquals(res.status, 200);
  const body = await jsonBody(res);
  assertEquals(body.environment.supabaseUrl, 'configured');
  assertEquals(body.environment.serviceRoleKey, 'configured');
  assertEquals(body.environment.openAiKey, 'configured');
  assertEquals(body.environment.dbUrl, 'missing');
  assertEquals(body.routeModules, 15);
  assertEquals(body.checks.kvStore.status, 'ok');
  assertEquals(body.checks.storage.status, 'ok');
  assertEquals(body.checks.openAI.status, 'configured');
  assert(['healthy', 'degraded'].includes(body.status));

  fake.kvDown = true;
  fake.storageDown = true;
  const degraded = await jsonBody(await request(app, `${P}/diagnostics/health`));
  fake.kvDown = false;
  fake.storageDown = false;
  assertEquals(degraded.status, 'degraded');
  assertEquals(degraded.checks.kvStore.status, 'error');
  assertEquals(degraded.checks.storage.status, 'degraded');
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
  assert(fake.buckets.has('make-f626b673-media'));
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

  fake.uploadError = 'storage down';
  const uploadFail = await request(app, `${P}/upload/media`, {
    body: { fileBase64: 'AAAA', mimeType: 'audio/mpeg', title: 'Fail', userId: 'media-user' },
  });
  fake.uploadError = null;
  assertEquals(uploadFail.status, 500);
  assertMatch((await jsonBody(uploadFail)).error, /Upload failed/);

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

  // 完成阶段存储失败
  const init2 = await jsonBody(await request(app, `${P}/upload/chunk/init`, {
    body: {
      fileName: 'fail.mp3', mimeType: 'audio/mpeg', totalChunks: 1,
      totalSize: 3, title: 'Fail', userId: 'chunk-user',
    },
  }));
  await request(app, `${P}/upload/chunk/${init2.sessionId}`, {
    body: { chunkIndex: 0, chunkBase64: 'AAAA' },
  });
  fake.uploadError = 'complete failed';
  const failComplete = await request(app, `${P}/upload/chunk/${init2.sessionId}/complete`, {
    method: 'POST',
  });
  fake.uploadError = null;
  assertEquals(failComplete.status, 500);
  assertMatch((await jsonBody(failComplete)).error, /finalization failed/);
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

  fake.signError = 'sign failed';
  const signFail = await request(app, `${P}/upload/media/${uploadedWithCoverId}`);
  fake.signError = null;
  assertEquals(signFail.status, 500);

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
