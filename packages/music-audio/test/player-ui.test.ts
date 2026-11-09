/**
 * @file PlayerUI 单元测试
 * @description 覆盖皮肤注册/应用/切换、DOM 渲染、事件派发与状态更新
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PlayerUI from '../src/PlayerUI.js'

type PlayerUIAny = InstanceType<typeof PlayerUI> & {
  currentSkin: any
  stateReceived: any
}

const setupContainer = () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

describe('PlayerUI', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: any) => {
      // jsdom 会执行注入的 <script>；测试中以普通元素替换，避免重复执行皮肤脚本
      if (String(tagName).toLowerCase() === 'script') {
        return createElement('div')
      }
      return createElement(tagName, options)
    }) as any)
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('初始化与默认皮肤', () => {
    it('注册 default/tech/nature 三套皮肤并渲染默认皮肤', () => {
      const container = setupContainer()
      const ui = new PlayerUI(container) as PlayerUIAny

      expect(Array.from(ui.skins.keys())).toEqual(['default', 'tech', 'nature'])
      expect(ui.currentSkin.name).toBe('默认皮肤')
      expect(container.querySelector('style')?.textContent).toContain('.player-container')
      expect(container.querySelector('.player-container')).not.toBeNull()
      expect(container.querySelector('.player-title')?.textContent).toBe('视频播放器')
      expect(container.querySelectorAll('button.player-btn')).toHaveLength(4)
      expect(container.querySelector('#volumeSlider')?.getAttribute('value')).toBe('70')
      // 皮肤脚本被注入容器
      expect(container.lastElementChild?.textContent).toContain('updatePlayerState')
    })

    it('支持通过选择器字符串定位容器', () => {
      const container = setupContainer()
      container.id = 'player-root'
      const ui = new PlayerUI('#player-root') as PlayerUIAny

      expect(ui.container).toBe(container)
      expect(container.querySelector('.player-container')).not.toBeNull()
    })
  })

  describe('皮肤切换', () => {
    it('切换到科技风与自然风时替换 DOM 并派发 skinApplied', () => {
      const container = setupContainer()
      const ui = new PlayerUI(container) as PlayerUIAny
      const listener = vi.fn()
      ui.on('skinApplied', listener)

      ui.switchSkin('tech')
      expect(ui.currentSkin.name).toBe('科技风皮肤')
      expect(container.querySelector('.player-title')?.textContent).toBe('科技风播放器')
      expect(listener).toHaveBeenLastCalledWith('tech')

      ui.switchSkin('nature')
      expect(ui.currentSkin.name).toBe('自然风皮肤')
      expect(container.querySelector('.player-title')?.textContent).toBe('自然风播放器')
      expect(listener).toHaveBeenLastCalledWith('nature')
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('应用不存在的皮肤时保持原状态并输出错误', () => {
      const container = setupContainer()
      const ui = new PlayerUI(container) as PlayerUIAny

      ui.applySkin('missing')

      expect(ui.currentSkin.name).toBe('默认皮肤')
      expect(errorSpy).toHaveBeenCalledWith('皮肤 missing 不存在')
    })

    it('支持注册并切换自定义皮肤', () => {
      const container = setupContainer()
      const ui = new PlayerUI(container) as PlayerUIAny

      ui.registerSkin('custom', {
        name: '自定义皮肤',
        css: '.player-container { color: red; }',
        html: '<div class="player-container"><span class="player-title">自定义播放器</span></div>',
        js: '',
      })

      ui.switchSkin('custom')

      expect(ui.skins.has('custom')).toBe(true)
      expect(container.querySelector('.player-title')?.textContent).toBe('自定义播放器')
      expect(container.querySelector('style')?.textContent).toContain('color: red')
    })
  })

  describe('updatePlayerState', () => {
    it('默认皮肤脚本可正常执行并更新时间显示', () => {
      const container = setupContainer()
      const ui = new PlayerUI(container) as PlayerUIAny

      expect(() => ui.updatePlayerState({ isPlaying: true, currentTime: 3, duration: 30 })).not.toThrow()
      expect(errorSpy).not.toHaveBeenCalled()
      expect(container.querySelector('#currentTime')?.textContent).toBe('00:03')
      expect(container.querySelector('#duration')?.textContent).toBe('00:30')
    })

    it('自定义皮肤可接管状态更新方法', () => {
      const container = setupContainer()
      const ui = new PlayerUI(container) as PlayerUIAny
      ui.registerSkin('stateful', {
        name: '有状态皮肤',
        css: '',
        html: '<div class="player-container"></div>',
        js: `this.updatePlayerState = (state) => { this.stateReceived = state; };`,
      })
      ui.switchSkin('stateful')

      const state = { isPlaying: true, currentTime: 12, duration: 120 }
      ui.updatePlayerState(state)

      expect(ui.stateReceived).toEqual(state)
    })

    it('无皮肤或无脚本时安全跳过', () => {
      const container = setupContainer()
      const ui = new PlayerUI(container) as PlayerUIAny
      ui.currentSkin = null

      expect(() => ui.updatePlayerState({ isPlaying: true })).not.toThrow()
      expect(errorSpy).not.toHaveBeenCalled()

      ui.currentSkin = { name: '无脚本' }
      expect(() => ui.updatePlayerState({ isPlaying: false })).not.toThrow()
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })

  describe('事件系统', () => {
    it('on 注册多个回调并按顺序触发，emit 未知事件安全忽略', () => {
      const container = setupContainer()
      const ui = new PlayerUI(container) as PlayerUIAny
      const first = vi.fn()
      const second = vi.fn()

      ui.on('play', first)
      ui.on('play', second)
      ui.emit('play', 'payload')
      ui.emit('unknown', 'ignored')

      expect(first).toHaveBeenCalledWith('payload')
      expect(second).toHaveBeenCalledWith('payload')
    })
  })
})
