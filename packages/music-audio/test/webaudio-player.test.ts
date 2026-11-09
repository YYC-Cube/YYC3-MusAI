/**
 * @file WebAudioPlayer 单元测试
 * @description 覆盖 AudioContext 初始化、缓冲加载/缓存、基本播放、情感化淡入淡出与错误分支
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WebAudioPlayer from '../src/WebAudioPlayer.js'

type AnyRecord = Record<string, any>

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  destination = { id: 'destination' }
  currentTime = 10
  sources: AnyRecord[] = []
  gains: AnyRecord[] = []
  decodeAudioData = vi.fn(async () => ({ duration: 1 }))

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createBufferSource() {
    const source = {
      buffer: null,
      startedAt: null as number | null,
      onended: null as null | (() => void),
      connect: vi.fn(function (this: void, next: any) {
        return next
      }),
      start: vi.fn(function (this: AnyRecord, at: number) {
        source.startedAt = at
      }),
    }
    this.sources.push(source)
    return source
  }

  createGain() {
    const gain = {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    }
    const node = {
      gain,
      connect: vi.fn(function (next: any) {
        return next
      }),
    }
    this.gains.push(node)
    return node
  }
}

const flushAsync = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const okResponse = () => ({
  arrayBuffer: async () => new ArrayBuffer(8),
})

describe('WebAudioPlayer', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    FakeAudioContext.instances = []
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('AudioContext', FakeAudioContext)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okResponse())
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createPlayer = () => {
    const player = new WebAudioPlayer() as any
    const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1] as AnyRecord
    return { player, ctx }
  }

  const resolveSource = (ctx: AnyRecord) => {
    const source = ctx.sources[ctx.sources.length - 1]
    source.onended?.()
    return source
  }

  describe('初始化', () => {
    it('使用 window.AudioContext 创建上下文', () => {
      const { player, ctx } = createPlayer()

      expect(player.audioContext).toBe(ctx)
      expect(errorSpy).not.toHaveBeenCalled()
      expect(player.getCacheSize()).toBe(0)
    })

    it('AudioContext 不可用时记录错误并保持未初始化', () => {
      vi.stubGlobal(
        'AudioContext',
        class {
          constructor() {
            throw new Error('not supported')
          }
        }
      )

      const player = new WebAudioPlayer() as any

      expect(player.audioContext).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith('Web Audio API is not supported in this browser')
    })

    it('回退到 webkitAudioContext', () => {
      vi.stubGlobal('AudioContext', undefined)
      vi.stubGlobal('webkitAudioContext', FakeAudioContext)

      const player = new WebAudioPlayer() as any

      expect(player.audioContext).toBeInstanceOf(FakeAudioContext)
    })
  })

  describe('playSound', () => {
    it('未初始化时拒绝播放', async () => {
      const player = new WebAudioPlayer() as any
      player.audioContext = null

      await expect(player.playSound('/a.mp3')).rejects.toThrow('AudioContext not initialized')
      expect(errorSpy).toHaveBeenCalledWith('AudioContext not initialized')
    })

    it('加载、解码、缓存并通过 BufferSource 播放', async () => {
      const { player, ctx } = createPlayer()

      const promise = player.playSound('/a.mp3', 0.4)
      await flushAsync()

      expect(fetch).toHaveBeenCalledWith('/a.mp3')
      expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1)
      expect(player.getCacheSize()).toBe(1)

      const gainNode = ctx.gains[0]
      expect(gainNode.gain.value).toBe(0.4)
      expect(gainNode.connect).toHaveBeenCalledWith(ctx.destination)

      const source = ctx.sources[0]
      expect(source.startedAt).toBe(0)
      expect(source.buffer).toEqual({ duration: 1 })

      resolveSource(ctx)
      await expect(promise).resolves.toBeUndefined()
    })

    it('命中缓存时不再请求与解码', async () => {
      const { player, ctx } = createPlayer()

      const first = player.playSound('/a.mp3', 0.4)
      await flushAsync()
      resolveSource(ctx)
      await first

      const second = player.playSound('/a.mp3', 0.2)
      await flushAsync()

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1)
      expect(ctx.gains[1].gain.value).toBe(0.2)

      resolveSource(ctx)
      await second
    })

    it('请求失败时拒绝并记录错误', async () => {
      const { player } = createPlayer()
      const failure = new Error('network down')
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw failure
        })
      )

      await expect(player.playSound('/bad.mp3')).rejects.toBe(failure)
      expect(errorSpy).toHaveBeenCalledWith('Error playing sound:', failure)
    })

    it('创建音源失败时拒绝', async () => {
      const { player, ctx } = createPlayer()
      ctx.createBufferSource = () => {
        throw new Error('source failed')
      }

      await expect(player.playBuffer({}, 0.5)).rejects.toThrow('source failed')
    })
  })

  describe('playEmotionSound', () => {
    it('未初始化时拒绝播放', async () => {
      const player = new WebAudioPlayer() as any
      player.audioContext = null

      await expect(player.playEmotionSound('/a.mp3')).rejects.toThrow('AudioContext not initialized')
      expect(errorSpy).toHaveBeenCalledWith('AudioContext not initialized')
    })

    it.each([
      ['calm', 0.3],
      ['happy', 0.6],
      ['sad', 0.3],
      ['default', 0.5],
    ])('情感 %s 使用音量 %s 并执行淡入淡出', async (emotion, expectedVolume) => {
      const { player, ctx } = createPlayer()

      const promise = player.playEmotionSound('/emotion.mp3', emotion)
      await flushAsync()

      const gainNode = ctx.gains[0]
      expect(gainNode.gain.value).toBe(expectedVolume)
      expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, ctx.currentTime)
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        expectedVolume,
        ctx.currentTime + 0.5
      )

      resolveSource(ctx)
      await expect(promise).resolves.toBeUndefined()
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, ctx.currentTime + 0.5)
    })

    it('情感音效命中缓存时不重复请求', async () => {
      const { player, ctx } = createPlayer()

      const first = player.playEmotionSound('/emotion.mp3', 'happy')
      await flushAsync()
      resolveSource(ctx)
      await first

      const second = player.playEmotionSound('/emotion.mp3', 'calm')
      await flushAsync()

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(ctx.gains[1].gain.value).toBe(0.3)

      resolveSource(ctx)
      await second
    })

    it('加载失败时拒绝并记录错误', async () => {
      const { player } = createPlayer()
      const failure = new Error('decode error')
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw failure
        })
      )

      await expect(player.playEmotionSound('/bad.mp3')).rejects.toBe(failure)
      expect(errorSpy).toHaveBeenCalledWith('Error playing emotion sound:', failure)
    })

    it('创建音源失败时拒绝', async () => {
      const { player, ctx } = createPlayer()
      ctx.createBufferSource = () => {
        throw new Error('emotion source failed')
      }

      await expect(player.playEmotionBuffer({}, 'happy')).rejects.toThrow('emotion source failed')
    })
  })

  describe('缓存管理', () => {
    it('clearCache 清空缓存并返回正确大小', async () => {
      const { player, ctx } = createPlayer()

      const promise = player.playSound('/a.mp3')
      await flushAsync()
      resolveSource(ctx)
      await promise

      expect(player.getCacheSize()).toBe(1)
      player.clearCache()
      expect(player.getCacheSize()).toBe(0)
    })
  })
})
