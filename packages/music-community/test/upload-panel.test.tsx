/**
 * @file UploadPanel 媒体上传面板测试
 * @description 覆盖我的上传列表、预览/删除、拖拽与文件选择、批量队列元数据编辑、
 *              单文件/分块上传的成功与失败、歌词编辑器（加载/增删改/排序/LRC 导入/保存/音频同步）
 *              以及英文文案
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { UploadPanel } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>

function makeFile(name = 'song.mp3', type = 'audio/mpeg', size = 2048) {
  return new File([new Uint8Array(size)], name, { type })
}

function media(over: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    userId: 'u1',
    userName: 'Alice',
    title: 'My Track',
    artist: 'Alice',
    album: 'Album',
    genre: 'Other',
    duration: 125,
    description: '',
    mimeType: 'audio/mpeg',
    mediaType: 'audio',
    filePath: 'p',
    fileSize: 2048,
    coverPath: null,
    isPublic: true,
    tags: [],
    plays: 0,
    likes: 0,
    createdAt: Date.now(),
    signedUrl: null,
    coverSignedUrl: null,
    ...over,
  }
}

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const onUploadComplete = vi.fn()
  const utils = render(
    createElement(UploadPanel, {
      onClose,
      userId: 'u1',
      userName: 'Alice',
      lang: 'zh',
      onUploadComplete,
      ...over,
    })
  )
  return { onClose, onUploadComplete, ...utils }
}

function findButtonByIcon(container: HTMLElement, icon: string) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.querySelector(`svg.lucide-${icon}`)
  )
}

/** 在我的上传卡片内查找图标按钮，避免命中标签页图标 */
function findListButton(container: HTMLElement, icon: string) {
  for (const card of Array.from(container.querySelectorAll('.group'))) {
    const btn = Array.from(card.querySelectorAll('button')).find((b) =>
      b.querySelector(`svg.lucide-${icon}`)
    )
    if (btn) return btn as HTMLButtonElement
  }
  throw new Error(`list button ${icon} not found`)
}

function mockApi(overrides: Array<[string, unknown]>) {
  api.mockImplementation((async (path: string, options?: RequestInit) => {
    for (const [key, value] of overrides) {
      if (path === key || path.startsWith(`${key}?`) || (options?.method && path === key)) {
        return typeof value === 'function' ? (value as Function)(path, options) : value
      }
    }
    if (path.startsWith('/upload/media?userId=')) return { media: [] }
    return null
  }) as never)
}

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:mock'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  })
  const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true,
    get() {
      return srcDescriptor?.get ? srcDescriptor.get.call(this) : ''
    },
    set(value: string) {
      srcDescriptor?.set?.call(this, value)
      Object.defineProperty(this, 'duration', { configurable: true, value: 125.4 })
      setTimeout(() => this.onloadedmetadata?.(new Event('loadedmetadata') as never), 0)
    },
  })
})

beforeEach(() => {
  api.mockReset()
  mockApi([])
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(() => Promise.resolve()),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  })
})

