/**
 * @file AIAssistant 交互与面板测试
 * @description 覆盖桌面 FAB、移动端面板、语音状态、指令表、智能提示与外部展开同步
 */
import { createElement } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { AIAssistant } from '../src'

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    activeTips: [],
    onDismissTip: vi.fn(),
    onExecuteAction: vi.fn(),
    isListening: false,
    onToggleListening: vi.fn(),
    voiceSupported: true,
    voiceFeedback: '',
    voiceHistory: [],
    sessionInsight: '你最近偏爱舒缓曲风',
    isPlaying: false,
    audioEnergy: 0.4,
    ...overrides,
  }
}

const tip = {
  id: 'tip-1',
  message: '试试语音点歌',
  category: 'voice',
  priority: 'high',
  icon: '🎵',
  actionLabel: '播放',
  actionKey: 'play',
  expiresAt: Date.now() + 60_000,
}

function getFab(container: HTMLElement) {
  return container.querySelector('button.relative') as HTMLButtonElement
}

function getDesktopPanel(container: HTMLElement) {
  return container.querySelector('.w-72') as HTMLElement
}

function getMobilePanel(container: HTMLElement) {
  return Array.from(container.querySelectorAll('div')).find((el) =>
    typeof el.className === 'string' && el.className.includes('left-3 right-3 top-14')
  ) as HTMLElement
}

describe('AIAssistant 桌面 FAB 与面板', () => {
  it('点击 FAB 展开面板，点击收起按钮与再次点击 FAB 均能折叠', async () => {
    const viewer = userEvent.setup()
    const onExternalExpandedChange = vi.fn()
    const { container } = render(
      createElement(AIAssistant, baseProps({ onExternalExpandedChange }))
    )

    await viewer.click(getFab(container))
    expect(onExternalExpandedChange).toHaveBeenLastCalledWith(true)
    expect(screen.getAllByText('AI 助手').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('你最近偏爱舒缓曲风').length).toBeGreaterThanOrEqual(1)

    const panel = getDesktopPanel(container)
    const closeBtn = panel.querySelector('button')!
    await viewer.click(closeBtn)
    expect(onExternalExpandedChange).toHaveBeenLastCalledWith(false)
    await waitFor(() => expect(screen.queryAllByText('AI 助手')).toHaveLength(0))

    await viewer.click(getFab(container))
    await viewer.click(getFab(container))
    expect(onExternalExpandedChange).toHaveBeenLastCalledWith(false)
  })

  it('externalExpanded 变化时同步展开状态并渲染移动端面板', async () => {
    const viewer = userEvent.setup()
    const onExternalExpandedChange = vi.fn()
    const onExecuteAction = vi.fn()
    const onDismissTip = vi.fn()
    const props = baseProps({
      onExternalExpandedChange,
      onExecuteAction,
      onDismissTip,
      activeTips: [tip],
    })
    const { container, rerender } = render(
      createElement(AIAssistant, { ...props, externalExpanded: false })
    )

    expect(screen.queryByText('AI 助手')).not.toBeInTheDocument()
    rerender(createElement(AIAssistant, { ...props, externalExpanded: true }))
    await waitFor(() => expect(screen.getAllByText('AI 助手').length).toBeGreaterThan(1))

    const mobile = getMobilePanel(container)
    expect(mobile).toBeTruthy()
    expect(within(mobile).getByText('试试语音点歌')).toBeInTheDocument()

    await viewer.click(within(mobile).getByText('播放'))
    expect(onExecuteAction).toHaveBeenCalledWith('play')
    const mobileDismiss = within(mobile)
      .getAllByRole('button')
      .find((btn) => btn.className.includes('text-white/20'))
    expect(mobileDismiss).toBeTruthy()
    await viewer.click(mobileDismiss!)
    expect(onDismissTip).toHaveBeenCalledWith('tip-1')

    const backdrop = Array.from(container.querySelectorAll('div')).find(
      (el) => typeof el.className === 'string' && el.className.includes('bg-black/40')
    ) as HTMLElement
    await viewer.click(backdrop)
    expect(onExternalExpandedChange).toHaveBeenCalledWith(false)
  })

  it('移动端面板中的语音按钮触发 onToggleListening', async () => {
    const viewer = userEvent.setup()
    const onToggleListening = vi.fn()
    const onExternalExpandedChange = vi.fn()
    const { container } = render(
      createElement(
        AIAssistant,
        baseProps({
          onToggleListening,
          onExternalExpandedChange,
          externalExpanded: true,
          isListening: false,
        })
      )
    )

    const mobile = getMobilePanel(container)
    await viewer.click(within(mobile).getByText('点击说出指令'))
    expect(onToggleListening).toHaveBeenCalledTimes(1)

    await viewer.click(within(mobile).getAllByRole('button')[0])
    expect(onExternalExpandedChange).toHaveBeenCalledWith(false)
  })
})

