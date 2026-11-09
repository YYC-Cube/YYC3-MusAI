/**
 * @file ForkTree 创作分支树测试
 * @description 覆盖作品列表、树构建/递归渲染、歌词展开、返回、刷新、回退根节点、空态与错误态
 */
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { ForkTree } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>

const works = [
  {
    id: 'root1',
    title: 'Root Song',
    theme: 'happy',
    authorName: 'Alice',
    authorId: 'u1',
    likes: 5,
    lyrics: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'],
    createdAt: Date.now(),
  },
  {
    id: 'fork1',
    title: 'Fork One',
    authorName: 'Bob',
    authorId: 'u2',
    parentWorkId: 'root1',
    likes: 0,
    createdAt: Date.now(),
  },
  {
    id: 'fork2',
    title: 'Fork Two',
    authorName: 'Cara',
    authorId: 'u3',
    parentWorkId: 'root1',
    createdAt: Date.now(),
  },
  {
    id: 'grand',
    title: 'Grand Child',
    authorName: 'Dan',
    authorId: 'u4',
    parentWorkId: 'fork1',
    createdAt: Date.now(),
  },
  {
    id: 'root2',
    title: 'Second Root',
    authorName: 'Eve',
    authorId: 'u5',
    createdAt: Date.now(),
  },
]

function mockApi(overrides: Record<string, unknown> = {}) {
  api.mockImplementation((async (path: string) => {
    if (path === '/shared-works') return { works }
    if (path === '/works/fork-tree/root1') {
      return { rootId: 'root1', tree: works.filter((w) => w.id !== 'root2') }
    }
    if (path === '/works/fork-tree/root2') return { rootId: 'root2', tree: [] }
    return null
  }) as never)
  Object.entries(overrides).forEach(([path, value]) => {
    const original = api.getMockImplementation()!
    api.mockImplementation(((p: string, o?: RequestInit) =>
      p === path ? Promise.resolve(value) : original(p, o)) as never)
  })
}

function setup(over: Record<string, unknown> = {}) {
  const onClose = vi.fn()
  const utils = render(
    createElement(ForkTree, { isOpen: true, onClose, lang: 'zh', ...over })
  )
  return { onClose, ...utils }
}

beforeEach(() => {
  api.mockReset()
  mockApi()
})

describe('ForkTree', () => {
  it('关闭状态不渲染任何内容', () => {
    const { container } = setup({ isOpen: false })
    expect(container.firstChild).toBeNull()
  })

  it('展示根作品列表与作品总数', async () => {
    setup()
    await waitFor(() => expect(screen.getByText('Root Song')).toBeInTheDocument())
    expect(screen.getByText('Second Root')).toBeInTheDocument()
    expect(screen.queryByText('Fork One')).toBeNull()
    expect(screen.getByText('共 5 个作品')).toBeInTheDocument()
    expect(screen.getByText(/Alice/)).toBeInTheDocument()
  })

  it('打开分支树并递归渲染各层级、徽章与歌词', async () => {
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByText('Root Song')).toBeInTheDocument())

    await viewer.click(screen.getByText('Root Song'))
    await waitFor(() => expect(screen.getByText('原创')).toBeInTheDocument())

    expect(screen.getAllByText('改编').length).toBe(3)
    expect(screen.getByText('Fork One')).toBeInTheDocument()
    expect(screen.getByText('Grand Child')).toBeInTheDocument()
    expect(screen.getByText(/个节点/)).toBeInTheDocument()
    expect(screen.getAllByText(/个分支/).length).toBeGreaterThan(0)

    // 展开根节点歌词（7 行 → 6 行 + more）
    await viewer.click(screen.getByText('Root Song'))
    await waitFor(() => expect(screen.getByText('l1')).toBeInTheDocument())
    expect(screen.getByText('...(1 more)')).toBeInTheDocument()

    // 再次点击取消选中
    await viewer.click(screen.getByText('Root Song'))
    await waitFor(() => expect(screen.queryByText('l1')).toBeNull())
  })

  it('返回列表并重置选中状态', async () => {
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByText('Root Song')).toBeInTheDocument())
    await viewer.click(screen.getByText('Root Song'))
    await waitFor(() => expect(screen.getByText('返回列表')).toBeInTheDocument())

    await viewer.click(screen.getByText('返回列表'))
    expect(screen.getByText('Second Root')).toBeInTheDocument()
  })

  it('空树展示暂无分支提示（根节点回退到作品列表）', async () => {
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByText('Second Root')).toBeInTheDocument())

    await viewer.click(screen.getByText('Second Root'))
    await waitFor(() => expect(screen.getByText('该作品暂无改编分支')).toBeInTheDocument())
    expect(screen.getByText('1 个节点')).toBeInTheDocument()
  })

  it('刷新按钮重新拉取作品列表', async () => {
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(api).toHaveBeenCalledWith('/shared-works'))
    const before = api.mock.calls.filter((c) => c[0] === '/shared-works').length
    const refreshBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.querySelector('svg.lucide-refresh-cw')
    )!
    await viewer.click(refreshBtn)
    await waitFor(() =>
      expect(api.mock.calls.filter((c) => c[0] === '/shared-works').length).toBe(before + 1)
    )
  })

  it('拉取作品失败时记录错误并展示空态', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockRejectedValue(new Error('down') as never)
    setup()
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[ForkTree] Fetch works error:', expect.any(Error)))
    expect(screen.getByText('暂无共享作品')).toBeInTheDocument()
    errorSpy.mockRestore()
  })

  it('打开分支树失败时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.mockImplementation((async (path: string) => {
      if (path === '/shared-works') return { works }
      if (path.startsWith('/works/fork-tree/')) throw new Error('tree down')
      return null
    }) as never)
    const viewer = userEvent.setup()
    setup()
    await waitFor(() => expect(screen.getByText('Root Song')).toBeInTheDocument())
    await viewer.click(screen.getByText('Root Song'))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[ForkTree] Fetch tree error:', expect.any(Error)))
    errorSpy.mockRestore()
  })

  it('空作品列表展示空态', async () => {
    api.mockResolvedValue({ works: [] } as never)
    setup()
    await waitFor(() => expect(screen.getByText('暂无共享作品')).toBeInTheDocument())
  })

  it('遮罩与关闭按钮触发 onClose，面板阻止冒泡', async () => {
    const viewer = userEvent.setup()
    const { container, onClose } = setup()
    const overlay = container.querySelector('.fixed.inset-0.z-50')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)

    const closeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.querySelector('svg.lucide-x')
    )!
    await viewer.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('英文语言渲染英文文案', async () => {
    setup({ lang: 'en' })
    await waitFor(() => expect(screen.getByText('Collaboration Fork Tree')).toBeInTheDocument())
    expect(screen.getByText('Visualize adaptation relationships')).toBeInTheDocument()
    expect(screen.getByText('Second Root')).toBeInTheDocument()
  })
})
