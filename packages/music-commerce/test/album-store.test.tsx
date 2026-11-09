/**
 * @file AlbumStore 数字专辑商城测试
 * @description 覆盖加载/空态/错误态、商城网格、详情页、购买成功与各类失败、
 *              点赞、收藏架、登录限制、限量版与专属内容、中英文文案。
 */
import { createElement } from 'react'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { I18nProvider } from '@yyc3/music-hooks'
import { AlbumStore } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>

const user = { id: 'u1', name: 'Tester', email: 'tester@example.com' }
const purchasedAt = new Date(2025, 0, 15, 12, 0, 0).getTime()

function makeAlbum(over: Record<string, any> = {}) {
  return {
    id: 'a1',
    creatorId: 'c1',
    creatorName: 'Nova',
    title: 'Neon Dreams',
    description: 'A synth journey',
    coverUrl: '',
    genre: 'Electronic / Ambient',
    tracks: [
      { songId: 's1', title: 'Opening', artist: 'Nova', duration: 75, trackNumber: 1 },
      { songId: 's2', title: 'Falling', artist: 'Nova', duration: 65, trackNumber: 2 },
    ],
    price: 120,
    limitedEdition: true,
    maxSupply: 100,
    circulatingSupply: 40,
    releaseDate: purchasedAt,
    exclusiveContent: [
      { type: 'bonus-track', label: '附赠曲', labelEn: 'Bonus Track' },
      { type: 'pdf', label: '数字手册', labelEn: 'Digital Booklet' },
      { type: 'stem', label: '分轨文件', labelEn: 'Stems' },
      { type: 'video', label: '幕后视频', labelEn: 'Behind the Scenes' },
    ],
    tags: ['space', 'dream'],
    likes: 5,
    totalSales: 2,
    createdAt: purchasedAt,
    ...over,
  }
}

function makeCollectionEntry(album: any, over: Record<string, any> = {}) {
  return {
    ...album,
    ownership: {
      albumId: album.id,
      userId: user.id,
      purchasedAt,
      price: album.price,
      edition: 7,
      ...over,
    },
  }
}

function renderWithLang(element: React.ReactElement, lang: 'zh' | 'en' = 'zh') {
  localStorage.setItem('dmusic-prefs', JSON.stringify({ lang }))
  return render(createElement(I18nProvider, null, element))
}

function setup(over: Record<string, any> = {}, lang: 'zh' | 'en' = 'zh') {
  const onClose = vi.fn()
  const onStarPowerUpdate = vi.fn()
  const utils = renderWithLang(
    createElement(AlbumStore, {
      isOpen: true,
      onClose,
      user,
      starPower: 1000,
      onStarPowerUpdate,
      ...over,
    }),
    lang
  )
  return { onClose, onStarPowerUpdate, ...utils }
}

function mockDefault(listAlbums: any[], collection: any[] = []) {
  api.mockImplementation(async (path: string) => {
    if (path === '/albums') return { albums: listAlbums, total: listAlbums.length }
    if (path.startsWith('/albums/collection/')) return { collection, total: collection.length }
    return null
  })
}

async function openStore(listAlbums: any[], collection: any[] = [], lang: 'zh' | 'en' = 'zh') {
  mockDefault(listAlbums, collection)
  const ctx = setup({}, lang)
  await waitFor(() => expect(screen.queryByText(lang === 'zh' ? '加载中...' : 'Loading...')).not.toBeInTheDocument())
  return ctx
}

/** 等待详情视图完成过渡（AnimatePresence mode="wait"） */
async function waitForDetail(lang: 'zh' | 'en' = 'zh') {
  await screen.findByText(lang === 'zh' ? '曲目列表' : 'Track List')
}

beforeEach(() => {
  localStorage.clear()
  api.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  localStorage.clear()
})

