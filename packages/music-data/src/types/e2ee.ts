// 端到端加密域 — E2EE/PKI 密钥、加密载荷、备份与设置面板

import type { AuthUser } from './user';

/** E2EE setup wizard steps */
export type E2ESetupStep =
  | 'intro'
  | 'generating'
  | 'uploading'
  | 'backup'
  | 'complete'
  | 'status'
  | 'restore';

/** E2EE key pair */
export interface E2EKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  createdAt: number;
  userId: string;
}

/** Encrypted message payload */
export interface EncryptedPayload {
  /** AES-GCM encrypted content (base64) */
  ciphertext: string;
  /** AES-GCM initialization vector (base64) */
  iv: string;
  /** RSA-OAEP encrypted AES session key (base64) */
  encryptedSessionKey: string;
  /** Sender's public key fingerprint */
  senderFingerprint: string;
}

/** Key backup data */
export interface KeyBackup {
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  publicKeyJwk?: JsonWebKey;
  createdAt: number;
}

/** PKI enrollment status */
export interface PkiStatus {
  enrolled: boolean;
  hasBackup: boolean;
  fingerprint: string | null;
  enrolledAt: number | null;
}

/** PKI public key record */
export interface PkiPublicKeyRecord {
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
  algorithm: string;
  createdAt: number;
  updatedAt: number;
  enrolled: boolean;
}

/** PKI public key upload request */
export interface PkiUploadKeyRequest {
  userId: string;
  publicKeyJwk: JsonWebKey;
}

/** PKI key backup store request */
export interface PkiKeyBackupRequest {
  userId: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  publicKeyJwk?: JsonWebKey;
}

export interface E2EKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  lang?: string;
}
