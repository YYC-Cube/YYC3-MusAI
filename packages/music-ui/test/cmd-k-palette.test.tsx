/**
 * @file CmdKPalette 命令面板测试（W7 收编组件补测，基于 cmdk 1.1.1）
 * @description 覆盖受控开关（open 缺省关闭 / Escape 关闭）、静态命令组渲染、cmdk 默认过滤、
 *              输入触发 /api/search 全局搜索（含 URL 编码）、空白输入不搜索、搜索结果渲染与
 *              选择回调、无匹配 CommandEmpty、fetch 失败兜底、children 注入。
 *              jsdom 兼容处理：cmdk CommandList 内部使用 ResizeObserver（守卫式 stub）；
 *              组件用全局 fetch → vi.stubGlobal 与 vi.unstubAllGlobals 成对。
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// RTL 挂载手动清理：源仓 vitest 不依赖 globals auto-cleanup（W7-P2-3 环境自足化）
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// jsdom 缺失浏览器 API 守卫（W7-P2-3 环境自足化；守卫式，不覆盖宿主已有实现）
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}


import { createElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CmdKPalette } from '../src'

const SEARCH_RESULTS = [
  { id: 'song-1', type: 'song', title: 'Cosmic Dreams', subtitle: 'Nova', artwork: 'https://example.com/a.png' },
  { id: 'song-2', type: 'song', title: 'Starlight', subtitle: 'Echo' },
]

function setup(over: { open?: boolean; onOpenChange?: (open: boolean) => void; children?: unknown } = {}) {
  const onOpenChange = over.onOpenChange ?? vi.fn()
  const utils = render(
    createElement(CmdKPalette, {
      open: true,
      onOpenChange,
      ...over,
    })
  )
  return { onOpenChange, ...utils }
}

describe('CmdKPalette 开关', () => {
  it('open 缺省（false）时不渲染 dialog', () => {
    const { container } = render(createElement(CmdKPalette, {}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.querySelector('[cmdk-root]')).toBeNull()
  })

  it('受控 open=true 渲染 dialog、静态命令组与搜索输入框', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByPlaceholderText('搜索命令（⌘K / Ctrl+K）')).toBeInTheDocument()
    // 播放控制组
    expect(screen.getByText('播放控制')).toBeInTheDocument()
    expect(screen.getByText('播放/暂停')).toBeInTheDocument()
    expect(screen.getByText('下一首')).toBeInTheDocument()
    expect(screen.getByText('上一首')).toBeInTheDocument()
    // 视图组
    expect(screen.getByText('视图')).toBeInTheDocument()
    expect(screen.getByText('切换歌词')).toBeInTheDocument()
    expect(screen.getByText('切换迷你播放器')).toBeInTheDocument()
    // 未输入时无搜索结果分组与 Empty
    expect(screen.queryByText('搜索结果')).not.toBeInTheDocument()
    expect(screen.queryByText('没有匹配的命令')).not.toBeInTheDocument()
  })

  it('Escape 触发 onOpenChange(false)', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = setup()
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('className 透传到 CommandList，children 注入列表尾部', () => {
    setup({
      children: createElement('div', { 'data-testid': 'custom-child' }, '自定义分组'),
    })
    // Radix Portal 挂载在 document.body（不在 RTL container 内）
    const list = document.querySelector('[cmdk-list]')
    expect(list).toHaveClass('w-full', 'max-w-md')
    expect(screen.getByTestId('custom-child')).toBeInTheDocument()
  })
})

describe('CmdKPalette 过滤', () => {
  it('输入命中 item value 时保留命中项、过滤未命中项（cmdk 默认过滤）', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({ json: async () => ({ results: [] }) }))
    vi.stubGlobal('fetch', fetchMock)
    setup()

    await user.type(screen.getByPlaceholderText('搜索命令（⌘K / Ctrl+K）'), 'lyrics')
    await waitFor(() => expect(screen.getByText('切换歌词')).toBeInTheDocument())
    expect(screen.queryByText('播放/暂停')).not.toBeInTheDocument()
  })

  it('查询无任何命中时显示具体「没有搜索结果」反馈而非通用 CommandEmpty', async () => {
    // W8 修复后：「没有搜索结果」以当前查询为 value，始终通过过滤可见；
    // cmdk 因存在匹配项而不再渲染通用 CommandEmpty——用户得到更具体反馈
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({ json: async () => ({ results: [] }) }))
    vi.stubGlobal('fetch', fetchMock)
    setup()

    await user.type(screen.getByPlaceholderText('搜索命令（⌘K / Ctrl+K）'), 'zzzz')
    await waitFor(() => expect(screen.getByText('没有搜索结果')).toBeInTheDocument())
    expect(screen.queryByText('没有匹配的命令')).not.toBeInTheDocument()
  })

  it('按歌名查询时搜索结果可见（修复前被 cmdk 默认过滤吞掉）', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        results: [{ id: 'song-1', type: 'song', title: '夜航星', subtitle: '专辑 A' }],
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    setup()

    // 查询为标题文本、与 id 完全无关——修复前 value=result.id 不命中 → 结果/空态全部不可见
    await user.type(screen.getByPlaceholderText('搜索命令（⌘K / Ctrl+K）'), '夜航星')
    await waitFor(() => expect(screen.getByText('夜航星')).toBeInTheDocument())
  })
})

describe('CmdKPalette 全局搜索', () => {
  const INPUT_PLACEHOLDER = '搜索命令（⌘K / Ctrl+K）'

  it('输入触发 /api/search 并对查询做 URL 编码', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({ json: async () => ({ results: [] }) }))
    vi.stubGlobal('fetch', fetchMock)
    setup()

    await user.type(screen.getByPlaceholderText(INPUT_PLACEHOLDER), 'cosmic dreams')
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/search?q=cosmic%20dreams')
    )
    // 每次击键触发一次搜索（逐字符）
    expect(fetchMock).toHaveBeenCalledWith('/api/search?q=c')
  })

  it('搜索结果命中 item value 时渲染结果分组、封面与副标题', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({ json: async () => ({ results: SEARCH_RESULTS }) }))
    vi.stubGlobal('fetch', fetchMock)
    setup()

    // 查询 "song" 与结果 id（song-1/song-2）前缀匹配 → cmdk 过滤后可见
    await user.type(screen.getByPlaceholderText(INPUT_PLACEHOLDER), 'song')
    await waitFor(() => expect(screen.getByText('Cosmic Dreams')).toBeInTheDocument())
    expect(screen.getByText('搜索结果')).toBeInTheDocument()
    expect(screen.getByText('Starlight')).toBeInTheDocument()
    expect(screen.getByText('Nova')).toBeInTheDocument()
    // img 带 alt=""（ARIA 里为 presentation 角色）→ 直接查 img 元素
    const img = document.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://example.com/a.png')
  })

  it('点击搜索结果触发 onSelectSearchResult 并关闭面板', async () => {
    const user = userEvent.setup()
    const onSelectSearchResult = vi.fn()
    const fetchMock = vi.fn(async () => ({ json: async () => ({ results: SEARCH_RESULTS }) }))
    vi.stubGlobal('fetch', fetchMock)
    const { onOpenChange } = setup({ onSelectSearchResult })

    await user.type(screen.getByPlaceholderText(INPUT_PLACEHOLDER), 'song')
    await waitFor(() => expect(screen.getByText('Cosmic Dreams')).toBeInTheDocument())
    await user.click(screen.getByText('Cosmic Dreams'))
    expect(onSelectSearchResult).toHaveBeenCalledTimes(1)
    expect(onSelectSearchResult).toHaveBeenCalledWith(SEARCH_RESULTS[0])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('未传 onSelectSearchResult 时点击结果仅关闭面板不崩溃', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({ json: async () => ({ results: SEARCH_RESULTS }) }))
    vi.stubGlobal('fetch', fetchMock)
    const { onOpenChange } = setup({})

    await user.type(screen.getByPlaceholderText(INPUT_PLACEHOLDER), 'song')
    await waitFor(() => expect(screen.getByText('Cosmic Dreams')).toBeInTheDocument())
    await user.click(screen.getByText('Cosmic Dreams'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('空白输入不发起搜索且不渲染搜索结果分组', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async () => ({ json: async () => ({ results: SEARCH_RESULTS }) }))
    vi.stubGlobal('fetch', fetchMock)
    setup()

    await user.type(screen.getByPlaceholderText(INPUT_PLACEHOLDER), '   ')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText('搜索结果')).not.toBeInTheDocument()
  })

  it('fetch 失败记录错误并显示具体空态兜底', async () => {
    const user = userEvent.setup()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchMock = vi.fn(async () => {
      throw new Error('network down')
    })
    vi.stubGlobal('fetch', fetchMock)
    setup()

    await user.type(screen.getByPlaceholderText(INPUT_PLACEHOLDER), 'song')
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('[CmdK] Search error:', expect.any(Error)))
    await waitFor(() => expect(screen.getByText('没有搜索结果')).toBeInTheDocument())
    errorSpy.mockRestore()
  })
})

describe('CmdKPalette 全局快捷键（W8 内置 ⌘K）', () => {
  const fireMetaK = (ctrl = false) =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: !ctrl,
        ctrlKey: ctrl,
        bubbles: true,
      })
    )

  it('受控关闭态按 ⌘K 触发 onOpenChange(true)', () => {
    const onOpenChange = vi.fn()
    render(createElement(CmdKPalette, { open: false, onOpenChange }))
    fireMetaK()
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('受控开启态按 Ctrl+K 触发 onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    render(createElement(CmdKPalette, { open: true, onOpenChange }))
    fireMetaK(true)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disableShortcut 时不响应 ⌘K', () => {
    const onOpenChange = vi.fn()
    render(createElement(CmdKPalette, { open: false, onOpenChange, disableShortcut: true }))
    fireMetaK()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('非受控用法：⌘K 直接开合 dialog', async () => {
    const onOpenChange = vi.fn()
    render(createElement(CmdKPalette, { onOpenChange }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireMetaK()
    // 事件在 act 外派发，React 批处理异步提交 → 用 waitFor 等待提交
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(onOpenChange).toHaveBeenCalledWith(true)
    fireMetaK()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
})
