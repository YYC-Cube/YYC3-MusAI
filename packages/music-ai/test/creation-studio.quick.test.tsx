/**
 * @file CreationStudio 模式中枢与极简写歌测试
 * @description 覆盖模式导航、主题/关键词表单、歌词→编曲→合成三阶段管线与失败降级
 */
import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { DEMO_PLAYLIST } from '@yyc3/music-data'
import { CreationStudio } from '../src'

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
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  return writeText
}

function renderStudio(overrides: Record<string, unknown> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onCreateTrack: vi.fn(),
    playlist: DEMO_PLAYLIST,
    currentTrackIndex: 0,
    onHaptic: vi.fn(),
    onShareWork: vi.fn(),
    onOpenMV: vi.fn(),
    user: undefined as { id: string; name: string } | undefined,
    starPower: 0,
    onStarPowerUpdate: vi.fn(),
    ...overrides,
  }
  const result = render(createElement(CreationStudio, props))
  return { ...result, props }
}

describe('CreationStudio 模式中枢', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue({})
    composeMock.mockReset()
    setupClipboard()
  })

  it('展示五种模式与作品统计，MV 模式直接回调', async () => {
    const viewer = userEvent.setup()
    const { props } = renderStudio()

    expect(screen.getByText('AI 创作工坊')).toBeInTheDocument()
    expect(screen.getByText('极简写歌')).toBeInTheDocument()
    expect(screen.getByText('大师写歌')).toBeInTheDocument()
    expect(screen.getByText('热歌改编')).toBeInTheDocument()
    expect(screen.getByText('作品管理')).toBeInTheDocument()
    expect(screen.getByText('MV 创作')).toBeInTheDocument()
    expect(screen.getByText('0 首作品')).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: /MV 创作/ }))
    expect(props.onOpenMV).toHaveBeenCalledTimes(1)
    expect(props.onHaptic).toHaveBeenCalledWith('selection')

    await viewer.click(screen.getByRole('button', { name: /大师写歌/ }))
    expect(screen.getByRole('heading', { name: '大师写歌' })).toBeInTheDocument()
    expect(screen.getAllByText('精细控制主题、结构与风格').length).toBeGreaterThanOrEqual(1)
  })

  it('返回箭头回到模式中枢，关闭按钮与遮罩触发 onClose', async () => {
    const viewer = userEvent.setup()
    const { container, props } = renderStudio()

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    expect(await screen.findByRole('heading', { name: '极简写歌' })).toBeInTheDocument()
    expect((await screen.findAllByText('一键AI写词作曲，秒出成品')).length).toBeGreaterThanOrEqual(1)

    await viewer.click(container.querySelector('.lucide-arrow-left')!.closest('button')!)
    expect(await screen.findByText('选择创作模式开始')).toBeInTheDocument()
    expect(props.onHaptic).toHaveBeenCalledWith('light')

    await viewer.click(container.querySelector('.lucide-x')!.closest('button')!)
    expect(props.onClose).toHaveBeenCalledTimes(1)

    await viewer.click(container.querySelector('.fixed.inset-0')!)
    expect(props.onClose).toHaveBeenCalledTimes(2)
  })
})

describe('CreationStudio 极简写歌', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApiFetch.mockReset()
    composeMock.mockReset()
    setupClipboard()
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vi.fn() })
  })

  it('选择主题、输入关键词并走无音频降级管线', async () => {
    const viewer = userEvent.setup()
    const writeText = setupClipboard()
    const onCreateTrack = vi.fn()
    const { props } = renderStudio({ onCreateTrack })

    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics: ['L1', 'L2'] }
      if (url === '/ai/compose') return { success: true }
      return {}
    })

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    const prompt = await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    await viewer.click(screen.getByText('忧伤').closest('button')!)

    await viewer.type(prompt, 'summer, night')
    await viewer.click(screen.getByRole('button', { name: /一键创作/ }))

    expect(await screen.findByText('L1')).toBeInTheDocument()
    await waitFor(() =>
      expect(onCreateTrack).toHaveBeenCalledWith(['L1', 'L2'], 'sad')
    )

    const lyricsCall = mockApiFetch.mock.calls.find((call) => call[0] === '/ai/lyrics')!
    expect(JSON.parse((lyricsCall[1] as RequestInit).body as string)).toEqual({
      theme: 'sad',
      keywords: ['summer', 'night'],
      lines: 8,
    })

    expect(screen.getByText('创作完成!')).toBeInTheDocument()
    expect(props.onHaptic).toHaveBeenCalledWith('medium')
    expect(props.onHaptic).toHaveBeenCalledWith('success')

    const stored = JSON.parse(localStorage.getItem('d-music-works')!)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ theme: 'sad', lyrics: ['L1', 'L2'], mode: 'quick' })

    await viewer.click(screen.getByRole('button', { name: /复制/ }))
    expect(writeText).toHaveBeenCalledWith('L1\nL2')
    expect(screen.getByText('已复制')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('一键创作')).toBeInTheDocument(), {
      timeout: 4000,
    })
  })

  it('回车触发创作并依次展示写词、编曲、合成进度', async () => {
    const viewer = userEvent.setup()
    const onCreateTrack = vi.fn()
    const composition = { tempo: 128, key: 'Am' } as never
    const lyricsDeferred = deferred<{ success: boolean; lyrics: string[] }>()
    const composeDeferred = deferred<{ success: boolean; composition: typeof composition }>()
    const audioDeferred = deferred<string>()
    composeMock.mockReturnValue(audioDeferred.promise)
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return lyricsDeferred.promise
      if (url === '/ai/compose') return composeDeferred.promise
      return {}
    })

    const { props } = renderStudio({ onCreateTrack })
    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))

    const prompt = await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    await viewer.type(prompt, '{enter}')
    expect(await screen.findByText('AI 写词中...')).toBeInTheDocument()

    lyricsDeferred.resolve({ success: true, lyrics: ['A1', 'A2'] })
    expect(await screen.findByText('编曲设计中...')).toBeInTheDocument()

    composeDeferred.resolve({ success: true, composition })
    expect(await screen.findByText(/音频合成 42%/)).toBeInTheDocument()

    audioDeferred.resolve('blob:quick')
    await waitFor(() =>
      expect(onCreateTrack).toHaveBeenCalledWith(['A1', 'A2'], 'happy', 'blob:quick', composition)
    )
    expect(screen.getByText('创作完成!')).toBeInTheDocument()
    expect(props.onHaptic).toHaveBeenCalledWith('success')
  })

  it('歌词接口失败时记录错误并恢复可点击状态', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onCreateTrack = vi.fn()
    mockApiFetch.mockRejectedValue(new Error('lyrics down'))
    const { props } = renderStudio({ onCreateTrack })

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await viewer.click(await screen.findByRole('button', { name: /一键创作/ }))

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Quick create failed:', expect.any(Error)))
    expect(onCreateTrack).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /一键创作/ })).toBeEnabled()
    expect(props.onHaptic).toHaveBeenCalledWith('medium')
    expect(localStorage.getItem('d-music-works')).toBeNull()
  })

  it('已有歌词后编曲失败会使用缓存歌词降级创建', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onCreateTrack = vi.fn()
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics: ['C1'] }
      throw new Error('compose down')
    })

    renderStudio({ onCreateTrack })
    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))

    await viewer.click(await screen.findByRole('button', { name: /一键创作/ }))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1))
    expect(onCreateTrack).not.toHaveBeenCalled()

    await viewer.click(screen.getByRole('button', { name: /一键创作/ }))
    await waitFor(() => expect(onCreateTrack).toHaveBeenCalledWith(['C1'], 'happy'))
  })
})
