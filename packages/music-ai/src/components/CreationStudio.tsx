// 创作工作室 · 有机体组装层（状态机 / 流水线 / 子组件组装）
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '@yyc3/music-utils';
import { useI18n } from '@yyc3/music-hooks';
import { useAudioComposer, type CompositionParams } from '@yyc3/music-hooks';
import { type CreationStudioProps, type CreationMode, type AILyricsTheme, type CreatedWork, formatDate } from './creation-studio/shared';
import { StudioHeader } from './creation-studio/StudioHeader';
import { ModeHub } from './creation-studio/ModeHub';
import { QuickSongPanel } from './creation-studio/QuickSongPanel';
import { MasterPanel } from './creation-studio/MasterPanel';
import { RemixPanel } from './creation-studio/RemixPanel';
import { WorksPanel } from './creation-studio/WorksPanel';

// ==========================================
// AI Creation Studio
// ==========================================
// A comprehensive music creation hub with multiple modes:
// 1. Quick Song (极简写歌) — fast AI lyrics + compose
// 2. Master Mode (大师写歌) — advanced controls for theme, structure, instruments
// 3. Remix Mode (热歌改编/AI翻唱) — transform existing tracks
// 4. My Works (作品管理) — manage created tracks

export const CreationStudio: React.FC<CreationStudioProps> = ({
  isOpen,
  onClose,
  onCreateTrack,
  playlist,
  currentTrackIndex,
  onHaptic,
  onShareWork,
  onOpenMV,
  user,
  starPower = 0,
  onStarPowerUpdate,
}) => {
  const { t, lang } = useI18n();
  const [activeMode, setActiveMode] = useState<CreationMode | null>(null);
  const [unlockedPremium, setUnlockedPremium] = useState<Set<string>>(new Set());

  // Load unlocked themes from KV (with localStorage migration fallback)
  useEffect(() => {
    if (!user) {
      try {
        const saved = localStorage.getItem('dmusic-unlocked-themes');
        if (saved) setUnlockedPremium(new Set(JSON.parse(saved)));
      } catch {}
      return;
    }
    (async () => {
      try {
        const data = await apiFetch<{ themes: string[] }>(`/user/${user.id}/unlocked-themes`);
        if (data?.themes && data.themes.length > 0) {
          setUnlockedPremium(new Set(data.themes));
        } else {
          // Migrate from localStorage if exists
          try {
            const saved = localStorage.getItem('dmusic-unlocked-themes');
            if (saved) {
              const parsed = JSON.parse(saved) as string[];
              if (parsed.length > 0) {
                setUnlockedPremium(new Set(parsed));
                for (const tid of parsed) {
                  await apiFetch(`/user/${user.id}/unlocked-themes`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ themeId: tid }),
                  });
                }
                localStorage.removeItem('dmusic-unlocked-themes');
              }
            }
          } catch {}
        }
      } catch {
        try { const s = localStorage.getItem('dmusic-unlocked-themes'); if (s) setUnlockedPremium(new Set(JSON.parse(s))); } catch {}
      }
    })();
  }, [user]);

  const handleUnlockTheme = async (themeId: string, cost: number) => {
    if (!user || starPower < cost) return;
    try {
      const result = await apiFetch<any>(`/starpower/${user.id}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: cost, purpose: 'template_unlock', targetId: themeId }),
      });
      if (result?.success) {
        onStarPowerUpdate?.(result.starPower);
        const updated = new Set(unlockedPremium);
        updated.add(themeId);
        setUnlockedPremium(updated);
        // Persist to KV
        await apiFetch(`/user/${user.id}/unlocked-themes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId }),
        });
      }
    } catch (err) { console.error('Theme unlock error:', err); }
  };

  // Quick Song state
  const [quickTheme, setQuickTheme] = useState<AILyricsTheme>('happy');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickGenerating, setQuickGenerating] = useState(false);
  const [quickLyrics, setQuickLyrics] = useState<string[] | null>(null);
  const [quickComposing, setQuickComposing] = useState<'idle' | 'lyrics' | 'composing' | 'synth' | 'done'>('idle');
  const composer = useAudioComposer();

  // Master Mode state
  const [masterTheme, setMasterTheme] = useState<AILyricsTheme>('calm');
  const [masterKeywords, setMasterKeywords] = useState<string[]>([]);
  const [masterKwInput, setMasterKwInput] = useState('');
  const [masterLineCount, setMasterLineCount] = useState(10);
  const [masterStructure, setMasterStructure] = useState('verse-chorus');
  const [masterInstruments, setMasterInstruments] = useState<string[]>(['piano', 'strings']);
  const [masterTempo, setMasterTempo] = useState(100);
  const [masterGenerating, setMasterGenerating] = useState(false);
  const [masterLyrics, setMasterLyrics] = useState<string[] | null>(null);
  const [masterComposing, setMasterComposing] = useState<'idle' | 'lyrics' | 'composing' | 'synth' | 'done'>('idle');

  // Remix state
  const [remixSourceTrack, setRemixSourceTrack] = useState<number | null>(null);
  const [remixTargetTheme, setRemixTargetTheme] = useState<AILyricsTheme>('energetic');
  const [remixGenerating, setRemixGenerating] = useState(false);
  const [remixResult, setRemixResult] = useState<string[] | null>(null);
  const [remixComposing, setRemixComposing] = useState<'idle' | 'lyrics' | 'composing' | 'synth' | 'done'>('idle');

  // My Works state
  const [works, setWorks] = useState<CreatedWork[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // Load works from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('d-music-works');
        if (stored) setWorks(JSON.parse(stored));
      } catch {}
    }
  }, [isOpen]);

  const saveWork = useCallback((work: CreatedWork) => {
    setWorks(prev => {
      const updated = [work, ...prev].slice(0, 50);
      try { localStorage.setItem('d-music-works', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const deleteWork = useCallback((id: string) => {
    setWorks(prev => {
      const updated = prev.filter(w => w.id !== id);
      try { localStorage.setItem('d-music-works', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // ========== Quick Song Pipeline ==========
  const handleQuickCreate = useCallback(async () => {
    setQuickGenerating(true);
    setQuickComposing('lyrics');
    onHaptic?.('medium');

    try {
      // Step 1: Generate lyrics
      const lyricsResult = await apiFetch<{ success: boolean; lyrics: string[] }>('/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: quickTheme,
          keywords: quickPrompt ? quickPrompt.split(/[,，\s]+/).filter(Boolean) : [],
          lines: 8,
        }),
      });

      if (!lyricsResult?.lyrics) throw new Error('Lyrics generation failed');
      setQuickLyrics(lyricsResult.lyrics);
      setQuickComposing('composing');

      // Step 2: Get composition parameters
      const compResult = await apiFetch<{ success: boolean; composition: CompositionParams }>('/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: quickTheme,
          lyrics: lyricsResult.lyrics,
          lineCount: 8,
        }),
      });

      if (!compResult?.composition) {
        // Fallback without audio
        onCreateTrack?.(lyricsResult.lyrics, quickTheme);
        saveWork({
          id: `work-${Date.now()}`,
          title: `${quickTheme} · Quick Song`,
          theme: quickTheme,
          lyrics: lyricsResult.lyrics,
          createdAt: Date.now(),
          mode: 'quick',
        });
        setQuickComposing('done');
        onHaptic?.('success');
        setTimeout(() => setQuickComposing('idle'), 2000);
        return;
      }

      setQuickComposing('synth');

      // Step 3: Synthesize audio
      const audioBlobUrl = await composer.compose(compResult.composition);

      // Step 4: Create track
      onCreateTrack?.(lyricsResult.lyrics, quickTheme, audioBlobUrl, compResult.composition);
      saveWork({
        id: `work-${Date.now()}`,
        title: `${quickTheme} · Quick Song`,
        theme: quickTheme,
        lyrics: lyricsResult.lyrics,
        createdAt: Date.now(),
        mode: 'quick',
      });
      setQuickComposing('done');
      onHaptic?.('success');
      setTimeout(() => setQuickComposing('idle'), 2500);
    } catch (err) {
      console.error('Quick create failed:', err);
      if (quickLyrics) {
        onCreateTrack?.(quickLyrics, quickTheme);
      }
      setQuickComposing('idle');
    } finally {
      setQuickGenerating(false);
    }
  }, [quickTheme, quickPrompt, onCreateTrack, composer, onHaptic, quickLyrics, saveWork]);

  // ========== Master Mode Pipeline ==========
  const handleMasterCreate = useCallback(async () => {
    setMasterGenerating(true);
    setMasterComposing('lyrics');
    onHaptic?.('medium');

    try {
      const lyricsResult = await apiFetch<{ success: boolean; lyrics: string[] }>('/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: masterTheme,
          keywords: masterKeywords,
          lines: masterLineCount,
        }),
      });

      if (!lyricsResult?.lyrics) throw new Error('Lyrics generation failed');
      setMasterLyrics(lyricsResult.lyrics);
      setMasterComposing('composing');

      const compResult = await apiFetch<{ success: boolean; composition: CompositionParams }>('/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: masterTheme,
          lyrics: lyricsResult.lyrics,
          lineCount: masterLineCount,
        }),
      });

      if (!compResult?.composition) {
        onCreateTrack?.(lyricsResult.lyrics, masterTheme);
        saveWork({
          id: `work-${Date.now()}`,
          title: `${masterTheme} · Master Work`,
          theme: masterTheme,
          lyrics: lyricsResult.lyrics,
          createdAt: Date.now(),
          mode: 'master',
        });
        setMasterComposing('done');
        onHaptic?.('success');
        setTimeout(() => setMasterComposing('idle'), 2000);
        return;
      }

      setMasterComposing('synth');
      const audioBlobUrl = await composer.compose(compResult.composition);
      onCreateTrack?.(lyricsResult.lyrics, masterTheme, audioBlobUrl, compResult.composition);
      saveWork({
        id: `work-${Date.now()}`,
        title: `${masterTheme} · Master Work`,
        theme: masterTheme,
        lyrics: lyricsResult.lyrics,
        createdAt: Date.now(),
        mode: 'master',
      });
      setMasterComposing('done');
      onHaptic?.('success');
      setTimeout(() => setMasterComposing('idle'), 2500);
    } catch (err) {
      console.error('Master create failed:', err);
      setMasterComposing('idle');
    } finally {
      setMasterGenerating(false);
    }
  }, [masterTheme, masterKeywords, masterLineCount, onCreateTrack, composer, onHaptic, saveWork]);

  // ========== Remix Pipeline (with AI audio re-synthesis) ==========
  const handleRemix = useCallback(async () => {
    if (remixSourceTrack === null) return;
    setRemixGenerating(true);
    setRemixComposing('lyrics');
    onHaptic?.('medium');

    try {
      const sourceTrack = playlist[remixSourceTrack];
      const sourceWords = sourceTrack.lyrics
        .slice(1, 5)
        .map(l => l.text)
        .join(' ')
        .split(' ')
        .filter(w => w.length > 3)
        .slice(0, 5);

      // Step 1: Generate remixed lyrics in target style
      const lyricsResult = await apiFetch<{ success: boolean; lyrics: string[] }>('/ai/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: remixTargetTheme,
          keywords: sourceWords,
          lines: 8,
        }),
      });

      if (!lyricsResult?.lyrics) throw new Error('Remix lyrics failed');
      setRemixResult(lyricsResult.lyrics);
      setRemixComposing('composing');

      // Step 2: AI composition in the new style
      const compResult = await apiFetch<{ success: boolean; composition: CompositionParams }>('/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: remixTargetTheme,
          lyrics: lyricsResult.lyrics,
          lineCount: 8,
        }),
      });

      const workTitle = `Remix · ${sourceTrack.title}`;

      if (!compResult?.composition) {
        // Fallback without audio
        onCreateTrack?.(lyricsResult.lyrics, remixTargetTheme);
        saveWork({ id: `work-${Date.now()}`, title: workTitle, theme: remixTargetTheme, lyrics: lyricsResult.lyrics, createdAt: Date.now(), mode: 'remix' });
        setRemixComposing('done');
        onHaptic?.('success');
        setTimeout(() => setRemixComposing('idle'), 2000);
        return;
      }

      setRemixComposing('synth');

      // Step 3: Synthesize audio via OfflineAudioContext
      const audioBlobUrl = await composer.compose(compResult.composition);

      // Step 4: Create playable track with synthesized audio
      onCreateTrack?.(lyricsResult.lyrics, remixTargetTheme, audioBlobUrl, compResult.composition);
      saveWork({ id: `work-${Date.now()}`, title: workTitle, theme: remixTargetTheme, lyrics: lyricsResult.lyrics, createdAt: Date.now(), mode: 'remix' });
      setRemixComposing('done');
      onHaptic?.('success');
      setTimeout(() => setRemixComposing('idle'), 2500);
    } catch (err) {
      console.error('Remix failed:', err);
      setRemixComposing('idle');
    } finally {
      setRemixGenerating(false);
    }
  }, [remixSourceTrack, remixTargetTheme, playlist, onCreateTrack, onHaptic, saveWork, composer]);

  const handleCopyLyrics = useCallback((lyrics: string[], id: string) => {
    navigator.clipboard.writeText(lyrics.join('\n'));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const addMasterKeyword = useCallback(() => {
    const trimmed = masterKwInput.trim();
    if (trimmed && masterKeywords.length < 8 && !masterKeywords.includes(trimmed)) {
      setMasterKeywords(prev => [...prev, trimmed]);
      setMasterKwInput('');
    }
  }, [masterKwInput, masterKeywords]);

  const toggleInstrument = useCallback((id: string) => {
    setMasterInstruments(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  // ========== Composition Progress Label ==========
  const getProgressLabel = (stage: string) => {
    if (stage === 'lyrics') return lang === 'zh' ? 'AI 写词中...' : 'Generating lyrics...';
    if (stage === 'composing') return lang === 'zh' ? '编曲设计中...' : 'Composing...';
    if (stage === 'synth') return lang === 'zh' ? `音频合成 ${Math.round(composer.progress * 100)}%` : `Synthesizing ${Math.round(composer.progress * 100)}%`;
    if (stage === 'done') return lang === 'zh' ? '创作完成!' : 'Complete!';
    return '';
  };

  // ========== Render ==========
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Studio Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[92vh] bg-[#0B1030]/98 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:max-h-[88vh]"
          >
            {/* Header */}
            <StudioHeader
              activeMode={activeMode}
              onBack={() => { setActiveMode(null); onHaptic?.('light'); }}
              onClose={onClose}
              lang={lang}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <AnimatePresence mode="wait">
                {/* ========== Mode Selection Hub ========== */}
                {!activeMode && (
                  <ModeHub
                    key="hub"
                    worksCount={works.length}
                    onSelectMode={setActiveMode}
                    onOpenMV={onOpenMV}
                    onHaptic={onHaptic}
                    lang={lang}
                  />
                )}

                {/* ========== Quick Song Mode ========== */}
                {activeMode === 'quick' && (
                  <QuickSongPanel
                    key="quick"
                    lang={lang}
                    onHaptic={onHaptic}
                    quickTheme={quickTheme}
                    onSelectTheme={setQuickTheme}
                    quickPrompt={quickPrompt}
                    setQuickPrompt={setQuickPrompt}
                    quickGenerating={quickGenerating}
                    quickComposing={quickComposing}
                    quickLyrics={quickLyrics}
                    unlockedPremium={unlockedPremium}
                    user={user}
                    starPower={starPower}
                    onUnlockTheme={handleUnlockTheme}
                    onCreate={handleQuickCreate}
                    getProgressLabel={getProgressLabel}
                    copiedId={copied}
                    onCopyLyrics={handleCopyLyrics}
                  />
                )}

                {/* ========== Master Mode ========== */}
                {activeMode === 'master' && (
                  <MasterPanel
                    key="master"
                    lang={lang}
                    onHaptic={onHaptic}
                    masterTheme={masterTheme}
                    onSelectTheme={setMasterTheme}
                    masterKeywords={masterKeywords}
                    setMasterKeywords={setMasterKeywords}
                    masterKwInput={masterKwInput}
                    setMasterKwInput={setMasterKwInput}
                    addMasterKeyword={addMasterKeyword}
                    masterStructure={masterStructure}
                    setMasterStructure={setMasterStructure}
                    masterInstruments={masterInstruments}
                    toggleInstrument={toggleInstrument}
                    masterLineCount={masterLineCount}
                    setMasterLineCount={setMasterLineCount}
                    masterTempo={masterTempo}
                    setMasterTempo={setMasterTempo}
                    masterGenerating={masterGenerating}
                    masterComposing={masterComposing}
                    masterLyrics={masterLyrics}
                    unlockedPremium={unlockedPremium}
                    user={user}
                    starPower={starPower}
                    onUnlockTheme={handleUnlockTheme}
                    onCreate={handleMasterCreate}
                    getProgressLabel={getProgressLabel}
                    copiedId={copied}
                    onCopyLyrics={handleCopyLyrics}
                  />
                )}

                {/* ========== Remix Mode ========== */}
                {activeMode === 'remix' && (
                  <RemixPanel
                    key="remix"
                    lang={lang}
                    onHaptic={onHaptic}
                    playlist={playlist}
                    remixSourceTrack={remixSourceTrack}
                    onSelectTrack={setRemixSourceTrack}
                    remixTargetTheme={remixTargetTheme}
                    onSelectTargetTheme={setRemixTargetTheme}
                    remixGenerating={remixGenerating}
                    remixComposing={remixComposing}
                    remixResult={remixResult}
                    unlockedPremium={unlockedPremium}
                    user={user}
                    starPower={starPower}
                    onUnlockTheme={handleUnlockTheme}
                    onRemix={handleRemix}
                    getProgressLabel={getProgressLabel}
                    copiedId={copied}
                    onCopyLyrics={handleCopyLyrics}
                  />
                )}

                {/* ========== My Works ========== */}
                {activeMode === 'works' && (
                  <WorksPanel
                    key="works"
                    lang={lang}
                    works={works}
                    onStartCreate={() => setActiveMode('quick')}
                    copiedId={copied}
                    onCopyLyrics={handleCopyLyrics}
                    deleteWork={deleteWork}
                    formatDate={formatDate}
                    onShareWork={onShareWork}
                    onOpenMV={onOpenMV}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
