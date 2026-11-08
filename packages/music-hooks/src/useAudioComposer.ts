import { useState, useCallback, useRef } from 'react';

// ==========================================
// AI Audio Composer — Web Audio Synthesis
// ==========================================
// Takes composition parameters (from backend /ai/compose)
// and generates a playable audio Blob using OfflineAudioContext.
// This enables the full AI lyrics → playable track pipeline.

export interface CompositionParams {
  tempo: number;        // BPM
  key: string;          // e.g. 'Am', 'C', 'Dm'
  scale: number[];      // Frequencies for the scale notes
  chordProgression: number[][]; // Array of chords, each chord is array of frequencies
  bassLine: number[];   // Bass note frequencies per bar
  rhythmPattern: number[]; // 1=kick, 2=snare, 3=hihat per beat subdivision
  padFreqs: number[];   // Sustained pad frequencies
  duration: number;     // Total seconds
  mood: string;         // For applying effects
  sections: Array<{
    name: string;       // 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro'
    startBar: number;
    endBar: number;
    intensity: number;  // 0.0 - 1.0
  }>;
}

export interface ComposerReturn {
  /** Synthesize a track from params; returns a blob URL */
  compose: (params: CompositionParams) => Promise<string>;
  /** Current progress 0-1 */
  progress: number;
  /** Whether currently rendering */
  isComposing: boolean;
  /** Any error message */
  error: string | null;
}

