/**
 * D-Music §4.1 — AI Model Manager
 *
 * 多模型配置 + 自动降级 + 响应缓存 + 成本追踪
 *
 * 架构：
 *   1. ModelProvider 接口 — 统一调用协议
 *   2. OpenAIProvider — GPT-4o-mini 实现（需 OPENAI_API_KEY）
 *   3. TemplateFallbackProvider — 本地模板兜底（零成本）
 *   4. AIModelManager — 统一调度器（尝试主模型 → 自动降级 → 缓存 → 计量）
 *
 * 缓存策略：
 *   - 相同 theme + keywords 组合 → 缓存 5 分钟
 *   - 作曲结果缓存 10 分钟（计算量更大）
 */

import { queryCache, kv } from "./server-utils.ts";

// ==========================================
// Types
// ==========================================

export interface LyricsRequest {
  theme: string;
  keywords?: string[];
  lines?: number;
  language?: string;
}

export interface LyricsResponse {
  lyrics: string[];
  theme: string;
  themeLabel: string;
  provider: string;      // 'openai' | 'template'
  cached: boolean;
  generatedAt: string;
}

export interface EmotionAnalysisRequest {
  workTitle: string;
  workTheme?: string;
  workLyrics?: string[];
  challengeTheme?: string;
  challengeTags?: string[];
}

export interface EmotionAnalysisResponse {
  score: number;          // 0-100 judge score
  breakdown: {
    themeRelevance: number;    // 0-30
    emotionalDepth: number;    // 0-30
    creativity: number;        // 0-25
    technicalQuality: number;  // 0-15
  };
  feedback: string;
  provider: string;
  cached: boolean;
}

export interface TranscribeRequest {
  audioBase64: string;
  mimeType?: string;
  language?: string;
}

export interface TranscribeResponse {
  text: string;
  language: string;
  duration?: number;
  provider: string;
  cached: boolean;
}

export interface UserPreferenceAnalysisRequest {
  userId: string;
  emotionPrefs: Record<string, number>;
  recentHistory: Array<{
    songId: string;
    songTitle: string;
    emotion: string;
    completionRate: number;
  }>;
  dominantMood: string;
  totalListeningEvents: number;
}

export interface UserPreferenceAnalysisResponse {
  insights: string;           // Natural language analysis of user's taste
  suggestedMoods: string[];   // Top 3 recommended moods
  personalityTag: string;     // e.g. "夜行探索者" / "Night Explorer"
  personalityTagEn: string;
  engagementLevel: 'casual' | 'regular' | 'enthusiast' | 'power';
  recommendations: Array<{
    mood: string;
    reason: string;
    reasonZh: string;
    weight: number;
  }>;
  provider: string;
  cached: boolean;
}

export interface StreamTranscribeChunk {
  index: number;
  text: string;
  isFinal: boolean;
  language?: string;
  provider: string;
}

export interface ModelUsageStats {
  totalCalls: number;
  openaiCalls: number;
  templateFallbacks: number;
  cacheHits: number;
  estimatedCostUSD: number;
  lastReset: number;
}

// ==========================================
// Provider Interface
// ==========================================

interface ModelProvider {
  name: string;
  isAvailable(): boolean;
  generateLyrics(req: LyricsRequest): Promise<string[]>;
  analyzeEmotion?(req: EmotionAnalysisRequest): Promise<EmotionAnalysisResponse>;
  transcribeAudio?(req: TranscribeRequest): Promise<TranscribeResponse>;
}

// ==========================================
// Provider 1: OpenAI GPT-4o-mini
// ==========================================

class OpenAIProvider implements ModelProvider {
  name = 'openai';

  isAvailable(): boolean {
    const key = Deno.env.get('OPENAI_API_KEY');
    return !!key && key.length > 10 && key !== 'sk-placeholder';
  }

  async generateLyrics(req: LyricsRequest): Promise<string[]> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const themeLabels: Record<string, string> = {
      happy: 'joyful and uplifting', sad: 'melancholic and reflective',
      energetic: 'high-energy and powerful', calm: 'peaceful and serene',
      love: 'romantic and tender',
    };