describe('AIAssistant 语音状态与指令表', () => {
  it('折叠时快捷麦克风与展开时麦克风按钮均触发回调', async () => {
    const viewer = userEvent.setup()
    const onToggleListening = vi.fn()
    const { container } = render(createElement(AIAssistant, baseProps({ onToggleListening })))

    const quickMic = container.querySelector('button.w-9') as HTMLButtonElement
    expect(quickMic).toBeTruthy()
    await viewer.click(quickMic)
    expect(onToggleListening).toHaveBeenCalledTimes(1)

    await viewer.click(getFab(container))
    await viewer.click(within(getDesktopPanel(container)).getByText('点击说出指令'))
    expect(onToggleListening).toHaveBeenCalledTimes(2)
  })

  it('语音监听中展示覆盖层与聆听文案', async () => {
    render(
      createElement(
        AIAssistant,
        baseProps({ isListening: true, externalExpanded: true, isPlaying: true, audioEnergy: 0.9 })
      )
    )
    expect(screen.getAllByText('正在聆听...').length).toBeGreaterThan(0)
    expect(screen.getAllByText('正在聆听...').length).toBeGreaterThanOrEqual(2)
  })

  it('浏览器不支持语音时展示降级提示且无麦克风按钮', async () => {
    const viewer = userEvent.setup()
    const onToggleListening = vi.fn()
    const { container } = render(
      createElement(AIAssistant, baseProps({ voiceSupported: false, onToggleListening }))
    )

    expect(container.querySelector('button.w-9')).toBeNull()
    await viewer.click(getFab(container))
    expect(screen.getByText('当前浏览器不支持语音识别')).toBeInTheDocument()
    expect(screen.queryByText('点击说出指令')).not.toBeInTheDocument()
    expect(onToggleListening).not.toHaveBeenCalled()
  })

  it('查看并收起语音指令表', async () => {
    const viewer = userEvent.setup()
    const { container } = render(createElement(AIAssistant, baseProps()))

    await viewer.click(getFab(container))
    await viewer.click(screen.getByText('查看指令表'))
    expect(screen.getByText('"播放"')).toBeInTheDocument()
    expect(screen.getByText('播放音乐')).toBeInTheDocument()
    expect(screen.getByText('"分析"')).toBeInTheDocument()

    await viewer.click(screen.getByText('收起'))
    await waitFor(() => expect(screen.queryByText('"播放"')).not.toBeInTheDocument())
  })

})