// Helper: simple noise generator for percussion
function generateNoise(ctx: OfflineAudioContext, duration: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function useAudioComposer(): ComposerReturn {
  const [progress, setProgress] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const compose = useCallback(async (params: CompositionParams): Promise<string> => {
    setIsComposing(true);
    setProgress(0);
    setError(null);
    cancelledRef.current = false;

    try {
      const sampleRate = 44100;
      const totalSamples = Math.ceil(sampleRate * params.duration);
      const ctx = new OfflineAudioContext(2, totalSamples, sampleRate);

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(ctx.destination);

      // Compressor for glue
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 20;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.2;
      compressor.connect(masterGain);

      const beatDuration = 60 / params.tempo;
      const barDuration = beatDuration * 4;
      const totalBars = Math.floor(params.duration / barDuration);

      setProgress(0.1);

      // ========== PAD LAYER ==========
      const padGain = ctx.createGain();
      padGain.gain.value = 0;
      padGain.connect(compressor);

      // Slow fade in
      padGain.gain.setValueAtTime(0, 0);
      padGain.gain.linearRampToValueAtTime(0.08, 2);

      params.padFreqs.forEach((freq) => {
        // Detuned pair for richness
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;
        const g1 = ctx.createGain();
        g1.gain.value = 0.06;
        osc1.connect(g1);
        g1.connect(padGain);
        osc1.start(0);
        osc1.stop(params.duration);

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq * 1.003;
        const g2 = ctx.createGain();
        g2.gain.value = 0.03;
        osc2.connect(g2);
        g2.connect(padGain);
        osc2.start(0);
        osc2.stop(params.duration);
      });

      // LFO for pad modulation
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.12;
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(padGain.gain);
      lfo.start(0);
      lfo.stop(params.duration);

      setProgress(0.25);

      // ========== CHORD PROGRESSION ==========
      const chordGain = ctx.createGain();
      chordGain.gain.value = 0;
      chordGain.connect(compressor);

      for (let bar = 0; bar < totalBars; bar++) {
        const section = params.sections.find(s => bar >= s.startBar && bar < s.endBar);
        const intensity = section?.intensity ?? 0.5;
        const chordIdx = bar % params.chordProgression.length;
        const chord = params.chordProgression[chordIdx];
        const startTime = bar * barDuration;
        const noteDuration = barDuration * 0.95;

        // Dynamic intensity
        chordGain.gain.setValueAtTime(0.04 * intensity, startTime);

        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const env = ctx.createGain();
          env.gain.value = 0;
          env.gain.setValueAtTime(0, startTime);
          env.gain.linearRampToValueAtTime(0.06 * intensity, startTime + 0.05);
          env.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);
          osc.connect(env);
          env.connect(chordGain);
          osc.start(startTime);
          osc.stop(startTime + noteDuration + 0.1);
        });
      }

      setProgress(0.4);

      // ========== BASS LINE ==========
      const bassGain = ctx.createGain();
      bassGain.gain.value = 0.12;
      bassGain.connect(compressor);

      for (let bar = 0; bar < totalBars; bar++) {
        const section = params.sections.find(s => bar >= s.startBar && bar < s.endBar);
        const intensity = section?.intensity ?? 0.5;
        const bassFreq = params.bassLine[bar % params.bassLine.length];

        // Two notes per bar (root + octave)
        for (let hit = 0; hit < 2; hit++) {
          const startTime = bar * barDuration + hit * (barDuration / 2);
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = hit === 0 ? bassFreq : bassFreq * 1.5;
          const env = ctx.createGain();
          env.gain.value = 0;
          env.gain.setValueAtTime(0, startTime);
          env.gain.linearRampToValueAtTime(0.15 * intensity, startTime + 0.01);
          env.gain.exponentialRampToValueAtTime(0.001, startTime + beatDuration * 1.5);
          osc.connect(env);
          env.connect(bassGain);
          osc.start(startTime);
          osc.stop(startTime + beatDuration * 2);
        }
      }

      setProgress(0.55);

      // ========== MELODY (arpeggiated) ==========
      const melodyGain = ctx.createGain();
      melodyGain.gain.value = 0.06;
      melodyGain.connect(compressor);

      for (let bar = 0; bar < totalBars; bar++) {
        const section = params.sections.find(s => bar >= s.startBar && bar < s.endBar);
        if (!section || section.name === 'intro' || section.name === 'outro') continue;

        const intensity = section.intensity;
        const scaleNotes = params.scale;
        const chordIdx = bar % params.chordProgression.length;
        const chordNotes = params.chordProgression[chordIdx];

        // Play an arpeggio pattern
        const arpeggioNotes = [...chordNotes, scaleNotes[Math.floor(Math.random() * scaleNotes.length)] * 2];
        const notesPerBar = section.name === 'chorus' ? 8 : 4;
        const noteLen = barDuration / notesPerBar;

        for (let n = 0; n < notesPerBar; n++) {
          const startTime = bar * barDuration + n * noteLen;
          const freq = arpeggioNotes[n % arpeggioNotes.length];
          if (!freq || freq <= 0) continue;

          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq * (section.name === 'chorus' ? 2 : 1);
          const env = ctx.createGain();
          env.gain.value = 0;
          env.gain.setValueAtTime(0, startTime);
          env.gain.linearRampToValueAtTime(0.08 * intensity, startTime + 0.005);
          env.gain.exponentialRampToValueAtTime(0.001, startTime + noteLen * 0.9);
          osc.connect(env);
          env.connect(melodyGain);
          osc.start(startTime);
          osc.stop(startTime + noteLen + 0.05);
        }
      }

      setProgress(0.7);

      // ========== PERCUSSION ==========
      const percGain = ctx.createGain();
      percGain.gain.value = 0.1;
      percGain.connect(compressor);

      const noiseBuffer = generateNoise(ctx, 0.1);

      for (let bar = 0; bar < totalBars; bar++) {
        const section = params.sections.find(s => bar >= s.startBar && bar < s.endBar);
        if (!section || section.name === 'intro') continue;

        const intensity = section.intensity;
        const subdivisions = 8;
        const subLen = barDuration / subdivisions;

        for (let s = 0; s < subdivisions; s++) {
          const beatType = params.rhythmPattern[s % params.rhythmPattern.length];
          if (!beatType) continue;

          const startTime = bar * barDuration + s * subLen;

          if (beatType === 1) {
            // Kick
            const kickOsc = ctx.createOscillator();
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(160, startTime);
            kickOsc.frequency.exponentialRampToValueAtTime(40, startTime + 0.08);
            const kickEnv = ctx.createGain();
            kickEnv.gain.setValueAtTime(0.6 * intensity, startTime);
            kickEnv.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            kickOsc.connect(kickEnv);
            kickEnv.connect(percGain);
            kickOsc.start(startTime);
            kickOsc.stop(startTime + 0.2);
          } else if (beatType === 2) {
            // Snare (noise burst)
            const snare = ctx.createBufferSource();
            snare.buffer = noiseBuffer;
            const snareFilter = ctx.createBiquadFilter();
            snareFilter.type = 'highpass';
            snareFilter.frequency.value = 2000;
            const snareEnv = ctx.createGain();
            snareEnv.gain.setValueAtTime(0.3 * intensity, startTime);
            snareEnv.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
            snare.connect(snareFilter);
            snareFilter.connect(snareEnv);
            snareEnv.connect(percGain);
            snare.start(startTime);
          } else if (beatType === 3) {
            // Hi-hat (filtered noise)
            const hh = ctx.createBufferSource();
            hh.buffer = noiseBuffer;
            const hhFilter = ctx.createBiquadFilter();
            hhFilter.type = 'highpass';
            hhFilter.frequency.value = 8000;
            const hhEnv = ctx.createGain();
            hhEnv.gain.setValueAtTime(0.15 * intensity, startTime);
            hhEnv.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);
            hh.connect(hhFilter);
            hhFilter.connect(hhEnv);
            hhEnv.connect(percGain);
            hh.start(startTime);
          }
        }
      }

      setProgress(0.85);

      // ========== FADE OUT ==========
      masterGain.gain.setValueAtTime(0.7, params.duration - 3);
      masterGain.gain.linearRampToValueAtTime(0, params.duration);

      // ========== RENDER ==========
      const renderedBuffer = await ctx.startRendering();
      setProgress(0.95);

      // Convert to WAV blob
      const wavBlob = audioBufferToWav(renderedBuffer);
      const blobUrl = URL.createObjectURL(wavBlob);

      setProgress(1);
      setIsComposing(false);
      return blobUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsComposing(false);
      console.error('Audio composition failed:', msg);
      throw err;
    }
  }, []);

  return { compose, progress, isComposing, error };
}

// ==========================================
// WAV Encoder
// ==========================================
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write PCM data
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
