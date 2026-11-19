// 社区面板逻辑层 · 时空墙时间胶囊（含 P3 §2 E2EE 加密/解密）
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@yyc3/music-utils';
import type { STCapsule, STTab } from './shared';

interface UseCapsulesParams {
  isOpen: boolean;
  tab: STTab;
  user: any;
  currentTrackId?: string;
  currentTrackTitle?: string;
}

export function useCapsules({ isOpen, tab, user, currentTrackId, currentTrackTitle }: UseCapsulesParams) {
  // Capsules state
  const [capsules, setCapsules] = useState<STCapsule[]>([]);
  const [capLoading, setCapLoading] = useState(false);
  const [capTitle, setCapTitle] = useState('');
  const [capContent, setCapContent] = useState('');
  const [capUnlockAt, setCapUnlockAt] = useState('');
  const [capEmotion, setCapEmotion] = useState('neutral');
  const [capRecipient, setCapRecipient] = useState('');
  const [capLinkSong, setCapLinkSong] = useState(false);
  const [capCreating, setCapCreating] = useState(false);
  const [capCreatedFlash, setCapCreatedFlash] = useState(false);

  // E2EE capsule state (P3 §2 integration — no new hooks, uses existing state slots)
  const [capEncrypt, setCapEncrypt] = useState(false);
  const [capRecipientId, setCapRecipientId] = useState('');
  const [e2eeReady, setE2eeReady] = useState(false);
  const [e2eeChecked, setE2eeChecked] = useState(false);
  const e2eeCryptoRef = useRef<any>(null);
  const e2eePkiRef = useRef<any>(null);
  const autoDecryptedRef = useRef<Set<string>>(new Set());
  const [e2eePromptVisible, setE2eePromptVisible] = useState(false);

  // E2EE: Check if user has local keys (ref-based, runs once)
  useEffect(() => {
    if (!user?.id || e2eeChecked) return;
    setE2eeChecked(true);
    (async () => {
      try {
        const crypto = await import('@yyc3/music-utils');
        e2eeCryptoRef.current = crypto;
        const { pkiApi } = await import('@yyc3/music-utils');
        e2eePkiRef.current = pkiApi;
        const hasKeys = await crypto.hasLocalKeyPair(user.id);
        setE2eeReady(hasKeys && crypto.isE2EESupported());
      } catch { setE2eeReady(false); }
    })();
  }, [user?.id, e2eeChecked]);

  // ======== Fetch Capsules ========
  const fetchCapsules = useCallback(async () => {
    setCapLoading(true);
    try {
      const data = await apiFetch<{ capsules: STCapsule[] }>('/spacetime/capsules');
      if (data?.capsules) setCapsules(data.capsules);
    } catch (err) { console.error('SpaceTime capsules fetch error:', err); }
    finally { setCapLoading(false); }
  }, []);

  // ======== Create Capsule (with optional E2EE) ========
  const handleCreateCapsule = async () => {
    if (!capTitle.trim() || !capContent.trim() || !capUnlockAt || !user) return;
    setCapCreating(true);
    try {
      const plainContent = capContent.trim();
      const payload: any = {
        userId: user.id,
        userName: user.email?.split('@')[0] || 'User',
        title: capTitle.trim(),
        content: plainContent,
        unlockAt: new Date(capUnlockAt).toISOString(),
        emotion: capEmotion,
      };
      if (capRecipient.trim()) payload.recipientName = capRecipient.trim();
      if (capLinkSong && currentTrackId) {
        payload.songId = currentTrackId;
        payload.songTitle = currentTrackTitle || '';
      }

      // E2EE: Encrypt capsule content if toggle is on and recipient ID is set
      if (capEncrypt && capRecipientId.trim() && e2eeCryptoRef.current && e2eePkiRef.current) {
        try {
          // Fetch recipient's public key from PKI
          const recipientPkiRes = await e2eePkiRef.current.getPublicKey(capRecipientId.trim());
          if (recipientPkiRes?.publicKeyJwk) {
            const recipientPubKey = await e2eeCryptoRef.current.importPublicKey(recipientPkiRes.publicKeyJwk);
            const encrypted = await e2eeCryptoRef.current.encryptMessage(plainContent, recipientPubKey, user.id);
            payload.encrypted = true;
            payload.encryptedContent = encrypted.ciphertext;
            payload.encryptedSessionKey = encrypted.encryptedSessionKey;
            payload.encryptionIv = encrypted.iv;
            payload.senderFingerprint = encrypted.senderId;
            payload.recipientUserId = capRecipientId.trim();
            console.log('[E2EE] Capsule encrypted for recipient:', capRecipientId.trim());
          } else {
            console.warn('[E2EE] Recipient has no public key, sending unencrypted');
          }
        } catch (e2eeErr) {
          console.error('[E2EE] Encryption failed, sending unencrypted:', e2eeErr);
        }
      }

      const result = await apiFetch<{ success: boolean; capsule: STCapsule }>('/spacetime/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result?.success && result.capsule) {
        setCapsules(prev => [result.capsule, ...prev]);
        setCapTitle('');
        setCapContent('');
        setCapUnlockAt('');
        setCapEmotion('neutral');
        setCapRecipient('');
        setCapLinkSong(false);
        setCapEncrypt(false);
        setCapRecipientId('');
        setCapCreatedFlash(true);
        setTimeout(() => setCapCreatedFlash(false), 2000);
        // Track achievement: capsule created
        apiFetch(`/achievements/${user.id}/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_capsule' }),
        }).catch(() => {});
      }
    } catch (err) { console.error('Create capsule error:', err); }
    finally { setCapCreating(false); }
  };

  // ======== Decrypt Capsule (client-side, ref-based) ========
  const handleDecryptCapsule = useRef(async (cap: STCapsule) => {
    if (!cap.encrypted || !cap.encryptedContent || !cap.encryptedSessionKey || !cap.encryptionIv) return;
    if (!user?.id || !e2eeCryptoRef.current) return;
    try {
      const privateKey = await e2eeCryptoRef.current.loadPrivateKey(user.id);
      if (!privateKey) {
        setCapsules(prev => prev.map(c => c.id === cap.id ? { ...c, _decryptError: true } : c));
        return;
      }
      const decrypted = await e2eeCryptoRef.current.decryptMessage({
        ciphertext: cap.encryptedContent,
        encryptedSessionKey: cap.encryptedSessionKey,
        iv: cap.encryptionIv,
        senderId: cap.senderFingerprint || '',
        algorithm: 'RSA-OAEP+AES-GCM-256' as const,
        encryptedAt: cap.createdAt,
      }, privateKey);
      setCapsules(prev => prev.map(c => c.id === cap.id ? { ...c, _decryptedContent: decrypted } : c));
    } catch (err) {
      console.error('[E2EE] Decryption failed:', err);
      setCapsules(prev => prev.map(c => c.id === cap.id ? { ...c, _decryptError: true } : c));
    }
  });

  // ======== Auto-decrypt capsules for current user (ref-based, no new hooks) ========
  const autoDecryptCapsulesFn = useRef(async (capList: STCapsule[], userId: string) => {
    if (!e2eeCryptoRef.current || !userId) return;
    for (const cap of capList) {
      if (!cap.encrypted || !cap.isUnlocked) continue;
      if (cap._decryptedContent || cap._decryptError) continue;
      if (cap.recipientUserId !== userId && cap.userId !== userId) continue;
      if (autoDecryptedRef.current.has(cap.id)) continue;
      autoDecryptedRef.current.add(cap.id);
      handleDecryptCapsule.current(cap);
    }
  });

  // Trigger auto-decrypt when capsules load (ref-based effect inside existing useEffect)
  useEffect(() => {
    if (isOpen && tab === 'capsules' && capsules.length > 0 && e2eeReady && user?.id) {
      autoDecryptCapsulesFn.current(capsules, user.id);
    }
  }, [isOpen, tab, capsules, e2eeReady, user?.id]);

  // ======== Like Capsule ========
  const handleLikeCapsule = async (capId: string) => {
    try {
      await apiFetch(`/spacetime/capsules/${capId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setCapsules(prev => prev.map(c => c.id === capId ? { ...c, likes: c.likes + 1 } : c));
    } catch (err) { console.error('Like capsule error:', err); }
  };

  return {
    capsules, capLoading,
    capTitle, setCapTitle,
    capContent, setCapContent,
    capUnlockAt, setCapUnlockAt,
    capEmotion, setCapEmotion,
    capRecipient, setCapRecipient,
    capLinkSong, setCapLinkSong,
    capCreating, capCreatedFlash,
    capEncrypt, setCapEncrypt,
    capRecipientId, setCapRecipientId,
    e2eeReady, e2eeChecked, e2eePromptVisible, setE2eePromptVisible,
    fetchCapsules, handleCreateCapsule, handleLikeCapsule,
    handleDecryptCapsule,
  };
}