describe('AIAssistant 提示与历史记录', () => {
  it('提示操作按钮同时执行动作并关闭提示', async () => {
    const viewer = userEvent.setup()
    const onExecuteAction = vi.fn()
    const onDismissTip = vi.fn()
    const { container } = render(
      createElement(AIAssistant, baseProps({ activeTips: [tip], onExecuteAction, onDismissTip }))
    )

    // 浮层提示
    await viewer.click(screen.getByText('播放'))
    expect(onExecuteAction).toHaveBeenCalledWith('play')
    expect(onDismissTip).toHaveBeenCalledWith('tip-1')

    const floatingCard = screen.getByText('试试语音点歌').closest('.rounded-xl') as HTMLElement
    const floatingButtons = Array.from(floatingCard.querySelectorAll('button'))
    await viewer.click(floatingButtons[floatingButtons.length - 1])
    expect(onDismissTip).toHaveBeenCalledTimes(2)

    // 展开面板内的提示
    await viewer.click(getFab(container))
    const panel = getDesktopPanel(container)
    const actionButtons = within(panel).getAllByText('播放')
    await viewer.click(actionButtons[actionButtons.length - 1])
    expect(onExecuteAction).toHaveBeenCalledTimes(2)

    await viewer.click(within(panel).getAllByText('试试语音点歌')[0])
    const dismissBtn = within(panel)
      .getAllByRole('button')
      .find((btn) => btn.querySelector('svg') && btn.className.includes('text-white/20'))
    expect(dismissBtn).toBeTruthy()
    await viewer.click(dismissBtn!)
    expect(onDismissTip).toHaveBeenCalledWith('tip-1')
  })

  it('无 actionKey 的提示不渲染操作按钮，未知分类回退到系统样式', async () => {
    const viewer = userEvent.setup()
    const unknownTip = {
      id: 'tip-x',
      message: '神秘提示',
      category: 'unknown-category',
      priority: 'low',
      icon: '❓',
      actionLabel: '无效动作',
      expiresAt: Date.now() + 60_000,
    }
    const { container } = render(
      createElement(AIAssistant, baseProps({ activeTips: [unknownTip] }))
    )

    expect(screen.getByText('神秘提示')).toBeInTheDocument()
    expect(screen.queryByText('无效动作')).not.toBeInTheDocument()
    expect(getFab(container).textContent).toContain('1')

    await viewer.click(getFab(container))
    expect(screen.getAllByText('神秘提示').length).toBeGreaterThanOrEqual(2)
  })

  it('展示最近三条语音指令（倒序）与语音反馈', async () => {
    const history = [
      { transcript: '播放', intent: 'play', timestamp: 1 },
      { transcript: '暂停', intent: 'pause', timestamp: 2 },
      { transcript: '下一首', intent: 'next', timestamp: 3 },
      { transcript: '喜欢', intent: 'like', timestamp: 4 },
    ]
    const viewer = userEvent.setup()
    const { container } = render(
      createElement(
        AIAssistant,
        baseProps({ voiceHistory: history, voiceFeedback: '已为你播放' })
      )
    )

    expect(screen.getByText('已为你播放')).toBeInTheDocument()
    await viewer.click(getFab(container))
    const panel = getDesktopPanel(container)

    expect(within(panel).getByText('"喜欢"')).toBeInTheDocument()
    expect(within(panel).getByText('"下一首"')).toBeInTheDocument()
    expect(within(panel).getByText('"暂停"')).toBeInTheDocument()
    expect(within(panel).queryByText('"播放"')).not.toBeInTheDocument()
  })
})

describe('AIAssistant 英文界面与播放态', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('英文模式渲染全部面板文案与英文指令表', async () => {
    const viewer = userEvent.setup()
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    const { container } = render(
      createElement(
        I18nProvider,
        null,
        createElement(
          AIAssistant,
          baseProps({
            externalExpanded: true,
            activeTips: [tip],
            voiceHistory: [{ transcript: 'play', intent: 'play', timestamp: 1 }],
            isListening: true,
            isPlaying: true,
          })
        )
      )
    )

    expect(screen.getAllByText('AI Assistant').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Listening...').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('AI Insights').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Recent').length).toBeGreaterThanOrEqual(1)

    const panel = getDesktopPanel(container)
    expect(within(panel).getByText('Voice Commands')).toBeInTheDocument()
    const basePlayCount = screen.getAllByText('"play"').length

    await viewer.click(within(panel).getByText('Show commands'))
    expect(screen.getAllByText('"play"').length).toBeGreaterThan(basePlayCount)
    await viewer.click(within(panel).getByText('Hide'))
    await waitFor(() => expect(screen.getAllByText('"play"')).toHaveLength(basePlayCount))

    await viewer.click(panel.querySelector('button')!)
    expect(getFab(container)).toBeTruthy()

    localStorage.removeItem('dmusic-prefs')
  })

  it('播放中且未监听时 FAB 应用播放态阴影与脉冲', () => {
    const { container } = render(
      createElement(AIAssistant, baseProps({ isPlaying: true, isListening: false }))
    )
    const fab = getFab(container)
    expect(fab.style.boxShadow).toContain('12.8px')
    expect(fab.querySelectorAll('div').length).toBeGreaterThan(0)
  })
})