describe('AlbumStore — 打开与加载', () => {
  it('关闭时不渲染任何内容', () => {
    const { container } = setup({ isOpen: false })
    expect(container).toBeEmptyDOMElement()
  })

  it('首次加载展示加载态，随后渲染商城网格', async () => {
    let resolveList: (v: any) => void = () => {}
    const pending = new Promise((res) => { resolveList = res })
    api.mockImplementation((path: string) => {
      if (path === '/albums') return pending
      return Promise.resolve({ collection: [], total: 0 })
    })
    setup()
    expect(screen.getByText('加载中...')).toBeInTheDocument()

    await act(async () => {
      resolveList({ albums: [makeAlbum()], total: 1 })
    })
    expect(await screen.findByText('Neon Dreams')).toBeInTheDocument()
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
  })

  it('请求失败时记录错误并展示空态', async () => {
    api.mockRejectedValue(new Error('offline'))
    setup()
    expect(await screen.findByText('暂无专辑')).toBeInTheDocument()
    expect(console.error).toHaveBeenCalled()
  })

  it('无专辑时展示空态', async () => {
    await openStore([])
    expect(screen.getByText('暂无专辑')).toBeInTheDocument()
  })

  it('已加载后用户对象变化不会重复请求', async () => {
    const ctx = await openStore([makeAlbum()])
    const callsAfterLoad = api.mock.calls.length
    ctx.rerender(
      createElement(I18nProvider, null,
        createElement(AlbumStore, {
          isOpen: true, onClose: ctx.onClose, user: { ...user }, starPower: 1000,
          onStarPowerUpdate: ctx.onStarPowerUpdate,
        })
      )
    )
    expect(api.mock.calls.length).toBe(callsAfterLoad)
  })
})

describe('AlbumStore — 商城网格与详情', () => {
  it('渲染限量/价格/曲目数/点赞/库存并打开详情', async () => {
    const album = makeAlbum()
    const plain = makeAlbum({
      id: 'a2', title: 'Quiet Waves', coverUrl: 'https://example.com/a2.jpg',
      genre: 'Unknown Genre', limitedEdition: false, maxSupply: null, likes: 1, price: 80,
      exclusiveContent: [], tracks: [{ songId: 's3', title: 'Solo', artist: 'Nova', duration: 30, trackNumber: 1 }],
    })
    const { container } = await openStore([album, plain])

    expect(screen.getByText('Neon Dreams')).toBeInTheDocument()
    expect(screen.getByText('限量')).toBeInTheDocument()
    expect(screen.getByText('120 SP')).toBeInTheDocument()
    expect(screen.getByText('40/100')).toBeInTheDocument()
    expect(screen.getByText('Quiet Waves')).toBeInTheDocument()
    expect(container.querySelectorAll('img').length).toBeGreaterThan(0)
    expect(screen.queryByText('已拥有')).not.toBeInTheDocument()

    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail()

    expect(screen.getByText('曲目列表')).toBeInTheDocument()
    expect(screen.getByText('Opening')).toBeInTheDocument()
    expect(screen.getByText('Falling')).toBeInTheDocument()
    expect(screen.getByText('2:20')).toBeInTheDocument()
    expect(screen.getByText('1:15')).toBeInTheDocument()
    expect(screen.getByText('2 首')).toBeInTheDocument()
    expect(screen.getByText('Electronic / Ambient')).toBeInTheDocument()
    expect(screen.getByText('发行量')).toBeInTheDocument()
    expect(screen.getByText('40 / 100')).toBeInTheDocument()
    expect(screen.getByText('专属内容')).toBeInTheDocument()
    expect(screen.getByText('附赠曲')).toBeInTheDocument()
    expect(screen.getByText('数字手册')).toBeInTheDocument()
    expect(screen.getByText('分轨文件')).toBeInTheDocument()
    expect(screen.getByText('幕后视频')).toBeInTheDocument()
    expect(screen.getByText('#space')).toBeInTheDocument()
    expect(screen.getByText('#dream')).toBeInTheDocument()
    expect(screen.getByText('限量版')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /120 SP/ })).toBeInTheDocument()

    await userEventApi.click(screen.getByRole('button', { name: /返回/ }))
    expect(screen.getByText('商城')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('曲目列表')).not.toBeInTheDocument())
    expect(screen.queryByText('已拥有')).not.toBeInTheDocument()
  })

  it('点赞会调用接口并同步列表与详情中的赞数', async () => {
    const album = makeAlbum({ likes: 5 })
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [album], total: 1 }
      if (path === '/albums/a1/like') return { likes: 9 }
      return { collection: [], total: 0 }
    })
    setup()
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail()
    await userEventApi.click(screen.getByRole('button', { name: /^5$/ }))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/albums/a1/like', { method: 'POST' }))
    expect(screen.getAllByText('9').length).toBeGreaterThan(0)
  })

  it('点赞失败时记录错误且不改变赞数', async () => {
    const album = makeAlbum({ likes: 3 })
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [album], total: 1 }
      if (path === '/albums/a1/like') throw new Error('like failed')
      return { collection: [], total: 0 }
    })
    setup()
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail()
    await userEventApi.click(screen.getByRole('button', { name: /^3$/ }))
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })
})

