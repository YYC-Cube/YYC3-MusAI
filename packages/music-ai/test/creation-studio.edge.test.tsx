/**
 * @file CreationStudio 边界与英文界面测试
 * @description 覆盖英文 i18n 分支、无歌词错误、大师/改编付费主题解锁及损坏本地存储降级
 */
import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { I18nProvider } from '@yyc3/music-hooks'
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
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function setupClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  return writeText
}

function props(overrides: Record<string, unknown> = {}) {
  return {
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
}

function renderEnglish(overrides: Record<string, unknown> = {}) {
  return render(createElement(I18nProvider, null, createElement(CreationStudio, props(overrides))))
}

const storedWorks = [
  {
    id: 'e1',
    title: 'English Work',
    theme: 'happy',
    lyrics: ['line one'],
    createdAt: Date.now(),
    mode: 'quick',
  },
  {
    id: 'e2',
    title: 'Unknown Work',
    theme: 'unknown',
    lyrics: ['line two'],
    createdAt: Date.now(),
    mode: 'custom',
  },
]

describe('CreationStudio 英文界面分支', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    localStorage.setItem('d-music-works', JSON.stringify(storedWorks))
    mockApiFetch.mockReset()
    composeMock.mockReset()
    setupClipboard()
  })

  it('英文模式下完整走通创作、大师、改编与作品列表', async () => {
    const viewer = userEvent.setup()
    const writeText = setupClipboard()
    const onCreateTrack = vi.fn()
    const lyricsDeferred = deferred<{ success: boolean; lyrics: string[] }>()
    const compDeferred = deferred<{ success: boolean; composition: unknown }>()
    const audioDeferred = deferred<string>()
    composeMock.mockReturnValue(audioDeferred.promise)
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return lyricsDeferred.promise
      if (url === '/ai/compose') return compDeferred.promise
      return {}
    })

    renderEnglish({ onCreateTrack })
    expect(screen.getByText('AI Creation Studio')).toBeInTheDocument()
    expect(screen.getByText('Choose a creation mode')).toBeInTheDocument()
    expect(screen.getByText('2 works')).toBeInTheDocument()
    expect(screen.getByText('AI-powered creation')).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: /Quick Song/ }))
    expect(await screen.findByText('Choose Mood')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter keywords, comma separated...')).toBeInTheDocument()
    expect(screen.getByText('Inspiration Keywords (optional)')).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: /Create Now/ }))
    expect(await screen.findByText('Generating lyrics...')).toBeInTheDocument()

    lyricsDeferred.resolve({ success: true, lyrics: ['EN1', 'EN2'] })
    expect(await screen.findByText('Composing...')).toBeInTheDocument()

    compDeferred.resolve({ success: true, composition: { tempo: 120 } })
    expect(await screen.findByText('Synthesizing 42%')).toBeInTheDocument()

    audioDeferred.resolve('blob:en')
    await waitFor(() =>
      expect(onCreateTrack).toHaveBeenCalledWith(['EN1', 'EN2'], 'happy', 'blob:en', {
        tempo: 120,
      })
    )
    expect(screen.getByText('Complete!')).toBeInTheDocument()
    expect(screen.getByText('Generated Lyrics')).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: /Copy/ }))
    expect(writeText).toHaveBeenCalledWith('EN1\nEN2')
    expect(screen.getByText('Copied')).toBeInTheDocument()

    await viewer.click(document.querySelector('.lucide-arrow-left')!.closest('button')!)
    await viewer.click(await screen.findByRole('button', { name: /Master Mode/ }))
    expect(await screen.findByText('Emotional Base')).toBeInTheDocument()
    expect(screen.getByText('Keywords')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add keyword...')).toBeInTheDocument()
    expect(screen.getByText('Song Structure')).toBeInTheDocument()
    expect(screen.getByText('AABA')).toBeInTheDocument()
    expect(screen.getByText('Instruments')).toBeInTheDocument()
    expect(screen.getByText('Piano')).toBeInTheDocument()
    expect(screen.getByText('Lines')).toBeInTheDocument()
    expect(screen.getByText('Tempo BPM')).toBeInTheDocument()
    expect(screen.getByText('Start Creating')).toBeInTheDocument()

    await viewer.click(document.querySelector('.lucide-arrow-left')!.closest('button')!)
    await viewer.click(await screen.findByRole('button', { name: /Remix & Cover/ }))
    expect(await screen.findByText('Select Source Track')).toBeInTheDocument()
    expect(screen.getByText('Target Style')).toBeInTheDocument()
    expect(screen.getByText('Remix (with audio synthesis)')).toBeInTheDocument()

    await viewer.click(document.querySelector('.lucide-arrow-left')!.closest('button')!)
    await viewer.click(await screen.findByRole('button', { name: /My Works/ }))
    expect(await screen.findByText('3 Works')).toBeInTheDocument()
    expect(screen.getAllByText('Quick Song').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('custom')).toBeInTheDocument()
    expect(screen.getAllByTitle('Copy lyrics').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('Delete').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('Share work').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('Create MV from this work').length).toBeGreaterThan(0)
  })

  it('英文模式空作品列表展示引导文案', async () => {
    const viewer = userEvent.setup()
    localStorage.removeItem('d-music-works')
    renderEnglish()

    await viewer.click(screen.getByRole('button', { name: /My Works/ }))
    expect(await screen.findByText(/No works yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Creating/ })).toBeInTheDocument()
  })
})

