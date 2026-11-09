/**
 * @file AILyricsGenerator 完整交互测试
 * @description 覆盖主题/关键词/行数表单、生成与复制、创建歌曲三种降级路径
 */
import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { I18nProvider } from '@yyc3/music-hooks'
import { AILyricsGenerator } from '../src'

const composeMock = vi.hoisted(() => vi.fn())

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

vi.mock('@yyc3/music-hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-hooks')>()
  return {
    ...actual,
    useAudioComposer: () => ({
      compose: composeMock,
      progress: 0.42,
      isComposing: false,
      error: null,
    }),
  }
})

const mockApiFetch = vi.mocked(apiFetch)

const lyrics = ['第一句生成的歌词', '第二句生成的歌词']

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  return writeText
}

describe('AILyricsGenerator 表单与生成流程', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
    composeMock.mockReset()
    setupClipboard()
  })

  it('切换情绪主题并增减歌词行数', async () => {
    const viewer = userEvent.setup()
    render(createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn() }))

    await viewer.click(screen.getByText('忧伤').closest('button')!)
    await viewer.click(screen.getByText('活力').closest('button')!)

    const linesSection = screen.getByText('aiLyrics.lines').parentElement!
    const [minus, plus] = Array.from(linesSection.querySelectorAll('button'))
    expect(screen.getByText('8')).toBeInTheDocument()
    await viewer.click(plus)
    expect(screen.getByText('10')).toBeInTheDocument()
    await viewer.click(minus)
    expect(screen.getByText('8')).toBeInTheDocument()

    // 到达下限/上限
    for (let i = 0; i < 5; i += 1) await viewer.click(minus)
    expect(screen.getByText('4')).toBeInTheDocument()
    for (let i = 0; i < 10; i += 1) await viewer.click(plus)
    expect(screen.getByText('16')).toBeInTheDocument()
  })

  it('关键词去重、上限 5 个并支持删除', async () => {
    const viewer = userEvent.setup()
    render(createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn() }))
    const input = screen.getByPlaceholderText('aiLyrics.enterKeyword')

    await viewer.type(input, '   {enter}')
    expect(screen.queryByText('k1')).not.toBeInTheDocument()

    for (const kw of ['k1', 'k2', 'k3', 'k4', 'k5', 'k6']) {
      await viewer.type(input, `${kw}{enter}`)
    }
    expect(screen.getByText('k5')).toBeInTheDocument()
    expect(screen.queryByText('k6')).not.toBeInTheDocument()

    // 重复关键词不追加
    await viewer.type(input, 'k1{enter}')
    expect(screen.getAllByText('k1')).toHaveLength(1)

    await viewer.click(screen.getByText('k1').closest('span')!.querySelector('button')!)
    expect(screen.queryByText('k1')).not.toBeInTheDocument()
  })

  it('生成歌词、复制到剪贴板并显示已复制状态', async () => {
    const viewer = userEvent.setup()
    const writeText = setupClipboard()
    mockApiFetch.mockResolvedValue({ success: true, lyrics })

    render(createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn() }))
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))

    expect(await screen.findByText(lyrics[0])).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aiLyrics.regenerate/ })).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: /aiLyrics.copy/ }))
    expect(writeText).toHaveBeenCalledWith(lyrics.join('\n'))
    expect(screen.getByText('aiLyrics.copied')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('aiLyrics.copy')).toBeInTheDocument(), {
      timeout: 3500,
    })
  })

  it('返回缺少歌词字段时保持未生成状态', async () => {
    const viewer = userEvent.setup()
    mockApiFetch.mockResolvedValue({ success: false })

    render(createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn() }))
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: /aiLyrics.generate/ })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /aiLyrics.copy/ })).not.toBeInTheDocument()
  })

  it('点击关闭按钮与遮罩均触发 onClose', async () => {
    const viewer = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      createElement(AILyricsGenerator, { isOpen: true, onClose, onCreateTrack: vi.fn() })
    )

    const buttons = screen.getAllByRole('button')
    await viewer.click(buttons[0])
    expect(onClose).toHaveBeenCalledTimes(1)

    await viewer.click(container.querySelector('.fixed.inset-0')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('无 onCreateTrack 时不渲染创建歌曲按钮', async () => {
    const viewer = userEvent.setup()
    mockApiFetch.mockResolvedValue({ success: true, lyrics })

    render(createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn() }))
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))

    expect(await screen.findByText(lyrics[0])).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /创建歌曲/ })).not.toBeInTheDocument()
  })
})