describe('UploadPanel 基础与上传列表', () => {
  it('渲染标题与三个标签页，切换到列表展示空态', async () => {
    const viewer = userEvent.setup()
    setup()
    expect(screen.getAllByText('上传音乐/视频').length).toBeGreaterThan(0)
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    await waitFor(() => expect(screen.getByText('暂无上传')).toBeInTheDocument())
  })

  it('加载上传列表时展示加载态', async () => {
    api.mockReturnValue(new Promise(() => {}) as never)
    const viewer = userEvent.setup()
    setup()
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('渲染音频/视频条目、封面、大小与时长', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string) => {
      if (path.startsWith('/upload/media?userId=')) {
        return {
          media: [
            media({ id: 'a1', title: 'Audio With Cover', fileSize: 1536, duration: 125, coverSignedUrl: 'http://cover', signedUrl: 'http://audio' }),
            media({ id: 'v1', title: 'Clip', mediaType: 'video', duration: 0, fileSize: 500000 }),
            media({ id: 'a2', title: 'Bare Audio', duration: 0 }),
          ],
        }
      }
      return null
    }) as never)
    const { container } = setup()
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    await waitFor(() => expect(screen.getByText('Audio With Cover')).toBeInTheDocument())

    expect(container.querySelector('img[src="http://cover"]')).not.toBeNull()
    expect(screen.getByText('1.5KB')).toBeInTheDocument()
    expect(screen.getByText('2:05')).toBeInTheDocument()
    expect(screen.getByText('488.3KB')).toBeInTheDocument()
    expect(container.querySelector('svg.lucide-video')).not.toBeNull()
    expect(container.querySelector('svg.lucide-music')).not.toBeNull()
  })

  it('加载列表失败记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockRejectedValue(new Error('list down') as never)
    setup()
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('[Upload] Failed to load uploads:', expect.any(Error))
    )
    errorSpy.mockRestore()
  })

  it('音频预览可播放并再次点击暂停', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string) => {
      if (path.startsWith('/upload/media?userId=')) {
        return { media: [media({ signedUrl: 'http://audio' })] }
      }
      return null
    }) as never)
    const { container } = setup()
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    await waitFor(() => expect(screen.getByText('My Track')).toBeInTheDocument())

    const preview = container.querySelector('svg.lucide-play')!.closest('button') as HTMLButtonElement
    fireEvent.click(preview)
    expect(container.querySelector('svg.lucide-pause')).not.toBeNull()
    fireEvent.click(container.querySelector('svg.lucide-pause')!.closest('button') as HTMLButtonElement)
    expect(container.querySelector('svg.lucide-play')).not.toBeNull()
  })

  it('删除成功移除条目，失败与异常时保留', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path.startsWith('/upload/media?userId=')) {
        return { media: [media({ id: 'a1' }), media({ id: 'a2', title: 'Second' })] }
      }
      if (path === '/upload/media/a1' && options?.method === 'DELETE') return { success: true }
      if (path === '/upload/media/a2' && options?.method === 'DELETE') throw new Error('del fail')
      return null
    }) as never)
    const { container } = setup()
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    await waitFor(() => expect(screen.getByText('My Track')).toBeInTheDocument())

    fireEvent.click(findListButton(container, 'trash-2'))
    await waitFor(() => expect(screen.queryByText('My Track')).toBeNull())
    expect(screen.getByText('Second')).toBeInTheDocument()

    fireEvent.click(findListButton(container, 'trash-2'))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[Upload] Delete error:', expect.any(Error)))
    expect(screen.getByText('Second')).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('点击歌词入口进入歌词编辑并显示目标信息', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [media()] }
      if (path.endsWith('/lyrics')) return { lyrics: [] }
      return null
    }) as never)
    const { container } = setup()
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    await waitFor(() => expect(screen.getByText('My Track')).toBeInTheDocument())
    fireEvent.click(findListButton(container, 'pen-line'))
    expect(screen.getByText('Alice · 2:05')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /添加一行/ })).toBeInTheDocument())
    expect(screen.getByText('暂无歌词，点击添加')).toBeInTheDocument()
  })
})