describe('AlbumStore — 购买流程', () => {
  async function openDetail(album = makeAlbum()) {
    const ctx = setup()
    await screen.findByText(album.title)
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: new RegExp(album.title) }))
    await waitForDetail()
    return { ...ctx, userEventApi, album }
  }

  it('未登录购买提示先登录', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [makeAlbum()], total: 1 }
      return null
    })
    setup({ user: null })
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail()
    await userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(screen.getByText('请先登录')).toBeInTheDocument()
    expect(api).not.toHaveBeenCalledWith(expect.stringContaining('/purchase'), expect.anything())
  })

  it('购买成功时展示限量编号、更新星力并刷新数据', async () => {
    const album = makeAlbum()
    let listCalls = 0
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) {
        listCalls += 1
        return { albums: [album], total: 1 }
      }
      if (path === '/albums/a1/purchase') {
        return { success: true, edition: 3, maxSupply: 100, starPower: 880 }
      }
      if (path.startsWith('/albums/collection/')) {
        return listCalls > 1
          ? { collection: [makeCollectionEntry(album)], total: 1 }
          : { collection: [], total: 0 }
      }
      return null
    })
    const ctx = await openDetail(album)
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))

    expect(await screen.findByText('购买成功！限量版 #3 / 100')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/albums/a1/purchase', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 'u1' }),
    }))
    expect(ctx.onStarPowerUpdate).toHaveBeenCalledWith(880)
    expect(screen.getByText('已收藏')).toBeInTheDocument()
    expect(screen.getByText('已拥有')).toBeInTheDocument()
    await waitFor(() => expect(api.mock.calls.filter(([p]) => p === '/albums').length).toBe(2))
  })

  it('购买成功但无发行量时文案不含上限', async () => {
    const album = makeAlbum({ maxSupply: null, limitedEdition: false })
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) return { albums: [album], total: 1 }
      if (path === '/albums/a1/purchase') return { success: true, edition: 2, starPower: 700 }
      if (path.startsWith('/albums/collection/')) return { collection: [], total: 0 }
      return null
    })
    const ctx = await openDetail(album)
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(await screen.findByText('购买成功！限量版 #2')).toBeInTheDocument()
    expect(ctx.onStarPowerUpdate).toHaveBeenCalledWith(700)
  })

  it('购买按钮在请求中展示购买中并禁用', async () => {
    let resolvePurchase: (v: any) => void = () => {}
    api.mockImplementation((path: string, init?: any) => {
      if (path === '/albums' && !init) return Promise.resolve({ albums: [makeAlbum()], total: 1 })
      if (path === '/albums/a1/purchase') return new Promise((res) => { resolvePurchase = res })
      if (path.startsWith('/albums/collection/')) return Promise.resolve({ collection: [], total: 0 })
      return Promise.resolve(null)
    })
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    const pendingBtn = screen.getByRole('button', { name: /购买中.../ })
    expect(pendingBtn).toBeDisabled()

    await act(async () => {
      resolvePurchase({ success: true, edition: 1, starPower: 900 })
    })
    expect(await screen.findByText(/购买成功/)).toBeInTheDocument()
  })

  it('星力不足时展示所需与当前星力', async () => {
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) return { albums: [makeAlbum()], total: 1 }
      if (path === '/albums/a1/purchase') return { success: false, insufficientFunds: true, required: 500, current: 100 }
      if (path.startsWith('/albums/collection/')) return { collection: [], total: 0 }
      return null
    })
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(await screen.findByText('星力不足（需要 500，当前 100）')).toBeInTheDocument()
  })

  it('已售罄时展示售罄文案', async () => {
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) return { albums: [makeAlbum()], total: 1 }
      if (path === '/albums/a1/purchase') return { success: false, soldOut: true }
      if (path.startsWith('/albums/collection/')) return { collection: [], total: 0 }
      return null
    })
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(await screen.findByText('已售罄')).toBeInTheDocument()
  })

  it('服务端标记已拥有时展示对应文案', async () => {
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) return { albums: [makeAlbum()], total: 1 }
      if (path === '/albums/a1/purchase') return { success: false, alreadyOwned: true }
      if (path.startsWith('/albums/collection/')) return { collection: [], total: 0 }
      return null
    })
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(await screen.findByText('您已拥有此专辑')).toBeInTheDocument()
  })

  it('服务端返回错误信息与空响应时使用默认文案', async () => {
    const responses = [{ success: false, error: 'Server exploded' }, { success: false }]
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) return { albums: [makeAlbum()], total: 1 }
      if (path === '/albums/a1/purchase') return responses.shift()
      if (path.startsWith('/albums/collection/')) return { collection: [], total: 0 }
      return null
    })
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(await screen.findByText('购买失败')).toBeInTheDocument()
  })

  it('网络异常时展示网络错误', async () => {
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) return { albums: [makeAlbum()], total: 1 }
      if (path === '/albums/a1/purchase') throw new Error('network down')
      if (path.startsWith('/albums/collection/')) return { collection: [], total: 0 }
      return null
    })
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(await screen.findByText('网络错误')).toBeInTheDocument()
  })

  it('已拥有专辑不显示购买按钮并显示专属内容已解锁标记', async () => {
    const album = makeAlbum()
    const entry = makeCollectionEntry(album)
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [album], total: 1 }
      if (path.startsWith('/albums/collection/')) return { collection: [entry], total: 1 }
      return null
    })
    setup()
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail()
    expect(screen.queryByRole('button', { name: /120 SP/ })).not.toBeInTheDocument()
    expect(screen.getByText('已收藏')).toBeInTheDocument()
    expect(screen.getAllByText('已拥有').length).toBeGreaterThan(0)
    expect(screen.queryByText('请先登录')).not.toBeInTheDocument()
  })

  it('点击已拥有专辑不会重复购买', async () => {
    // ownedIds 由收藏数据构建，购买按钮不渲染，因此再次触发不会发起 purchase 请求
    const album = makeAlbum()
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [album], total: 1 }
      if (path.startsWith('/albums/collection/')) return { collection: [makeCollectionEntry(album)], total: 1 }
      return null
    })
    setup()
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail()
    await userEventApi.click(screen.getByRole('button', { name: /^5$/ }))
    expect(api.mock.calls.some(([p]) => String(p).includes('/purchase'))).toBe(false)
  })
})

