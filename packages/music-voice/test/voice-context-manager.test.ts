/**
 * @file VoiceContextManager 单元测试
 * @description 覆盖上下文创建/切换/合并、规则与实体提取、意图理解与统计
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VoiceContextManager } from '../src/VoiceContextManager'

describe('VoiceContextManager', () => {
  let manager: VoiceContextManager

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    manager = new VoiceContextManager()
  })

  afterEach(() => {
    manager.destroy()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('上下文生命周期', () => {
    it('创建上下文后成为当前上下文', () => {
      const id = manager.createContext('en-US')
      expect(id).toMatch(/^context-/)
      expect(manager.getCurrentContext()?.id).toBe(id)
      expect(manager.getContext(id)).toMatchObject({ language: 'en-US', topic: 'general' })
    })

    it('未创建上下文时 getContext 返回 null', () => {
      expect(manager.getContext()).toBeNull()
      expect(manager.getCurrentContext()).toBeNull()
    })

    it('切换到不存在的上下文返回 false', () => {
      const id = manager.createContext()
      expect(manager.switchContext('missing')).toBe(false)
      expect(manager.getCurrentContext()?.id).toBe(id)
    })

    it('可在多个上下文之间切换', () => {
      const a = manager.createContext()
      const b = manager.createContext('ja-JP')
      expect(manager.switchContext(a)).toBe(true)
      expect(manager.getCurrentContext()?.id).toBe(a)
      expect(manager.getAllContexts()).toHaveLength(2)
      expect(manager.getContext(b)?.language).toBe('ja-JP')
    })
  })

  describe('对话历史与规则', () => {
    it('向不存在的上下文追加历史返回 null', () => {
      expect(manager.addToContext('missing', 'user', '你好')).toBeNull()
    })

    it('用户发言会累计轮次与历史', () => {
      const id = manager.createContext()
      const ctx = manager.addToContext(id, 'user', '你好，很高兴见到你')
      expect(ctx?.history).toHaveLength(1)
      expect(ctx?.metadata.turnCount).toBe(1)
      expect(ctx?.topic).toBe('greeting')
      expect(ctx?.state.greetingCount).toBe(1)
    })

    it('弹窗关键词触发 popup 主题并记录提及，后续数字补充数量', () => {
      const id = manager.createContext()
      const first = manager.addToContext(id, 'user', '帮我创建弹窗')
      expect(first?.topic).toBe('popup')
      expect(first?.state.popupMentions).toHaveLength(1)

      const second = manager.addToContext(id, 'user', '要 3 个')
      expect(second?.state.popupCount).toBe(3)
      expect(second?.state.popupMentions).toHaveLength(1)
    })

    it('布局关键词触发 layout 主题', () => {
      const id = manager.createContext()
      const ctx = manager.addToContext(id, 'user', '把窗口改成网格排列')
      expect(ctx?.topic).toBe('layout')
      expect(ctx?.state.layoutType).toBe('网格')
    })

    it('系统消息不触发规则与实体提取', () => {
      const id = manager.createContext()
      const ctx = manager.addToContext(id, 'system', '你好')
      expect(ctx?.topic).toBe('general')
      expect(ctx?.metadata.turnCount).toBe(1)
    })

    it('自定义实体提取器可注入实体', () => {
      manager.addEntityExtractor('song', (text) =>
        text.includes('歌') ? [{ value: 'song-1', confidence: 0.9 }] : []
      )
      const id = manager.createContext()
      const ctx = manager.addToContext(id, 'user', '播放这首歌')
      expect(ctx?.entities[0]).toMatchObject({ type: 'song', value: 'song-1', confidence: 0.9 })
    })

    it('历史记录最多保留 50 条', () => {
      const id = manager.createContext()
      for (let i = 0; i < 60; i += 1) manager.addToContext(id, 'assistant', `m${i}`)
      expect(manager.getContext(id)?.history).toHaveLength(50)
      expect(manager.getContext(id)?.history[49].content).toBe('m59')
    })
  })

  describe('意图理解', () => {
    it('问候上下文识别为 greeting', () => {
      const id = manager.createContext()
      manager.addToContext(id, 'user', '你好')
      const result = manager.understandIntent('你好呀')
      expect(result?.intent).toBe('greeting')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.8)
      expect(result?.context.id).toBe(id)
    })

    it('弹窗上下文结合动作状态识别创建意图', () => {
      const id = manager.createContext()
      const ctx = manager.getContext(id)!
      ctx.topic = 'popup'
      ctx.state.action = '创建'
      manager.addToContext(id, 'user', '创建弹窗')
      expect(manager.understandIntent('创建弹窗')?.intent).toBe('create_popup')
    })

    it('布局上下文识别为 arrange_popups', () => {
      const id = manager.createContext()
      const ctx = manager.getContext(id)!
      ctx.topic = 'layout'
      expect(manager.understandIntent('排列一下')?.intent).toBe('arrange_popups')
    })

    it('上下文不存在时返回 null', () => {
      expect(manager.understandIntent('你好')).toBeNull()
    })
  })

  describe('上下文字段与统计', () => {
    it('getContextSummary 汇总主题/轮次/实体数', () => {
      const id = manager.createContext()
      manager.addToContext(id, 'user', '你好')
      const summary = manager.getContextSummary(id)
      expect(summary).toMatchObject({ topic: 'greeting', turnCount: 1, entityCount: 0 })
      expect(manager.getContextSummary('missing')).toBeNull()
    })

    it('getRelatedContexts 按主题过滤并按评分返回', () => {
      const a = manager.createContext()
      const b = manager.createContext()
      manager.getContext(a)!.topic = 'popup'
      manager.getContext(b)!.topic = 'layout'
      const related = manager.getRelatedContexts('popup')
      expect(related).toHaveLength(1)
      expect(related[0].id).toBe(a)
    })

    it('getContextStatistics 统计总数/活跃数/平均轮次', () => {
      const a = manager.createContext()
      manager.createContext()
      manager.addToContext(a, 'user', '你好')
      const stats = manager.getContextStatistics()
      expect(stats.totalContexts).toBe(2)
      expect(stats.activeContexts).toBe(2)
      expect(stats.totalTurns).toBe(1)
      expect(stats.averageTurns).toBe(0.5)
      expect(stats.topics.greeting).toBe(1)
    })
  })

  describe('上下文合并', () => {
    it('合并历史、实体与状态并删除源上下文', () => {
      const source = manager.createContext()
      const target = manager.createContext()
      manager.addToContext(source, 'user', '你好')
      manager.addToContext(target, 'user', '创建弹窗')

      const sourceCtx = manager.getContext(source)!
      sourceCtx.entities.push({ type: 'test', value: 'v', confidence: 0.9, timestamp: Date.now() })

      expect(manager.mergeContexts(source, target)).toBe(true)
      expect(manager.getContext(source)).toBeNull()
      const merged = manager.getContext(target)!
      expect(merged.history).toHaveLength(2)
      expect(merged.entities.some((e) => e.type === 'test')).toBe(true)
    })

    it('任一上下文缺失时合并失败', () => {
      const id = manager.createContext()
      expect(manager.mergeContexts(id, 'missing')).toBe(false)
      expect(manager.mergeContexts('missing', id)).toBe(false)
    })
  })

  describe('事件与销毁', () => {
    it('创建/更新上下文会派发事件，off 后不再触发', () => {
      const created = vi.fn()
      const updated = vi.fn()
      manager.on('context-created', created)
      manager.on('context-updated', updated)
      const id = manager.createContext()
      manager.addToContext(id, 'user', '你好')
      expect(created).toHaveBeenCalledTimes(1)
      expect(updated).toHaveBeenCalledTimes(1)

      manager.off('context-updated', updated)
      manager.addToContext(id, 'user', '再次问候')
      expect(updated).toHaveBeenCalledTimes(1)
    })

    it('destroy 清空上下文与规则', () => {
      manager.createContext()
      manager.destroy()
      expect(manager.getAllContexts()).toEqual([])
      expect(manager.getCurrentContext()).toBeNull()
    })
  })
})
