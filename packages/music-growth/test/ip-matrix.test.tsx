/**
 * @file IPMatrixPanel 深度测试
 * @description 覆盖档案/作品集/数据分析/创作者探索/改编与改编树等分支
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { apiFetch } from '@yyc3/music-utils'
import { IPMatrixPanel } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch)

const user = { id: 'u1', email: 'tester@example.com' }

const workA = {
  workId: 'w1',
  title: '作品一',
  theme: 'happy',
  lyrics: ['第一行'],
  mode: 'quick',
  createdAt: Date.UTC(2025, 0, 2),
  sharedAt: Date.UTC(2025, 0, 3),
  userName: 'tester',
  userId: 'u1',
  likes: 10,
  plays: 20,
}

const workB = {
  workId: 'w2',
  title: '作品二',
  theme: 'mystery',
  lyrics: [],
  mode: 'master',
  createdAt: Date.UTC(2025, 1, 2),
  sharedAt: Date.UTC(2025, 1, 3),
  userName: 'someone',
  likes: 5,
  plays: 7,
}

const workC = {
  workId: 'w3',
  title: '作品三',
  theme: 'sad',
  lyrics: ['a'],
  mode: 'custom',
  createdAt: Date.UTC(2025, 2, 2),
  sharedAt: Date.UTC(2025, 2, 3),
  userName: 'another',
  userId: 'u1',
  likes: 0,
  plays: 0,
}

const allWorks = [workA, workB, workC]

type Handler = (path: string, options?: any) => any

function mockApi(routes: Record<string, Handler | unknown>) {
  api.mockImplementation(async (path: any, options?: any) => {
    const key = `${options?.method ?? 'GET'} ${path}`
    const handler = routes[key] ?? routes[path as string]
    if (handler === undefined) return null
    return typeof handler === 'function' ? handler(path, options) : handler
  })
}

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  user,
  profile: null,
  starPower: 500,
  onOpenCreationStudio: vi.fn(),
}

function openPortfolio() {
  fireEvent.click(screen.getByRole('button', { name: 'ipmatrix.portfolio' }))
}

function openExplore() {
  fireEvent.click(screen.getByRole('button', { name: 'ipmatrix.explore' }))
}

function closeButton() {
  return document.querySelector('.lucide-x')!.closest('button') as HTMLElement
}

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue(null)
  localStorage.clear()
  baseProps.onClose = vi.fn()
  baseProps.onOpenCreationStudio = vi.fn()
})

describe('IPMatrixPanel 基础与档案', () => {
  it('关闭时渲染为空，未登录显示登录提示', () => {
    const { container, rerender } = render(<IPMatrixPanel {...baseProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()

    rerender(<IPMatrixPanel {...baseProps} isOpen user={null} />)
    expect(screen.getByText('ipmatrix.signInRequired')).toBeInTheDocument()

    fireEvent.click(closeButton())
    expect(baseProps.onClose).toHaveBeenCalled()
  })

  it('展示创作者档案、等级、影响力与互动率', async () => {
    mockApi({ 'GET /shared-works': { works: allWorks } })
    render(
      <IPMatrixPanel
        {...baseProps}
        profile={{ displayName: 'DJ Yanyu', joinedAt: Date.UTC(2024, 0, 15) } as any}
      />
    )

    expect(await screen.findByText('DJ Yanyu')).toBeInTheDocument()
    expect(screen.getByText('新手创作者')).toBeInTheDocument()
    expect(screen.getByText(/2024/)).toBeInTheDocument()
    // 2 件本人作品：2*100 + 10*50 + 20*10 + 500*0.5 = 1150
    expect(screen.getByText('1,150')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('无 profile 时回退到邮箱前缀，邮箱缺失时回退 Creator', async () => {
    mockApi({ 'GET /shared-works': { works: allWorks } })
    const { rerender } = render(<IPMatrixPanel {...baseProps} />)
    expect(await screen.findByText('tester')).toBeInTheDocument()
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))

    rerender(<IPMatrixPanel {...baseProps} user={{ id: 'u9' }} />)
    expect(await screen.findByText('Creator')).toBeInTheDocument()
    await waitFor(() => expect(api.mock.calls.length).toBeGreaterThanOrEqual(2))
    // 无匹配作品 → 仅星力加成 500*0.5
    expect(await screen.findByText('250')).toBeInTheDocument()
  })

  it('接口失败时记录错误并保持空态', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApi({ 'GET /shared-works': () => Promise.reject(new Error('boom')) })
    render(<IPMatrixPanel {...baseProps} />)
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('IP Matrix fetch error:', expect.any(Error)))
  })
})

describe('IPMatrixPanel 作品集', () => {
  it('加载中显示 spinner，加载后渲染作品元信息并可进入创作工坊', async () => {
    let resolveWorks: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => {
      resolveWorks = resolve
    })
    mockApi({ 'GET /shared-works': () => pending })
    const works = [
      workA,
      { ...workA, workId: 'w4', title: '作品四', mode: 'master' },
      { ...workA, workId: 'w5', title: '作品五', mode: 'custom', theme: 'mystery', lyrics: undefined },
    ]

    const { container } = render(<IPMatrixPanel {...baseProps} />)
    openPortfolio()
    expect(container.querySelector('.animate-spin')).not.toBeNull()

    await act(async () => {
      resolveWorks({ works })
    })

    expect(await screen.findByText('作品一')).toBeInTheDocument()
    expect(screen.getByText(/ipmatrix\.sharedWorks/)).toBeInTheDocument()
    expect(screen.getByText(/极简模式/)).toBeInTheDocument()
    expect(screen.getByText(/大师模式/)).toBeInTheDocument()
    expect(screen.getByText(/custom/)).toBeInTheDocument()
    expect(screen.getAllByText(/1 行歌词/)).toHaveLength(2)
    expect(screen.getByText(/0 行歌词/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /创作工坊/ }))
    expect(baseProps.onClose).toHaveBeenCalled()
    expect(baseProps.onOpenCreationStudio).toHaveBeenCalled()
  })

  it('无作品时展示空态并可从空态开始创作', async () => {
    mockApi({ 'GET /shared-works': { works: [] } })
    render(<IPMatrixPanel {...baseProps} />)
    openPortfolio()

    expect(await screen.findByText('ipmatrix.noWorks')).toBeInTheDocument()
    expect(screen.getByText('ipmatrix.startCreating')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '开始创作' }))
    expect(baseProps.onOpenCreationStudio).toHaveBeenCalled()
  })

  it('数据分析页展示等级进度与统计卡片', async () => {
    mockApi({ 'GET /shared-works': { works: allWorks } })
    render(<IPMatrixPanel {...baseProps} />)
    await waitFor(() => expect(api.mock.calls.some(([path]) => path === '/shared-works')).toBe(true))

    fireEvent.click(screen.getByRole('button', { name: 'ipmatrix.analytics' }))
    expect(screen.getByText('ipmatrix.creatorLevel')).toBeInTheDocument()
    expect(screen.getAllByText('ipmatrix.influence').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ipmatrix.engagementRate').length).toBeGreaterThan(0)
    expect(screen.getByText('金牌创作者')).toBeInTheDocument()
  })
})

describe('IPMatrixPanel 创作者探索', () => {
  it('展示创作者列表并可查看其作品与返回', async () => {
    mockApi({
      'GET /shared-works': { works: [] },
      'GET /creators': { creators: [{ userName: 'Alice', works: 2, totalLikes: 9, latestWork: 1 }] },
      'GET /creators/Alice/works': {
        works: [
          {
            ...workB,
            userName: 'Alice',
            forkedFrom: { workId: 'w0', author: '原作者', forkedAt: Date.UTC(2025, 0, 1) },
          },
        ],
      },
    })
    render(<IPMatrixPanel {...baseProps} />)
    openExplore()

    expect(await screen.findByText('Alice')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Alice/ }))

    expect(await screen.findByText(/ipmatrix\.forkedFrom/)).toBeInTheDocument()
    expect(screen.getByText(/原作者/)).toBeInTheDocument()
    expect(screen.getByText('mystery')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ipmatrix\.back/ }))
    expect(await screen.findByText('ipmatrix.allCreators')).toBeInTheDocument()
  })

  it('无创作者与创作者无作品时展示空态', async () => {
    mockApi({
      'GET /shared-works': { works: [] },
      'GET /creators': { creators: [] },
    })
    const { rerender } = render(<IPMatrixPanel {...baseProps} />)
    openExplore()
    expect(await screen.findByText('暂无其他创作者')).toBeInTheDocument()

    mockApi({
      'GET /shared-works': { works: [] },
      'GET /creators': { creators: [{ userName: 'Bob', works: 0, totalLikes: 0, latestWork: 0 }] },
      'GET /creators/Bob/works': { works: [] },
    })
    rerender(<IPMatrixPanel {...baseProps} isOpen={false} />)
    rerender(<IPMatrixPanel {...baseProps} />)
    openExplore()
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    expect(await screen.findByText('ipmatrix.noWorks')).toBeInTheDocument()
  })

  it('探索接口失败时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApi({
      'GET /shared-works': { works: [] },
      'GET /creators': () => Promise.reject(new Error('creators down')),
    })
    render(<IPMatrixPanel {...baseProps} />)
    openExplore()
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Creators fetch error:', expect.any(Error))
    )
  })
})

describe('IPMatrixPanel 改编', () => {
  const creatorWork = {
    ...workA,
    userName: 'Alice',
    userId: 'u2',
  }

  async function setupFork(routes: Record<string, Handler | unknown> = {}) {
    mockApi({
      'GET /shared-works': { works: [] },
      'GET /creators': { creators: [{ userName: 'Alice', works: 1, totalLikes: 1, latestWork: 1 }] },
      'GET /creators/Alice/works': { works: [creatorWork] },
      ...routes,
    })
    render(<IPMatrixPanel {...baseProps} />)
    openExplore()
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
  }

  it('改编成功提交作品并记录双方成就', async () => {
    await setupFork({
      'POST /works/fork': { success: true, forkedWork: { ...creatorWork, workId: 'forked' } },
      'POST /achievements/u1/track': {},
      'POST /achievements/u2/track': {},
    })

    const forkButton = await screen.findByTitle('ipmatrix.forkWork')
    fireEvent.click(forkButton)

    await waitFor(() => {
      const forkCall = api.mock.calls.find(([path]) => path === '/works/fork')
      expect(forkCall).toBeTruthy()
      const body = JSON.parse((forkCall![1] as RequestInit).body as string)
      expect(body).toMatchObject({
        originalWorkId: 'w1',
        originalAuthor: 'Alice',
        userId: 'u1',
        userName: 'tester',
        title: '作品一 (改编)',
        theme: 'happy',
      })
    })

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/achievements/u1/track', expect.objectContaining({ method: 'POST' }))
      expect(api).toHaveBeenCalledWith('/achievements/u2/track', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('原作者无 userId 时仅记录改编者成就', async () => {
    await setupFork({
      'GET /creators/Alice/works': { works: [{ ...creatorWork, userId: undefined }] },
      'POST /works/fork': { success: true, forkedWork: creatorWork },
      'POST /achievements/u1/track': {},
    })

    fireEvent.click(await screen.findByTitle('ipmatrix.forkWork'))
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/achievements/u1/track', expect.anything())
    )
    const paths = api.mock.calls.map(([path]) => path)
    expect(paths.filter((p) => String(p).startsWith('/achievements/'))).toEqual(['/achievements/u1/track'])
  })

  it('改编返回失败时不刷新作品列表', async () => {
    await setupFork({ 'POST /works/fork': { success: false } })
    fireEvent.click(await screen.findByTitle('ipmatrix.forkWork'))

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/works/fork', expect.objectContaining({ method: 'POST' }))
    )
    const sharedCalls = api.mock.calls.filter(([path]) => path === '/shared-works')
    // 初始加载 + 切换到探索页各一次，改编失败不应追加刷新
    expect(sharedCalls).toHaveLength(2)
    expect(screen.getByTitle('ipmatrix.forkWork')).toBeInTheDocument()
  })

  it('改编请求异常时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await setupFork({ 'POST /works/fork': () => Promise.reject(new Error('fork down')) })

    fireEvent.click(await screen.findByTitle('ipmatrix.forkWork'))
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Fork error:', expect.any(Error))
    )
  })
})

describe('IPMatrixPanel 改编树', () => {
  const creatorWork = { ...workA, userName: 'Alice', userId: 'u2' }

  async function setupTree(routes: Record<string, Handler | unknown>) {
    mockApi({
      'GET /shared-works': { works: [] },
      'GET /creators': { creators: [{ userName: 'Alice', works: 1, totalLikes: 1, latestWork: 1 }] },
      'GET /creators/Alice/works': { works: [creatorWork] },
      ...routes,
    })
    render(<IPMatrixPanel {...baseProps} />)
    openExplore()
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
  }

  it('展开改编树展示节点，再次点击收起', async () => {
    await setupTree({
      'GET /works/w1/forks': {
        forks: [
          { workId: 'f1', author: 'Bob', forkedAt: Date.UTC(2025, 1, 2) },
          { workId: 'f2', author: 'Carol', forkedAt: Date.UTC(2025, 1, 3) },
        ],
        count: 2,
      },
    })

    fireEvent.click(await screen.findByTitle('ipmatrix.forkTree'))
    expect(await screen.findByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('ipmatrix.forkTree'))
    await waitFor(() => expect(screen.queryByText('Bob')).toBeNull())
  })

  it('无改编分支与请求异常时展示空提示', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await setupTree({
      'GET /works/w1/forks': () => Promise.reject(new Error('tree down')),
    })

    fireEvent.click(await screen.findByTitle('ipmatrix.forkTree'))
    expect(await screen.findByText('暂无改编分支')).toBeInTheDocument()
    expect(errorSpy).toHaveBeenCalledWith('Fork chain error:', expect.any(Error))
  })
})

describe('IPMatrixPanel 英文环境', () => {
  it('按 en 语言渲染作品模式与改编标题', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    mockApi({
      'GET /shared-works': { works: [workA] },
      'GET /creators': { creators: [{ userName: 'Alice', works: 1, totalLikes: 1, latestWork: 1 }] },
      'GET /creators/Alice/works': { works: [{ ...workA, userName: 'Alice' }] },
      'POST /works/fork': { success: true, forkedWork: workA },
      'POST /achievements/u1/track': {},
    })

    render(
      <I18nProvider>
        <IPMatrixPanel {...baseProps} />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Portfolio' }))
    expect(await screen.findByText(/Quick/)).toBeInTheDocument()
    expect(screen.getByText(/lines/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Studio/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Explore Creators' }))
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    await screen.findByText(/Alice/)
    fireEvent.click(document.querySelector('.lucide-git-fork')!.closest('button') as HTMLElement)
    await waitFor(() => {
      const forkCall = api.mock.calls.find(([path]) => path === '/works/fork')
      expect(JSON.parse((forkCall![1] as RequestInit).body as string).title).toBe('作品一 (Remix)')
    })
  })
})