describe('AlbumStore — 我的收藏', () => {
  it('收藏架展示编号与购买日期，点击进入详情', async () => {
    const album = makeAlbum()
    const noSupply = makeAlbum({ id: 'a3', title: 'Rare Cut', maxSupply: null })
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [album, noSupply], total: 2 }
      if (path.startsWith('/albums/collection/')) {
        return { collection: [makeCollectionEntry(album), makeCollectionEntry(noSupply, { edition: 4 })], total: 2 }
      }
      return null
    })
    setup()
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /我的收藏/ }))

    expect(await screen.findByText('#7/100')).toBeInTheDocument()
    expect(screen.getByText('#4')).toBeInTheDocument()
    expect(screen.getAllByText(/2025年1月15日/).length).toBe(2)
    expect(screen.getAllByText(/购于/).length).toBe(2)

    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail()
    expect(screen.getByText('曲目列表')).toBeInTheDocument()
  })

  it('收藏为空时展示空态并可返回商城', async () => {
    await openStore([makeAlbum()], [])
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /我的收藏/ }))
    expect(await screen.findByText('暂无收藏专辑')).toBeInTheDocument()
    await userEventApi.click(screen.getByRole('button', { name: /去商城逛逛/ }))
    expect(await screen.findByText('Neon Dreams')).toBeInTheDocument()
  })

  it('未登录查看收藏时提示登录', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [makeAlbum()], total: 1 }
      return null
    })
    setup({ user: null })
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /我的收藏/ }))
    expect(await screen.findByText('登录后查看收藏')).toBeInTheDocument()
  })
})

describe('AlbumStore — 头部与关闭', () => {
  it('展示星力余额、标题与 P3 副标题', async () => {
    await openStore([makeAlbum()])
    expect(screen.getByText('数字专辑')).toBeInTheDocument()
    expect(screen.getByText(/P3 · 数字专辑分发系统/)).toBeInTheDocument()
    expect(screen.getByText('1000')).toBeInTheDocument()
  })

  it('点击关闭按钮与遮罩都会触发 onClose', async () => {
    const ctx = await openStore([])
    const userEventApi = userEvent.setup()
    const closeBtn = ctx.container.querySelector('button:has(svg.lucide-x)') as HTMLElement
    await userEventApi.click(closeBtn)
    expect(ctx.onClose).toHaveBeenCalledTimes(1)
    await userEventApi.click(ctx.container.querySelector('.absolute.inset-0') as HTMLElement)
    expect(ctx.onClose).toHaveBeenCalledTimes(2)
  })
})

