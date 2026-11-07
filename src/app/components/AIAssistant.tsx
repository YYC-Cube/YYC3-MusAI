import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import {
  Mic, MicOff, X, ChevronDown, Sparkles,
  BrainCircuit, Clock, MessageSquare,
} from 'lucide-react';
import type { AITip, VoiceCommand } from '../hooks/useAIAssistant';
import { useI18n } from '../hooks/useI18n';

// ==========================================
// Types
// ==========================================
interface AIAssistantProps {
  activeTips: AITip[];
  onDismissTip: (id: string) => void;
  onExecuteAction: (actionKey: string) => void;
  isListening: boolean;
  onToggleListening: () => void;
  voiceSupported: boolean;
  voiceFeedback: string;
  voiceHistory: VoiceCommand[];
  sessionInsight: string;
  isPlaying: boolean;
  audioEnergy: number;
  externalExpanded?: boolean;
  onExternalExpandedChange?: (expanded: boolean) => void;
}

// ==========================================
// Voice Command Help
// ==========================================
const VOICE_COMMANDS_ZH = [
  { cmd: '"播放"', desc: '播放音乐' },
  { cmd: '"暂停"', desc: '暂停音乐' },
  { cmd: '"下一首"', desc: '下一首歌' },
  { cmd: '"上一首"', desc: '上一首歌' },
  { cmd: '"喜欢"', desc: '点赞' },
  { cmd: '"随机播放"', desc: '切换随机' },
  { cmd: '"音量大"', desc: '增大音量' },
  { cmd: '"音量小"', desc: '减小音量' },
  { cmd: '"静音"', desc: '静音切换' },
  { cmd: '"播放列表"', desc: '打开列表' },
  { cmd: '"创作"', desc: 'AI歌词' },
  { cmd: '"排行"', desc: '排行榜' },
  { cmd: '"评论"', desc: '打开评论' },
  { cmd: '"社区"', desc: '社区动态' },
  { cmd: '"分析"', desc: '数据分析' },
];

const VOICE_COMMANDS_EN = [
  { cmd: '"play"', desc: 'Play music' },
  { cmd: '"pause"', desc: 'Pause music' },
  { cmd: '"next"', desc: 'Next track' },
  { cmd: '"previous"', desc: 'Previous track' },
  { cmd: '"like"', desc: 'Like song' },
  { cmd: '"shuffle"', desc: 'Toggle shuffle' },
  { cmd: '"volume up"', desc: 'Increase volume' },
  { cmd: '"volume down"', desc: 'Decrease volume' },
  { cmd: '"mute"', desc: 'Mute toggle' },
  { cmd: '"playlist"', desc: 'Open playlist' },
  { cmd: '"create"', desc: 'AI Lyrics' },
  { cmd: '"leaderboard"', desc: 'Rankings' },
  { cmd: '"comment"', desc: 'Comments' },
  { cmd: '"community"', desc: 'Community' },
  { cmd: '"analytics"', desc: 'Analytics' },
];