    const themeDesc = themeLabels[req.theme] || req.theme;
    const lineCount = req.lines || 8;
    const keywordsHint = req.keywords && req.keywords.length > 0
      ? `\nIncorporate these keywords naturally: ${req.keywords.join(', ')}`
      : '';
    const langHint = req.language === 'zh' ? '\nWrite the lyrics in Chinese (中文).' : '';

    const systemPrompt = `You are a professional songwriter. Generate exactly ${lineCount} lines of song lyrics.
Return ONLY the lyrics, one line per line. No numbering, no titles, no explanations.`;

    const userPrompt = `Write ${lineCount} lines of ${themeDesc} song lyrics.${keywordsHint}${langHint}
The lyrics should be poetic, rhythmic, and emotionally resonant.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenAI API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const lines = content
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)
      .slice(0, lineCount);

    if (lines.length === 0) {
      throw new Error('OpenAI returned empty lyrics');
    }

    return lines;
  }

  async analyzeEmotion(req: EmotionAnalysisRequest): Promise<EmotionAnalysisResponse> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const lyricsText = req.workLyrics && req.workLyrics.length > 0
      ? `\nLyrics:\n${req.workLyrics.join('\n')}`
      : '';

    const challengeContext = req.challengeTheme
      ? `\nChallenge theme: "${req.challengeTheme}" (tags: ${(req.challengeTags || []).join(', ')})`
      : '';

    const systemPrompt = `You are an expert music critic and AI judge for a creative challenge competition.
Evaluate the submitted work and provide scores in exactly this JSON format:
{
  "themeRelevance": <0-30>,
  "emotionalDepth": <0-30>,
  "creativity": <0-25>,
  "technicalQuality": <0-15>,
  "feedback": "<one sentence feedback in the work's language>"
}
Be fair but encouraging. Score realistically — average works should score 55-70 total, exceptional works 80-95.
Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Evaluate this music submission:
Title: "${req.workTitle}"
Theme/mood: "${req.workTheme || 'unspecified'}"${challengeContext}${lyricsText}

Provide your JSON evaluation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenAI API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse AI judge response: ${content.slice(0, 200)}`);
    }

    const breakdown = {
      themeRelevance: Math.min(30, Math.max(0, Number(parsed.themeRelevance) || 15)),
      emotionalDepth: Math.min(30, Math.max(0, Number(parsed.emotionalDepth) || 15)),
      creativity: Math.min(25, Math.max(0, Number(parsed.creativity) || 12)),
      technicalQuality: Math.min(15, Math.max(0, Number(parsed.technicalQuality) || 7)),
    };

    const totalScore = breakdown.themeRelevance + breakdown.emotionalDepth + breakdown.creativity + breakdown.technicalQuality;

    return {
      score: Math.round(totalScore * 10) / 10,
      breakdown,
      feedback: parsed.feedback || 'Good effort!',
      provider: 'openai',
      cached: false,
    };
  }

  async transcribeAudio(req: TranscribeRequest): Promise<TranscribeResponse> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    // Decode base64 audio to binary
    const binaryStr = atob(req.audioBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Determine file extension from mime type
    const mimeType = req.mimeType || 'audio/webm';
    const extMap: Record<string, string> = {
      'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3',
      'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/flac': 'flac',
    };
    const ext = extMap[mimeType] || 'webm';

    // Build multipart form data for Whisper API
    const blob = new Blob([bytes], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, `audio.${ext}`);
    formData.append('model', 'whisper-1');
    if (req.language) {
      // Whisper uses ISO 639-1 codes: 'zh', 'en', 'ja', etc.
      formData.append('language', req.language === 'zh' ? 'zh' : req.language);
    }
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Whisper API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const result = await response.json();

    return {
      text: result.text || '',
      language: result.language || req.language || 'unknown',
      duration: result.duration,
      provider: 'openai',
      cached: false,
    };
  }
}

// ==========================================
// Provider 2: Template Fallback
// ==========================================

const LYRICS_TEMPLATES: Record<string, string[][]> = {
  happy: [
    ["Sunshine breaks through the morning sky", "Golden rays paint the world alive"],
    ["Dancing on the edge of light", "Every moment feels so right"],
    ["Stars align in perfect harmony", "This is where I'm meant to be"],
    ["Laughing echoes fill the air", "Joy is floating everywhere"],
    ["Hearts beat fast with pure delight", "Colors burst into the night"],
  ],
  sad: [
    ["Shadows fall where light once lived", "Empty rooms with nothing left to give"],
    ["Tears like rain upon the glass", "Watching moments slip and pass"],
    ["Silence speaks the loudest words", "Songs of sorrow left unheard"],
    ["Fading photos on the wall", "Memories that rise and fall"],
    ["Cold winds blow through hollow halls", "Echo of a distant call"],
  ],
  energetic: [
    ["Thunder rolls across the sky", "Lightning strikes we're soaring high"],
    ["Break the chains and set us free", "Revolution is our destiny"],
    ["Pulse is rising can't stop now", "Feel the power breaking through somehow"],
    ["Neon lights and city streets", "Bass drops heavy shaking underneath"],
    ["Burning bright we own the night", "Fire in our veins ignite"],
  ],
  calm: [
    ["Gentle waves upon the shore", "Breathing deeply wanting nothing more"],
    ["Moonlight paints a silver stream", "Drifting softly through a dream"],
    ["Whispers of the evening breeze", "Peace that puts the mind at ease"],
    ["Still waters reflect the sky", "Time stands still as clouds float by"],
    ["Garden blooms in morning dew", "Finding peace in all we do"],
  ],
  love: [
    ["Your eyes are galaxies untold", "Stories written made of gold"],
    ["Two hearts beating as one soul", "Together finally feeling whole"],
    ["Across the universe I'd go", "Just to let you finally know"],
    ["In your arms I've found my home", "Never again to walk alone"],
    ["Love like stars will never fade", "Eternal light that heaven made"],
  ],
};

class TemplateFallbackProvider implements ModelProvider {
  name = 'template';

  isAvailable(): boolean {
    return true; // Always available
  }

  async generateLyrics(req: LyricsRequest): Promise<string[]> {
    const lines = req.lines || 8;
    const templates = LYRICS_TEMPLATES[req.theme] || LYRICS_TEMPLATES.happy;
    const selectedLines: string[] = [];
    const usedIndices = new Set<number>();

    while (selectedLines.length < lines && usedIndices.size < templates.length) {
      const idx = Math.floor(Math.random() * templates.length);
      if (usedIndices.has(idx)) continue;
      usedIndices.add(idx);
      templates[idx].forEach(line => {
        if (selectedLines.length < lines) selectedLines.push(line);
      });
    }

    while (selectedLines.length < lines) {
      const base = templates[Math.floor(Math.random() * templates.length)];
      const line = base[Math.floor(Math.random() * base.length)];
      selectedLines.push(line);
    }

    // Keyword injection
    const finalLines = selectedLines.map(line => {
      if (req.keywords && req.keywords.length > 0 && Math.random() > 0.5) {
        const kw = req.keywords[Math.floor(Math.random() * req.keywords.length)];
        const words = line.split(' ');
        const replaceIdx = Math.floor(Math.random() * words.length);
        words[replaceIdx] = kw;
        return words.join(' ');
      }
      return line;
    });

    return finalLines;
  }

  async analyzeEmotion(req: EmotionAnalysisRequest): Promise<EmotionAnalysisResponse> {
    // Template-based scoring: deterministic but reasonable
    // Uses title length, lyrics presence, theme match as heuristics
    const hasLyrics = req.workLyrics && req.workLyrics.length > 0;
    const lyricsLength = hasLyrics ? req.workLyrics!.reduce((sum, l) => sum + l.length, 0) : 0;
    const titleLength = req.workTitle?.length || 0;

    // Theme relevance: check if challenge tags appear in title/lyrics
    let themeMatch = 0;
    if (req.challengeTags && req.challengeTags.length > 0) {
      const allText = `${req.workTitle} ${req.workTheme || ''} ${(req.workLyrics || []).join(' ')}`.toLowerCase();
      themeMatch = req.challengeTags.filter(tag => allText.includes(tag.toLowerCase())).length;
    }

    // Base scores with some variation based on content
    const seed = (req.workTitle || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const pseudoRandom = (offset: number) => ((seed * 7 + offset * 13) % 100) / 100;

    const themeRelevance = Math.min(30, 12 + Math.floor(themeMatch * 5) + Math.floor(pseudoRandom(1) * 8));
    const emotionalDepth = Math.min(30, 10 + (hasLyrics ? Math.min(12, Math.floor(lyricsLength / 30)) : 0) + Math.floor(pseudoRandom(2) * 8));
    const creativity = Math.min(25, 8 + Math.min(7, titleLength) + Math.floor(pseudoRandom(3) * 6));
    const technicalQuality = Math.min(15, 5 + (hasLyrics ? 3 : 0) + Math.floor(pseudoRandom(4) * 5));

    const totalScore = themeRelevance + emotionalDepth + creativity + technicalQuality;

    return {
      score: Math.round(totalScore * 10) / 10,
      breakdown: { themeRelevance, emotionalDepth, creativity, technicalQuality },
      feedback: hasLyrics
        ? 'Solid submission with meaningful lyrics. Keep creating!'
        : 'Interesting concept — adding lyrics would strengthen the entry.',
      provider: 'template',
      cached: false,
    };
  }

  async transcribeAudio(_req: TranscribeRequest): Promise<TranscribeResponse> {
    // Fallback: return a placeholder indicating STT is unavailable without API key
    return {
      text: '',
      language: _req.language || 'unknown',
      provider: 'template',
      cached: false,
    };
  }
}

// ==========================================
// AI Model Manager (Singleton)
// ==========================================

const THEME_LABELS: Record<string, string> = {
  happy: '快乐', sad: '忧伤', energetic: '活力', calm: '宁静', love: '爱情',
};

class AIModelManagerImpl {
  private providers: ModelProvider[] = [];
  private usageKey = 'ai:usage-stats';

  constructor() {
    // Order matters: first available provider is used
    this.providers = [
      new OpenAIProvider(),
      new TemplateFallbackProvider(),
    ];
    console.log('[AIModelManager] Initialized with providers:', this.providers.map(p => p.name));
  }

  /** Check which provider will be used */
  getActiveProvider(): string {
    for (const p of this.providers) {
      if (p.isAvailable()) return p.name;
    }
    return 'none';
  }

  /** Check if real AI (OpenAI) is available */
  isAIAvailable(): boolean {
    return this.providers[0]?.isAvailable() ?? false;
  }

  /** Generate lyrics with automatic fallback + caching */
  async generateLyrics(req: LyricsRequest): Promise<LyricsResponse> {
    const cacheKey = `ai:lyrics:${req.theme}:${(req.keywords || []).sort().join(',')}:${req.lines || 8}:${req.language || 'en'}`;

    // Check cache
    const cached = queryCache.get<LyricsResponse>(cacheKey);
    if (cached) {
      console.log(`[AIModelManager] Cache hit for lyrics: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    let lyrics: string[] = [];
    let providerUsed = 'template';