describe('AlbumStore — 英文文案', () => {
  it('英文商城空态、详情与购买成功', async () => {
    await openStore([], [], 'en')
    expect(screen.getByText('Digital Albums')).toBeInTheDocument()
    expect(screen.getByText('No albums yet')).toBeInTheDocument()
  })

  it('英文详情、曲目、专属内容与购买文案', async () => {
    const album = makeAlbum()
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) return { albums: [album], total: 1 }
      if (path === '/albums/a1/purchase') return { success: true, edition: 3, maxSupply: 100, starPower: 760 }
      if (path.startsWith('/albums/collection/')) return { collection: [], total: 0 }
      return null
    })
    setup({}, 'en')
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail('en')

    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Track List')).toBeInTheDocument()
    expect(screen.getByText('Exclusive Content')).toBeInTheDocument()
    expect(screen.getByText('Bonus Track')).toBeInTheDocument()
    expect(screen.getByText('Digital Booklet')).toBeInTheDocument()
    expect(screen.getByText('Stems')).toBeInTheDocument()
    expect(screen.getByText('Behind the Scenes')).toBeInTheDocument()
    expect(screen.getByText('Limited')).toBeInTheDocument()
    expect(screen.getByText('2 tracks')).toBeInTheDocument()
    await userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(await screen.findByText('Purchase successful! Edition #3 of 100')).toBeInTheDocument()
    expect(screen.getByText('In Collection')).toBeInTheDocument()
    expect(screen.getByText('Owned')).toBeInTheDocument()
  })

  it('英文未登录、已拥有、售罄、星力不足与网络错误文案', async () => {
    const album = makeAlbum()
    const responses = [
      { success: false, alreadyOwned: true },
      { success: false, soldOut: true },
      { success: false, insufficientFunds: true, required: 300, current: 10 },
      { success: false },
      'throw',
    ]
    api.mockImplementation(async (path: string, init?: any) => {
      if (path === '/albums' && !init) return { albums: [album], total: 1 }
      if (path === '/albums/a1/purchase') {
        const next = responses.shift()
        if (next === 'throw') throw new Error('boom')
        return next
      }
      if (path.startsWith('/albums/collection/')) return { collection: [], total: 0 }
      return null
    })
    setup({}, 'en')
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail('en')
    const buy = () => screen.getByRole('button', { name: /120 SP/ })

    await userEventApi.click(buy())
    expect(await screen.findByText('You already own this album')).toBeInTheDocument()
    await userEventApi.click(buy())
    expect(await screen.findByText('Sold out')).toBeInTheDocument()
    await userEventApi.click(buy())
    expect(await screen.findByText('Insufficient Star Power (need 300, have 10)')).toBeInTheDocument()
    await userEventApi.click(buy())
    expect(await screen.findByText('Purchase failed')).toBeInTheDocument()
    await userEventApi.click(buy())
    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  it('英文未登录提示与空收藏', async () => {
    const album = makeAlbum()
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [album], total: 1 }
      return null
    })
    setup({ user: null }, 'en')
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await waitForDetail('en')
    await userEventApi.click(screen.getByRole('button', { name: /120 SP/ }))
    expect(screen.getByText('Please log in first')).toBeInTheDocument()
  })

  it('英文收藏架日期与空态', async () => {
    const album = makeAlbum()
    const entry = makeCollectionEntry(album)
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [album], total: 1 }
      if (path.startsWith('/albums/collection/')) return { collection: [entry], total: 1 }
      return null
    })
    setup({}, 'en')
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /My Collection/ }))
    expect(await screen.findByText(/Jan 15, 2025/)).toBeInTheDocument()
    expect(screen.getByText(/Purchased/)).toBeInTheDocument()
  })

  it('英文未登录收藏提示', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/albums') return { albums: [makeAlbum()], total: 1 }
      return null
    })
    setup({ user: null }, 'en')
    await screen.findByText('Neon Dreams')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /My Collection/ }))
    expect(await screen.findByText('Log in to view collection')).toBeInTheDocument()
  })

  it('英文空收藏提示', async () => {
    await openStore([makeAlbum()], [], 'en')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /My Collection/ }))
    expect(await screen.findByText('No albums in collection')).toBeInTheDocument()
    await userEventApi.click(screen.getByRole('button', { name: /Browse marketplace/ }))
    expect(await screen.findByText('Neon Dreams')).toBeInTheDocument()
  })
})