describe('UploadPanel 文件选择与队列', () => {
  it('点击拖拽区触发隐藏文件输入', () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const { container } = setup()
    fireEvent.click(container.querySelector('.border-dashed')!)
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('拖入/离开切换拖拽样式，拖放文件加入队列', async () => {
    const { container } = setup()
    const zone = container.querySelector('.border-dashed')!
    fireEvent.dragOver(zone)
    expect(zone.className).toContain('border-violet-400')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-violet-400')

    fireEvent.drop(zone, { dataTransfer: { files: [makeFile('dropped.mp3')] } })
    await waitFor(() => expect(screen.getByText('dropped')).toBeInTheDocument())
  })

  it('选择单个文件自动展开并允许编辑元数据、封面与可见性', async () => {
    const viewer = userEvent.setup()
    const { container } = setup()
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('song.mp3')] } })

    await waitFor(() => expect(screen.getByText('song')).toBeInTheDocument())
    expect(screen.getByText('1 个文件就绪')).toBeInTheDocument()
    expect(screen.getByText('2:05')).toBeInTheDocument()

    const titleInput = screen.getByPlaceholderText('标题')
    expect(titleInput).toHaveValue('song')
    await viewer.clear(titleInput)
    await viewer.type(titleInput, 'Edited Title')
    await viewer.type(screen.getByPlaceholderText('艺术家'), ' - Artist')
    await viewer.type(screen.getByPlaceholderText('专辑'), ' - Album')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Jazz' } })
    await viewer.type(screen.getByPlaceholderText('标签（逗号分隔）'), 'pop, rock')

    await viewer.click(screen.getByText('私密'))
    await viewer.click(screen.getByText('公开'))

    const coverInput = container.querySelector('input[accept=".jpg,.jpeg,.png,.webp"]') as HTMLInputElement
    fireEvent.change(coverInput, { target: { files: [makeFile('a.png', 'image/png', 1024)] } })
    await waitFor(() => expect(container.querySelector('img[src="blob:mock"]')).not.toBeNull())

    const coverWrapper = container.querySelector('img[src="blob:mock"]')!.parentElement!
    fireEvent.click(coverWrapper.querySelector('button')!)
    await waitFor(() => expect(container.querySelector('img[src="blob:mock"]')).toBeNull())

    expect(screen.getByText('Edited Title')).toBeInTheDocument()
  })

  it('忽略超大与不支持格式的文件；多文件不自动展开', async () => {
    const { container } = setup()
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [makeFile('huge.mp3', 'audio/mpeg', 11 * 1024 * 1024), makeFile('doc.txt', 'text/plain', 10)] },
    })
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.queryByText(/个文件就绪/)).toBeNull()

    fireEvent.change(input, {
      target: { files: [makeFile('a.mp3'), makeFile('b.mp3')] },
    })
    await waitFor(() => expect(screen.getByText('2 个文件就绪')).toBeInTheDocument())
    expect(screen.queryByPlaceholderText('标题')).toBeNull()
  })

  it('可移除单个文件与清空队列', async () => {
    const { container } = setup()
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('a.mp3'), makeFile('b.mp3')] } })
    await waitFor(() => expect(screen.getByText('a')).toBeInTheDocument())

    const card = screen.getByText('a').closest('div.rounded-xl') as HTMLElement
    fireEvent.click(card.querySelector('svg.lucide-x')!.closest('button')!)
    await waitFor(() => expect(screen.queryByText('a')).toBeNull())
    expect(screen.getByText('b')).toBeInTheDocument()

    fireEvent.click(screen.getByText('清空队列'))
    await waitFor(() => expect(screen.queryByText('b')).toBeNull())
  })

  it('单文件上传成功：携带元数据并回调、更新列表', async () => {
    const viewer = userEvent.setup()
    const { container, onUploadComplete } = setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [] }
      if (path === '/upload/media' && options?.method === 'POST') {
        return { success: true, media: media({ id: 'new1', title: 'song' }) }
      }
      return null
    }) as never)

    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [makeFile('song.mp3')] },
    })
    await waitFor(() => expect(screen.getByText('song')).toBeInTheDocument())

    // 编辑标题、标签与封面后上传
    const titleInput = screen.getByPlaceholderText('标题')
    await viewer.clear(titleInput)
    await viewer.type(titleInput, 'Final Title')
    await viewer.type(screen.getByPlaceholderText('标签（逗号分隔）'), 'pop, rock，jazz')
    fireEvent.change(container.querySelector('input[accept=".jpg,.jpeg,.png,.webp"]') as HTMLInputElement, {
      target: { files: [makeFile('c.png', 'image/png', 1024)] },
    })
    await waitFor(() => expect(container.querySelector('img[src="blob:mock"]')).not.toBeNull())

    await viewer.click(screen.getByRole('button', { name: /全部上传 \(1\)/ }))
    await waitFor(() => expect(screen.getByText('全部完成')).toBeInTheDocument())
    expect(onUploadComplete).toHaveBeenCalledWith(expect.objectContaining({ id: 'new1' }))

    const call = api.mock.calls.find((c) => c[0] === '/upload/media' && c[1]?.method === 'POST')!
    const body = JSON.parse((call[1] as RequestInit).body as string)
    expect(body).toEqual(
      expect.objectContaining({
        title: 'Final Title',
        artist: 'Alice',
        album: 'My Collection',
        genre: 'Other',
        tags: ['pop', 'rock', 'jazz'],
        isPublic: true,
        userId: 'u1',
        userName: 'Alice',
        mimeType: 'audio/mpeg',
      })
    )
    expect(typeof body.fileBase64).toBe('string')
    expect(body.coverMimeType).toBe('image/png')

    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    expect(screen.getByText(/我的上传 \(1\)/)).toBeInTheDocument()
  })

  it('单文件上传返回失败时标记错误', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [] }
      if (path === '/upload/media' && options?.method === 'POST') return { success: false }
      return null
    }) as never)

    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('song.mp3')] } })
    await waitFor(() => expect(screen.getByText('song')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: /全部上传 \(1\)/ }))

    await waitFor(() => expect(screen.getByText('Upload returned no data')).toBeInTheDocument())
    expect(errorSpy).toHaveBeenCalledWith('[Upload] Batch file error:', expect.any(Error))
    errorSpy.mockRestore()
  })

  it('分块上传成功：init → chunks → complete', async () => {
    const viewer = userEvent.setup()
    const { container } = setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [] }
      if (path === '/upload/chunk/init' && options?.method === 'POST') {
        return { success: true, sessionId: 's1', totalChunks: 3 }
      }
      if (/^\/upload\/chunk\/s1$/.test(path) && options?.method === 'POST') return { success: true }
      if (path === '/upload/chunk/s1/complete' && options?.method === 'POST') {
        return { success: true, media: media({ id: 'big1', title: 'big' }) }
      }
      return null
    }) as never)
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('big.mp3', 'audio/mpeg', 1200 * 1024)] } })
    await waitFor(() => expect(screen.getByText('big')).toBeInTheDocument())

    await viewer.click(screen.getByRole('button', { name: /全部上传 \(1\)/ }))
    await waitFor(() => expect(screen.getByText('全部完成')).toBeInTheDocument(), { timeout: 5000 })
    expect(api).toHaveBeenCalledWith('/upload/chunk/init', expect.objectContaining({ method: 'POST' }))
    const chunkCalls = api.mock.calls.filter((c) => c[0] === '/upload/chunk/s1')
    expect(chunkCalls).toHaveLength(3)
    expect(api).toHaveBeenCalledWith('/upload/chunk/s1/complete', expect.objectContaining({ method: 'POST' }))
  })

  it('分块初始化失败时标记错误', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = setup()
    api.mockImplementation((async (path: string) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [] }
      if (path === '/upload/chunk/init') return { success: false }
      return null
    }) as never)
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('big.mp3', 'audio/mpeg', 1200 * 1024)] } })
    await waitFor(() => expect(screen.getByText('big')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: /全部上传 \(1\)/ }))
    await waitFor(() =>
      expect(screen.getByText('Failed to initialize chunked upload session')).toBeInTheDocument()
    )
    errorSpy.mockRestore()
  })

  it('分块上传失败时提示具体块', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = setup()
    let callIndex = 0
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [] }
      if (path === '/upload/chunk/init') return { success: true, sessionId: 's1', totalChunks: 3 }
      if (/^\/upload\/chunk\/s1$/.test(path) && options?.method === 'POST') {
        callIndex += 1
        return { success: callIndex !== 2 }
      }
      return null
    }) as never)
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('big.mp3', 'audio/mpeg', 1200 * 1024)] } })
    await waitFor(() => expect(screen.getByText('big')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: /全部上传 \(1\)/ }))
    await waitFor(() => expect(screen.getByText('Chunk 2/3 upload failed')).toBeInTheDocument(), { timeout: 5000 })
    errorSpy.mockRestore()
  })

  it('分块完成失败时标记错误', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = setup()
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [] }
      if (path === '/upload/chunk/init') return { success: true, sessionId: 's1', totalChunks: 3 }
      if (/^\/upload\/chunk\/s1$/.test(path) && options?.method === 'POST') return { success: true }
      if (path === '/upload/chunk/s1/complete') return { success: false }
      return null
    }) as never)
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('big.mp3', 'audio/mpeg', 1200 * 1024)] } })
    await waitFor(() => expect(screen.getByText('big')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: /全部上传 \(1\)/ }))
    await waitFor(() => expect(screen.getByText('Chunked upload finalization failed')).toBeInTheDocument(), { timeout: 5000 })
    errorSpy.mockRestore()
  })
})

