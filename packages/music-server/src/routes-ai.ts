/**
 * D-Music §2.2 / §4.1 — AI Routes
 *
 * Routes: AI lyrics generation, AI composition engine, AI model status & usage
 *
 * §4.1 改进：
 *   - 通过 AIModelManager 调度多模型（OpenAI → 模板兜底）
 *   - 自动降级：API Key 不可用时无缝切换到模板引擎
 *   - 响应缓存：相同参数组合 5 分钟内直接命中
 *   - 成本追踪：记录每次调用的模型和估算费用
 *   - 新增 /ai/status 和 /ai/usage 诊断端点
 */

import { ROUTE_PREFIX } from "./server-utils.ts";
import { rateLimit, RATE_HEAVY } from "./rate-limit.ts";
import { aiModelManager } from "./ai-model-manager.ts";

// ==========================================
// AI Composition Constants
// ==========================================
const SCALE_FREQS: Record<string, number[]> = {
  'Am': [220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0],
  'C':  [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25],
  'Dm': [146.83, 164.81, 174.61, 196.0, 220.0, 233.08, 261.63, 293.66],
  'Em': [164.81, 185.0, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63],
  'G':  [196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 369.99, 392.0],
  'F':  [174.61, 196.0, 220.0, 233.08, 261.63, 293.66, 329.63, 349.23],
};

const CHORD_MAPS: Record<string, number[][]> = {
  'Am': [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]],
  'C':  [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]],
  'Dm': [[146.83, 174.61, 220], [116.54, 146.83, 174.61], [174.61, 220, 261.63], [130.81, 164.81, 196]],
  'Em': [[164.81, 196, 246.94], [130.81, 164.81, 196], [196, 246.94, 293.66], [146.83, 185, 220]],
  'G':  [[196, 246.94, 293.66], [261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63]],
  'F':  [[174.61, 220, 261.63], [261.63, 329.63, 392], [146.83, 174.61, 220], [196, 246.94, 293.66]],
};

const BASS_MAPS: Record<string, number[]> = {
  'Am': [110, 87.31, 130.81, 98],
  'C':  [130.81, 110, 87.31, 98],
  'Dm': [73.42, 58.27, 87.31, 65.41],
  'Em': [82.41, 65.41, 98, 73.42],
  'G':  [98, 130.81, 110, 87.31],
  'F':  [87.31, 130.81, 73.42, 98],
};

const MOOD_TO_KEY: Record<string, string> = {
  happy: 'C', sad: 'Am', energetic: 'Em', calm: 'F', love: 'Dm',
};

const MOOD_TO_TEMPO: Record<string, number> = {
  happy: 120, sad: 72, energetic: 140, calm: 80, love: 95,
};

const MOOD_RHYTHMS: Record<string, number[]> = {
  happy:     [1, 0, 3, 0, 2, 0, 3, 3],
  sad:       [1, 0, 0, 3, 0, 0, 2, 0],
  energetic: [1, 0, 3, 3, 2, 0, 3, 1],
  calm:      [1, 0, 0, 0, 0, 3, 0, 0],
  love:      [1, 0, 3, 0, 2, 0, 0, 3],
};

