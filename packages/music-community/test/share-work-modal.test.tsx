/**
 * @file ShareWorkModal 分享弹窗测试
 * @description 覆盖 Canvas 卡片绘制（含主题回退/歌词截断）、分享到社区成功/失败/分享中、
 *              复制歌词、下载图片、关闭操作与英文文案
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { I18nProvider } from '@yyc3/music-hooks'
import { ShareWorkModal } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>

const work = {
  id: 'w1',
  title: 'Cosmic Dreams',
  theme: 'happy',
  lyrics: Array.from({ length: 12 }, (_, i) =>
    i === 0 ? 'x'.repeat(80) : `line ${i}`
  ),
  mode: 'quick',
  createdAt: new Date(2024, 0, 5).getTime(),
}

function createFakeCtx() {
  const gradient = { addColorStop: vi.fn() }
  return {
    fillStyle: '' as string | object,
    strokeStyle: '' as string | object,
    font: '',
    letterSpacing: '',
    textAlign: '',
    lineWidth: 0,
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
    roundRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  }
}

let fakeCtx: ReturnType<typeof createFakeCtx>

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const onShared = vi.fn()
  const utils = render(
    createElement(ShareWorkModal, {
      isOpen: true,
      onClose,
      work,
      userName: 'Alice',
      userId: 'u1',
      onShared,
      ...over,
    })
  )
  return { onClose, onShared, ...utils }
}

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue(null)
  localStorage.clear()
  fakeCtx = createFakeCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as never)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('ShareWorkModal', () => {
  it('work 为空或未打开时不渲染内容', () => {
    const { container } = setup({ work: null })
    expect(container.firstChild).toBeNull()
  })

  it('未打开时即使有作品也不渲染面板', () => {
    const { container } = setup({ isOpen: false })
    expect(container.firstChild).toBeNull()
  })

  it('绘制分享卡片（主题回退、模式回退、歌词截断与省略号）', async () => {
    setup({ work: { ...work, theme: 'mystery', mode: 'custom-mode' } })
    await waitFor(() => expect(fakeCtx.fillText).toHaveBeenCalled())

    const texts = fakeCtx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('D - M U S I C')
    expect(texts).toContain('🎵')
    expect(texts).toContain('Cosmic Dreams')
    expect(texts).toContain('custom-mode')
    expect(texts).toContain('by Alice')
    expect(texts.some((t) => t.endsWith('...'))).toBe(true)
    // 最多绘制 10 行歌词
    const lyricLines = fakeCtx.fillText.mock.calls.filter((c) => c[1] === 40)
    expect(lyricLines).toHaveLength(10)
    expect(texts[texts.length - 1]).toBe('2024/01/05')
  })

  it('已知主题使用对应渐变与表情，未提供用户名时不绘制作者', async () => {
    setup({ userName: undefined })
    await waitFor(() => expect(fakeCtx.fillText).toHaveBeenCalled())
    const texts = fakeCtx.fillText.mock.calls.map((c) => String(c[0]))
    expect(texts).toContain('🌟')
    expect(texts).toContain('极简写歌')
    expect(texts.some((t) => t.startsWith('by '))).toBe(false)
  })

  it('分享到社区成功后展示已分享并触发 onShared 与成就上报', async () => {
    const viewer = userEvent.setup()
    const { onShared } = setup()
    await viewer.click(screen.getByText('分享到社区'))

    await waitFor(() => expect(screen.getByText('已分享到社区!')).toBeInTheDocument())
    expect(onShared).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith('/community/activities', expect.objectContaining({ method: 'POST' }))
    expect(api).toHaveBeenCalledWith('/shared-works', expect.objectContaining({ method: 'POST' }))
    expect(api).toHaveBeenCalledWith('/achievements/u1/track', expect.objectContaining({ method: 'POST' }))
  })

  it('分享过程中展示分享中状态', async () => {
    const viewer = userEvent.setup()
    api.mockReturnValue(new Promise(() => {}) as never)
    setup()
    await viewer.click(screen.getByText('分享到社区'))
    expect(screen.getByText('分享中...')).toBeInTheDocument()
  })

  it('分享失败时记录错误并保持可重试', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockRejectedValue(new Error('offline') as never)
    setup()
    await viewer.click(screen.getByText('分享到社区'))
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Share to community failed:', expect.any(Error))
    )
    expect(screen.getByText('分享到社区')).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('复制歌词写入剪贴板并展示已复制', async () => {
    const viewer = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    setup()
    await viewer.click(screen.getByText('复制歌词'))
    expect(writeText).toHaveBeenCalledTimes(1)
    const text = writeText.mock.calls[0][0] as string
    expect(text).toContain('🎵 Cosmic Dreams')
    expect(text).toContain('🌟 极简写歌')
    expect(text).toContain('line 1')
    expect(text).toContain('— D-Music AI 创作')
    await waitFor(() => expect(screen.getByText('已复制')).toBeInTheDocument())
  })

  it('下载图片调用 toDataURL 并触发链接点击', async () => {
    const viewer = userEvent.setup()
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,abc')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    setup()
    await viewer.click(screen.getByText('保存图片'))
    expect(toDataURL).toHaveBeenCalledWith('image/png')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    toDataURL.mockRestore()
    clickSpy.mockRestore()
  })

  it('关闭按钮与遮罩触发 onClose', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    await viewer.click(container.querySelector('button')!)
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(container.querySelector('.fixed.inset-0.z-\\[70\\]')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('英文且未提供用户信息时使用 anon/Creator 回退，并覆盖英文分享中与复制文案', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    const viewer = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    let resolveShare: (value: unknown) => void
    api.mockReturnValueOnce(new Promise((resolve) => { resolveShare = resolve }) as never)
    render(
      createElement(I18nProvider, null,
        createElement(ShareWorkModal, {
          isOpen: true,
          onClose: vi.fn(),
          work: { ...work, theme: 'mystery', mode: 'custom-mode' },
        })
      )
    )

    await viewer.click(screen.getByText('Share to Community'))
    expect(screen.getByText('Sharing...')).toBeInTheDocument()
    // 分享中按钮禁用，重复点击不会再次发起请求
    await viewer.click(screen.getByText('Sharing...'))
    expect(api.mock.calls.filter((c) => c[0] === '/community/activities')).toHaveLength(1)

    resolveShare!(null)
    await waitFor(() => expect(screen.getByText('Shared to community!')).toBeInTheDocument())

    const activityBody = JSON.parse(
      api.mock.calls.find((c) => c[0] === '/community/activities')![1].body as string
    )
    expect(activityBody.userId).toBe('anon')
    expect(activityBody.userName).toBe('Creator')
    expect(activityBody.detail).toBe('shared AI creation "Cosmic Dreams"')
    const sharedBody = JSON.parse(
      api.mock.calls.find((c) => c[0] === '/shared-works')![1].body as string
    )
    expect(sharedBody.userId).toBe('anon')
    expect(sharedBody.userName).toBe('Creator')

    await viewer.click(screen.getByText('Copy Lyrics'))
    const text = writeText.mock.calls[0][0] as string
    expect(text).toContain('🎶 custom-mode')
    expect(text).toContain('— Created with D-Music AI')
    await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument())
  })

  it('canvas 上下文不可用时安全跳过绘制', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    setup()
    expect(screen.getByText('分享作品')).toBeInTheDocument()
  })

  it('英文语言渲染英文文案并绘制英文品牌', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    render(
      createElement(I18nProvider, null,
        createElement(ShareWorkModal, {
          isOpen: true,
          onClose: vi.fn(),
          work,
          userName: 'Alice',
          userId: 'u1',
        })
      )
    )
    expect(screen.getByText('Share Work')).toBeInTheDocument()
    expect(screen.getByText('Share to Community')).toBeInTheDocument()
    expect(screen.getByText('Copy Lyrics')).toBeInTheDocument()
    expect(screen.getByText('Save Image')).toBeInTheDocument()
    await waitFor(() =>
      expect(fakeCtx.fillText.mock.calls.map((c) => c[0])).toContain(
        'Created with D-Music AI · Next-Gen Music Platform'
      )
    )
  })
})
