/**
 * @file VoiceContextManager 单元测试
 * @description 覆盖上下文创建/切换/合并、规则与实体提取、意图理解与统计
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VoiceContextManager } from '../src'

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

describe('VoiceContextManager 过期清理与规则分支（W5 补流）', () => {
  let manager: VoiceContextManager

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    manager = new VoiceContextManager()
  })

  afterEach(() => {
    manager.destroy()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('过期且轮次少于 3 的上下文被定时清理并派发事件', () => {
    const cleaned = vi.fn()
    manager.on('context-cleaned', cleaned)
    const id = manager.createContext()

    // 每分钟检查一次；推进到超过 5 分钟超时
    vi.advanceTimersByTime(360_000)

    expect(manager.getAllContexts()).toHaveLength(0)
    expect(cleaned).toHaveBeenCalledTimes(1)
    expect(cleaned.mock.calls[0][0]).toMatchObject({ contextId: id, reason: 'timeout' })
    expect(console.log).toHaveBeenCalledWith('清理了 1 个旧上下文')
  })

  it('多次交互（轮次 >= 3）的上下文不会被清理', () => {
    const id = manager.createContext()
    manager.addToContext(id, 'user', '你好')
    manager.addToContext(id, 'user', '创建弹窗')
    manager.addToContext(id, 'user', '要 3 个')

    vi.advanceTimersByTime(360_000)

    expect(manager.getAllContexts()).toHaveLength(1)
    expect(manager.getCurrentContext()?.id).toBe(id)
    expect(console.log).not.toHaveBeenCalledWith('清理了 1 个旧上下文')
  })

  it('方向、颜色与提问规则更新状态并影响意图与建议', () => {
    const id = manager.createContext()
    manager.addToContext(id, 'user', '向左滑动')
    expect(manager.getContext(id)?.state.direction).toBe('左')

    manager.addToContext(id, 'user', '背景换成红色')
    expect(manager.getContext(id)?.state.color).toBe('红')

    manager.addToContext(id, 'user', '这是什么？')
    expect(manager.getContext(id)?.topic).toBe('question')
    expect(manager.getContext(id)?.state.isQuestion).toBe(true)

    const result = manager.understandIntent('还有别的吗？')
    expect(result?.intent).toBe('question')
    expect(result?.suggestions).toContain('您可以问关于弹窗、布局或智能体的问题')

    // 方向与颜色进入建议（最多 3 条）
    const guided = manager.understandIntent('继续')
    expect(guided?.suggestions.some((s) => s.includes('左方向'))).toBe(true)
    expect(guided?.suggestions.some((s) => s.includes('红色'))).toBe(true)
    expect(guided!.suggestions.length).toBeLessThanOrEqual(3)
  })

  it('时间与日期实体按模式提取（类型取提取器键）', () => {
    const id = manager.createContext()
    const ctx = manager.addToContext(id, 'user', '明天 2026年11月21日 11月21日 3:30 开 10 分钟会，马上开始')

    // 实体外层 type 为提取器键（time/date/number），内部模式差异体现在 value 上
    const types = new Set(ctx?.entities.map((e) => e.type))
    expect(types.has('time')).toBe(true)
    expect(types.has('date')).toBe(true)
    expect(types.has('number')).toBe(true)

    const dateValues = ctx?.entities.filter((e) => e.type === 'date').map((e) => e.value)
    expect(dateValues).toContain('明天') // relative_date
    expect(dateValues).toContain('2026年11月21日') // absolute_date
    expect(dateValues?.filter((v) => v === '11月21日')).toHaveLength(2) // month_day

    const timeValues = ctx?.entities.filter((e) => e.type === 'time').map((e) => e.value)
    expect(timeValues).toContain('3:30')
    expect(timeValues).toContain('10 分钟')
    expect(timeValues).toContain('马上')
  })

  it('实体数量超过 20 时裁剪到 20', () => {
    const id = manager.createContext()
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1).join(' ')
    const ctx = manager.addToContext(id, 'user', numbers)
    expect(ctx?.entities).toHaveLength(20)
    // 裁剪保留末尾（高索引）实体
    expect(ctx?.entities.at(-1)?.value).toBe(25)
  })

  it('规则动作抛错时记录错误且不影响其他规则', () => {
    manager.addContextRule({
      pattern: /爆炸/,
      action: () => {
        throw new Error('rule boom')
      },
      priority: 0,
    })
    const id = manager.createContext()
    const ctx = manager.addToContext(id, 'user', '爆炸了 好讨厌')
    expect(console.error).toHaveBeenCalledWith('应用上下文规则失败:', expect.any(Error))
    // 抛错规则之后的其他规则（情感词不落 state，但命令规则等）仍执行
    expect(ctx?.metadata.turnCount).toBe(1)
  })

  it('close_popup 意图与 popupCount 建议分支', () => {
    const id = manager.createContext()
    const ctx = manager.getContext(id)!
    ctx.topic = 'popup'
    ctx.state.action = '关闭'
    expect(manager.understandIntent('关闭弹窗')?.intent).toBe('close_popup')
    expect(manager.understandIntent('关闭弹窗')?.suggestions).toContain(
      '您要关闭所有弹窗还是特定弹窗？',
    )

    ctx.state.action = '创建'
    ctx.state.popupCount = 3
    const result = manager.understandIntent('创建弹窗')
    expect(result?.intent).toBe('create_popup')
    expect(result?.suggestions).toContain('您要创建3个弹窗吗？')
  })

  it('无任何上下文时统计平均轮次为 0', () => {
    const stats = manager.getContextStatistics()
    expect(stats.totalContexts).toBe(0)
    expect(stats.activeContexts).toBe(0)
    expect(stats.totalTurns).toBe(0)
    expect(stats.averageTurns).toBe(0)
    expect(manager.getContextSummary()).toBeNull()
  })
})