// ==========================================
// Component
// ==========================================
export const AIAssistant: React.FC<AIAssistantProps> = ({
  activeTips,
  onDismissTip,
  onExecuteAction,
  isListening,
  onToggleListening,
  voiceSupported,
  voiceFeedback,
  voiceHistory,
  sessionInsight,
  isPlaying,
  audioEnergy,
  externalExpanded,
  onExternalExpandedChange,
}) => {
  const { t, lang } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const tipContainerRef = useRef<HTMLDivElement>(null);

  const voiceCommands = lang === 'zh' ? VOICE_COMMANDS_ZH : VOICE_COMMANDS_EN;

  // Sync with external expanded state (logo click)
  useEffect(() => {
    if (externalExpanded !== undefined) {
      setIsExpanded(externalExpanded);
    }
  }, [externalExpanded]);

  const handleSetExpanded = (val: boolean) => {
    setIsExpanded(val);
    onExternalExpandedChange?.(val);
  };

  // Auto-expand when tips arrive — no auto
  useEffect(() => {}, [activeTips.length]);

  const CATEGORY_COLORS: Record<string, string> = {
    emotion: 'from-pink-500/20 to-purple-500/20 border-pink-500/30',
    achievement: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
    streak: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
    discovery: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    interaction: 'from-green-500/20 to-teal-500/20 border-green-500/30',
    voice: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/30',
    system: 'from-gray-500/20 to-slate-500/20 border-white/10',
  };

  return (
    <>
      {/* ===== Floating Tips (Non-intrusive, top-left) ===== */}
      <div
        ref={tipContainerRef}
        className="fixed top-20 left-4 z-[45] flex flex-col gap-2 max-w-[340px] pointer-events-none"
      >
        <AnimatePresence mode="popLayout">
          {activeTips.map((tip) => (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={clsx(
                'pointer-events-auto bg-gradient-to-r backdrop-blur-2xl rounded-xl border p-3 shadow-2xl',
                CATEGORY_COLORS[tip.category] || CATEGORY_COLORS.system
              )}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0 mt-0.5">{tip.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/80 leading-relaxed">{tip.message}</p>
                  {tip.actionLabel && tip.actionKey && (
                    <button
                      onClick={() => {
                        onExecuteAction(tip.actionKey!);
                        onDismissTip(tip.id);
                      }}
                      className="mt-2 text-[11px] font-medium px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-colors border border-white/10"
                    >
                      {tip.actionLabel}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => onDismissTip(tip.id)}
                  className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {/* Progress bar for tip expiry */}
              <motion.div
                className="absolute bottom-0 left-0 h-[2px] bg-white/20 rounded-b-xl"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 30, ease: 'linear' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ===== Voice Feedback Overlay ===== */}
      <AnimatePresence>
        {voiceFeedback && (
          <motion.div
            key="voice-fb"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[70] bg-black/70 backdrop-blur-2xl rounded-2xl px-5 py-3 border border-white/10 shadow-2xl"
          >
            <p className="text-sm text-white/90 font-medium whitespace-nowrap">{voiceFeedback}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Listening Overlay ===== */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            key="listening-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] pointer-events-none flex items-center justify-center"
          >
            {/* Concentric pulse rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-purple-400/20"
                animate={{
                  width: [80, 200 + i * 60],
                  height: [80, 200 + i * 60],
                  opacity: [0.4, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: 'easeOut',
                }}
              />
            ))}

            {/* Center mic icon */}
            <motion.div
              className="w-20 h-20 rounded-full bg-purple-600/30 backdrop-blur-xl border border-purple-400/40 flex items-center justify-center shadow-2xl shadow-purple-500/30"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Mic className="w-8 h-8 text-purple-300" />
            </motion.div>

            {/* Label */}
            <motion.p
              className="absolute mt-32 text-sm text-purple-300/80 font-medium"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {lang === 'zh' ? '正在聆听...' : 'Listening...'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== AI Assistant FAB (Bottom-left, desktop only — mobile uses logo) ===== */}
      <div className="fixed bottom-[120px] md:bottom-28 left-4 z-[55] hidden md:flex flex-col items-start gap-2">
        {/* Expanded Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-72 md:w-80 bg-[#0D1235]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white/90">
                    {lang === 'zh' ? 'AI 助手' : 'AI Assistant'}
                  </span>
                </div>
                <button
                  onClick={() => handleSetExpanded(false)}
                  className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {/* Session Insight */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <Clock className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                  <p className="text-[11px] text-white/50">{sessionInsight}</p>
                </div>

                {/* Voice Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
                      {lang === 'zh' ? '语音指令' : 'Voice Commands'}
                    </p>
                    <button
                      onClick={() => setShowCommands(!showCommands)}
                      className="text-[10px] text-purple-400/60 hover:text-purple-400 transition-colors"
                    >
                      {showCommands
                        ? (lang === 'zh' ? '收起' : 'Hide')
                        : (lang === 'zh' ? '查看指令表' : 'Show commands')
                      }
                    </button>
                  </div>

                  {/* Mic Button */}
                  {voiceSupported ? (
                    <button
                      onClick={onToggleListening}
                      className={clsx(
                        'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all',
                        isListening
                          ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                          : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
                      )}
                    >
                      {isListening ? (
                        <>
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Mic className="w-4 h-4" />
                          </motion.div>
                          <span className="text-sm">{lang === 'zh' ? '正在聆听...' : 'Listening...'}</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span className="text-sm">{lang === 'zh' ? '点击说出指令' : 'Tap to speak'}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] rounded-lg text-white/30 text-xs">
                      <MicOff className="w-3.5 h-3.5" />
                      {lang === 'zh' ? '当前浏览器不支持语音识别' : 'Voice not supported in this browser'}
                    </div>
                  )}

                  {/* Command List */}
                  <AnimatePresence>
                    {showCommands && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {voiceCommands.map((vc, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.02]">
                              <span className="text-[10px] text-purple-400 font-mono">{vc.cmd}</span>
                              <span className="text-[10px] text-white/30">{vc.desc}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Voice History */}
                  {voiceHistory.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-white/25 uppercase tracking-wider">
                        {lang === 'zh' ? '最近指令' : 'Recent'}
                      </p>
                      {voiceHistory.slice(-3).reverse().map((vh, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.02]">
                          <MessageSquare className="w-3 h-3 text-white/20 flex-shrink-0" />
                          <span className="text-[10px] text-white/40 truncate">"{vh.transcript}"</span>
                          <span className="text-[10px] text-green-400/60 ml-auto flex-shrink-0">✓</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Tips Section */}
                {activeTips.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
                      {lang === 'zh' ? '智能提示' : 'AI Insights'}
                    </p>
                    <div className="space-y-2">
                      {activeTips.map((tip) => (
                        <div
                          key={tip.id}
                          className={clsx(
                            'flex items-start gap-2 px-3 py-2 rounded-lg bg-gradient-to-r border',
                            CATEGORY_COLORS[tip.category] || CATEGORY_COLORS.system
                          )}
                        >
                          <span className="text-sm flex-shrink-0">{tip.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-white/70 leading-relaxed">{tip.message}</p>
                            {tip.actionLabel && tip.actionKey && (
                              <button
                                onClick={() => {
                                  onExecuteAction(tip.actionKey!);
                                  onDismissTip(tip.id);
                                }}
                                className="mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                              >
                                {tip.actionLabel}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => onDismissTip(tip.id)}
                            className="text-white/20 hover:text-white/50 flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          onClick={() => handleSetExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={clsx(
            'relative w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all border',
            isListening
              ? 'bg-purple-600 border-purple-400/50 shadow-purple-500/40'
              : isExpanded
                ? 'bg-[#0D1235] border-purple-500/30'
                : 'bg-[#0D1235]/90 backdrop-blur-xl border-white/10 hover:border-purple-500/30'
          )}
          style={{
            boxShadow: isListening
              ? `0 0 ${15 + audioEnergy * 20}px rgba(139,92,246,0.4)`
              : isPlaying
                ? `0 0 ${8 + audioEnergy * 12}px rgba(139,92,246,0.15)`
                : undefined,
          }}
        >
          {isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Mic className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <BrainCircuit className="w-5 h-5 text-purple-400" />
          )}

          {/* Notification badge */}
          {activeTips.length > 0 && !isExpanded && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center"
            >
              {activeTips.length}
            </motion.div>
          )}

          {/* Ambient pulse when playing */}
          {isPlaying && !isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border border-purple-500/20"
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.button>

        {/* Quick mic button (separate from FAB when collapsed) */}
        {voiceSupported && !isExpanded && (
          <motion.button
            onClick={onToggleListening}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={clsx(
              'w-9 h-9 rounded-full flex items-center justify-center border transition-all',
              isListening
                ? 'bg-purple-600 border-purple-400/50 text-white'
                : 'bg-[#0D1235]/80 backdrop-blur-xl border-white/10 text-white/40 hover:text-purple-400 hover:border-purple-500/30'
            )}
          >
            {isListening ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </motion.button>
        )}
      </div>

      {/* ===== Mobile AI Panel (triggered from logo) ===== */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              key="mobile-ai-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-[55] bg-black/40"
              onClick={() => handleSetExpanded(false)}
            />
            <motion.div
              key="mobile-ai-overlay"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed left-3 right-3 top-14 z-[56] max-h-[70vh] bg-[#0D1235]/98 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white/90">
                    {lang === 'zh' ? 'AI 助手' : 'AI Assistant'}
                  </span>
                </div>
                <button
                  onClick={() => handleSetExpanded(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <Clock className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                  <p className="text-[11px] text-white/50">{sessionInsight}</p>
                </div>
                {voiceSupported && (
                  <button
                    onClick={onToggleListening}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all',
                      isListening
                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                        : 'bg-white/[0.03] border-white/[0.08] text-white/50'
                    )}
                  >
                    <Mic className="w-5 h-5" />
                    <span className="text-sm">{isListening ? (lang === 'zh' ? '正在聆听...' : 'Listening...') : (lang === 'zh' ? '点击说出指令' : 'Tap to speak')}</span>
                  </button>
                )}
                {activeTips.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{lang === 'zh' ? '智能提示' : 'AI Tips'}</p>
                    {activeTips.map(tip => (
                      <div key={tip.id} className={clsx('flex items-start gap-2 px-3 py-2 rounded-lg bg-gradient-to-r border', CATEGORY_COLORS[tip.category] || CATEGORY_COLORS.system)}>
                        <span className="text-sm flex-shrink-0">{tip.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/70 leading-relaxed">{tip.message}</p>
                          {tip.actionLabel && tip.actionKey && (
                            <button onClick={() => { onExecuteAction(tip.actionKey!); onDismissTip(tip.id); }} className="mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/80">{tip.actionLabel}</button>
                          )}
                        </div>
                        <button onClick={() => onDismissTip(tip.id)} className="text-white/20"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {voiceHistory.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">{lang === 'zh' ? '最近指令' : 'Recent'}</p>
                    {voiceHistory.slice(-3).reverse().map((vh, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.02]">
                        <MessageSquare className="w-3 h-3 text-white/20 flex-shrink-0" />
                        <span className="text-[10px] text-white/40 truncate">"{vh.transcript}"</span>
                        <span className="text-[10px] text-green-400/60 ml-auto">✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};