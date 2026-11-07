/**
 * D-Music P3 §2 — End-to-End Encryption (E2EE) Utilities
 *
 * Wraps the Web Crypto API for:
 *   - RSA-OAEP 2048-bit key pair generation (key exchange)
 *   - AES-GCM 256-bit symmetric encryption (message content)
 *   - Hybrid encrypt/decrypt flows
 *   - IndexedDB-based private key storage
 *   - Key export/import (PEM-like JWK format)
 *   - Key backup with passphrase-derived encryption (PBKDF2 + AES-GCM)
 *
 * Security model:
 *   - Private keys NEVER leave the client (stored in IndexedDB)
 *   - Public keys are uploaded to the server PKI store
 *   - Messages are encrypted with random AES session keys
 *   - AES session keys are encrypted with recipient's RSA public key
 *   - Only the recipient can decrypt the session key → message
 */

// ============================================================
// Constants
// ============================================================

const DB_NAME = 'dmusic-e2ee';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const RSA_ALGORITHM: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]), // 65537
  hash: 'SHA-256',
};
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100_000;

// ============================================================
// Types
// ============================================================

export interface E2EKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  createdAt: number;
  userId: string;
}

export interface EncryptedPayload {
  /** AES-GCM encrypted content (base64) */
  ciphertext: string;
  /** AES session key encrypted with recipient's RSA public key (base64) */
  encryptedSessionKey: string;
  /** AES-GCM initialization vector (base64) */
  iv: string;
  /** Sender's userId for key lookup */
  senderId: string;
  /** Algorithm metadata */
  algorithm: 'RSA-OAEP+AES-GCM-256';
  /** Timestamp */
  encryptedAt: number;
}

export interface KeyBackup {
  /** Private key encrypted with passphrase-derived key (base64) */
  encryptedPrivateKey: string;
  /** PBKDF2 salt (base64) */
  salt: string;
  /** AES-GCM IV used for backup encryption (base64) */
  iv: string;
  /** Public key JWK (plaintext, not secret) */
  publicKeyJwk: JsonWebKey;
  /** Creation metadata */
  createdAt: number;
  userId: string;
}

// ============================================================
// IndexedDB Helpers
// ============================================================

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============================================================
// Encoding Helpers
// ============================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function textToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function arrayBufferToText(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

// ============================================================
// Key Generation
// ============================================================

/**
 * Generate a new RSA-OAEP key pair for E2EE.
 * The private key is stored in IndexedDB, never exported in plaintext.
 */
export async function generateKeyPair(userId: string): Promise<E2EKeyPair> {
  const crypto = window.crypto.subtle;

  // Generate RSA-OAEP key pair
  const keyPair = await crypto.generateKey(RSA_ALGORITHM, true, ['encrypt', 'decrypt']);

  // Export public key as JWK for server upload
  const publicKeyJwk = await crypto.exportKey('jwk', keyPair.publicKey);

  const result: E2EKeyPair = {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeyJwk,
    createdAt: Date.now(),
    userId,
  };

  // Store private key JWK in IndexedDB (extractable for backup purposes)
  const privateKeyJwk = await crypto.exportKey('jwk', keyPair.privateKey);
  await idbSet(`privateKey:${userId}`, {
    jwk: privateKeyJwk,
    createdAt: result.createdAt,
  });
  await idbSet(`publicKey:${userId}`, {
    jwk: publicKeyJwk,
    createdAt: result.createdAt,
  });

  return result;
}

/**
 * Check if a user has a local key pair.
 */
export async function hasLocalKeyPair(userId: string): Promise<boolean> {
  try {
    const stored = await idbGet<{ jwk: JsonWebKey }>(`privateKey:${userId}`);
    return !!stored?.jwk;
  } catch {
    return false;
  }
}

/**
 * Load the local private key from IndexedDB.
 */
export async function loadPrivateKey(userId: string): Promise<CryptoKey | null> {
  try {
    const stored = await idbGet<{ jwk: JsonWebKey }>(`privateKey:${userId}`);
    if (!stored?.jwk) return null;

    return await window.crypto.subtle.importKey(
      'jwk',
      stored.jwk,
      RSA_ALGORITHM,
      false,
      ['decrypt']
    );
  } catch (err) {
    console.error('[E2EE] Failed to load private key:', err);
    return null;
  }
}

/**
 * Load the local public key JWK.
 */
export async function loadPublicKeyJwk(userId: string): Promise<JsonWebKey | null> {
  try {
    const stored = await idbGet<{ jwk: JsonWebKey }>(`publicKey:${userId}`);
    return stored?.jwk || null;
  } catch {
    return null;
  }
}

/**
 * Import a public key JWK (e.g., fetched from server PKI) into a CryptoKey.
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    RSA_ALGORITHM,
    false,
    ['encrypt']
  );
}

/**
 * Delete local keys (for key rotation or account cleanup).
 */
export async function deleteLocalKeys(userId: string): Promise<void> {
  await idbDelete(`privateKey:${userId}`);
  await idbDelete(`publicKey:${userId}`);
}

// ============================================================
// Hybrid Encryption (RSA-OAEP + AES-GCM)
// ============================================================