describe('UploadPanel 歌词编辑器', () => {
  async function openEditor(viewer: ReturnType<typeof userEvent.setup>, lyrics: unknown[] = []) {
    api.mockImplementation((async (path: string) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [media()] }
      if (path.endsWith('/lyrics') && path.includes('?')) return { lyrics }
      if (path === '/upload/media/m1/lyrics') return { lyrics }
      return null
    }) as never)
    const utils = setup()
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    await waitFor(() => expect(screen.getByText('My Track')).toBeInTheDocument())
    fireEvent.click(findListButton(utils.container, 'pen-line'))
    await waitFor(() => expect(screen.getByRole('button', { name: /添加一行/ })).toBeInTheDocument())
    return utils
  }

  it('无歌词时展示空态，添加行后可编辑、标记时间、排序与删除', async () => {
    const viewer = userEvent.setup()
    const { container } = await openEditor(viewer)

    expect(screen.getByRole('button', { name: /保存歌词/ })).toBeDisabled()
    await viewer.click(screen.getByRole('button', { name: /添加一行/ }))
    await waitFor(() => expect(container.textContent).toContain('1 行歌词'))
    await viewer.click(screen.getByRole('button', { name: /添加一行/ }))
    await waitFor(() => expect(container.textContent).toContain('2 行歌词'))

    const textInputs = screen.getAllByPlaceholderText('歌词文本')
    await viewer.type(textInputs[0], 'first line')
    await viewer.type(textInputs[1], 'second line')
    await viewer.type(screen.getAllByPlaceholderText('翻译')[0], 'translation')
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'happy' } })
    expect((container.querySelectorAll('select')[0] as HTMLSelectElement).value).toBe('happy')

    // 标记当前时间与排序
    fireEvent.click(screen.getAllByTitle('标记当前时间')[0])
    await viewer.click(screen.getByRole('button', { name: /按时间排序/ }))
    expect(screen.getAllByPlaceholderText('歌词文本')).toHaveLength(2)

    // 删除一行（仅限歌词行内的删除按钮）
    const row = screen.getAllByPlaceholderText('歌词文本')[0].closest('.group') as HTMLElement
    fireEvent.click(row.querySelector('svg.lucide-x')!.closest('button')!)
    await waitFor(() => expect(container.textContent).toContain('1 行歌词'))
  })

  it('导入 LRC 并按时间排序，空输入时导入按钮禁用', async () => {
    const viewer = userEvent.setup()
    const { container } = await openEditor(viewer)

    await viewer.click(screen.getByRole('button', { name: /导入LRC/ }))
    const importBtn = screen.getByRole('button', { name: '导入' })
    expect(importBtn).toBeDisabled()

    const textarea = screen.getByPlaceholderText(/First line of lyrics/)
    fireEvent.change(textarea, {
      target: {
        value: '[00:20.50]Second line\n[00:10.123]First line\ninvalid line',
      },
    })
    await viewer.click(importBtn)
    await waitFor(() => expect(container.textContent).toContain('2 行歌词'))
    const texts = screen.getAllByPlaceholderText('歌词文本') as HTMLInputElement[]
    expect(texts[0]).toHaveValue('First line')
    expect(texts[1]).toHaveValue('Second line')
  })

  it('加载已有歌词并保存成功显示已保存', async () => {
    const viewer = userEvent.setup()
    const { container } = await openEditor(viewer, [
      { time: 1, text: 'existing', translation: '', emotion: 'neutral' },
    ])
    expect(screen.getByDisplayValue('existing')).toBeInTheDocument()

    await viewer.click(screen.getByRole('button', { name: /保存歌词/ }))
    await waitFor(() => expect(screen.getByText('歌词已保存')).toBeInTheDocument())
    expect(api).toHaveBeenCalledWith(
      '/upload/media/m1/lyrics',
      expect.objectContaining({ method: 'PUT' })
    )
    expect(container.querySelector('svg.lucide-check')).not.toBeNull()
  })

  it('保存失败记录错误', async () => {
    const viewer = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string, options?: RequestInit) => {
      if (path.startsWith('/upload/media?userId=')) return { media: [media()] }
      if (path === '/upload/media/m1/lyrics' && options?.method === 'PUT') throw new Error('save fail')
      if (path === '/upload/media/m1/lyrics') return { lyrics: [{ time: 0, text: 'x', translation: '', emotion: 'neutral' }] }
      return null
    }) as never)
    const utils = setup()
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    await waitFor(() => expect(screen.getByText('My Track')).toBeInTheDocument())
    fireEvent.click(findListButton(utils.container, 'pen-line'))
    await waitFor(() => expect(screen.getByDisplayValue('x')).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: /保存歌词/ }))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[Lyrics] Save error:', expect.any(Error)))
    errorSpy.mockRestore()
  })

  it('带音频地址时展示播放条并可播放/暂停与标记时间', async () => {
    const viewer = userEvent.setup()
    api.mockImplementation((async (path: string) => {
      if (path.startsWith('/upload/media?userId=')) {
        return { media: [media({ signedUrl: 'http://audio' })] }
      }
      if (path === '/upload/media/m1/lyrics') return { lyrics: [] }
      return null
    }) as never)
    const utils = setup()
    await viewer.click(screen.getByRole('button', { name: /我的上传/ }))
    await waitFor(() => expect(screen.getByText('My Track')).toBeInTheDocument())
    fireEvent.click(findListButton(utils.container, 'pen-line'))
    await waitFor(() => expect(screen.getByText('暂无歌词，点击添加')).toBeInTheDocument())

    expect(screen.getByText(/点击时间戳标记播放位置/)).toBeInTheDocument()
    fireEvent.click(utils.container.querySelector('svg.lucide-play')!.closest('button')!)
    expect(utils.container.querySelector('svg.lucide-pause')).not.toBeNull()
    fireEvent.click(utils.container.querySelector('svg.lucide-pause')!.closest('button')!)
    expect(utils.container.querySelector('svg.lucide-play')).not.toBeNull()

    await viewer.click(screen.getByRole('button', { name: /添加一行/ }))
    fireEvent.click(screen.getByTitle('标记当前时间'))
    expect(screen.getAllByText('00:00.00').length).toBeGreaterThan(0)
  })

  it('关闭歌词目标回到选择提示并可跳转列表', async () => {
    const viewer = userEvent.setup()
    const { container } = await openEditor(viewer)
    fireEvent.click(container.querySelector('.space-y-3 > .flex button')!)
    await waitFor(() => expect(screen.getByText(/从"我的上传"中选择一首歌来编辑歌词/)).toBeInTheDocument())
    await viewer.click(screen.getByRole('button', { name: '我的上传' }))
    await waitFor(() => expect(screen.getByText('My Track')).toBeInTheDocument())
  })

  it('未选择目标时歌词页展示提示', async () => {
    const viewer = userEvent.setup()
    setup()
    await viewer.click(screen.getByRole('button', { name: /^歌词/ }))
    expect(screen.getByText(/从"我的上传"中选择一首歌来编辑歌词/)).toBeInTheDocument()
  })
})

describe('UploadPanel 其他', () => {
  it('关闭按钮触发 onClose', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    await viewer.click(findButtonByIcon(container, 'x')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('英文语言渲染英文文案', async () => {
    const viewer = userEvent.setup()
    api.mockResolvedValue({ media: [] } as never)
    setup({ lang: 'en' })
    expect(screen.getAllByText('Upload Music / Video').length).toBeGreaterThan(0)
    expect(screen.getByText('Drag & drop files here (batch supported)')).toBeInTheDocument()
    await viewer.click(screen.getByRole('button', { name: /Lyrics/ }))
    expect(screen.getByText('Select a song from "My Uploads" to edit lyrics')).toBeInTheDocument()
  })
})

afterAll(() => {
  vi.unstubAllGlobals()
})
