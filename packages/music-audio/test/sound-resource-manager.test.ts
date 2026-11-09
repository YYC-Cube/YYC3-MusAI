/**
 * @file SoundResourceManager 单元测试
 * @description 覆盖音效皮肤注册/切换、加载缓存、播放参数、音量静音与事件
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SoundResourceManager from '../src/SoundResourceManager.js'

type Listener = (event?: any) => void

class FakeAudio {
  static instances: FakeAudio[] = []
  src = ''
  volume = 1
  playbackRate = 1
  loop = false
  currentTime = 0
  paused = true
  private listeners: Record<string, Listener[]> = {}

  constructor() {
    FakeAudio.instances.push(this)
  }

  addEventListener(event: string, cb: Listener) {
    ;(this.listeners[event] ||= []).push(cb)
  }

  removeEventListener(event: string, cb: Listener) {
    this.listeners[event] = (this.listeners[event] || []).filter((fn) => fn !== cb)
  }

  static failNextLoad = false

  load() {
    // 模拟异步解码：微任务后派发 canplaythrough（或按需派发 error）
    if (FakeAudio.failNextLoad) {
      FakeAudio.failNextLoad = false
      queueMicrotask(() => this.dispatch('error', { message: 'decode failed' }))
      return
    }
    queueMicrotask(() => this.dispatch('canplaythrough'))
  }

  play() {
    this.paused = false
    setTimeout(() => (this.listeners.ended || []).forEach((fn) => fn()), 0)
    return Promise.resolve()
  }

  pause() {
    this.paused = true
  }

  dispatch(event: string, payload?: any) {
    ;(this.listeners[event] || []).forEach((fn) => fn(payload))
  }
}

describe('SoundResourceManager', () => {
  let manager: SoundResourceManager

  beforeEach(() => {
    FakeAudio.instances = []
    vi.stubGlobal('Audio', FakeAudio as any)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    manager = new SoundResourceManager()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('皮肤管理', () => {
    it('初始化注册 default/tech/nature 三套皮肤', () => {
      expect(manager.currentSkin).toBe('default')
      expect(Array.from(manager.soundSkins.keys())).toEqual(['default', 'tech', 'nature'])
    })

    it('切换皮肤成功并派发 skinChanged 事件', () => {
      const listener = vi.fn()
      manager.on('skinChanged', listener)
      manager.switchSoundSkin('tech')
      expect(manager.currentSkin).toBe('tech')
      expect(listener).toHaveBeenCalledWith('tech')
    })

    it('切换不存在的皮肤时保持原皮肤并输出错误', () => {
      manager.switchSoundSkin('missing')
      expect(manager.currentSkin).toBe('default')
      expect(console.error).toHaveBeenCalled()
    })

    it('可注册自定义皮肤', () => {
      manager.registerSoundSkin('custom', { name: '自定义', sounds: { buttonClick: '/c.mp3' } })
      expect(manager.soundSkins.has('custom')).toBe(true)
    })
  })

  describe('音效加载', () => {
    it('加载并缓存音效实例', async () => {
      const first = await manager.loadSound('buttonClick')
      const second = await manager.loadSound('buttonClick')
      expect(first).toBe(second)
      expect(first.src).toBe('/sounds/default/button-click.mp3')
      expect(FakeAudio.instances).toHaveLength(1)
    })

    it('当前皮肤不存在的音效加载失败', async () => {
      await expect(manager.loadSound('not-exist')).rejects.toThrow('不存在')
    })

    it('音频加载出错时 Promise 被拒绝', async () => {
      FakeAudio.failNextLoad = true
      await expect(manager.loadSound('notification')).rejects.toThrow('加载音效 notification 失败')
    })

    it('preloadAllSounds 预加载当前皮肤全部 5 个音效', async () => {
      const sounds = await manager.preloadAllSounds()
      expect(sounds).toHaveLength(5)
      expect(manager.soundLibrary.size).toBe(5)
    })
  })

  describe('播放控制', () => {
    it('播放时应用音量、播放速率与循环参数', async () => {
      await manager.playSound('success', { volume: 0.5, playbackRate: 1.5, loop: true })
      const audio = manager.soundLibrary.get('success')
      expect(audio.volume).toBeCloseTo(0.35, 5)
      expect(audio.playbackRate).toBe(1.5)
      expect(audio.loop).toBe(true)
      expect(audio.paused).toBe(false)
    })

    it('非循环播放等待 ended 事件后结束', async () => {
      await expect(manager.playSound('pageFlip')).resolves.toBeUndefined()
    })

    it('静音状态下不加载也不播放', async () => {
      manager.setMuted(true)
      await manager.playSound('error')
      expect(manager.soundLibrary.size).toBe(0)
    })

    it('stopSound 暂停并复位进度，未知音效安全忽略', () => {
      manager.soundLibrary.set('error', Object.assign(new FakeAudio(), { currentTime: 3 }))
      const audio = manager.soundLibrary.get('error')
      manager.stopSound('error')
      expect(audio.paused).toBe(true)
      expect(audio.currentTime).toBe(0)
      expect(() => manager.stopSound('unknown')).not.toThrow()
    })
  })

  describe('音量与事件', () => {
    it('setVolume 限制在 0-1 并派发事件', () => {
      const listener = vi.fn()
      manager.on('volumeChanged', listener)
      manager.setVolume(1.8)
      expect(manager.volume).toBe(1)
      manager.setVolume(-1)
      expect(manager.volume).toBe(0)
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('setMuted 派发 mutedChanged 事件', () => {
      const listener = vi.fn()
      manager.on('mutedChanged', listener)
      manager.setMuted(true)
      expect(manager.muted).toBe(true)
      expect(listener).toHaveBeenCalledWith(true)
    })
  })
})