describe('AILyricsGenerator 创建歌曲管线', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
    composeMock.mockReset()
    setupClipboard()
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('合成成功时携带 blob 与编曲参数创建歌曲', async () => {
    const viewer = userEvent.setup()
    const onCreateTrack = vi.fn()
    const composition = { tempo: 120, key: 'C' } as never
    const composeDeferred = deferred<string>()
    composeMock.mockReturnValue(composeDeferred.promise)

    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics }
      if (url === '/ai/compose') return { success: true, composition }
      return {}
    })

    render(
      createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn(), onCreateTrack })
    )
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))
    await screen.findByText(lyrics[0])

    await viewer.click(screen.getByRole('button', { name: /创建歌曲/ }))
    expect(await screen.findByText(/合成 42%/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /合成 42%/ })).toBeDisabled()

    composeDeferred.resolve('blob:audio')
    await waitFor(() =>
      expect(onCreateTrack).toHaveBeenCalledWith(lyrics, 'happy', 'blob:audio', composition)
    )
    expect(screen.getByText('aiLyrics.trackCreated')).toBeInTheDocument()
    expect(navigator.vibrate).toHaveBeenCalled()
  })

  it('缺少编曲参数时降级为无音频创建', async () => {
    const viewer = userEvent.setup()
    const onCreateTrack = vi.fn()
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics }
      if (url === '/ai/compose') return { success: false }
      return {}
    })

    render(
      createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn(), onCreateTrack })
    )
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))
    await screen.findByText(lyrics[0])
    await viewer.click(screen.getByRole('button', { name: /创建歌曲/ }))

    await waitFor(() => expect(onCreateTrack).toHaveBeenCalledWith(lyrics, 'happy'))
    expect(screen.getByText('aiLyrics.trackCreated')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('创建歌曲')).toBeInTheDocument(), {
      timeout: 3500,
    })
  })

  it('合成抛错时回退为无音频创建并记录错误', async () => {
    const viewer = userEvent.setup()
    const onCreateTrack = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    composeMock.mockRejectedValue(new Error('offline audio failed'))
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics }
      if (url === '/ai/compose') return { success: true, composition: { tempo: 100 } }
      return {}
    })

    render(
      createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn(), onCreateTrack })
    )
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))
    await screen.findByText(lyrics[0])
    await viewer.click(screen.getByRole('button', { name: /创建歌曲/ }))

    await waitFor(() => expect(onCreateTrack).toHaveBeenCalledWith(lyrics, 'happy'))
    expect(errorSpy).toHaveBeenCalledWith('Composition pipeline failed:', expect.any(Error))
  })

  it('编曲接口抛错时同样回退创建歌曲', async () => {
    const viewer = userEvent.setup()
    const onCreateTrack = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics }
      throw new Error('compose endpoint down')
    })

    render(
      createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn(), onCreateTrack })
    )
    await viewer.click(screen.getByRole('button', { name: /aiLyrics.generate/ }))
    await screen.findByText(lyrics[0])
    await viewer.click(screen.getByRole('button', { name: /创建歌曲/ }))

    await waitFor(() => expect(onCreateTrack).toHaveBeenCalledWith(lyrics, 'happy'))
    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('AILyricsGenerator 英文界面', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApiFetch.mockReset()
    composeMock.mockReset()
    setupClipboard()
  })

  it('英文模式下的主题、合成阶段与复制文案', async () => {
    const viewer = userEvent.setup()
    const writeText = setupClipboard()
    const onCreateTrack = vi.fn()
    const composition = { tempo: 110 } as never
    const compDeferred = deferred<{ success: boolean; composition: typeof composition }>()
    const audioDeferred = deferred<string>()
    composeMock.mockReturnValue(audioDeferred.promise)
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics: ['EN lyric'] }
      if (url === '/ai/compose') return compDeferred.promise
      return {}
    })
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined })
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))

    render(
      createElement(
        I18nProvider,
        null,
        createElement(AILyricsGenerator, { isOpen: true, onClose: vi.fn(), onCreateTrack })
      )
    )

    expect(screen.getByText('Happy')).toBeInTheDocument()
    expect(screen.getByText('Calm')).toBeInTheDocument()
    await viewer.click(screen.getByText('Calm').closest('button')!)

    await viewer.click(screen.getByRole('button', { name: /Generate Lyrics/ }))
    expect(await screen.findByText('EN lyric')).toBeInTheDocument()
    expect(screen.getAllByText('Calm').length).toBeGreaterThan(0)

    await viewer.click(screen.getByRole('button', { name: /Create Track/ }))
    expect(await screen.findByText('Composing...')).toBeInTheDocument()

    compDeferred.resolve({ success: true, composition })
    expect(await screen.findByText('Synth 42%')).toBeInTheDocument()

    audioDeferred.resolve('blob:en-lyrics')
    await waitFor(() =>
      expect(onCreateTrack).toHaveBeenCalledWith(
        ['EN lyric'],
        'calm',
        'blob:en-lyrics',
        composition
      )
    )
    expect(screen.getByText('Track Created')).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: /^Copy$/ }))
    expect(writeText).toHaveBeenCalledWith('EN lyric')
    expect(screen.getByText('Copied')).toBeInTheDocument()

    localStorage.removeItem('dmusic-prefs')
  })
})
