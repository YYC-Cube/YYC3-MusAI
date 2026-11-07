/**
 * D-Music P3 §2 — E2EE Key Setup Wizard
 *
 * A guided wizard for users to set up end-to-end encryption:
 *   Step 1: Feature introduction + browser compatibility check
 *   Step 2: Key pair generation (RSA-OAEP 2048-bit)
 *   Step 3: Public key upload to server PKI
 *   Step 4: Optional passphrase-protected key backup
 *   Step 5: Confirmation + fingerprint display
 *
 * Also supports:
 *   - Key restoration from server backup
 *   - Key rotation (generate new pair, delete old)
 *   - Status display for already-enrolled users
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Shield, Key, Lock, Unlock, CheckCircle2, AlertTriangle,
  RefreshCw, Download, Upload, Eye, EyeOff, Fingerprint, Sparkles,
  ArrowRight, ArrowLeft, Info, Copy, Check, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useI18n } from '../hooks/useI18n';
import {
  generateKeyPair,
  hasLocalKeyPair,
  loadPublicKeyJwk,
  deleteLocalKeys,
  createKeyBackup,
  restoreKeyFromBackup,
  isE2EESupported,
  getE2EEStatus,
  type KeyBackup,
} from '../lib/crypto';
import { pkiApi } from '../lib/api';

// ============================================================
// Props
// ============================================================

interface E2EKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  lang?: string;
}

// ============================================================
// Step definitions
// ============================================================

type SetupStep = 'intro' | 'generating' | 'uploading' | 'backup' | 'complete' | 'status' | 'restore';

// ============================================================
// Component
// ============================================================

export function E2EKeySetup({ isOpen, onClose, user, lang }: E2EKeySetupProps) {
  const { t } = useI18n();
  const isZh = lang !== 'en';

  // ---- State ----
  const [step, setStep] = useState<SetupStep>('intro');
  const [supported, setSupported] = useState(true);
  const [hasKeys, setHasKeys] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [enrolledAt, setEnrolledAt] = useState<number | null>(null);
  const [hasBackup, setHasBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Backup
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);

  // Restore
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'restoring' | 'success' | 'failed'>('idle');

  // Copied
  const [copied, setCopied] = useState(false);

  // ---- Initialization — check status on open ----
  const initRef = useRef(false);
  useEffect(() => {
    if (!isOpen || !user?.id || initRef.current) return;
    initRef.current = true;

    const checkStatus = async () => {
      const sup = isE2EESupported();
      setSupported(sup);
      if (!sup) return;

      try {
        const localStatus = await getE2EEStatus(user.id);
        setHasKeys(localStatus.hasLocalKeys);

        // Also check server status
        const serverStatus = await pkiApi.getStatus(user.id);
        if (serverStatus) {
          setFingerprint(serverStatus.fingerprint);
          setEnrolledAt(serverStatus.enrolledAt);
          setHasBackup(serverStatus.hasBackup);
        }

        if (localStatus.hasLocalKeys && serverStatus?.enrolled) {
          setStep('status');
        }
      } catch (err) {
        console.error('[E2EE Setup] Status check error:', err);
      }
    };

    checkStatus();
  }, [isOpen, user?.id]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      initRef.current = false;
      setError(null);
      setPassphrase('');
      setPassphraseConfirm('');
      setRestorePassphrase('');
      setRestoreStatus('idle');
      setBackupCreated(false);
      setCopied(false);
    }
  }, [isOpen]);

  // ---- Actions ----

  const handleGenerateKeys = async () => {
    if (!user?.id) return;
    setStep('generating');
    setError(null);
    setLoading(true);

    try {
      // Step 1: Generate key pair
      const keyPair = await generateKeyPair(user.id);

      // Step 2: Upload public key to server
      setStep('uploading');
      const result = await pkiApi.uploadPublicKey(user.id, keyPair.publicKeyJwk);

      if (result?.success) {
        setFingerprint(result.fingerprint);
        setHasKeys(true);
        setEnrolledAt(Date.now());
        setStep('backup');
      } else {
        throw new Error('Server rejected public key upload');
      }
    } catch (err: any) {
      setError(err.message || 'Key generation failed');
      setStep('intro');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!user?.id || !passphrase) return;
    if (passphrase !== passphraseConfirm) {
      setError(isZh ? '两次输入的口令不一致' : 'Passphrases do not match');
      return;
    }
    if (passphrase.length < 8) {
      setError(isZh ? '口令至少需要8个字符' : 'Passphrase must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const backup = await createKeyBackup(user.id, passphrase);
      if (!backup) throw new Error('Failed to create backup');

      // Upload encrypted backup to server
      const result = await pkiApi.storeKeyBackup({
        userId: user.id,
        encryptedPrivateKey: backup.encryptedPrivateKey,
        salt: backup.salt,
        iv: backup.iv,
        publicKeyJwk: backup.publicKeyJwk,
      });

      if (result?.success) {
        setBackupCreated(true);
        setHasBackup(true);
        setStep('complete');
      } else {
        throw new Error('Failed to store backup on server');
      }
    } catch (err: any) {
      setError(err.message || 'Backup creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipBackup = () => {
    setStep('complete');
  };

  const handleRestoreFromBackup = async () => {
    if (!user?.id || !restorePassphrase) return;
    setRestoreStatus('restoring');
    setError(null);

    try {
      // Fetch backup from server
      const backupData = await pkiApi.getKeyBackup(user.id);
      if (!backupData || !backupData.hasBackup) {
        throw new Error(isZh ? '服务器上没有找到密钥备份' : 'No key backup found on server');
      }

      // Attempt restore
      const backup: KeyBackup = {
        encryptedPrivateKey: backupData.encryptedPrivateKey,
        salt: backupData.salt,
        iv: backupData.iv,
        publicKeyJwk: backupData.publicKeyJwk,
        createdAt: backupData.createdAt,
        userId: user.id,
      };

      const success = await restoreKeyFromBackup(backup, restorePassphrase);
      if (success) {
        setRestoreStatus('success');
        setHasKeys(true);
        // Re-check fingerprint
        const serverStatus = await pkiApi.getStatus(user.id);
        if (serverStatus) {
          setFingerprint(serverStatus.fingerprint);
          setEnrolledAt(serverStatus.enrolledAt);
        }
        setTimeout(() => setStep('status'), 1500);
      } else {
        setRestoreStatus('failed');
        setError(isZh ? '口令错误或备份已损坏' : 'Wrong passphrase or corrupted backup');
      }
    } catch (err: any) {
      setRestoreStatus('failed');
      setError(err.message || 'Restore failed');
    }
  };

  const handleRotateKeys = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // Delete old keys locally and on server
      await deleteLocalKeys(user.id);
      await pkiApi.deletePublicKey(user.id);

      setHasKeys(false);
      setFingerprint(null);
      setHasBackup(false);
      setBackupCreated(false);
      setStep('intro');
    } catch (err: any) {
      setError(err.message || 'Key rotation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFingerprint = () => {
    if (fingerprint) {
      navigator.clipboard.writeText(fingerprint).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  // ---- Render ----
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-gradient-to-b from-[#0F1642] to-[#0A0E2E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="p-6 pt-8">
            {/* ======== STEP: Intro ======== */}
            {step === 'intro' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-white">
                    {isZh ? '端到端加密 (E2EE)' : 'End-to-End Encryption'}
                  </h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {isZh
                      ? '为你的时空胶囊和私密消息启用端到端加密。只有你和收件人可以阅读消息内容——服务器无法解密。'
                      : 'Enable E2EE for your Space-Time Capsules and private messages. Only you and the recipient can read message content — the server cannot decrypt it.'}
                  </p>
                </div>

                {/* Feature highlights */}
                <div className="space-y-3">
                  {[
                    {
                      icon: <Key className="w-4 h-4 text-cyan-400" />,
                      zh: 'RSA-2048 密钥对 + AES-256 加密',
                      en: 'RSA-2048 key pair + AES-256 encryption',
                    },
                    {
                      icon: <Lock className="w-4 h-4 text-emerald-400" />,
                      zh: '私钥仅存储在你的设备上',
                      en: 'Private key stored only on your device',
                    },
                    {
                      icon: <Download className="w-4 h-4 text-blue-400" />,
                      zh: '可选的口令保护密钥备份',
                      en: 'Optional passphrase-protected key backup',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      {item.icon}
                      <span className="text-sm text-white/70">{isZh ? item.zh : item.en}</span>
                    </div>
                  ))}
                </div>

                {/* Browser support warning */}
                {!supported && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-300">
                      {isZh
                        ? '你的浏览器不支持 Web Crypto API。请使用现代浏览器。'
                        : 'Your browser does not support Web Crypto API. Please use a modern browser.'}
                    </span>
                  </div>
                )}

                {/* Server backup available → offer restore */}
                {hasBackup && !hasKeys && (
                  <button
                    onClick={() => setStep('restore')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    {isZh ? '从备份恢复密钥' : 'Restore keys from backup'}
                  </button>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                  >
                    {isZh ? '稍后' : 'Later'}
                  </button>
                  <button
                    onClick={handleGenerateKeys}
                    disabled={!supported || loading}
                    className={clsx(
                      'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all',
                      supported
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-emerald-500/20'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    )}
                  >
                    <Key className="w-4 h-4" />
                    {isZh ? '生成密钥' : 'Generate Keys'}
                  </button>
                </div>

                {error && (
                  <p className="text-red-400 text-xs text-center">{error}</p>
                )}
              </motion.div>
            )}

            {/* ======== STEP: Generating ======== */}
            {step === 'generating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center space-y-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center"
                >
                  <Key className="w-8 h-8 text-emerald-400" />
                </motion.div>
                <p className="text-white font-medium">
                  {isZh ? '正在生成 RSA-2048 密钥对...' : 'Generating RSA-2048 key pair...'}
                </p>
                <p className="text-white/40 text-sm">
                  {isZh ? '这可能需要几秒钟' : 'This may take a few seconds'}
                </p>
              </motion.div>
            )}

            {/* ======== STEP: Uploading ======== */}
            {step === 'uploading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center space-y-4"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-blue-400" />
                </motion.div>
                <p className="text-white font-medium">
                  {isZh ? '正在上传公钥至服务器...' : 'Uploading public key to server...'}
                </p>
                <p className="text-white/40 text-sm">
                  {isZh ? '私钥安全存储在您的设备上' : 'Private key is safely stored on your device'}
                </p>
              </motion.div>
            )}

            {/* ======== STEP: Backup ======== */}
            {step === 'backup' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                    <Download className="w-7 h-7 text-amber-400" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-white">
                    {isZh ? '密钥备份（可选）' : 'Key Backup (Optional)'}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {isZh
                      ? '设置一个恢复口令，将加密后的私钥备份到服务器。如果你更换设备或清除浏览器数据，可以使用此口令恢复密钥。'
                      : 'Set a recovery passphrase to back up your encrypted private key to the server. Use this passphrase to restore your keys if you switch devices or clear browser data.'}
                  </p>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-amber-200/80 leading-relaxed">
                    {isZh
                      ? '请记住此口令！如果忘记，将无法恢复私钥，需要重新生成。'
                      : 'Remember this passphrase! If forgotten, you cannot restore your private key and will need to regenerate.'}
                  </span>
                </div>

                {/* Passphrase inputs */}
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder={isZh ? '设置恢复口令 (至少8位)' : 'Recovery passphrase (min 8 chars)'}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphraseConfirm}
                    onChange={(e) => setPassphraseConfirm(e.target.value)}
                    placeholder={isZh ? '确认口令' : 'Confirm passphrase'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Passphrase strength indicator */}
                {passphrase.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', {
                          'bg-red-500 w-1/4': passphrase.length < 8,
                          'bg-yellow-500 w-1/2': passphrase.length >= 8 && passphrase.length < 12,
                          'bg-emerald-500 w-3/4': passphrase.length >= 12 && passphrase.length < 16,
                          'bg-cyan-400 w-full': passphrase.length >= 16,
                        })}
                      />
                    </div>
                    <span className={clsx('text-xs', {
                      'text-red-400': passphrase.length < 8,
                      'text-yellow-400': passphrase.length >= 8 && passphrase.length < 12,
                      'text-emerald-400': passphrase.length >= 12 && passphrase.length < 16,
                      'text-cyan-400': passphrase.length >= 16,
                    })}>
                      {passphrase.length < 8 ? (isZh ? '太短' : 'Too short')
                        : passphrase.length < 12 ? (isZh ? '一般' : 'Fair')
                        : passphrase.length < 16 ? (isZh ? '良好' : 'Good')
                        : (isZh ? '极佳' : 'Excellent')}
                    </span>
                  </div>
                )}

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSkipBackup}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                  >
                    {isZh ? '跳过' : 'Skip'}
                  </button>
                  <button
                    onClick={handleCreateBackup}
                    disabled={loading || passphrase.length < 8 || passphrase !== passphraseConfirm}
                    className={clsx(
                      'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all',
                      passphrase.length >= 8 && passphrase === passphraseConfirm
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/20'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    )}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isZh ? '创建备份' : 'Create Backup'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ======== STEP: Complete ======== */}
            {step === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 py-4"
              >
                <div className="flex justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.2 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </motion.div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-white">
                    {isZh ? 'E2EE 设置完成！' : 'E2EE Setup Complete!'}
                  </h3>
                  <p className="text-white/50 text-sm">
                    {isZh
                      ? '你的消息现在已受端到端加密保护。'
                      : 'Your messages are now protected with end-to-end encryption.'}
                  </p>
                </div>

                {/* Fingerprint display */}
                {fingerprint && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-2">
                    <div className="flex items-center gap-2 text-white/40 text-xs">
                      <Fingerprint className="w-3.5 h-3.5" />
                      {isZh ? '密钥指纹' : 'Key Fingerprint'}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-emerald-300 text-xs font-mono break-all leading-relaxed">
                        {fingerprint}
                      </code>
                      <button
                        onClick={handleCopyFingerprint}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status badges */}
                <div className="flex gap-2 justify-center">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    {isZh ? '已加密' : 'Encrypted'}
                  </span>
                  {backupCreated && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-1.5">
                      <Download className="w-3 h-3" />
                      {isZh ? '已备份' : 'Backed Up'}
                    </span>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                >
                  {isZh ? '完成' : 'Done'}
                </button>
              </motion.div>
            )}

            {/* ======== STEP: Status (already enrolled) ======== */}
            {step === 'status' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 text-emerald-400" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-white">
                    {isZh ? 'E2EE 已启用' : 'E2EE Enabled'}
                  </h3>
                  <p className="text-white/50 text-sm">
                    {isZh
                      ? '你的端到端加密密钥已配置完成。'
                      : 'Your end-to-end encryption keys are configured.'}
                  </p>
                </div>

                {/* Status details */}
                <div className="space-y-2">
                  {/* Fingerprint */}
                  {fingerprint && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/40 text-xs">
                          <Fingerprint className="w-3.5 h-3.5" />
                          {isZh ? '密钥指纹' : 'Fingerprint'}
                        </div>
                        <button
                          onClick={handleCopyFingerprint}
                          className="p-1 rounded text-white/30 hover:text-white/60"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <code className="text-emerald-300 text-[10px] font-mono mt-1 block break-all">
                        {fingerprint}
                      </code>
                    </div>
                  )}

                  {/* Enrollment date */}
                  {enrolledAt && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-white/40 text-xs">{isZh ? '注册时间' : 'Enrolled'}</span>
                      <span className="text-white/70 text-xs">{new Date(enrolledAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Backup status */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-white/40 text-xs">{isZh ? '密钥备份' : 'Key Backup'}</span>
                    {hasBackup ? (
                      <span className="text-emerald-400 text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {isZh ? '已备份' : 'Backed up'}
                      </span>
                    ) : (
                      <span className="text-amber-400 text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {isZh ? '未备份' : 'Not backed up'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {!hasBackup && (
                    <button
                      onClick={() => setStep('backup')}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {isZh ? '备份密钥' : 'Backup Keys'}
                    </button>
                  )}
                  <button
                    onClick={handleRotateKeys}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
                    {isZh ? '轮换密钥' : 'Rotate Keys'}
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                >
                  {isZh ? '关闭' : 'Close'}
                </button>

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              </motion.div>
            )}

            {/* ======== STEP: Restore ======== */}
            {step === 'restore' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-blue-400" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-white">
                    {isZh ? '从备份恢复' : 'Restore from Backup'}
                  </h3>
                  <p className="text-white/50 text-sm">
                    {isZh
                      ? '输入你的恢复口令来从服务器下载并解密你的私钥。'
                      : 'Enter your recovery passphrase to download and decrypt your private key from the server.'}
                  </p>
                </div>

                <input
                  type="password"
                  value={restorePassphrase}
                  onChange={(e) => setRestorePassphrase(e.target.value)}
                  placeholder={isZh ? '输入恢复口令' : 'Enter recovery passphrase'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
                />

                {restoreStatus === 'success' && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-300">
                      {isZh ? '密钥恢复成功！' : 'Keys restored successfully!'}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-300">{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep('intro'); setError(null); setRestoreStatus('idle'); }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {isZh ? '返回' : 'Back'}
                  </button>
                  <button
                    onClick={handleRestoreFromBackup}
                    disabled={!restorePassphrase || restoreStatus === 'restoring'}
                    className={clsx(
                      'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all',
                      restorePassphrase
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-blue-500/20'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    )}
                  >
                    {restoreStatus === 'restoring' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                    {isZh ? '恢复' : 'Restore'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
