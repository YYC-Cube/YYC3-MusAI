import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, CheckCircle, Copy, Download, FileText, Clock, Hash, User as UserIcon, Music, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';

interface CopyrightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

interface CopyrightCert {
  certId: string;
  userId: string;
  userName: string;
  workId: string;
  workTitle: string;
  workTheme: string;
  workLyrics: string[];
  contentHash: string;
  status: string;
  appliedAt: number;
  certifiedAt: number;
  certNumber: string;
}

export const CopyrightPanel: React.FC<CopyrightPanelProps> = ({
  isOpen, onClose, user,
}) => {
  const { lang } = useI18n();
  const [certs, setCerts] = useState<CopyrightCert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CopyrightCert | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchCerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ certs: CopyrightCert[] }>(`/copyright/user/${user.id}`);
      if (data?.certs) setCerts(data.certs);
    } catch (err) { console.error('Copyright fetch error:', err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) fetchCerts();
  }, [isOpen, user, fetchCerts]);

  const handleCopyNumber = (certNumber: string) => {
    navigator.clipboard?.writeText(certNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md bg-[#0D1235]/98 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    {lang === 'zh' ? '版权认证中心' : 'Copyright Center'}
                  </h2>
                  <p className="text-[10px] text-white/30">
                    {lang === 'zh' ? '原创保护 · 证书管理' : 'Original Protection & Certificates'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Stats Banner */}
              <div className="bg-gradient-to-r from-emerald-500/[0.08] to-teal-500/[0.08] border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-emerald-400 tabular-nums">{certs.length}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {lang === 'zh' ? '已认证作品' : 'Certified Works'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {lang === 'zh' ? '区块链存证' : 'Blockchain Verified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
                <p className="text-xs text-white/50 font-medium mb-2">
                  {lang === 'zh' ? '认证流程' : 'How it works'}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-white/30">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    {lang === 'zh' ? '① 发布作品' : '1. Publish'}
                  </span>
                  <span className="text-white/15">→</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    {lang === 'zh' ? '② 申请认证' : '2. Apply'}
                  </span>
                  <span className="text-white/15">→</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                    {lang === 'zh' ? '③ 获得证书' : '3. Certified'}
                  </span>
                </div>
                <p className="text-[10px] text-white/20 mt-2 leading-relaxed">
                  {lang === 'zh'
                    ? '在「IP矩阵」面板中选择你的作品，点击认证按钮即可申请。认证后作品将显示原创标识，并生成唯一版权证书。'
                    : 'Select your work in the IP Matrix panel and click the certify button. Certified works display an original badge and receive a unique copyright certificate.'}
                </p>
              </div>

              {/* Certificate List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                </div>
              ) : certs.length === 0 ? (
                <div className="text-center py-10">
                  <Shield className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">
                    {lang === 'zh' ? '暂无版权认证' : 'No certifications yet'}
                  </p>
                  <p className="text-[11px] text-white/15 mt-1">
                    {lang === 'zh' ? '在 IP 矩阵中为你的作品申请认证' : 'Certify your works in the IP Matrix'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-white/30 font-medium px-1">
                    {lang === 'zh' ? '我的证书' : 'My Certificates'}
                  </p>
                  {certs.map((cert) => (
                    <motion.button
                      key={cert.certId}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCert(cert)}
                      className="w-full text-left bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl p-3.5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{cert.workTitle}</p>
                          <p className="text-[10px] text-white/25 mt-0.5 font-mono">{cert.certNumber}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-emerald-400/60 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDate(cert.certifiedAt)}
                            </span>
                            <span className="text-[10px] text-cyan-400/40 flex items-center gap-1">
                              <Hash className="w-2.5 h-2.5" />
                              {cert.contentHash}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Certificate Detail Modal */}
            <AnimatePresence>
              {selectedCert && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-[#0A0E2F]/98 flex flex-col overflow-y-auto"
                >
                  <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
                    <button onClick={() => setSelectedCert(null)} className="text-xs text-white/40 hover:text-white/60">
                      {lang === 'zh' ? '← 返回' : '← Back'}
                    </button>
                    <button
                      onClick={() => handleCopyNumber(selectedCert.certNumber)}
                      className="flex items-center gap-1 text-xs text-emerald-400/60 hover:text-emerald-400"
                    >
                      <Copy className="w-3 h-3" />
                      {copied ? (lang === 'zh' ? '已复制' : 'Copied') : (lang === 'zh' ? '复制编号' : 'Copy #')}
                    </button>
                  </div>

                  {/* Visual Certificate */}
                  <div className="px-5 pb-6 flex-1">
                    <div className="relative bg-gradient-to-b from-[#0F1A3A] to-[#0A0E2F] border border-emerald-500/20 rounded-2xl p-6 overflow-hidden">
                      {/* Certificate decorative border */}
                      <div className="absolute inset-[2px] rounded-2xl border border-emerald-500/[0.08]" />
                      <div className="absolute top-0 left-0 w-20 h-20 bg-emerald-500/5 rounded-br-[40px]" />
                      <div className="absolute bottom-0 right-0 w-20 h-20 bg-teal-500/5 rounded-tl-[40px]" />

                      {/* Header */}
                      <div className="text-center mb-5 relative">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <Shield className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          {lang === 'zh' ? '原创版权证书' : 'Original Copyright Certificate'}
                        </h3>
                        <p className="text-[10px] text-emerald-400/50 mt-0.5 tracking-wider">
                          D-MUSIC ORIGINAL CERTIFICATION
                        </p>
                      </div>

                      {/* Certificate Details */}
                      <div className="space-y-3 relative">
                        <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                          <FileText className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-white/25 uppercase tracking-wider">
                              {lang === 'zh' ? '证书编号' : 'Certificate No.'}
                            </p>
                            <p className="text-xs text-emerald-400 font-mono font-semibold">{selectedCert.certNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                          <Music className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-white/25 uppercase tracking-wider">
                              {lang === 'zh' ? '作品名称' : 'Work Title'}
                            </p>
                            <p className="text-xs text-white font-medium">{selectedCert.workTitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                          <UserIcon className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-white/25 uppercase tracking-wider">
                              {lang === 'zh' ? '作者' : 'Author'}
                            </p>
                            <p className="text-xs text-white font-medium">{selectedCert.userName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                          <Hash className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-white/25 uppercase tracking-wider">
                              {lang === 'zh' ? '内容指纹' : 'Content Hash'}
                            </p>
                            <p className="text-xs text-cyan-400 font-mono">{selectedCert.contentHash}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                          <Clock className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] text-white/25 uppercase tracking-wider">
                              {lang === 'zh' ? '认证时间' : 'Certified At'}
                            </p>
                            <p className="text-xs text-white/70">
                              {new Date(selectedCert.certifiedAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                            </p>
                          </div>
                        </div>

                        {selectedCert.workTheme && (
                          <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
                            <Sparkles className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] text-white/25 uppercase tracking-wider">
                                {lang === 'zh' ? '创作主题' : 'Theme'}
                              </p>
                              <p className="text-xs text-purple-400/80">{selectedCert.workTheme}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer stamp */}
                      <div className="mt-5 pt-4 border-t border-white/[0.04] text-center">
                        <p className="text-[9px] text-white/15 tracking-widest">
                          VERIFIED BY D-MUSIC BLOCKCHAIN
                        </p>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500/40" />
                          <span className="text-[10px] text-emerald-400/50 font-medium">
                            {selectedCert.status === 'certified'
                              ? (lang === 'zh' ? '已认证' : 'CERTIFIED')
                              : (lang === 'zh' ? '审核中' : 'PENDING')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