export function registerAiRoutes(app: any) {
  // ==========================================
  // §4.1 AI Lyrics Generation (via Model Manager)
  // ==========================================
  app.post(`${ROUTE_PREFIX}/ai/lyrics`, rateLimit(RATE_HEAVY), async (c: any) => {
    try {
      const body = await c.req.json();
      const { theme = 'happy', keywords = [], lines = 8, language = 'en' } = body;

      const result = await aiModelManager.generateLyrics({
        theme, keywords, lines, language,
      });

      return c.json({
        success: true,
        lyrics: result.lyrics,
        theme: result.theme,
        themeLabel: result.themeLabel,
        provider: result.provider,
        cached: result.cached,
        generatedAt: result.generatedAt,
      });
    } catch (error) {
      console.log("AI lyrics generation error:", error);
      return c.json({ error: `AI lyrics failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // AI Composition Engine (unchanged — algorithmic)
  // ==========================================
  app.post(`${ROUTE_PREFIX}/ai/compose`, rateLimit(RATE_HEAVY), async (c: any) => {
    try {
      const body = await c.req.json();
      const { theme = 'happy', lyrics = [], lineCount = 8 } = body;

      const mood = theme;
      const key = MOOD_TO_KEY[mood] || 'C';
      const tempo = MOOD_TO_TEMPO[mood] || 110;
      const scale = SCALE_FREQS[key] || SCALE_FREQS['C'];
      const chordProg = CHORD_MAPS[key] || CHORD_MAPS['C'];
      const bassLine = BASS_MAPS[key] || BASS_MAPS['C'];
      const rhythmPattern = MOOD_RHYTHMS[mood] || MOOD_RHYTHMS['happy'];
      const padFreqs = chordProg[0].map(f => f * 0.5);

      const barDuration = (60 / tempo) * 4;
      const barsPerLine = 2;
      const lyricBars = Math.max(lineCount, lyrics.length) * barsPerLine;
      const introBars = 4;
      const outroBars = 4;
      const totalBars = introBars + lyricBars + outroBars;
      const totalDuration = Math.ceil(totalBars * barDuration);

      const verseBars = Math.floor(lyricBars * 0.6);
      const chorusBars = lyricBars - verseBars;
      const sections = [
        { name: 'intro', startBar: 0, endBar: introBars, intensity: 0.3 },
        { name: 'verse', startBar: introBars, endBar: introBars + verseBars, intensity: 0.6 },
        { name: 'chorus', startBar: introBars + verseBars, endBar: introBars + lyricBars, intensity: 0.9 },
        { name: 'outro', startBar: introBars + lyricBars, endBar: totalBars, intensity: 0.2 },
      ];

      const composition = {
        tempo, key, scale, chordProgression: chordProg,
        bassLine, rhythmPattern, padFreqs, duration: totalDuration,
        mood, sections,
      };

      console.log(`AI Compose: mood=${mood}, key=${key}, tempo=${tempo}, duration=${totalDuration}s, bars=${totalBars}`);
      return c.json({ success: true, composition });
    } catch (error) {
      console.log("AI composition error:", error);
      return c.json({ error: `AI composition failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // §4.1 — AI Model Status (diagnostic)
  // ==========================================
  app.get(`${ROUTE_PREFIX}/ai/status`, async (c: any) => {
    try {
      const status = aiModelManager.getStatus();
      return c.json(status);
    } catch (error) {
      console.log("AI status error:", error);
      return c.json({ error: `AI status failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // §4.1 — AI Usage Statistics
  // ==========================================
  app.get(`${ROUTE_PREFIX}/ai/usage`, async (c: any) => {
    try {
      const usage = await aiModelManager.getUsageStats();
      return c.json(usage);
    } catch (error) {
      console.log("AI usage error:", error);
      return c.json({ error: `AI usage failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // §4.3 — Speech-to-Text (Whisper via Model Manager)
  // ==========================================
  app.post(`${ROUTE_PREFIX}/stt/transcribe`, rateLimit(RATE_HEAVY), async (c: any) => {
    try {
      const body = await c.req.json();
      const { audio, language = 'zh', mimeType = 'audio/webm' } = body;

      if (!audio) {
        return c.json({ error: 'audio (base64) required' }, 400);
      }

      // Validate base64 size (max ~25MB for Whisper, but we limit to ~5MB for edge function)
      const estimatedBytes = (audio.length * 3) / 4;
      if (estimatedBytes > 5 * 1024 * 1024) {
        return c.json({ error: 'Audio too large. Maximum 5MB.' }, 400);
      }

      const result = await aiModelManager.transcribeAudio({
        audioBase64: audio,
        mimeType,
        language,
      });

      // If template fallback returned empty, inform the client
      if (result.provider === 'template' && !result.text) {
        return c.json({
          text: '',
          fallback: language === 'zh'
            ? '语音转文字需要配置 OpenAI API Key'
            : 'Speech-to-text requires OpenAI API Key configuration',
          provider: result.provider,
          available: false,
        });
      }

      console.log(`[STT] Transcribed ${result.text.length} chars via ${result.provider} (lang=${result.language})`);
      return c.json({
        text: result.text,
        language: result.language,
        duration: result.duration,
        provider: result.provider,
        available: true,
      });
    } catch (error) {
      console.log("STT transcribe error:", error);
      return c.json({ error: `Transcription failed: ${error}` }, 500);
    }
  });

  // ==========================================
  // §4.3 — STT Stream (Chunked Whisper Transcription)
  // Accepts multiple audio chunks and returns progressive transcription results.
  // This simulates real-time streaming by processing sequential chunks server-side.
  // ==========================================
  app.post(`${ROUTE_PREFIX}/stt/stream`, rateLimit(RATE_HEAVY), async (c: any) => {
    try {
      const body = await c.req.json();
      const { chunks, language = 'zh', mimeType = 'audio/webm', sessionId } = body;

      if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
        return c.json({ error: 'chunks (array of {audioBase64, index}) required' }, 400);
      }

      // Validate total size (sum of all chunks ≤ 10MB)
      let totalBytes = 0;
      for (const chunk of chunks) {
        if (!chunk.audioBase64) {
          return c.json({ error: `Chunk at index ${chunk.index} missing audioBase64` }, 400);
        }
        totalBytes += (chunk.audioBase64.length * 3) / 4;
      }
      if (totalBytes > 10 * 1024 * 1024) {
        return c.json({ error: 'Total audio chunks too large. Maximum 10MB combined.' }, 400);
      }

      // Limit to 5 chunks per request (prevent abuse)
      if (chunks.length > 5) {
        return c.json({ error: 'Maximum 5 chunks per stream request' }, 400);
      }

      console.log(`[STT Stream] Processing ${chunks.length} chunks (session=${sessionId || 'anon'}, lang=${language})`);

      const results = await aiModelManager.streamTranscribe(
        chunks.map((c: any) => ({ audioBase64: c.audioBase64, index: c.index || 0 })),
        language,
        mimeType,
      );

      // Combine all text for convenience
      const fullText = results
        .filter(r => r.text)
        .sort((a, b) => a.index - b.index)
        .map(r => r.text)
        .join(' ')
        .trim();

      const activeProvider = results.find(r => r.provider !== 'error')?.provider || 'unknown';
      const available = activeProvider === 'openai';

      console.log(`[STT Stream] Completed: ${results.length} chunks, ${fullText.length} chars total, provider=${activeProvider}`);

      return c.json({
        chunks: results,
        fullText,
        provider: activeProvider,
        available,
        sessionId: sessionId || null,
        fallback: !available && language === 'zh'
          ? '流式语音转文字需要配置 OpenAI API Key'
          : !available
          ? 'Streaming STT requires OpenAI API Key'
          : undefined,
      });
    } catch (error) {
      console.log("STT stream error:", error);
      return c.json({ error: `Stream transcription failed: ${error}` }, 500);
    }
  });
}