// YYC³ music-utils — 共享 AudioContext 生命周期测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isAudioContextSupported,
  getSharedAudioContext,
  resumeSharedAudioContext,
  disposeSharedAudioContext,
  getSharedAudioContextStats,
} from '../src/audioContext'

class AudioContextMock {
  static instances: AudioContextMock[] = []
  state: AudioContextState = 'suspended'
  resume = vi.fn(async () => {
    this.state = 'running'
  })
  close = vi.fn(async () => {
    this.state = 'closed'
  })

  constructor() {
    AudioContextMock.instances.push(this)
  }
}

describe('shared AudioContext', () => {
  beforeEach(async () => {
    AudioContextMock.instances = []
    await disposeSharedAudioContext()
    vi.stubGlobal('AudioContext', AudioContextMock as any)
    delete (window as any).webkitAudioContext
  })

  afterEach(async () => {
    await disposeSharedAudioContext()
    vi.unstubAllGlobals()
  })

  it('不支持 WebAudio 时返回 null 且不创建实例', async () => {
    delete (window as any).AudioContext
    delete (window as any).webkitAudioContext

    expect(isAudioContextSupported()).toBe(false)
    expect(getSharedAudioContext()).toBeNull()
    await expect(resumeSharedAudioContext()).resolves.toBeNull()
    expect(getSharedAudioContextStats().created).toBe(0)
  })

  it('多次获取返回同一实例', () => {
    const first = getSharedAudioContext()
    const second = getSharedAudioContext()

    expect(first).toBe(second)
    expect(AudioContextMock.instances).toHaveLength(1)
    expect(getSharedAudioContextStats()).toMatchObject({ created: 1, active: true })
  })

  it('webkitAudioContext 回退可用', () => {
    delete (window as any).AudioContext
    ;(window as any).webkitAudioContext = AudioContextMock

    expect(isAudioContextSupported()).toBe(true)
    expect(getSharedAudioContext()).toBeInstanceOf(AudioContextMock)
    delete (window as any).webkitAudioContext
  })

  it('suspended 状态下 resume 并更新状态', async () => {
    const ctx = getSharedAudioContext()!
    expect(ctx.state).toBe('suspended')

    await expect(resumeSharedAudioContext()).resolves.toBe(ctx)
    expect(ctx.resume).toHaveBeenCalledTimes(1)
    expect(ctx.state).toBe('running')
  })

  it('running 状态不重复 resume', async () => {
    const ctx = getSharedAudioContext()!
    ctx.state = 'running'

    await resumeSharedAudioContext()
    expect(ctx.resume).not.toHaveBeenCalled()
  })

  it('dispose 关闭实例并清空状态，可重复调用', async () => {
    const ctx = getSharedAudioContext()!

    await disposeSharedAudioContext()
    expect(ctx.close).toHaveBeenCalledTimes(1)
    expect(getSharedAudioContextStats().active).toBe(false)

    await expect(disposeSharedAudioContext()).resolves.toBeUndefined()
  })

  it('dispose 后再次获取会创建新实例', async () => {
    const before = getSharedAudioContextStats().created
    const first = getSharedAudioContext()
    await disposeSharedAudioContext()

    const second = getSharedAudioContext()
    expect(second).not.toBe(first)
    expect(getSharedAudioContextStats().created).toBe(before + 2)
  })

  it('实例被外部关闭后自动重建', () => {
    const first = getSharedAudioContext()!
    first.state = 'closed'

    const second = getSharedAudioContext()
    expect(second).not.toBe(first)
  })

  it('close 抛错时 dispose 不抛出', async () => {
    const ctx = getSharedAudioContext()! as any
    ctx.close.mockRejectedValueOnce(new Error('already closed'))

    await expect(disposeSharedAudioContext()).resolves.toBeUndefined()
    expect(getSharedAudioContextStats().active).toBe(false)
  })
})
