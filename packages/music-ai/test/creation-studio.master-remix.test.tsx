/**
 * @file CreationStudio 大师写歌与热歌改编测试
 * @description 覆盖高级表单、结构/乐器/行数/BPM 控件及两条创作管线的成功与失败分支
 */
import { createElement } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
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

describe('CreationStudio 大师写歌表单', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue({})
    composeMock.mockReset()
    setupClipboard()
  })

  it('编辑关键词、结构与乐器，并调整行数和 BPM 边界', async () => {
    const viewer = userEvent.setup()
    renderStudio()
    await viewer.click(screen.getByRole('button', { name: /大师写歌/ }))

    const kwInput = await screen.findByPlaceholderText('添加关键词...')
    await viewer.type(kwInput, '夏日{enter}')
    await viewer.type(kwInput, '雨')
    await viewer.click(kwInput.parentElement!.querySelector('button')!)
    expect(screen.getByText('夏日')).toBeInTheDocument()
    expect(screen.getByText('雨')).toBeInTheDocument()

    await viewer.type(kwInput, '夏日{enter}')
    expect(screen.getAllByText('夏日')).toHaveLength(1)

    for (let i = 0; i < 7; i += 1) await viewer.type(kwInput, `k${i}{enter}`)
    expect(screen.getByText('(8/8)')).toBeInTheDocument()
    expect(kwInput.parentElement!.querySelector('button')).toBeDisabled()

    await viewer.click(screen.getByText('夏日').closest('span')!.querySelector('button')!)
    expect(screen.queryByText('夏日')).not.toBeInTheDocument()

    await viewer.click(screen.getByText('主歌-桥段').closest('button')!)
    await viewer.click(screen.getByText('AABA经典').closest('button')!)
    await viewer.click(screen.getByText('通谱体').closest('button')!)
    await viewer.click(screen.getByText('主副歌').closest('button')!)

    await viewer.click(screen.getByText('吉他').closest('button')!)
    await viewer.click(screen.getByText('钢琴').closest('button')!)
    for (const name of ['合成器', '弦乐', '鼓', '贝斯']) {
      await viewer.click(screen.getByText(name).closest('button')!)
    }

    const linesSection = screen.getByText('歌词行数').parentElement!
    const [linesMinus, linesPlus] = Array.from(linesSection.querySelectorAll('button'))
    for (let i = 0; i < 5; i += 1) await viewer.click(linesMinus)
    expect(within(linesSection).getByText('4')).toBeInTheDocument()
    for (let i = 0; i < 10; i += 1) await viewer.click(linesPlus)
    expect(within(linesSection).getByText('20')).toBeInTheDocument()

    const tempoSection = screen.getByText('速度 BPM').parentElement!
    const [tempoMinus, tempoPlus] = Array.from(tempoSection.querySelectorAll('button'))
    for (let i = 0; i < 6; i += 1) await viewer.click(tempoMinus)
    expect(within(tempoSection).getByText('60')).toBeInTheDocument()
    for (let i = 0; i < 20; i += 1) await viewer.click(tempoPlus)
    expect(within(tempoSection).getByText('200')).toBeInTheDocument()

    // 未登录时点击付费主题不会解锁
    await viewer.click(screen.getByText('爱情').closest('button')!)
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('无编曲参数时创建大师作品并支持复制歌词', async () => {
    const viewer = userEvent.setup()
    const writeText = setupClipboard()
    const onCreateTrack = vi.fn()
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics: ['M1', 'M2'] }
      if (url === '/ai/compose') return { success: true }
      return {}
    })
    const { props } = renderStudio({ onCreateTrack })

    await viewer.click(screen.getByRole('button', { name: /大师写歌/ }))
    await viewer.click(await screen.findByRole('button', { name: /开始创作/ }))

    expect(await screen.findByText('M1')).toBeInTheDocument()
    await waitFor(() => expect(onCreateTrack).toHaveBeenCalledWith(['M1', 'M2'], 'calm'))
    expect(screen.getByText('大师之作完成!')).toBeInTheDocument()
    expect(props.onHaptic).toHaveBeenCalledWith('success')

    const stored = JSON.parse(localStorage.getItem('d-music-works')!)
    expect(stored[0]).toMatchObject({ title: 'calm · Master Work', mode: 'master' })

    await viewer.click(screen.getByRole('button', { name: /复制/ }))
    expect(writeText).toHaveBeenCalledWith('M1\nM2')
    expect(screen.getByText('已复制')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('开始创作')).toBeInTheDocument(), {
      timeout: 4000,
    })
  })

  it('有编曲参数时合成音频后创建大师作品', async () => {
    const viewer = userEvent.setup()
    const onCreateTrack = vi.fn()
    const composition = { tempo: 96 } as never
    composeMock.mockResolvedValue('blob:master')
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics: ['MS1'] }
      if (url === '/ai/compose') return { success: true, composition }
      return {}
    })
    renderStudio({ onCreateTrack })

    await viewer.click(screen.getByRole('button', { name: /大师写歌/ }))
    await viewer.click(await screen.findByRole('button', { name: /开始创作/ }))

    await waitFor(() =>
      expect(onCreateTrack).toHaveBeenCalledWith(['MS1'], 'calm', 'blob:master', composition)
    )
  })

  it('大师管线失败时记录错误且不创建作品', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onCreateTrack = vi.fn()
    mockApiFetch.mockRejectedValue(new Error('master down'))
    renderStudio({ onCreateTrack })

    await viewer.click(screen.getByRole('button', { name: /大师写歌/ }))
    await viewer.click(await screen.findByRole('button', { name: /开始创作/ }))

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Master create failed:', expect.any(Error)))
    expect(onCreateTrack).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /开始创作/ })).toBeEnabled()
  })
})

