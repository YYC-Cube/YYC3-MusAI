/**
 * @file VoiceCommandProcessor 单元测试
 * @description 覆盖意图匹配、参数提取、自动执行/确认模式、历史裁剪与事件
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VoiceCommandProcessor } from '../src'
import type { SpeechRecognitionResult } from '../src'

const speech = (transcript: string, confidence = 0.8): SpeechRecognitionResult => ({
  transcript,
  confidence,
  isFinal: true,
  alternatives: [],
  timestamp: Date.now(),
  language: 'zh-CN',
})

describe('VoiceCommandProcessor', () => {
  let processor: VoiceCommandProcessor

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    processor = new VoiceCommandProcessor()
  })

  afterEach(() => {
    processor.destroy()
    vi.restoreAllMocks()
  })

  describe('意图识别', () => {
    it('识别「创建弹窗」并自动执行', async () => {
      const command = await processor.processSpeechResult(speech('创建弹窗'))
      expect(command.intent).toBe('create_popup')
      expect(command.confidence).toBeCloseTo(1, 5)
      expect(command.executed).toBe(true)
      expect(command.result).toMatchObject({ success: true })
    })

    it('识别「关闭弹窗」意图（无弹窗时返回失败结果）', async () => {
      const command = await processor.processSpeechResult(speech('关闭弹窗'))
      expect(command.intent).toBe('close_popup')
      expect(command.executed).toBe(true)
      expect(command.result).toMatchObject({ success: false })
    })

    it('无法匹配的文本标记为 unknown', async () => {
      const command = await processor.processSpeechResult(speech('xyzzy plugh'))
      expect(command.intent).toBe('unknown')
      expect(command.confidence).toBe(0.3)
      expect(command.executed).toBe(false)
    })

    it('数字文本走简单意图识别', async () => {
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      const command = await local.processSpeechResult(speech('调到 5'))
      expect(command.intent).toBe('specify_number')
      expect(command.parameters.number).toBe(5)
      local.destroy()
    })

    it('方向词与颜色词可被识别', async () => {
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      const direction = await local.processSpeechResult(speech('向右移动一点'))
      expect(direction.intent).toBe('move_direction')
      expect(direction.parameters.direction).toBe('右')

      const color = await local.processSpeechResult(speech('改成蓝色'))
      expect(color.intent).toBe('set_color')
      expect(color.parameters.color).toBe('蓝')
      local.destroy()
    })

    it('关闭自动执行时不执行命令', async () => {
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      const command = await local.processSpeechResult(speech('创建弹窗'))
      expect(command.intent).toBe('create_popup')
      expect(command.executed).toBe(false)
      local.destroy()
    })

    it('requireConfirmation 时派发确认事件而不执行', async () => {
      const local = new VoiceCommandProcessor({ requireConfirmation: true })
      const listener = vi.fn()
      local.on('confirmation-required', listener)
      const command = await local.processSpeechResult(speech('创建弹窗'))
      expect(command.executed).toBe(false)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].text).toBe('确认执行吗？')
      local.destroy()
    })
  })

  describe('executeCommand', () => {
    it('未知意图执行时抛出异常', async () => {
      await expect(
        processor.executeCommand({
          id: 'cmd-x',
          text: 'x',
          intent: 'not-exists',
          confidence: 1,
          parameters: {},
          timestamp: Date.now(),
          executed: false,
        })
      ).rejects.toThrow('未知的意图')
    })

    it('自定义意图可执行并写入上下文', async () => {
      const action = vi.fn().mockResolvedValue({ ok: true })
      processor.addIntent({
        intent: 'custom_ping',
        patterns: [/ping/],
        description: '自检',
        example: ['ping'],
        action,
      })
      const executed = vi.fn()
      processor.on('command-executed', executed)

      const command = {
        id: 'cmd-1',
        text: 'ping',
        intent: 'custom_ping',
        confidence: 1,
        parameters: { a: 1 },
        timestamp: Date.now(),
        executed: false,
      }
      const result = await processor.executeCommand(command)

      expect(action).toHaveBeenCalledWith({ a: 1 })
      expect(result).toEqual({ ok: true })
      expect(command.executed).toBe(true)
      expect(executed).toHaveBeenCalledTimes(1)
      expect(processor.getContext()['last-custom_ping']).toMatchObject({ intent: 'custom_ping' })
    })
  })

  describe('历史、意图列表与事件', () => {
    it('命令历史最多保留 100 条', async () => {
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      for (let i = 0; i < 105; i += 1) {
        await local.processSpeechResult(speech('xyzzy plugh'))
      }
      const history = local.getCommandHistory()
      expect(history).toHaveLength(100)
      local.destroy()
    })

    it('getIntents 返回默认意图及其模式数量', () => {
      const intents = processor.getIntents()
      expect(intents.length).toBeGreaterThan(10)
      const createPopup = intents.find((i) => i.intent === 'create_popup')
      expect(createPopup?.patternCount).toBeGreaterThan(0)
      expect(createPopup?.example.length).toBeGreaterThan(0)
    })

    it('addIntent 派发 intent-added 事件', () => {
      const listener = vi.fn()
      processor.on('intent-added', listener)
      processor.addIntent({
        intent: 'x',
        patterns: [/x/],
        description: 'x',
        example: ['x'],
        action: async () => null,
      })
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].intent).toBe('x')
    })

    it('off 移除监听后不再收到事件', async () => {
      const listener = vi.fn()
      processor.on('command-recognized', listener)
      await processor.processSpeechResult(speech('创建弹窗'))
      expect(listener).toHaveBeenCalledTimes(1)

      processor.off('command-recognized', listener)
      await processor.processSpeechResult(speech('创建弹窗'))
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('clearContext 清空已执行命令的上下文', async () => {
      await processor.processSpeechResult(speech('创建弹窗'))
      expect(Object.keys(processor.getContext()).length).toBeGreaterThan(0)
      processor.clearContext()
      expect(processor.getContext()).toEqual({})
    })

    it('destroy 清空命令历史', async () => {
      await processor.processSpeechResult(speech('创建弹窗'))
      expect(processor.getCommandHistory()).toHaveLength(1)
      processor.destroy()
      expect(processor.getCommandHistory()).toEqual([])
    })
  })

  describe('默认命令实现', () => {
    it('布局/排列/智能体命令在无弹窗时返回失败结果', async () => {
      const grid = await processor.processSpeechResult(speech('网格布局'))
      expect(grid.intent).toBe('layout_grid')
      expect(grid.result).toMatchObject({ success: false, message: '没有弹窗可以应用布局' })

      const circular = await processor.processSpeechResult(speech('圆形布局'))
      expect(circular.intent).toBe('layout_circular')
      expect(circular.result).toMatchObject({ success: false, message: '没有弹窗可以应用布局' })

      const arrange = await processor.processSpeechResult(speech('排列弹窗'))
      expect(arrange.intent).toBe('arrange_popups')
      expect(arrange.result).toMatchObject({ success: false, message: '没有弹窗可以排列' })

      const agent = await processor.processSpeechResult(speech('创建智能体'))
      expect(agent.intent).toBe('create_agent')
      expect(agent.result).toMatchObject({ success: false, message: '没有弹窗可以绑定智能体' })

      const ask = await processor.processSpeechResult(speech('咨询助手'))
      expect(ask.intent).toBe('ask_agent')
      expect(ask.result).toMatchObject({ success: false, message: '没有可用的助手智能体' })
    })

    it('帮助与清空命令返回成功结果', async () => {
      const help = await processor.processSpeechResult(speech('帮助'))
      expect(help.intent).toBe('help')
      expect(help.result).toMatchObject({ success: true, type: 'help' })
      expect(help.result.message).toContain('可用语音命令')

      const clear = await processor.processSpeechResult(speech('清空所有'))
      expect(clear.intent).toBe('clear_all')
      expect(clear.result).toMatchObject({ success: true, clearedPopups: 0, clearedAgents: 0 })
    })

    it('控制/确认/取消/导航命令返回对应动作', async () => {
      const cases: Array<[string, string, string]> = [
        ['开始语音', 'start_voice', 'start_voice'],
        ['停止语音', 'stop_voice', 'stop_voice'],
        ['确认', 'confirm', 'confirm'],
        ['取消', 'cancel', 'cancel'],
        ['返回', 'go_back', 'go_back'],
        ['首页', 'go_home', 'go_home'],
      ]

      for (const [text, intent, action] of cases) {
        const command = await processor.processSpeechResult(speech(text))
        expect(command.intent).toBe(intent)
        expect(command.result).toEqual({ action })
        expect(command.executed).toBe(true)
      }
    })

    it('置信度不足时不自动执行', async () => {
      const command = await processor.processSpeechResult(speech('创建弹窗', 0.1))
      expect(command.intent).toBe('create_popup')
      expect(command.confidence).toBeCloseTo(0.3, 5)
      expect(command.executed).toBe(false)
    })

    it('意图参数按定义从文本中提取', async () => {
      processor.addIntent({
        intent: 'play_song',
        patterns: [/播放(.*)/],
        parameters: { name: '播放(.+)' },
        description: '播放歌曲',
        example: ['播放晴天'],
        action: async (params) => params,
      })

      const command = await processor.processSpeechResult(speech('播放晴天'))
      expect(command.intent).toBe('play_song')
      expect(command.parameters).toEqual({ name: '晴天' })
      expect(command.result).toEqual({ name: '晴天' })
    })

    it('意图动作抛错时派发 command-failed 并向上抛出', async () => {
      processor.addIntent({
        intent: 'boom',
        patterns: [/boom/],
        description: '抛错',
        example: ['boom'],
        action: async () => {
          throw new Error('kaboom')
        },
      })
      const failed = vi.fn()
      processor.on('command-failed', failed)

      await expect(
        processor.executeCommand({
          id: 'cmd-boom',
          text: 'boom',
          intent: 'boom',
          confidence: 1,
          parameters: {},
          timestamp: Date.now(),
          executed: false,
        })
      ).rejects.toThrow('kaboom')

      expect(failed).toHaveBeenCalledTimes(1)
      expect(failed.mock.calls[0][0].error).toBe('kaboom')
    })

    it('上下文最多保留 20 条记录', async () => {
      for (let i = 0; i < 21; i += 1) {
        const intent = `ctx_${i}`
        processor.addIntent({
          intent,
          patterns: [new RegExp(intent)],
          description: intent,
          example: [],
          action: async () => ({ index: i }),
        })
        await processor.executeCommand({
          id: `cmd-${i}`,
          text: intent,
          intent,
          confidence: 1,
          parameters: {},
          timestamp: Date.now(),
          executed: false,
        })
      }

      const context = processor.getContext()
      expect(Object.keys(context)).toHaveLength(20)
      expect(context['last-ctx_0']).toBeUndefined()
      expect(context['last-ctx_20']).toBeDefined()
    })
  })

  describe('学习与持久化', () => {
    it('重复的简单意图在学习三次后生成新模式', async () => {
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })

      await local.processSpeechResult(speech('调到 5'))
      await local.processSpeechResult(speech('调到 6'))
      await local.processSpeechResult(speech('调到 7'))

      const learned = local.getIntents().find((i) => i.intent === 'specify_number')
      expect(learned).toBeDefined()
      expect(learned?.description).toContain('学习到的意图')
      expect(learned?.patternCount).toBeGreaterThan(0)
      local.destroy()
    })

    it('学习数据每累计 10 条写入 localStorage', async () => {
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      const prefixes = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

      for (let i = 0; i < 10; i += 1) {
        await local.processSpeechResult(speech(`${prefixes[i]} ${i + 1}`))
      }

      const saved = JSON.parse(localStorage.getItem('voice_command_learning') || '[]')
      expect(saved).toHaveLength(10)
      expect(saved[0]).toMatchObject({ intent: 'specify_number' })
      local.destroy()
    })

    it('关闭学习时不写入学习数据', async () => {
      const local = new VoiceCommandProcessor({ enableAutoExecution: false, enableLearning: false })
      await local.processSpeechResult(speech('调到 5'))
      await local.processSpeechResult(speech('调到 6'))
      await local.processSpeechResult(speech('调到 7'))

      expect(local.getIntents().some((i) => i.intent === 'specify_number')).toBe(false)
      expect(JSON.parse(localStorage.getItem('voice_command_learning') || '[]')).toEqual([])
      local.destroy()
    })

    it('构造时从 localStorage 恢复学习数据', () => {
      localStorage.setItem(
        'voice_command_learning',
        JSON.stringify([{ text: '旧命令', intent: 'old', parameters: {}, timestamp: 1 }])
      )
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      local.destroy()

      const saved = JSON.parse(localStorage.getItem('voice_command_learning') || '[]')
      expect(saved[0]).toMatchObject({ text: '旧命令', intent: 'old' })
    })

    it('读取学习数据异常时回退为空数组', () => {
      const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied')
      })

      let local: VoiceCommandProcessor | undefined
      expect(() => {
        local = new VoiceCommandProcessor()
      }).not.toThrow()

      expect(console.error).toHaveBeenCalledWith('加载学习数据失败:', expect.anything())
      getItem.mockRestore()
      local!.destroy()
    })

    it('保存学习数据异常时记录错误但不抛出', async () => {
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota')
      })
      const prefixes = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

      for (let i = 0; i < 10; i += 1) {
        await local.processSpeechResult(speech(`${prefixes[i]} ${i + 1}`))
      }

      expect(console.error).toHaveBeenCalledWith('保存学习数据失败:', expect.anything())
      setItem.mockRestore()
      local.destroy()
    })
  })

  describe('AI 意图识别降级', () => {
    class AssistantAgent {
      config = { id: 'assistant-1' }
      handleMessage = vi.fn()
    }

    it('助手智能体返回结果时采用 AI 意图并记录学习', async () => {
      const agent = new AssistantAgent()
      agent.handleMessage.mockResolvedValue({
        success: true,
        data: { intent: 'ai_intent', parameters: { foo: 'bar' }, confidence: 0.95 },
      })
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      ;(local as any).agentManager = { getAllAgents: () => [agent] }

      const command = await local.processSpeechResult(speech('今晚听点什么'))

      expect(agent.handleMessage).toHaveBeenCalledTimes(1)
      expect(command.intent).toBe('ai_intent')
      expect(command.parameters).toEqual({ foo: 'bar' })
      expect(command.confidence).toBe(0.95)
      expect(command.executed).toBe(false)
      local.destroy()
    })

    it('AI 返回失败时降级到简单意图识别', async () => {
      const agent = new AssistantAgent()
      agent.handleMessage.mockResolvedValue({ success: false })
      const local = new VoiceCommandProcessor({ enableAutoExecution: false })
      ;(local as any).agentManager = { getAllAgents: () => [agent] }

      const command = await local.processSpeechResult(speech('调到 9'))

      expect(agent.handleMessage).toHaveBeenCalledTimes(1)
      expect(command.intent).toBe('specify_number')
      expect(command.parameters.number).toBe(9)
      local.destroy()
    })

    it('AI 识别抛错时记录错误并标记 unknown', async () => {
      ;(processor as any).agentManager = {
        getAllAgents: () => {
          throw new Error('agent down')
        },
      }

      const command = await processor.processSpeechResult(speech('xyzzy plugh'))

      expect(command.intent).toBe('unknown')
      expect(console.error).toHaveBeenCalledWith('AI意图识别失败:', expect.anything())
    })

    it('off 对未注册回调与其他事件安全', async () => {
      const listener = vi.fn()
      processor.on('command-recognized', listener)
      processor.off('command-recognized', vi.fn())
      processor.off('missing-event', listener)

      await processor.processSpeechResult(speech('创建弹窗'))
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })
})

describe('VoiceCommandProcessor 弹窗实现链路与多语言命令（W5 补流）', () => {
  let processor: VoiceCommandProcessor

  type AnyRec = Record<string, any>

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    processor = new VoiceCommandProcessor()
  })

  afterEach(() => {
    processor.destroy()
    vi.restoreAllMocks()
  })

  /** 注入可控的弹窗管理器桩 */
  function stubPopupManager(over: AnyRec = {}) {
    const stub = {
      createPopup: vi.fn(async () => ({ id: 'pop-1', zIndex: 3 })),
      getAllPopups: vi.fn(() => [
        { id: 'pop-top', zIndex: 20 },
        { id: 'pop-low', zIndex: 5 },
      ]),
      closePopup: vi.fn(() => true),
      cascadePopups: vi.fn(async () => {}),
      ...over,
    }
    ;(processor as any).popupManager = stub
    return stub
  }

  /** 注入可控的智能体管理器桩 */
  function stubAgentManager(over: AnyRec = {}) {
    const stub = {
      getAllAgents: vi.fn(() => []),
      createAgentForPopup: vi.fn(async () => ({ config: { id: 'agent-9' } })),
      removeAgent: vi.fn(),
      ...over,
    }
    ;(processor as any).agentManager = stub
    return stub
  }

  it('带 popupId 的关闭命令：成功与失败分支', async () => {
    const stub = stubPopupManager()
    const result = await processor.executeCommand({
      id: 'cmd-close-1',
      text: '关闭指定弹窗',
      intent: 'close_popup',
      confidence: 1,
      parameters: { popupId: 'pop-low' },
      timestamp: Date.now(),
      executed: false,
    })
    expect(stub.closePopup).toHaveBeenCalledWith('pop-low')
    expect(result).toEqual({ success: true, message: '弹窗已关闭' })

    stub.closePopup.mockReturnValue(false)
    const failed = await processor.executeCommand({
      id: 'cmd-close-2',
      text: '关闭指定弹窗',
      intent: 'close_popup',
      confidence: 1,
      parameters: { popupId: 'ghost' },
      timestamp: Date.now(),
      executed: false,
    })
    expect(failed).toEqual({ success: false, message: '弹窗关闭失败' })
  })

  it('真实弹窗桩（无 popups）下 closePopup 走管理器返回失败', async () => {
    // 不注入桩：使用模块内置占位弹窗管理器（getAllPopups 恒为空数组）
    const result = await processor.executeCommand({
      id: 'cmd-close-3',
      text: '关闭指定弹窗',
      intent: 'close_popup',
      confidence: 1,
      parameters: { popupId: 'anything' },
      timestamp: Date.now(),
      executed: false,
    })
    expect(result).toEqual({ success: false, message: '没有弹窗可以关闭' })
  })

  it('无 popupId 时关闭 zIndex 最高的弹窗', async () => {
    const stub = stubPopupManager()
    const result = await processor.executeCommand({
      id: 'cmd-close-4',
      text: '关闭弹窗',
      intent: 'close_popup',
      confidence: 1,
      parameters: {},
      timestamp: Date.now(),
      executed: false,
    })
    expect(stub.closePopup).toHaveBeenCalledWith('pop-top')
    expect(result).toEqual({ success: true, popupId: 'pop-top', message: '弹窗已关闭' })
  })

  it('排列弹窗成功时级联排列并返回数量', async () => {
    const stub = stubPopupManager()
    const command = await processor.processSpeechResult(speech('排列弹窗'))
    expect(command.result).toMatchObject({ success: true, popupCount: 2, message: '已排列 2 个弹窗' })
    expect(stub.cascadePopups).toHaveBeenCalledTimes(1)
  })

  it('网格/圆形布局有弹窗时走默认级联布局', async () => {
    stubPopupManager()
    const grid = await processor.processSpeechResult(speech('网格布局'))
    expect(grid.result).toMatchObject({ success: true, layout: 'grid', popupCount: 2 })

    const circular = await processor.processSpeechResult(speech('圆形布局'))
    expect(circular.result).toMatchObject({ success: true, layout: 'circular', popupCount: 2 })
  })

  it('布局智能体存在时接管布局命令', async () => {
    stubPopupManager()
    const handleMessage = vi.fn(async (msg: AnyRec) => ({
      handled: true,
      strategy: msg.payload.parameters.strategy,
    }))
    stubAgentManager({
      getAllAgents: () => [new (class LayoutAgent { config = { id: 'layout-1' }; handleMessage = handleMessage })()],
    })

    const command = await processor.processSpeechResult(speech('网格布局'))
    expect(handleMessage).toHaveBeenCalledTimes(1)
    expect(command.result).toMatchObject({ handled: true, strategy: 'grid' })
  })

  it('创建智能体：params.type 优先、缺省 assistant、成功与失败分支', async () => {
    const agents = stubAgentManager()
    stubPopupManager()

    // 缺省 type → assistant，绑定到 zIndex 最高的弹窗
    const created = await processor.executeCommand({
      id: 'cmd-agent-1',
      text: '创建智能体',
      intent: 'create_agent',
      confidence: 1,
      parameters: {},
      timestamp: Date.now(),
      executed: false,
    })
    expect(agents.createAgentForPopup).toHaveBeenCalledWith('pop-top', 'assistant')
    expect(created).toMatchObject({ success: true, agentId: 'agent-9', popupId: 'pop-top', agentType: 'assistant' })

    // 显式 type
    agents.createAgentForPopup.mockClear()
    await processor.executeCommand({
      id: 'cmd-agent-2',
      text: '创建智能体',
      intent: 'create_agent',
      confidence: 1,
      parameters: { type: 'layout' },
      timestamp: Date.now(),
      executed: false,
    })
    expect(agents.createAgentForPopup).toHaveBeenCalledWith('pop-top', 'layout')

    // 创建失败 → catch 分支
    agents.createAgentForPopup.mockRejectedValue(new Error('no slot'))
    const failed = await processor.executeCommand({
      id: 'cmd-agent-3',
      text: '创建智能体',
      intent: 'create_agent',
      confidence: 1,
      parameters: {},
      timestamp: Date.now(),
      executed: false,
    })
    expect(failed).toMatchObject({ success: false, message: '智能体创建失败: no slot' })
  })

  it('未注入智能体桩时创建智能体走内置占位并捕获异常', async () => {
    stubPopupManager()
    const failed = await processor.executeCommand({
      id: 'cmd-agent-4',
      text: '创建智能体',
      intent: 'create_agent',
      confidence: 1,
      parameters: {},
      timestamp: Date.now(),
      executed: false,
    })
    expect(failed).toMatchObject({ success: false })
    expect(String((failed as AnyRec).message)).toContain('智能体创建失败')
  })

  it('ask_agent 命中助手智能体时透传提问', async () => {
    stubPopupManager()
    const handleMessage = vi.fn(async (msg: AnyRec) => ({
      success: true,
      data: { answer: `回复：${msg.payload.parameters.message}` },
    }))
    stubAgentManager({
      getAllAgents: () => [new (class AssistantAgent { config = { id: 'assistant-2' }; handleMessage = handleMessage })()],
    })

    const command = await processor.processSpeechResult(speech('咨询助手'))
    expect(command.result).toMatchObject({ success: true, data: { answer: '回复：帮助' } })
  })

  it('clear_all 关闭全部弹窗并移除智能体', async () => {
    const popupStub = stubPopupManager()
    const agents = stubAgentManager({
      getAllAgents: () => [{ popup: { id: 'pop-top' } }, { popup: undefined }],
    })

    const command = await processor.processSpeechResult(speech('清空所有'))
    expect(command.result).toMatchObject({ success: true, clearedPopups: 2, clearedAgents: 2 })
    expect(popupStub.closePopup).toHaveBeenCalledWith('pop-top')
    expect(popupStub.closePopup).toHaveBeenCalledWith('pop-low')
    expect(agents.removeAgent).toHaveBeenCalledWith('pop-top')
    expect(agents.removeAgent).toHaveBeenCalledWith(undefined)
  })

  it('创建弹窗动作把标题/位置/尺寸参数传给弹窗管理器', async () => {
    const stub = stubPopupManager()
    const result = await processor.executeCommand({
      id: 'cmd-create-1',
      text: '创建弹窗',
      intent: 'create_popup',
      confidence: 1,
      parameters: { title: '调音台', x: 40, y: 60, width: 320, height: 240 },
      timestamp: Date.now(),
      executed: false,
    })
    expect(stub.createPopup).toHaveBeenCalledWith({
      title: '调音台',
      content: '语音创建的弹窗',
      position: { x: 40, y: 60 },
      size: { width: 320, height: 240 },
    })
    expect(result).toMatchObject({ success: true, popupId: 'pop-1' })
  })

  it('AI 学习的意图积累三次后生成默认动作并可执行', async () => {
    const local = new VoiceCommandProcessor({ enableAutoExecution: false })
    ;(local as any).agentManager = {
      getAllAgents: () => [
        new (class AssistantAgent {
          config = { id: 'assistant-3' }
          handleMessage = vi.fn(async () => ({
            success: true,
            data: { intent: 'swipe_gesture', parameters: {}, confidence: 0.9 },
          }))
        })(),
      ],
    }

    await local.processSpeechResult(speech('swipe left now'))
    await local.processSpeechResult(speech('swipe right now'))
    await local.processSpeechResult(speech('swipe up now'))

    // 相似文本出现三次 → 学习到新模式（默认动作，意图原本不存在）
    const learned = local.getIntents().find((i) => i.intent === 'swipe_gesture')
    expect(learned).toBeDefined()
    expect(learned?.description).toContain('学习到的意图: swipe_gesture')

    // 匹配学习到的模式 → 走默认动作返回成功
    const command = await local.processSpeechResult(speech('swipe down now'))
    expect(command.intent).toBe('swipe_gesture')
    const result = await local.executeCommand(command)
    expect(result).toMatchObject({ success: true, intent: 'swipe_gesture', message: '执行学习到的意图: swipe_gesture' })
    local.destroy()
  })

  it('学习已存在意图时复用既有动作', async () => {
    const local = new VoiceCommandProcessor({ enableAutoExecution: false })
    ;(local as any).agentManager = {
      getAllAgents: () => [
        new (class AssistantAgent {
          config = { id: 'assistant-4' }
          handleMessage = vi.fn(async () => ({
            success: true,
            data: { intent: 'help', parameters: {}, confidence: 0.9 },
          }))
        })(),
      ],
    }

    await local.processSpeechResult(speech('please help me now'))
    await local.processSpeechResult(speech('help me please'))
    await local.processSpeechResult(speech('help the user'))

    const learned = local.getIntents().filter((i) => i.intent === 'help')
    expect(learned.length).toBeGreaterThanOrEqual(2)
    expect(learned.at(-1)?.description).toContain('学习到的意图: help')
    local.destroy()
  })

  it('关闭学习时 AI 意图不入学习库', async () => {
    const local = new VoiceCommandProcessor({ enableAutoExecution: false, enableLearning: false })
    ;(local as any).agentManager = {
      getAllAgents: () => [
        new (class AssistantAgent {
          config = { id: 'assistant-5' }
          handleMessage = vi.fn(async () => ({
            success: true,
            data: { intent: 'ai_only', parameters: {}, confidence: 0.9 },
          }))
        })(),
      ],
    }

    const command = await local.processSpeechResult(speech('这句话完全新'))
    expect(command.intent).toBe('ai_only')
    expect((local as any).learningData).toHaveLength(0)
    local.destroy()
  })

  it('AI 响应缺 data 时降级到简单意图识别', async () => {
    // specify_number 并非注册意图，自动执行会抛「未知的意图」；关闭自动执行仅验证识别降级
    const local = new VoiceCommandProcessor({ enableAutoExecution: false })
    ;(local as any).agentManager = {
      getAllAgents: () => [
        new (class AssistantAgent {
          config = { id: 'assistant-6' }
          handleMessage = vi.fn(async () => ({ success: true }))
        })(),
      ],
    }

    const command = await local.processSpeechResult(speech('调到 9'))
    expect(command.intent).toBe('specify_number')
    expect(command.parameters.number).toBe(9)
    local.destroy()
  })

  it('多语言命令：英文大小写不敏感匹配并执行', async () => {
    const action = vi.fn(async (params: AnyRec) => ({ played: true, ...params }))
    processor.addIntent({
      intent: 'play_music',
      patterns: [/play\s+.*\s*music/],
      description: 'Play music',
      example: ['play some music'],
      action,
    })

    const command = await processor.processSpeechResult(speech('PLAY some MUSIC'))
    expect(command.intent).toBe('play_music')
    expect(command.executed).toBe(true)
    expect(command.result).toEqual({ played: true })
    expect(action).toHaveBeenCalledWith({})
  })

  it('多语言命令：纯英文无匹配时标记 unknown', async () => {
    const command = await processor.processSpeechResult(speech('lorem ipsum dolor'))
    expect(command.intent).toBe('unknown')
    expect(command.confidence).toBe(0.3)
    expect(command.executed).toBe(false)
  })
})
