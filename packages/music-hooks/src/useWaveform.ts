/**
 * YYC³ music-hooks — useWaveform
 *
 * 从音频缓冲区提取波形采样点，供音乐可视化与波形 seek 使用。
 * 采样精度可配置，默认 512 点，足以渲染整首歌曲的能量轮廓。
 */

import * as React from "react";

export interface UseWaveformOptions {
  /** 采样点数量，越多波形越精细，默认 512 */
  sampleCount?: number;
  /** 归一化基准，默认 1.0（最大振幅映射到 1） */
  normalizeTo?: number;
}

export interface UseWaveformResult {
  /** 归一化后的波形采样点，范围 [0, 1] */
  samples: Float32Array;
  /** 采样点数量 */
  length: number;
  /** 是否已就绪 */
  ready: boolean;
}

/**
 * 从 AudioBuffer 提取单声道混合波形，归一化到 [0, 1]。
 * 若 buffer 为空或不可用，返回全零数组。
 */
export function useWaveform(
  audioBuffer: AudioBuffer | null,
  options: UseWaveformOptions = {},
): UseWaveformResult {
  const { sampleCount = 512, normalizeTo = 1 } = options;

  return React.useMemo(() => {
    const samples = new Float32Array(sampleCount);
    if (!audioBuffer) {
      return { samples, length: sampleCount, ready: false };
    }

    const { numberOfChannels, duration, sampleRate } = audioBuffer;
    const channelData = audioBuffer.getChannelData(0);
    const length = channelData.length;

    // 单声道混合：多声道取平均
    const mono = new Float32Array(length);
    for (let c = 0; c < numberOfChannels; c += 1) {
      const ch = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i += 1) {
        mono[i] += ch[i] / numberOfChannels;
      }
    }

    const step = Math.max(1, Math.floor(length / sampleCount));
    let maxAbs = 0;
    for (let i = 0; i < sampleCount; i += 1) {
      const start = i * step;
      const end = Math.min(start + step, length);
      let peak = 0;
      for (let j = start; j < end; j += 1) {
        const v = Math.abs(mono[j]);
        if (v > peak) peak = v;
      }
      samples[i] = Math.min(peak / normalizeTo, 1);
      if (peak > maxAbs) maxAbs = peak;
    }

    // 二次归一化，保证全局最大振幅映射到 normalizeTo
    if (maxAbs > 0) {
      for (let i = 0; i < sampleCount; i += 1) {
        samples[i] = Math.min((samples[i] / maxAbs) * normalizeTo, 1);
      }
    }

    return { samples, length: sampleCount, ready: true };
  }, [audioBuffer, sampleCount, normalizeTo]);
}