    // Try each provider in order
    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        console.log(`[AIModelManager] Provider '${provider.name}' not available, skipping`);
        continue;
      }

      try {
        console.log(`[AIModelManager] Attempting lyrics generation with '${provider.name}'`);
        lyrics = await provider.generateLyrics(req);
        providerUsed = provider.name;
        console.log(`[AIModelManager] Success with '${provider.name}': ${lyrics.length} lines`);
        break;
      } catch (err) {
        console.log(`[AIModelManager] Provider '${provider.name}' failed: ${err}`);
        // Continue to next provider (automatic fallback)
      }
    }

    if (lyrics.length === 0) {
      throw new Error('All AI providers failed to generate lyrics');
    }

    const result: LyricsResponse = {
      lyrics,
      theme: req.theme,
      themeLabel: THEME_LABELS[req.theme] || req.theme,
      provider: providerUsed,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    // Cache for 5 minutes
    queryCache.set(cacheKey, result, 300_000);

    // Update usage stats
    await this.recordUsage(providerUsed);

    return result;
  }

  /** Analyze emotion/quality of a challenge submission */
  async analyzeEmotion(req: EmotionAnalysisRequest): Promise<EmotionAnalysisResponse> {
    const cacheKey = `ai:emotion:${req.workTitle}:${req.workTheme || ''}:${(req.workLyrics || []).length}`;

    // Check cache
    const cached = queryCache.get<EmotionAnalysisResponse>(cacheKey);
    if (cached) {
      console.log(`[AIModelManager] Cache hit for emotion analysis: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    let result: EmotionAnalysisResponse | null = null;

    for (const provider of this.providers) {
      if (!provider.isAvailable() || !provider.analyzeEmotion) continue;

      try {
        console.log(`[AIModelManager] Attempting emotion analysis with '${provider.name}'`);
        result = await provider.analyzeEmotion(req);
        console.log(`[AIModelManager] Emotion analysis success with '${provider.name}': score=${result.score}`);
        break;
      } catch (err) {
        console.log(`[AIModelManager] Emotion analysis '${provider.name}' failed: ${err}`);
      }
    }

    if (!result) {
      throw new Error('All providers failed for emotion analysis');
    }

    // Cache for 10 minutes
    queryCache.set(cacheKey, result, 600_000);

    // Record usage
    await this.recordUsage(result.provider);

    return result;
  }

  /** Transcribe audio using Whisper (or fallback) */
  async transcribeAudio(req: TranscribeRequest): Promise<TranscribeResponse> {
    let result: TranscribeResponse | null = null;

    for (const provider of this.providers) {
      if (!provider.isAvailable() || !provider.transcribeAudio) continue;

      try {
        console.log(`[AIModelManager] Attempting transcription with '${provider.name}'`);
        result = await provider.transcribeAudio(req);
        // Skip template fallback if it returns empty text (means it can't actually transcribe)
        if (provider.name === 'template' && !result.text) {
          console.log(`[AIModelManager] Template provider returned empty transcription, expected`);
          // Still return it — caller can check provider field
          break;
        }
        console.log(`[AIModelManager] Transcription success with '${provider.name}': ${result.text.length} chars`);
        break;
      } catch (err) {
        console.log(`[AIModelManager] Transcription '${provider.name}' failed: ${err}`);
      }
    }

    if (!result) {
      throw new Error('All providers failed for audio transcription');
    }

    // Record usage (Whisper is ~$0.006/min, estimate 15s avg)
    if (result.provider === 'openai') {
      await this.recordUsage('openai');
    }

    return result;
  }

  /** Analyze user listening preferences via GPT for personalized recommendation insights */
  async analyzeUserPreferences(req: UserPreferenceAnalysisRequest): Promise<UserPreferenceAnalysisResponse> {
    const cacheKey = `ai:pref-analysis:${req.userId}:${req.dominantMood}:${req.totalListeningEvents}`;

    // Check cache (15 min TTL — user prefs don't change rapidly)
    const cached = queryCache.get<UserPreferenceAnalysisResponse>(cacheKey);
    if (cached) {
      console.log(`[AIModelManager] Cache hit for preference analysis: ${cacheKey}`);
      return { ...cached, cached: true };
    }

    // Attempt OpenAI first
    if (this.isAIAvailable()) {
      try {
        const result = await this.gptAnalyzePreferences(req);
        queryCache.set(cacheKey, result, 900_000); // 15 min
        await this.recordUsage('openai');
        return result;
      } catch (err) {
        console.log(`[AIModelManager] GPT preference analysis failed, falling back: ${err}`);
      }
    }

    // Template fallback
    const result = this.templateAnalyzePreferences(req);
    queryCache.set(cacheKey, result, 900_000);
    await this.recordUsage('template');
    return result;
  }

  /** GPT-powered user preference analysis */
  private async gptAnalyzePreferences(req: UserPreferenceAnalysisRequest): Promise<UserPreferenceAnalysisResponse> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const prefsSummary = Object.entries(req.emotionPrefs)
      .sort(([, a], [, b]) => b - a)
      .map(([mood, weight]) => `${mood}: ${Math.round(weight * 100) / 100}`)
      .join(', ');

    const recentTitles = req.recentHistory.slice(0, 10)
      .map(h => `"${h.songTitle}" (${h.emotion}, completion: ${Math.round(h.completionRate * 100)}%)`)
      .join('\n  ');

    const systemPrompt = `You are a music taste analyst for D-Music platform. Analyze the user's listening patterns and provide personalized insights.
Return ONLY valid JSON in this format:
{
  "insights": "<2-3 sentences in Chinese describing the user's music personality and taste, warm and encouraging>",
  "suggestedMoods": ["<top3 moods from: happy, sad, energetic, calm, love>"],
  "personalityTag": "<creative 2-4 char Chinese tag, e.g. 星夜漫游者>",
  "personalityTagEn": "<English version, e.g. Starnight Wanderer>",
  "engagementLevel": "<one of: casual, regular, enthusiast, power>",
  "recommendations": [
    {"mood": "<mood>", "reason": "<why in English>", "reasonZh": "<why in Chinese>", "weight": <0.0-1.0>}
  ]
}
No markdown fences.`;

    const userPrompt = `User ID: ${req.userId}
Dominant mood: ${req.dominantMood}
Total listening events: ${req.totalListeningEvents}
Emotion preferences (accumulated weights): ${prefsSummary}
Recent listening history:
  ${recentTitles || '(no recent history)'}

Analyze this user's music personality and suggest what they might enjoy next.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenAI API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse preference analysis: ${content.slice(0, 200)}`);
    }

    return {
      insights: parsed.insights || '你的音乐品味独特而多元！',
      suggestedMoods: Array.isArray(parsed.suggestedMoods) ? parsed.suggestedMoods.slice(0, 3) : [req.dominantMood],
      personalityTag: parsed.personalityTag || '音乐探索者',
      personalityTagEn: parsed.personalityTagEn || 'Music Explorer',
      engagementLevel: ['casual', 'regular', 'enthusiast', 'power'].includes(parsed.engagementLevel)
        ? parsed.engagementLevel
        : req.totalListeningEvents > 50 ? 'enthusiast' : req.totalListeningEvents > 20 ? 'regular' : 'casual',
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      provider: 'openai',
      cached: false,
    };
  }

  /** Template fallback for user preference analysis */
  private templateAnalyzePreferences(req: UserPreferenceAnalysisRequest): UserPreferenceAnalysisResponse {
    const sorted = Object.entries(req.emotionPrefs)
      .sort(([, a], [, b]) => b - a);
    const top3 = sorted.slice(0, 3).map(([mood]) => mood);
    const dominant = top3[0] || 'neutral';

    const tagMap: Record<string, [string, string]> = {
      happy: ['阳光旋律家', 'Sunshine Melodist'],
      sad: ['深夜诗人', 'Midnight Poet'],
      energetic: ['节拍猎手', 'Beat Hunter'],
      calm: ['星空冥想者', 'Stargazing Dreamer'],
      love: ['心弦共鸣者', 'Heartstring Resonator'],
      neutral: ['音乐探索者', 'Music Explorer'],
    };

    const [tag, tagEn] = tagMap[dominant] || tagMap.neutral;
    const events = req.totalListeningEvents;
    const level: 'casual' | 'regular' | 'enthusiast' | 'power' =
      events > 100 ? 'power' : events > 50 ? 'enthusiast' : events > 20 ? 'regular' : 'casual';

    const insightsMap: Record<string, string> = {
      happy: '你偏好欢快明亮的旋律，音乐是你正能量的源泉。推荐尝试更多充满活力的电子流行风格！',
      sad: '你对细腻情感的音乐有深度共鸣，品味成熟而独到。也许民谣或独立音乐能为你带来新灵感。',
      energetic: '你的音乐口味充满力量和激情！高能节拍是你的最爱，电子舞曲和摇滚可能正合你意。',
      calm: '你追求宁静与内心的和谐，偏好舒缓的旋律。环境音乐和新世纪风格或许能带来更深层的放松。',
      love: '你被温柔浪漫的旋律深深吸引，音乐中的情感共鸣是你最看重的。R&B 和抒情流行值得探索。',
      neutral: '你的音乐品味均衡而开放，不拘泥于单一风格。继续探索，你的音乐宇宙无限广阔！',
    };

    const recommendations = top3.map((mood, i) => ({
      mood,
      reason: `Based on your ${mood} listening preference (rank #${i + 1})`,
      reasonZh: `基于你的${THEME_LABELS[mood] || mood}偏好（排名 #${i + 1}）`,
      weight: Math.round((1 - i * 0.25) * 100) / 100,
    }));

    return {
      insights: insightsMap[dominant] || insightsMap.neutral,
      suggestedMoods: top3,
      personalityTag: tag,
      personalityTagEn: tagEn,
      engagementLevel: level,
      recommendations,
      provider: 'template',
      cached: false,
    };
  }

  /** Stream-transcribe: process audio in chunks for real-time transcription */
  async streamTranscribe(chunks: Array<{ audioBase64: string; index: number }>, language: string, mimeType: string): Promise<StreamTranscribeChunk[]> {
    const results: StreamTranscribeChunk[] = [];

    for (const chunk of chunks) {
      try {
        const transcription = await this.transcribeAudio({
          audioBase64: chunk.audioBase64,
          mimeType,
          language,
        });

        results.push({
          index: chunk.index,
          text: transcription.text,
          isFinal: chunk.index === chunks.length - 1,
          language: transcription.language,
          provider: transcription.provider,
        });
      } catch (err) {
        console.log(`[AIModelManager] Stream chunk ${chunk.index} failed: ${err}`);
        results.push({
          index: chunk.index,
          text: '',
          isFinal: chunk.index === chunks.length - 1,
          provider: 'error',
        });
      }
    }

    return results;
  }

  /** Record usage and estimated cost */
  private async recordUsage(provider: string): Promise<void> {
    try {
      const stats = await this.getUsageStats();
      stats.totalCalls++;
      if (provider === 'openai') {
        stats.openaiCalls++;
        // GPT-4o-mini estimated cost: ~$0.00015 per 1K input tokens + $0.0006 per 1K output tokens
        // Typical lyrics request: ~200 input tokens + ~150 output tokens ≈ $0.00012
        stats.estimatedCostUSD += 0.00012;
      } else {
        stats.templateFallbacks++;
      }
      await kv.set(this.usageKey, JSON.stringify(stats));
    } catch (err) {
      console.log(`[AIModelManager] Failed to record usage: ${err}`);
    }
  }

  /** Get usage statistics */
  async getUsageStats(): Promise<ModelUsageStats> {
    try {
      const raw = await kv.get(this.usageKey);
      if (raw) return JSON.parse(raw as string);
    } catch { /* fall through */ }
    return {
      totalCalls: 0,
      openaiCalls: 0,
      templateFallbacks: 0,
      cacheHits: 0,
      estimatedCostUSD: 0,
      lastReset: Date.now(),
    };
  }

  /** Reset usage statistics */
  async resetUsageStats(): Promise<void> {
    const fresh: ModelUsageStats = {
      totalCalls: 0, openaiCalls: 0, templateFallbacks: 0,
      cacheHits: 0, estimatedCostUSD: 0, lastReset: Date.now(),
    };
    await kv.set(this.usageKey, JSON.stringify(fresh));
  }

  /** Get model configuration status */
  getStatus(): {
    activeProvider: string;
    openaiAvailable: boolean;
    providers: Array<{ name: string; available: boolean }>;
  } {
    return {
      activeProvider: this.getActiveProvider(),
      openaiAvailable: this.isAIAvailable(),
      providers: this.providers.map(p => ({
        name: p.name,
        available: p.isAvailable(),
      })),
    };
  }
}

// Global singleton
export const aiModelManager = new AIModelManagerImpl();