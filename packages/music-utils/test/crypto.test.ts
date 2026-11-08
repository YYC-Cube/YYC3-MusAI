// YYC³ music-utils — E2EE 全链路测试（RSA-OAEP + AES-GCM-256 + IndexedDB 密钥存储）
// 环境：node webcrypto shim（setup.ts）+ fake-indexeddb
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import {
  generateKeyPair,
  hasLocalKeyPair,
  loadPrivateKey,
  loadPublicKeyJwk,
  importPublicKey,
  deleteLocalKeys,
  encryptMessage,
  decryptMessage,
  createKeyBackup,
  restoreKeyFromBackup,
  isE2EESupported,
  getE2EEStatus,
  type E2EKeyPair,
} from '../src/crypto'

const RSA_PARAMS = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
} as const

describe('E2EE 密钥生命周期（IndexedDB）', () => {
  let kp: E2EKeyPair

  beforeEach(async () => {
    indexedDB = new (await import('fake-indexeddb')).IDBFactory()
    kp = await generateKeyPair('user-a')
  })

  it('generateKeyPair 生成完整密钥对并落库', async () => {
    expect(kp.userId).toBe('user-a')
    expect(typeof kp.createdAt).toBe('number')
    expect(kp.publicKey.type).toBe('public')
    expect(kp.privateKey.type).toBe('private')
    expect(kp.publicKeyJwk.kty).toBe('RSA')
    expect(await hasLocalKeyPair('user-a')).toBe(true)
  })

  it('loadPrivateKey 还原可解密的私钥', async () => {
    const privateKey = await loadPrivateKey('user-a')
    expect(privateKey).not.toBeNull()
    expect(privateKey!.type).toBe('private')
    const payload = await encryptMessage('msg', kp.publicKey, 'user-b')
    expect(await decryptMessage(payload, privateKey!)).toBe('msg')
  })

  it('loadPublicKeyJwk / importPublicKey 往返', async () => {
    const jwk = await loadPublicKeyJwk('user-a')
    expect(jwk).not.toBeNull()
    expect(jwk!.kty).toBe('RSA')
    const key = await importPublicKey(jwk!)
    expect(key.type).toBe('public')
    const payload = await encryptMessage('via-imported', key, 'user-b')
    expect(await decryptMessage(payload, kp.privateKey)).toBe('via-imported')
  })

  it('getE2EEStatus 反映本地密钥状态', async () => {
    const status = await getE2EEStatus('user-a')
    expect(status.supported).toBe(true)
    expect(status.hasLocalKeys).toBe(true)
    expect(status.publicKeyJwk).not.toBeNull()
    const empty = await getE2EEStatus('nobody')
    expect(empty.hasLocalKeys).toBe(false)
    expect(empty.publicKeyJwk).toBeNull()
  })

  it('deleteLocalKeys 清除本地密钥', async () => {
    await deleteLocalKeys('user-a')
    expect(await hasLocalKeyPair('user-a')).toBe(false)
    expect(await loadPrivateKey('user-a')).toBeNull()
    expect(await loadPublicKeyJwk('user-a')).toBeNull()
  })

  it('isE2EESupported 在测试环境为 true', () => {
    expect(isE2EESupported()).toBe(true)
  })
})

describe('密钥备份与恢复（passphrase 派生）', () => {
  beforeEach(async () => {
    indexedDB = new (await import('fake-indexeddb')).IDBFactory()
    await generateKeyPair('user-c')
  })

  it('createKeyBackup → restoreKeyFromBackup 正确口令还原', async () => {
    const backup = await createKeyBackup('user-c', 'correct-passphrase')
    expect(backup).not.toBeNull()
    expect(backup!.userId).toBe('user-c')
    expect(backup!.encryptedPrivateKey).toBeTruthy()
    expect(backup!.publicKeyJwk.kty).toBe('RSA')

    await deleteLocalKeys('user-c')
    expect(await hasLocalKeyPair('user-c')).toBe(false)

    const ok = await restoreKeyFromBackup(backup!, 'correct-passphrase')
    expect(ok).toBe(true)
    expect(await hasLocalKeyPair('user-c')).toBe(true)
    // 还原后的密钥可正常解密：导入还原的公钥加密 → 还原的私钥解密
    const jwk = await loadPublicKeyJwk('user-c')
    const pub = await importPublicKey(jwk!)
    const payload = await encryptMessage('after-restore', pub, 'user-d')
    const priv = await loadPrivateKey('user-c')
    expect(await decryptMessage(payload, priv!)).toBe('after-restore')
  })

  it('错误口令还原失败并返回 false', async () => {
    const backup = await createKeyBackup('user-c', 'right-pass')
    expect(backup).not.toBeNull()
    await expect(restoreKeyFromBackup(backup!, 'wrong-pass')).resolves.toBe(false)
  })

  it('无本地密钥时 createKeyBackup 返回 null', async () => {
    expect(await createKeyBackup('nobody', 'pass')).toBeNull()
  })
})

describe('E2EE 加解密（混合加密）', () => {
  it('RSA+AES-GCM 往返还原明文（英文）', async () => {
    const kp = await webcrypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt'])
    const payload = await encryptMessage('Hello D-Music', kp.publicKey, 'alice')
    expect(payload.algorithm).toBe('RSA-OAEP+AES-GCM-256')
    expect(payload.ciphertext).toBeTruthy()
    expect(payload.encryptedSessionKey).toBeTruthy()
    expect(payload.iv).toBeTruthy()
    expect(payload.senderId).toBe('alice')
    const plaintext = await decryptMessage(payload, kp.privateKey)
    expect(plaintext).toBe('Hello D-Music')
  })

  it('往返还原明文（中文 + emoji）', async () => {
    const kp = await webcrypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt'])
    const payload = await encryptMessage('你好 D-Music 🎵🎵', kp.publicKey, 'bob')
    const plaintext = await decryptMessage(payload, kp.privateKey)
    expect(plaintext).toBe('你好 D-Music 🎵🎵')
  })

  it('错误密钥无法解密会话密钥', async () => {
    const kpA = await webcrypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt'])
    const kpB = await webcrypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt'])
    const payload = await encryptMessage('secret', kpA.publicKey, 'alice')
    await expect(decryptMessage(payload, kpB.privateKey)).rejects.toThrow()
  })
})

describe('E2EE 环境检测分支', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    // 恢复真实 window（jsdom 环境）
    vi.stubGlobal('window', originalWindow)
    vi.unstubAllGlobals()
  })

  it('无 window.crypto 时 isE2EESupported 返回 false', () => {
    vi.stubGlobal('window', {} as any)
    expect(isE2EESupported()).toBe(false)
  })

  it('无 indexedDB 时 isE2EESupported 返回 false', () => {
    const original = (globalThis as any).indexedDB
    ;(globalThis as any).indexedDB = undefined
    try {
      expect(isE2EESupported()).toBe(false)
    } finally {
      ;(globalThis as any).indexedDB = original
    }
  })

  it('不支持环境时 getE2EEStatus 返回三 false 结构', async () => {
    vi.stubGlobal('window', {} as any)
    const status = await getE2EEStatus('anyone')
    expect(status).toEqual({ supported: false, hasLocalKeys: false, publicKeyJwk: null })
  })
})