describe('CreationStudio 热歌改编', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue({})
    composeMock.mockReset()
    setupClipboard()
  })

  it('选择原曲与目标风格，无编曲参数时降级创建', async () => {
    const viewer = userEvent.setup()
    const writeText = setupClipboard()
    const onCreateTrack = vi.fn()
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics: ['R1', 'R2'] }
      if (url === '/ai/compose') return { success: true }
      return {}
    })
    const { props } = renderStudio({ onCreateTrack })

    await viewer.click(screen.getByRole('button', { name: /热歌改编/ }))
    const remixButton = await screen.findByRole('button', { name: /开始改编/ })
    expect(remixButton).toBeDisabled()

    await viewer.click(screen.getByText(DEMO_PLAYLIST[1].title).closest('button')!)
    expect(remixButton).toBeEnabled()
    await viewer.click(screen.getByText('宁静').closest('button')!)
    await viewer.click(screen.getByText('快乐').closest('button')!)
    // 未登录时点击付费风格不解锁
    await viewer.click(screen.getByText('爱情').closest('button')!)

    await viewer.click(remixButton)
    expect(await screen.findByText('R1')).toBeInTheDocument()
    await waitFor(() => expect(onCreateTrack).toHaveBeenCalledWith(['R1', 'R2'], 'happy'))
    expect(props.onHaptic).toHaveBeenCalledWith('success')

    const expectedKeywords = DEMO_PLAYLIST[1].lyrics
      .slice(1, 5)
      .map((line) => line.text)
      .join(' ')
      .split(' ')
      .filter((word) => word.length > 3)
      .slice(0, 5)
    const lyricsCall = mockApiFetch.mock.calls.find((call) => call[0] === '/ai/lyrics')!
    expect(JSON.parse((lyricsCall[1] as RequestInit).body as string).keywords).toEqual(
      expectedKeywords
    )

    const stored = JSON.parse(localStorage.getItem('d-music-works')!)
    expect(stored[0]).toMatchObject({
      title: `Remix · ${DEMO_PLAYLIST[1].title}`,
      mode: 'remix',
    })

    await viewer.click(screen.getByRole('button', { name: /复制/ }))
    expect(writeText).toHaveBeenCalledWith('R1\nR2')
    expect(screen.getByText('已复制')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('开始改编 (含音频重合成)')).toBeInTheDocument(), {
      timeout: 4000,
    })
  })

  it('有编曲参数时合成音频后创建改编作品', async () => {
    const viewer = userEvent.setup()
    const onCreateTrack = vi.fn()
    const composition = { tempo: 140 } as never
    composeMock.mockResolvedValue('blob:remix')
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/ai/lyrics') return { success: true, lyrics: ['RS1'] }
      if (url === '/ai/compose') return { success: true, composition }
      return {}
    })
    renderStudio({ onCreateTrack })

    await viewer.click(screen.getByRole('button', { name: /热歌改编/ }))
    await viewer.click(await screen.findByText(DEMO_PLAYLIST[0].title).then((el) => el.closest('button')!))
    await viewer.click(screen.getByRole('button', { name: /开始改编/ }))

    await waitFor(() =>
      expect(onCreateTrack).toHaveBeenCalledWith(['RS1'], 'energetic', 'blob:remix', composition)
    )
  })

  it('改编失败时记录错误并恢复按钮', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onCreateTrack = vi.fn()
    mockApiFetch.mockRejectedValue(new Error('remix down'))
    renderStudio({ onCreateTrack })

    await viewer.click(screen.getByRole('button', { name: /热歌改编/ }))
    await viewer.click(await screen.findByText(DEMO_PLAYLIST[0].title).then((el) => el.closest('button')!))
    await viewer.click(screen.getByRole('button', { name: /开始改编/ }))

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Remix failed:', expect.any(Error)))
    expect(onCreateTrack).not.toHaveBeenCalled()
  })
})
