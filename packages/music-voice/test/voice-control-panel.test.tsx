/**
 * @file VoiceControlPanel 组件测试
 * @description 使用真实引擎 + 局部浏览器 API mock，覆盖初始渲染、录音开关、
 *              识别结果展示、语音播报、语言切换、上下文/高级面板、命令历史与销毁。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { VoiceControlPanel } from '../src/components/VoiceControlPanel'
import {
  installMicrophoneEnv,
  installRecognitionEnv,
  installSynthesisEnv,
  type MicEnv,
  type RecognitionEnv,
  type SynthesisEnv,
} from './helpers/voice-env'

/** 构造引擎可消费的 SpeechRecognitionEvent 形状 */
const recognitionEvent = (transcript: string, confidence: number, isFinal: boolean) => ({
  results: [Object.assign([{ transcript, confidence }], { isFinal })],
})

describe('VoiceControlPanel', () => {
  let mic: MicEnv
  let recognitionEnv: RecognitionEnv
  let synthesisEnv: SynthesisEnv

  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mic = installMicrophoneEnv()
    recognitionEnv = installRecognitionEnv()
    synthesisEnv = installSynthesisEnv()
  })

  afterEach(() => {
    cleanup()
    recognitionEnv.restore()
    synthesisEnv.restore()
    mic.restore()
    vi.restoreAllMocks()
  })

  /** 渲染并等待两个引擎初始化完成 */
  const renderPanel = async () => {
    const utils = render(<VoiceControlPanel />)
    await waitFor(() => expect(recognitionEnv.instances).toHaveLength(1))
    await waitFor(() => expect(screen.getByText('语言: 简体中文')).toBeInTheDocument())
    return utils
  }

  /** 点击开始监听并触发识别器 onstart */
  const startListening = async () => {
    fireEvent.click(screen.getByRole('button', { name: /开始监听/ }))
    await waitFor(() => expect(recognitionEnv.latest().start).toHaveBeenCalled())
    act(() => {
      recognitionEnv.latest().onstart!()
    })
  }

  describe('初始渲染', () => {
    it('展示标题、状态、快速命令与空历史占位', async () => {
      await renderPanel()

      expect(screen.getByText('语音交互系统')).toBeInTheDocument()
      expect(screen.getByText('中文')).toBeInTheDocument()
      expect(screen.getByText('已停止')).toBeInTheDocument()
      expect(screen.getByText('空闲')).toBeInTheDocument()
      expect(screen.getByText('暂无命令历史')).toBeInTheDocument()
      expect(screen.getByText('状态: 待命')).toBeInTheDocument()
      expect(screen.getByText('语言: 简体中文')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /开始监听/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /测试语音/ })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /创建弹窗/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /显示帮助/ })).toBeInTheDocument()
    })

    it('从 localStorage 恢复命令历史', async () => {
      localStorage.setItem(
        'voice_command_history',
        JSON.stringify([{ command: '播放音乐', timestamp: Date.now(), language: 'zh-CN' }])
      )
      await renderPanel()

      expect(screen.getByText('播放音乐')).toBeInTheDocument()
      expect(screen.getByText('unknown')).toBeInTheDocument()
      expect(screen.queryByText('暂无命令历史')).not.toBeInTheDocument()
    })

    it('命令历史 JSON 损坏时记录错误并保持空列表', async () => {
      localStorage.setItem('voice_command_history', '{not-json')
      await renderPanel()

      expect(console.error).toHaveBeenCalledWith('加载历史数据失败:', expect.anything())
      expect(screen.getByText('暂无命令历史')).toBeInTheDocument()
    })
  })

  describe('录音开关与识别结果', () => {
    it('开始监听后展示监听状态，结束后恢复待命', async () => {
      await renderPanel()
      await startListening()

      expect(screen.getByText('监听中')).toBeInTheDocument()
      expect(screen.getByText('状态: 监听中')).toBeInTheDocument()
      expect(screen.queryByText('已停止')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /停止监听/ })).toBeInTheDocument()

      act(() => {
        recognitionEnv.latest().onend!()
      })

      expect(screen.getByText('已停止')).toBeInTheDocument()
      expect(screen.getByText('状态: 待命')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /开始监听/ })).toBeInTheDocument()
      expect(recognitionEnv.latest().stop).not.toHaveBeenCalled()
    })

    it('监听中点击停止会调用识别器 stop', async () => {
      await renderPanel()
      await startListening()

      fireEvent.click(screen.getByRole('button', { name: /停止监听/ }))
      expect(recognitionEnv.latest().stop).toHaveBeenCalledTimes(1)
    })

    it('启动失败时保持停止状态并播报权限提示', async () => {
      await renderPanel()
      recognitionEnv.latest().start.mockImplementation(() => {
        throw new Error('no-mic')
      })

      fireEvent.click(screen.getByRole('button', { name: /开始监听/ }))

      await waitFor(() => expect(synthesisEnv.utterances).toHaveLength(1))
      expect(synthesisEnv.utterances[0].text).toBe('无法启动语音识别，请检查麦克风权限')
      expect(screen.getByText('已停止')).toBeInTheDocument()
    })

    it('识别中展示临时结果，最终结果替换并写入命令历史', async () => {
      await renderPanel()
      await startListening()

      act(() => {
        recognitionEnv.latest().onresult!(recognitionEvent('临时文本', 0.9, false))
      })
      expect(screen.getByText('临时文本')).toBeInTheDocument()
      expect(screen.getByText('临时结果 • 识别中...')).toBeInTheDocument()
      expect(screen.queryByText(/最终结果/)).not.toBeInTheDocument()

      act(() => {
        recognitionEnv.latest().onresult!(recognitionEvent('创建一个弹窗', 0.9, true))
      })

      expect(screen.getAllByText('创建一个弹窗').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/最终结果/)).toBeInTheDocument()
      expect(screen.queryByText('临时文本')).not.toBeInTheDocument()

      await waitFor(() => expect(screen.getByText('create_popup')).toBeInTheDocument())
    })

    it('识别错误时退出监听状态', async () => {
      await renderPanel()
      await startListening()

      act(() => {
        recognitionEnv.latest().onerror!({ error: 'network' })
      })

      expect(screen.getByText('已停止')).toBeInTheDocument()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('语音播报', () => {
    it('测试语音按当前语言播报，播报中禁用按钮，结束后恢复空闲', async () => {
      await renderPanel()

      fireEvent.click(screen.getByRole('button', { name: /测试语音/ }))

      expect(synthesisEnv.utterances).toHaveLength(1)
      expect(synthesisEnv.utterances[0].text).toBe('语音系统测试，一切正常')
      expect(synthesisEnv.synthesis.speak).toHaveBeenCalledTimes(1)
      expect(screen.getByText('播报中')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /测试语音/ })).toBeDisabled()

      act(() => {
        synthesisEnv.utterances[0].onend!()
      })

      expect(screen.getByText('空闲')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /测试语音/ })).not.toBeDisabled()
    })

    it('播报出错时恢复空闲状态', async () => {
      await renderPanel()
      fireEvent.click(screen.getByRole('button', { name: /测试语音/ }))

      act(() => {
        synthesisEnv.utterances[0].onerror!({ error: 'failed' })
      })

      expect(screen.getByText('空闲')).toBeInTheDocument()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('语言与上下文面板', () => {
    it('切换语言后更新标签、识别器语言、统计并语音反馈', async () => {
      await renderPanel()

      fireEvent.click(screen.getByTitle('语言设置'))
      expect(screen.getByText('语言设置')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /日本語/ }))

      expect(recognitionEnv.latest().lang).toBe('ja-JP')
      expect(screen.getByText('语言: 日本語')).toBeInTheDocument()
      expect(synthesisEnv.utterances.at(-1)!.text).toBe('已切换至日本語')
      expect(screen.queryByText('语言设置')).not.toBeInTheDocument()

      fireEvent.click(screen.getByTitle('高级设置'))
      expect(screen.getByText('语言切换').parentElement!.textContent).toContain('1')
    })

    it('上下文面板初始为空，可再次点击收起', async () => {
      await renderPanel()

      fireEvent.click(screen.getByTitle('上下文'))
      expect(screen.getByText('对话上下文')).toBeInTheDocument()
      expect(screen.getByText('暂无上下文记录')).toBeInTheDocument()

      fireEvent.click(screen.getByTitle('上下文'))
      expect(screen.queryByText('对话上下文')).not.toBeInTheDocument()
    })
  })

  describe('高级设置与统计', () => {
    it('可切换语音、调整语速/音调/音量并作用于播报参数', async () => {
      await renderPanel()

      fireEvent.click(screen.getByTitle('高级设置'))
      expect(screen.getByText('语音设置')).toBeInTheDocument()
      expect(screen.getByText('使用统计')).toBeInTheDocument()

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(screen.getByRole('option', { name: /Chinese Local Female/ })).toBeInTheDocument()
      fireEvent.change(select, { target: { value: 'en-local' } })
      expect(select.value).toBe('en-local')

      const sliders = screen.getAllByRole('slider')
      expect(sliders).toHaveLength(3)
      fireEvent.change(sliders[0], { target: { value: '1.5' } })
      expect(screen.getByText('语速: 1.5')).toBeInTheDocument()
      fireEvent.change(sliders[1], { target: { value: '0.8' } })
      expect(screen.getByText('音调: 0.8')).toBeInTheDocument()
      fireEvent.change(sliders[2], { target: { value: '0.3' } })
      expect(screen.getByText('音量: 0.3')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /测试语音/ }))
      const utterance = synthesisEnv.utterances.at(-1)!
      expect(utterance.voice).toMatchObject({ voiceURI: 'en-local' })
      expect(utterance.rate).toBe(1.5)
      expect(utterance.pitch).toBe(0.8)
      expect(utterance.volume).toBe(0.3)
    })
  })

  describe('快速命令', () => {
    it('点击快速命令后写入历史、累计统计并语音反馈', async () => {
      await renderPanel()

      fireEvent.click(screen.getByRole('button', { name: /创建弹窗/ }))

      await waitFor(() => expect(screen.getByText('create_popup')).toBeInTheDocument())
      expect(screen.getAllByText('创建弹窗').length).toBeGreaterThanOrEqual(2)

      fireEvent.click(screen.getByTitle('高级设置'))
      expect(screen.getByText('识别次数').parentElement!.textContent).toContain('1')
      expect(screen.getByText('成功命令').parentElement!.textContent).toContain('1')
      expect(screen.getByText('失败命令').parentElement!.textContent).toContain('0')

      expect(synthesisEnv.utterances).toHaveLength(1)
      expect(synthesisEnv.utterances[0].text).toBe('命令执行成功')

      act(() => {
        synthesisEnv.utterances[0].onend!()
      })
      expect(synthesisEnv.utterances[1].text).toBe('正在执行：创建弹窗')
    })
  })

  describe('销毁', () => {
    it('卸载时释放麦克风媒体流并销毁引擎', async () => {
      const { unmount } = await renderPanel()

      unmount()

      expect(mic.track.stop).toHaveBeenCalledTimes(1)
      expect(mic.audioContext.close).not.toHaveBeenCalled()
    })
  })
})