describe('CreationStudio 边界降级', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApiFetch.mockReset()
    composeMock.mockReset()
    setupClipboard()
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vi.fn() })
  })

  it('三种模式遇到空歌词结果时均记录错误且不创建作品', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onCreateTrack = vi.fn()
    mockApiFetch.mockResolvedValue({ success: true })
    const { props: studioProps } = (() => {
      const p = props({ onCreateTrack })
      render(createElement(CreationStudio, p))
      return { props: p }
    })()

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await viewer.click(await screen.findByRole('button', { name: /一键创作/ }))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Quick create failed:', expect.any(Error)))

    await viewer.click(document.querySelector('.lucide-arrow-left')!.closest('button')!)
    await viewer.click(await screen.findByRole('button', { name: /大师写歌/ }))
    await viewer.click(await screen.findByRole('button', { name: /开始创作/ }))
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Master create failed:', expect.any(Error))
    )

    await viewer.click(document.querySelector('.lucide-arrow-left')!.closest('button')!)
    await viewer.click(await screen.findByRole('button', { name: /热歌改编/ }))
    await viewer.click((await screen.findByText(DEMO_PLAYLIST[0].title)).closest('button')!)
    await viewer.click(screen.getByRole('button', { name: /开始改编/ }))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Remix failed:', expect.any(Error)))

    expect(onCreateTrack).not.toHaveBeenCalled()
    expect(studioProps.onHaptic).toHaveBeenCalledWith('medium')
  })

  it('大师模式登录用户可用 SP 解锁付费主题', async () => {
    const viewer = userEvent.setup()
    const onStarPowerUpdate = vi.fn()
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/user/u1/unlocked-themes') return { themes: ['energetic'] }
      if (url === '/starpower/u1/consume') return { success: true, starPower: 300 }
      return {}
    })
    render(createElement(CreationStudio, props({
      user: { id: 'u1', name: 'Tester' },
      starPower: 500,
      onStarPowerUpdate,
    })))

    await viewer.click(screen.getByRole('button', { name: /大师写歌/ }))
    await screen.findByText('情绪基调')
    await waitFor(() => expect(screen.getAllByText('200SP')).toHaveLength(1))

    await viewer.click(screen.getByText('爱情').closest('button')!)
    await waitFor(() => expect(onStarPowerUpdate).toHaveBeenCalledWith(300))
    await waitFor(() => expect(screen.queryAllByText('200SP')).toHaveLength(0))
  })

  it('改编模式登录用户可用 SP 解锁付费风格', async () => {
    const viewer = userEvent.setup()
    const onStarPowerUpdate = vi.fn()
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/user/u1/unlocked-themes') return { themes: [] }
      if (url === '/starpower/u1/consume') return { success: true, starPower: 100 }
      return {}
    })
    render(createElement(CreationStudio, props({
      user: { id: 'u1', name: 'Tester' },
      starPower: 500,
      onStarPowerUpdate,
    })))

    await viewer.click(screen.getByRole('button', { name: /热歌改编/ }))
    await screen.findByText('改编风格')
    await waitFor(() => expect(screen.getAllByText('200SP')).toHaveLength(2))

    await viewer.click(screen.getByText('爱情').closest('button')!)
    await waitFor(() => expect(onStarPowerUpdate).toHaveBeenCalledWith(100))
    await waitFor(() => expect(screen.getAllByText('200SP')).toHaveLength(1))
  })

  it('损坏的本地存储不会导致崩溃', async () => {
    const viewer = userEvent.setup()
    localStorage.setItem('d-music-works', '{not-json')
    localStorage.setItem('dmusic-unlocked-themes', '{not-json')
    mockApiFetch.mockResolvedValue({})
    render(createElement(CreationStudio, props()))

    await viewer.click(screen.getByRole('button', { name: /作品管理/ }))
    expect(await screen.findByText(/还没有创作作品/)).toBeInTheDocument()
  })

  it('登录用户迁移时遇到损坏缓存会静默降级', async () => {
    const viewer = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('dmusic-unlocked-themes', '{not-json')
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/user/u1/unlocked-themes') return { themes: [] }
      return {}
    })
    render(createElement(CreationStudio, props({ user: { id: 'u1', name: 'Tester' } })))

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    expect(screen.getAllByText('200SP')).toHaveLength(2)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('登录用户接口失败且缓存损坏时保持默认锁定', async () => {
    const viewer = userEvent.setup()
    localStorage.setItem('dmusic-unlocked-themes', '{not-json')
    mockApiFetch.mockRejectedValue(new Error('network down'))
    render(createElement(CreationStudio, props({ user: { id: 'u1', name: 'Tester' } })))

    await viewer.click(screen.getByRole('button', { name: /极简写歌/ }))
    await screen.findByPlaceholderText('输入关键词，用逗号分隔...')
    expect(screen.getAllByText('200SP')).toHaveLength(2)
  })
})
