/**
 * @file MHeartSystem M❤️值成长体系测试
 * @description 覆盖未登录/空数据、五个段位分支、动画计数、维度卡片、情感分布、趋势图、
 *              收听统计、刷新、错误态与本地化
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { MHeartSystem } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>

function mheart(over: Record<string, unknown> = {}) {
  return {
    score: 300,
    emotionIntensity: 6.5,
    resonance: 7.2,
    rarity: 4.1,
    emotionBreakdown: { happy: 3, mystery: 1 },
    updatedAt: Date.now(),
    ...over,
  }
}

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const utils = render(
    createElement(MHeartSystem, { isOpen: true, onClose, userId: 'u1', lang: 'zh', ...over })
  )
  return { onClose, ...utils }
}

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue({ mheart: mheart(), trend: [] } as never)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MHeartSystem', () => {
  it('未登录时展示登录提示', () => {
    setup({ userId: undefined })
    expect(screen.getByText('登录后查看 M❤️值')).toBeInTheDocument()
  })

  it('无数据时展示引导文案', async () => {
    api.mockResolvedValue(null as never)
    setup()
    await waitFor(() => expect(screen.getByText('开始聆听音乐，积累你的 M❤️值')).toBeInTheDocument())
  })

  it('加载中显示旋转的刷新图标', () => {
    api.mockReturnValue(new Promise(() => {}) as never)
    const { container } = setup()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })

  it('拉取失败记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockRejectedValue(new Error('down') as never)
    setup()
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[MHeart] Fetch error:', expect.any(Error)))
    errorSpy.mockRestore()
  })

  it('展示三维指标、情感分布图例与收听统计', async () => {
    api.mockResolvedValue({
      mheart: mheart({ listeningMinutes: 42, totalSessions: 0 }),
      trend: [],
    } as never)
    setup()
    await waitFor(() => expect(screen.getByText('情感强度')).toBeInTheDocument())
    expect(screen.getByText('6.5')).toBeInTheDocument()
    expect(screen.getByText('7.2')).toBeInTheDocument()
    expect(screen.getByText('4.1')).toBeInTheDocument()
    expect(screen.getByText('欢快')).toBeInTheDocument()
    expect(screen.getByText('mystery')).toBeInTheDocument()
    expect(screen.getByText('42 分钟收听')).toBeInTheDocument()
    expect(screen.queryByText(/次会话/)).toBeNull()
  })

  it('趋势数据多于一个点时展示成长趋势，否则隐藏', async () => {
    api.mockResolvedValue({
      mheart: mheart(),
      trend: [
        { score: 100, timestamp: Date.now() - 86400000 },
        { score: 200, timestamp: Date.now() },
      ],
    } as never)
    const { unmount } = setup()
    await waitFor(() => expect(screen.getByText('成长趋势')).toBeInTheDocument())

    unmount()
    api.mockResolvedValue({
      mheart: mheart(),
      trend: [{ score: 100, timestamp: Date.now() }],
    } as never)
    setup()
    await waitFor(() => expect(screen.getByText('情感强度')).toBeInTheDocument())
    expect(screen.queryByText('成长趋势')).toBeNull()
  })

  it('刷新按钮重新拉取数据', async () => {
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByText('情感强度')).toBeInTheDocument())
    const before = api.mock.calls.filter((c) => String(c[0]).startsWith('/mheart/')).length
    const refreshBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.querySelector('svg.lucide-refresh-cw')
    )!
    await viewer.click(refreshBtn)
    await waitFor(() =>
      expect(api.mock.calls.filter((c) => String(c[0]).startsWith('/mheart/')).length).toBe(before + 1)
    )
  })

  it('关闭按钮、遮罩与面板点击行为', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    fireEvent.click(container.querySelector('.absolute.inset-0.bg-black\\/60')!)
    expect(onClose).toHaveBeenCalledTimes(1)
    const closeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.querySelector('svg.lucide-x')
    )!
    await viewer.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('英文语言渲染英文文案', async () => {
    setup({ lang: 'en' })
    await waitFor(() => expect(screen.getByText('M❤️ Growth System')).toBeInTheDocument())
    expect(screen.getByText('Emotion')).toBeInTheDocument()
    expect(screen.getByText('Happy')).toBeInTheDocument()
  })
})

describe('MHeartSystem 段位与动画', () => {
  const cases = [
    { score: 120, tier: '新星', next: '铜心' },
    { score: 300, tier: '铜心', next: '银心' },
    { score: 600, tier: '银心', next: '金心' },
    { score: 900, tier: '金心', next: '钻心' },
    { score: 1200, tier: '钻心', next: null },
  ]

  it.each(cases)('score=$score 落在 $tier 段位', async ({ score, tier, next }) => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'],
    })
    api.mockResolvedValue({ mheart: mheart({ score }), trend: [] } as never)
    setup()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText(String(score))).toBeInTheDocument()
    expect(screen.getAllByText(tier).length).toBeGreaterThan(0)
    if (next) {
      expect(screen.getByText(next)).toBeInTheDocument()
      expect(screen.getByText(/点到下一段位/)).toBeInTheDocument()
    } else {
      expect(screen.queryByText(/点到下一段位/)).toBeNull()
    }
  })
})
