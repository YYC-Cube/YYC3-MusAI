/**
 * @file VoiceCommandProcessor 单元测试
 * @description 覆盖意图匹配、参数提取、自动执行/确认模式、历史裁剪与事件
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VoiceCommandProcessor } from '../src/VoiceCommandProcessor'
import type { SpeechRecognitionResult } from '../src/SpeechRecognitionEngine'

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
