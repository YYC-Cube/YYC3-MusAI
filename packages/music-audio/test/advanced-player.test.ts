/**
 * @file AdvancedPlayer 单元测试
 * @description 覆盖曲目加载、播放控制、UI 事件桥接、音频事件与播放列表管理
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdvancedPlayer from '../src/AdvancedPlayer.js'
import PlayerUI from '../src/PlayerUI.js'
import SoundResourceManager from '../src/SoundResourceManager.js'

type Listener = (event?: any) => void

class FakeAudio {
  static instances: FakeAudio[] = []
  src: string
  volume = 1
  muted = false
  currentTime = 0
  duration = 100
  paused = true
  playbackRate = 1
  loop = false
  listeners: Record<string, Listener[]> = {}
  play = vi.fn(() => {
    this.paused = false
    return Promise.resolve()
  })
  pause = vi.fn(() => {
    this.paused = true
  })
  load = vi.fn(() => {
    queueMicrotask(() => this.dispatch('canplaythrough'))
  })

  constructor(src = '') {
    this.src = src
    FakeAudio.instances.push(this)
  }

  addEventListener(event: string, cb: Listener) {
    ;(this.listeners[event] ||= []).push(cb)
  }

  removeEventListener(event: string, cb: Listener) {
    this.listeners[event] = (this.listeners[event] || []).filter((fn) => fn !== cb)
  }

  dispatch(event: string, payload?: any) {
    ;(this.listeners[event] || []).forEach((fn) => fn(payload))
  }
}

let tracks = [
  { src: '/audio/a.mp3', title: 'A' },
  { src: '/audio/b.mp3', title: 'B' },
  { src: '/audio/c.mp3', title: 'C' },
]

const freshTracks = () => [
  { src: '/audio/a.mp3', title: 'A' },
  { src: '/audio/b.mp3', title: 'B' },
  { src: '/audio/c.mp3', title: 'C' },
]

const setupContainer = () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

describe('AdvancedPlayer', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  let updateStateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    FakeAudio.instances = []
    tracks = freshTracks()
    document.body.innerHTML = ''
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: any) => {
      // jsdom 会执行注入的 <script>，而默认皮肤脚本本身存在语法缺陷；
      // 用普通元素替换以避免测试环境抛出未捕获异常。
      if (String(tagName).toLowerCase() === 'script') {
        return createElement('div')
      }
      return createElement(tagName, options)
    }) as any)
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('AudioContext', class {})
    updateStateSpy = vi.spyOn(PlayerUI.prototype, 'updatePlayerState').mockImplementation(() => {})
    vi.spyOn(SoundResourceManager.prototype, 'playSound').mockResolvedValue(undefined)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  describe('初始化', () => {
    it('加载播放列表首曲目并派发 trackLoaded', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks, currentIndex: 0 }) as any

      expect(player.soundManager).toBeDefined()
      expect(player.playerUI).toBeInstanceOf(PlayerUI)
      expect(player.playlist).toHaveLength(3)
      expect(player.currentIndex).toBe(0)
      expect(player.currentTrack).toEqual(tracks[0])
      expect(player.isPlaying).toBe(false)
      expect(container.querySelector('.player-container')).not.toBeNull()

      const audio = FakeAudio.instances.find((item) => item.src === tracks[0].src)
      expect(audio).toBeDefined()

      const listener = vi.fn()
      player.on('trackLoaded', listener)
      player.loadTrack(1)
      expect(listener).toHaveBeenCalledWith(tracks[1])
    })

    it('空播放列表不加载曲目', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container) as any

      expect(player.playlist).toEqual([])
      expect(player.currentTrack).toBeNull()
      expect(player.audio).toBeUndefined()
    })

    it('autoPlay 开启时初始化后自动播放', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks, autoPlay: true }) as any

      expect(player.isPlaying).toBe(true)
      const audio = FakeAudio.instances.find((item) => item.src === tracks[0].src)
      expect(audio?.play).toHaveBeenCalled()
    })

    it('索引越界时拒绝加载并记录错误', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any

      player.loadTrack(5)
      player.loadTrack(-1)

      expect(errorSpy).toHaveBeenCalledWith('曲目索引超出范围')
      expect(player.currentTrack).toEqual(tracks[0])
    })

    it('切换曲目时先暂停正在播放的音频', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      player.play()
      const firstAudio = player.audio

      player.loadTrack(2)

      expect(firstAudio.pause).toHaveBeenCalled()
      expect(player.isPlaying).toBe(false)
      expect(player.currentTrack).toEqual(tracks[2])
    })
  })

  describe('UI 事件桥接', () => {
    it('play/pause 事件驱动播放器状态', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any

      player.playerUI.emit('play')
      expect(player.isPlaying).toBe(true)
      expect(player.audio.play).toHaveBeenCalled()

      player.playerUI.emit('pause')
      expect(player.isPlaying).toBe(false)
      expect(player.audio.pause).toHaveBeenCalled()
    })

    it('next/prev 事件切换曲目并在边界循环', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any

      player.playerUI.emit('next')
      expect(player.currentIndex).toBe(1)

      player.playerUI.emit('next')
      player.playerUI.emit('next')
      expect(player.currentIndex).toBe(0)

      player.playerUI.emit('prev')
      expect(player.currentIndex).toBe(2)
    })

    it('seek 与 volumeChange 事件更新音频属性', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      const seekListener = vi.fn()
      const volumeListener = vi.fn()
      player.on('seek', seekListener)
      player.on('volumeChange', volumeListener)

      player.playerUI.emit('seek', 42)
      expect(player.audio.currentTime).toBe(42)
      expect(seekListener).toHaveBeenCalledWith(42)

      player.playerUI.emit('volumeChange', 0.25)
      expect(player.audio.volume).toBe(0.25)
      expect(player.soundManager.volume).toBe(0.25)
      expect(volumeListener).toHaveBeenCalledWith(0.25)
    })

    it('skinApplied 事件同步音效皮肤', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any

      player.playerUI.emit('skinApplied', 'tech')

      expect(player.soundManager.currentSkin).toBe('tech')
    })
  })

  describe('音频事件', () => {
    it('ended 事件结束播放并自动切换下一首', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      player.play()
      const endedListener = vi.fn()
      player.on('trackEnded', endedListener)

      const finishedAudio = player.audio
      finishedAudio.dispatch('ended')

      expect(endedListener).toHaveBeenCalledWith(tracks[0])
      expect(player.currentIndex).toBe(1)
      expect(player.isPlaying).toBe(true)
    })

    it('timeupdate 与 loadedmetadata 触发 UI 更新', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      updateStateSpy.mockClear()
      player.audio.currentTime = 15

      player.audio.dispatch('timeupdate')
      expect(updateStateSpy).toHaveBeenLastCalledWith({
        isPlaying: false,
        currentTime: 15,
        duration: 100,
      })

      player.audio.duration = 0
      player.audio.dispatch('loadedmetadata')
      expect(updateStateSpy).toHaveBeenLastCalledWith({
        isPlaying: false,
        currentTime: 15,
        duration: 0,
      })
    })

    it('error 事件记录错误并派发 trackError', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      const listener = vi.fn()
      player.on('trackError', listener)
      const error = new Error('decode failed')

      player.audio.dispatch('error', error)

      expect(errorSpy).toHaveBeenCalledWith('音频加载失败:', error)
      expect(listener).toHaveBeenCalledWith({ track: tracks[0], error })
    })
  })

  describe('播放控制边界', () => {
    it('没有曲目时 play/pause/seek/setVolume/setMuted 均为安全空操作', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container) as any

      expect(() => player.play()).not.toThrow()
      expect(() => player.pause()).not.toThrow()
      expect(() => player.seek(10)).not.toThrow()
      expect(() => player.setVolume(0.5)).not.toThrow()
      expect(() => player.setMuted(true)).not.toThrow()
      expect(player.isPlaying).toBe(false)
    })

    it('audio.play 抛错时派发 playError', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      const listener = vi.fn()
      player.on('playError', listener)
      player.audio.play.mockImplementation(() => {
        throw new Error('blocked')
      })

      player.play()

      expect(errorSpy).toHaveBeenCalledWith('播放失败:', expect.any(Error))
      expect(listener).toHaveBeenCalledWith(expect.any(Error))
      expect(player.isPlaying).toBe(false)
    })

    it('setMuted 同步静音状态并派发 mutedChange', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      const listener = vi.fn()
      player.on('mutedChange', listener)

      player.setMuted(true)

      expect(player.audio.muted).toBe(true)
      expect(player.soundManager.muted).toBe(true)
      expect(listener).toHaveBeenCalledWith(true)
    })

    it('switchSkin 同时切换 UI 与音效皮肤', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      const listener = vi.fn()
      player.on('skinChanged', listener)

      player.switchSkin('nature')

      expect(player.playerUI.currentSkin.name).toBe('自然风皮肤')
      expect(player.soundManager.currentSkin).toBe('nature')
      expect(listener).toHaveBeenCalledWith('nature')
    })
  })

  describe('播放列表管理', () => {
    it('addTrack 追加曲目并派发 trackAdded', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: [tracks[0]] }) as any
      const listener = vi.fn()
      player.on('trackAdded', listener)

      player.addTrack(tracks[1])

      expect(player.playlist).toHaveLength(2)
      expect(listener).toHaveBeenCalledWith(tracks[1])
    })

    it('removeTrack 忽略越界索引', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      const listener = vi.fn()
      player.on('trackRemoved', listener)

      player.removeTrack(-1)
      player.removeTrack(99)

      expect(player.playlist).toHaveLength(3)
      expect(listener).not.toHaveBeenCalled()
    })

    it('移除当前曲目时加载剩余曲目并继续播放', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      const listener = vi.fn()
      player.on('trackRemoved', listener)

      player.removeTrack(0)

      expect(listener).toHaveBeenCalledWith({ src: '/audio/a.mp3', title: 'A' })
      expect(player.playlist).toHaveLength(2)
      expect(player.currentIndex).toBe(0)
      expect(player.currentTrack).toEqual({ src: '/audio/b.mp3', title: 'B' })
      expect(player.isPlaying).toBe(true)
    })

    it('移除当前且为最后一首时清空播放状态', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: [tracks[0]] }) as any
      const listener = vi.fn()
      player.on('trackRemoved', listener)

      player.removeTrack(0)

      expect(player.playlist).toHaveLength(0)
      expect(player.currentTrack).toBeNull()
      expect(player.audio).toBeNull()
      expect(player.isPlaying).toBe(false)
      expect(listener).toHaveBeenCalledWith(tracks[0])
    })

    it('移除当前曲目之前的曲目会修正索引', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      player.loadTrack(2)

      player.removeTrack(0)

      expect(player.currentIndex).toBe(1)
      expect(player.currentTrack).toEqual({ src: '/audio/c.mp3', title: 'C' })
      expect(player.playlist).toEqual([
        { src: '/audio/b.mp3', title: 'B' },
        { src: '/audio/c.mp3', title: 'C' },
      ])
    })

    it('移除当前曲目之后的曲目不影响当前索引', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      player.loadTrack(0)

      player.removeTrack(2)

      expect(player.currentIndex).toBe(0)
      expect(player.currentTrack).toEqual(tracks[0])
      expect(player.playlist).toEqual([tracks[0], tracks[1]])
    })

    it('clearPlaylist 清空状态并派发 playlistCleared', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container, { playlist: tracks }) as any
      const listener = vi.fn()
      player.on('playlistCleared', listener)

      player.clearPlaylist()

      expect(player.playlist).toEqual([])
      expect(player.currentIndex).toBe(0)
      expect(player.currentTrack).toBeNull()
      expect(player.audio).toBeNull()
      expect(listener).toHaveBeenCalled()
    })
  })

  describe('自定义事件', () => {
    it('on/emit 支持自定义事件，多个回调均被调用', () => {
      const container = setupContainer()
      const player = new AdvancedPlayer(container) as any
      const first = vi.fn()
      const second = vi.fn()

      player.on('custom', first)
      player.on('custom', second)
      player.emit('custom', { ok: true })
      player.emit('unknown', 'ignored')

      expect(first).toHaveBeenCalledWith({ ok: true })
      expect(second).toHaveBeenCalledWith({ ok: true })
    })
  })
})
