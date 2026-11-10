/**
 * D-Music P3 §2 — PKI (Public Key Infrastructure) Routes
 *
 * Routes:
 *   POST /pki/public-key              — Upload/update a user's public key (auth required)
 *   GET  /pki/public-key/:userId      — Fetch a user's public key
 *   DELETE /pki/public-key/:userId    — Delete a user's public key (auth required, key rotation)
 *   POST /pki/key-backup              — Store encrypted key backup on server (auth required)
 *   GET  /pki/key-backup/:userId      — Retrieve encrypted key backup
 *   GET  /pki/status/:userId          — Check E2EE enrollment status
 *
 * KV Schema:
 *   pki:public-key:{userId}           — Public key JWK + metadata (JSON)
 *   pki:key-backup:{userId}           — Encrypted private key backup (JSON)
 *   pki:enrollment-log                — Array of enrolled userIds (JSON)
 *
 * Security:
 *   - Public keys are NOT secret (anyone can fetch them to send encrypted messages)
 *   - Key backups are encrypted client-side with a passphrase; server stores opaque blob
 *   - Write operations require authentication
 */

import { ROUTE_PREFIX, kv, requireAuth } from "./server-utils.ts";
import { rateLimit, RATE_SENSITIVE } from "./rate-limit.ts";
import {
  getPkiPublicKey, upsertPkiPublicKey, getPkiKeyBackup, upsertPkiKeyBackup, deletePkiKeys,
} from "./db.ts";

// ==========================================
// Types
// ==========================================

interface PublicKeyRecord {
  userId: string;
  publicKeyJwk: JsonWebKey;
  algorithm: string;
  createdAt: number;
  updatedAt: number;
  fingerprint: string; // SHA-256 hash of the JWK for quick comparison
}