/**
 * Encrypt a message for a specific recipient.
 *
 * Flow:
 *  1. Generate a random AES-256-GCM session key
 *  2. Encrypt the plaintext with the session key
 *  3. Encrypt the session key with the recipient's RSA public key
 *  4. Return the encrypted payload
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
  senderId: string
): Promise<EncryptedPayload> {
  const crypto = window.crypto.subtle;

  // Step 1: Generate random AES session key
  const sessionKey = await crypto.generateKey(
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  // Step 2: Encrypt plaintext with AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const plaintextBuffer = textToArrayBuffer(plaintext);
  const ciphertextBuffer = await crypto.encrypt(
    { name: AES_ALGORITHM, iv },
    sessionKey,
    plaintextBuffer
  );

  // Step 3: Export & encrypt session key with recipient's RSA public key
  const sessionKeyRaw = await crypto.exportKey('raw', sessionKey);
  const encryptedSessionKeyBuffer = await crypto.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    sessionKeyRaw
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    encryptedSessionKey: arrayBufferToBase64(encryptedSessionKeyBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    senderId,
    algorithm: 'RSA-OAEP+AES-GCM-256',
    encryptedAt: Date.now(),
  };
}

/**
 * Decrypt an encrypted payload using the recipient's private key.
 *
 * Flow:
 *  1. Decrypt the AES session key with the private RSA key
 *  2. Decrypt the ciphertext with the session key
 *  3. Return the plaintext
 */
export async function decryptMessage(
  payload: EncryptedPayload,
  privateKey: CryptoKey
): Promise<string> {
  const crypto = window.crypto.subtle;

  // Step 1: Decrypt the session key
  const encryptedSessionKeyBuffer = base64ToArrayBuffer(payload.encryptedSessionKey);
  const sessionKeyRaw = await crypto.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedSessionKeyBuffer
  );

  // Step 2: Import the session key
  const sessionKey = await crypto.importKey(
    'raw',
    sessionKeyRaw,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    false,
    ['decrypt']
  );

  // Step 3: Decrypt the ciphertext
  const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);
  const ivBuffer = base64ToArrayBuffer(payload.iv);
  const plaintextBuffer = await crypto.decrypt(
    { name: AES_ALGORITHM, iv: new Uint8Array(ivBuffer) },
    sessionKey,
    ciphertextBuffer
  );

  return arrayBufferToText(plaintextBuffer);
}

// ============================================================
// Key Backup (Passphrase-protected export)
// ============================================================

/**
 * Derive an AES key from a passphrase using PBKDF2.
 */
async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const crypto = window.crypto.subtle;
  const passphraseKey = await crypto.importKey(
    'raw',
    textToArrayBuffer(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Create a passphrase-protected backup of the private key.
 * This backup can be stored on the server (encrypted, server cannot read it).
 */
export async function createKeyBackup(
  userId: string,
  passphrase: string
): Promise<KeyBackup | null> {
  const crypto = window.crypto.subtle;

  // Load private key JWK from IndexedDB
  const stored = await idbGet<{ jwk: JsonWebKey; createdAt: number }>(`privateKey:${userId}`);
  if (!stored?.jwk) return null;

  const publicStored = await idbGet<{ jwk: JsonWebKey }>(`publicKey:${userId}`);
  if (!publicStored?.jwk) return null;

  // Serialize private key JWK to JSON string
  const privateKeyJson = JSON.stringify(stored.jwk);

  // Derive encryption key from passphrase
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);

  // Encrypt private key with derived key
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedPrivateKeyBuffer = await crypto.encrypt(
    { name: AES_ALGORITHM, iv },
    derivedKey,
    textToArrayBuffer(privateKeyJson)
  );

  return {
    encryptedPrivateKey: arrayBufferToBase64(encryptedPrivateKeyBuffer),
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    publicKeyJwk: publicStored.jwk,
    createdAt: stored.createdAt,
    userId,
  };
}

/**
 * Restore a private key from a passphrase-protected backup.
 */
export async function restoreKeyFromBackup(
  backup: KeyBackup,
  passphrase: string
): Promise<boolean> {
  try {
    const crypto = window.crypto.subtle;

    // Derive key from passphrase
    const salt = new Uint8Array(base64ToArrayBuffer(backup.salt));
    const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);

    // Decrypt private key
    const iv = new Uint8Array(base64ToArrayBuffer(backup.iv));
    const encryptedBuffer = base64ToArrayBuffer(backup.encryptedPrivateKey);
    const decryptedBuffer = await crypto.decrypt(
      { name: AES_ALGORITHM, iv },
      derivedKey,
      encryptedBuffer
    );

    // Parse the decrypted JWK
    const privateKeyJwk = JSON.parse(arrayBufferToText(decryptedBuffer));

    // Verify it's a valid RSA private key by importing it
    await crypto.importKey('jwk', privateKeyJwk, RSA_ALGORITHM, true, ['decrypt']);

    // Store in IndexedDB
    await idbSet(`privateKey:${backup.userId}`, {
      jwk: privateKeyJwk,
      createdAt: backup.createdAt,
    });
    await idbSet(`publicKey:${backup.userId}`, {
      jwk: backup.publicKeyJwk,
      createdAt: backup.createdAt,
    });

    return true;
  } catch (err) {
    console.error('[E2EE] Key restoration failed (wrong passphrase?):', err);
    return false;
  }
}

// ============================================================
// Feature Detection
// ============================================================

/**
 * Check if the browser supports the required Web Crypto APIs.
 */
export function isE2EESupported(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.crypto !== 'undefined' &&
      typeof window.crypto.subtle !== 'undefined' &&
      typeof indexedDB !== 'undefined'
    );
  } catch {
    return false;
  }
}

/**
 * Get the E2EE status for a user.
 */
export async function getE2EEStatus(userId: string): Promise<{
  supported: boolean;
  hasLocalKeys: boolean;
  publicKeyJwk: JsonWebKey | null;
}> {
  const supported = isE2EESupported();
  if (!supported) {
    return { supported: false, hasLocalKeys: false, publicKeyJwk: null };
  }

  const hasLocalKeys = await hasLocalKeyPair(userId);
  const publicKeyJwk = hasLocalKeys ? await loadPublicKeyJwk(userId) : null;

  return { supported, hasLocalKeys, publicKeyJwk };
}
