/**
 * @file audioContext.ts
 * @description 全应用共享 AudioContext：单例创建、resume 与 dispose
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 * @license MIT
 * @tags audio,audiocontext,singleton,lifecycle
 */

export interface SharedAudioContextStats {
  /** 累计创建的实例数（用于泄漏与单例断言） */
  created: number;
  /** 当前是否有可用实例 */
  active: boolean;
  /** 当前实例状态 */
  state: AudioContextState | null;
}

type AudioContextConstructor = typeof AudioContext;

let sharedContext: AudioContext | null = null;
let createdCount = 0;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = globalThis as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

/** 当前环境是否支持 WebAudio */
export function isAudioContextSupported(): boolean {
  return getAudioContextConstructor() !== null;
}

/**
 * 获取共享 AudioContext。
 * - 首次调用时创建，之后复用；
 * - 实例被关闭后自动重建；
 * - 无浏览器环境或不支持 WebAudio 时返回 null。
 */
export function getSharedAudioContext(): AudioContext | null {
  const Ctor = getAudioContextConstructor();
  if (!Ctor) return null;

  if (sharedContext && sharedContext.state !== 'closed') {
    return sharedContext;
  }

  sharedContext = new Ctor();
  createdCount += 1;
  return sharedContext;
}

/**
 * 确保共享 AudioContext 处于 running 状态。
 * 浏览器自动播放策略要求必须在用户手势内调用。
 */
export async function resumeSharedAudioContext(): Promise<AudioContext | null> {
  const ctx = getSharedAudioContext();
  if (!ctx) return null;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // 某些浏览器在非手势上下文会拒绝 resume，保留 suspended 状态由调用方决定重试
    }
  }
  return ctx;
}

/** 关闭并释放共享 AudioContext；可重复调用 */
export async function disposeSharedAudioContext(): Promise<void> {
  const ctx = sharedContext;
  sharedContext = null;
  if (!ctx || ctx.state === 'closed') return;

  try {
    await ctx.close();
  } catch {
    // 已关闭或不可关闭时忽略
  }
}

/** 观测信息（用于测试与诊断面板） */
export function getSharedAudioContextStats(): SharedAudioContextStats {
  return {
    created: createdCount,
    active: sharedContext !== null && sharedContext.state !== 'closed',
    state: sharedContext?.state ?? null,
  };
}