interface KeyBackupRecord {
  userId: string;
  encryptedPrivateKey: string; // Base64 AES-GCM ciphertext
  salt: string;               // Base64 PBKDF2 salt
  iv: string;                 // Base64 AES-GCM IV
  publicKeyJwk: JsonWebKey;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// Helpers
// ==========================================

/**
 * Compute a simple fingerprint of a JWK for display/comparison.
 * Uses the 'n' (modulus) field of RSA keys, truncated.
 */
function computeFingerprint(jwk: JsonWebKey): string {
  const source = jwk.n || jwk.x || JSON.stringify(jwk);
  // Simple hash: take first 16 chars, insert colons every 4 chars
  const truncated = source.slice(0, 32);
  return truncated.replace(/(.{4})/g, '$1:').replace(/:$/, '').toUpperCase();
}

async function getEnrollmentLog(): Promise<string[]> {
  const raw = await kv.get('pki:enrollment-log');
  if (!raw) return [];
  try { return JSON.parse(raw as string); } catch { return []; }
}

/** P1b: 读取公钥记录——关系表优先，未命中回退 KV */
async function readPublicKey(userId: string): Promise<PublicKeyRecord | null> {
  const fromDb = await getPkiPublicKey(userId);
  if (fromDb) return fromDb as PublicKeyRecord;
  const raw = await kv.get(`pki:public-key:${userId}`);
  if (!raw) return null;
  try { return JSON.parse(raw as string) as PublicKeyRecord; } catch { return null; }
}

/** P1b: 读取密钥备份——关系表优先，未命中回退 KV */
async function readKeyBackup(userId: string): Promise<KeyBackupRecord | null> {
  const fromDb = await getPkiKeyBackup(userId);
  if (fromDb) return fromDb as KeyBackupRecord;
  const raw = await kv.get(`pki:key-backup:${userId}`);
  if (!raw) return null;
  try { return JSON.parse(raw as string) as KeyBackupRecord; } catch { return null; }
}

async function addToEnrollmentLog(userId: string): Promise<void> {
  const log = await getEnrollmentLog();
  if (!log.includes(userId)) {
    log.push(userId);
    await kv.set('pki:enrollment-log', JSON.stringify(log));
  }
}

// ==========================================
// Route Registration
// ==========================================

export function registerPkiRoutes(app: any) {

  // ---- POST /pki/public-key — Upload/update public key（需登录且仅限本人） ----
  app.post(`${ROUTE_PREFIX}/pki/public-key`, requireAuth, rateLimit(RATE_SENSITIVE), async (c: any) => {
    try {
      const body = await c.req.json();
      const { userId, publicKeyJwk } = body;

      if (!userId || !publicKeyJwk) {
        return c.json({ error: 'Missing required fields: userId, publicKeyJwk' }, 400);
      }

      // A2: 仅允许操作自己的公钥
      const authed = c.get('authedUser');
      if (!authed || authed.id !== userId) {
        return c.json({ error: 'Forbidden: userId mismatch' }, 403);
      }

      // Validate JWK structure
      if (!publicKeyJwk.kty || !publicKeyJwk.n || !publicKeyJwk.e) {
        return c.json({ error: 'Invalid JWK format: missing kty, n, or e fields' }, 400);
      }

      const fingerprint = computeFingerprint(publicKeyJwk);
      const now = Date.now();

      // P1b: 读优先关系表，未命中回退 KV
      const existing = await readPublicKey(userId);

      const record: PublicKeyRecord = {
        userId,
        publicKeyJwk,
        algorithm: 'RSA-OAEP-2048-SHA256',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        fingerprint,
      };

      await kv.set(`pki:public-key:${userId}`, JSON.stringify(record));
      await upsertPkiPublicKey(record);
      await addToEnrollmentLog(userId);

      console.log(`[PKI] Public key ${existing ? 'updated' : 'registered'} for user ${userId} (fingerprint: ${fingerprint})`);

      return c.json({
        success: true,
        fingerprint,
        isNew: !existing,
        updatedAt: now,
      });
    } catch (error) {
      console.log(`[PKI] Error uploading public key:`, error);
      return c.json({ error: 'Failed to upload public key', detail: String(error) }, 500);
    }
  });

  // ---- GET /pki/public-key/:userId — Fetch public key ----
  app.get(`${ROUTE_PREFIX}/pki/public-key/:userId`, async (c: any) => {
    const userId = c.req.param('userId');
    try {
      // P1b: 读优先关系表，未命中回退 KV
      const record = await readPublicKey(userId);
      if (!record) {
        return c.json({ error: 'Public key not found', enrolled: false }, 404);
      }

      return c.json({
        publicKeyJwk: record.publicKeyJwk,
        fingerprint: record.fingerprint,
        algorithm: record.algorithm,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        enrolled: true,
      });
    } catch (error) {
      console.log(`[PKI] Error fetching public key for ${userId}:`, error);
      return c.json({ error: 'Failed to fetch public key', detail: String(error) }, 500);
    }
  });

  // ---- DELETE /pki/public-key/:userId — Delete public key (key rotation，需登录且仅限本人) ----
  app.delete(`${ROUTE_PREFIX}/pki/public-key/:userId`, requireAuth, rateLimit(RATE_SENSITIVE), async (c: any) => {
    const userId = c.req.param('userId');
    try {
      // A2: 仅允许删除自己的密钥
      const authed = c.get('authedUser');
      if (!authed || authed.id !== userId) {
        return c.json({ error: 'Forbidden: userId mismatch' }, 403);
      }
      await kv.del(`pki:public-key:${userId}`);
      await kv.del(`pki:key-backup:${userId}`);

      // P1b: 关系表侧尽力同步删除
      await deletePkiKeys(userId);

      // Remove from enrollment log
      const log = await getEnrollmentLog();
      const updated = log.filter(id => id !== userId);
      await kv.set('pki:enrollment-log', JSON.stringify(updated));

      console.log(`[PKI] Keys deleted for user ${userId} (key rotation)`);

      return c.json({ success: true, message: 'Public key and backup deleted' });
    } catch (error) {
      console.log(`[PKI] Error deleting keys for ${userId}:`, error);
      return c.json({ error: 'Failed to delete keys', detail: String(error) }, 500);
    }
  });

  // ---- POST /pki/key-backup — Store encrypted key backup（需登录且仅限本人） ----
  app.post(`${ROUTE_PREFIX}/pki/key-backup`, requireAuth, rateLimit(RATE_SENSITIVE), async (c: any) => {
    try {
      const body = await c.req.json();
      const { userId, encryptedPrivateKey, salt, iv, publicKeyJwk } = body;

      if (!userId || !encryptedPrivateKey || !salt || !iv) {
        return c.json({ error: 'Missing required backup fields' }, 400);
      }

      // A2: 仅允许写入自己的备份
      const authed = c.get('authedUser');
      if (!authed || authed.id !== userId) {
        return c.json({ error: 'Forbidden: userId mismatch' }, 403);
      }

      const now = Date.now();
      // P1b: 读优先关系表，未命中回退 KV
      const existing = await readKeyBackup(userId);

      const record: KeyBackupRecord = {
        userId,
        encryptedPrivateKey,
        salt,
        iv,
        publicKeyJwk: publicKeyJwk || {},
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      await kv.set(`pki:key-backup:${userId}`, JSON.stringify(record));
      await upsertPkiKeyBackup(record);

      console.log(`[PKI] Key backup ${existing ? 'updated' : 'created'} for user ${userId}`);

      return c.json({
        success: true,
        isNew: !existing,
        updatedAt: now,
      });
    } catch (error) {
      console.log(`[PKI] Error storing key backup:`, error);
      return c.json({ error: 'Failed to store key backup', detail: String(error) }, 500);
    }
  });

  // ---- GET /pki/key-backup/:userId — Retrieve encrypted key backup（需登录且仅限本人） ----
  app.get(`${ROUTE_PREFIX}/pki/key-backup/:userId`, requireAuth, async (c: any) => {
    const userId = c.req.param('userId');
    try {
      // A2: 加密私钥备份仅本人可取
      const authed = c.get('authedUser');
      if (!authed || authed.id !== userId) {
        return c.json({ error: 'Forbidden: userId mismatch' }, 403);
      }
      // P1b: 读优先关系表，未命中回退 KV
      const record = await readKeyBackup(userId);
      if (!record) {
        return c.json({ error: 'Key backup not found', hasBackup: false }, 404);
      }

      return c.json({
        encryptedPrivateKey: record.encryptedPrivateKey,
        salt: record.salt,
        iv: record.iv,
        publicKeyJwk: record.publicKeyJwk,
        createdAt: record.createdAt,
        hasBackup: true,
      });
    } catch (error) {
      console.log(`[PKI] Error fetching key backup for ${userId}:`, error);
      return c.json({ error: 'Failed to fetch key backup', detail: String(error) }, 500);
    }
  });

  // ---- GET /pki/status/:userId — Check E2EE enrollment status ----
  app.get(`${ROUTE_PREFIX}/pki/status/:userId`, async (c: any) => {
    const userId = c.req.param('userId');
    try {
      // P1b: 读优先关系表，未命中回退 KV
      const keyRecord = await readPublicKey(userId);
      const backupRecord = await readKeyBackup(userId);

      const hasPublicKey = !!keyRecord;
      const hasBackup = !!backupRecord;

      return c.json({
        enrolled: hasPublicKey,
        hasBackup,
        fingerprint: keyRecord?.fingerprint ?? null,
        enrolledAt: keyRecord?.createdAt ?? null,
      });
    } catch (error) {
      console.log(`[PKI] Error checking status for ${userId}:`, error);
      return c.json({ error: 'Failed to check E2EE status', detail: String(error) }, 500);
    }
  });
}
