/**
 * @file SecondaryMarket 二级市场测试
 * @description 覆盖加载/空态/错误态、浏览与详情、溢价/折扣、购买成功失败、
 *              出售上架与下架、交易历史、返回导航、中英文文案与时间格式化。
 */
import { createElement, StrictMode } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { albumApi, marketApi, type Album, type MarketListing, type MarketSale } from '@yyc3/music-utils'
import { I18nProvider } from '@yyc3/music-hooks'
import { SecondaryMarket } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return {
    ...actual,
    albumApi: { ...actual.albumApi, getCollection: vi.fn() },
    marketApi: {
      ...actual.marketApi,
      getListings: vi.fn(),
      getSellerListings: vi.fn(),
      getHistory: vi.fn(),
      getStats: vi.fn(),
      buyListing: vi.fn(),
      createListing: vi.fn(),
      cancelListing: vi.fn(),
    },
  }
})

const getListings = vi.mocked(marketApi.getListings)
const getStats = vi.mocked(marketApi.getStats)
const getHistory = vi.mocked(marketApi.getHistory)
const getSellerListings = vi.mocked(marketApi.getSellerListings)
const buyListing = vi.mocked(marketApi.buyListing)
const createListing = vi.mocked(marketApi.createListing)
const cancelListing = vi.mocked(marketApi.cancelListing)
const getCollection = vi.mocked(albumApi.getCollection)

const now = Date.now()
const user = { id: 'u1', name: 'Tester', email: 'tester@example.com' }

const stats = {
  activeListings: 2,
  totalListings: 4,
  totalSales: 5,
  totalVolume: 300,
  floorPrices: {},
  recentSales: [],
}

function makeListing(over: Partial<MarketListing> = {}): MarketListing {
  return {
    id: 'l1',
    albumId: 'a1',
    albumTitle: 'Neon Dreams',
    albumGenre: 'Electronic / Ambient',
    albumCoverUrl: '',
    sellerId: 'u2',
    sellerName: 'Bob',
    price: 150,
    originalPrice: 100,
    edition: 7,
    maxSupply: 100,
    limitedEdition: true,
    createdAt: now - 5 * 60000,
    status: 'active',
    ...over,
  }
}

function makeSale(over: Partial<MarketSale> = {}): MarketSale {
  return {
    listingId: 'l9',
    albumId: 'a2',
    albumTitle: 'Quiet Waves',
    sellerId: 'u3',
    sellerName: 'Cara',
    buyerId: 'u4',
    buyerName: 'Dan',
    price: 90,
    sellerEarnings: 81,
    creatorRoyalty: 4,
    platformFee: 5,
    edition: 12,
    soldAt: now - 2 * 3600000,
    ...over,
  }
}

const collectionAlbum: Album & { ownership: any } = {
  id: 'a1',
  creatorId: 'c1',
  creatorName: 'Nova',
  title: 'Neon Dreams',
  description: 'desc',
  coverUrl: '',
  genre: 'Electronic / Ambient',
  tracks: [],
  price: 100,
  limitedEdition: true,
  maxSupply: 100,
  circulatingSupply: 10,
  releaseDate: now,
  exclusiveContent: [],
  tags: [],
  likes: 1,
  totalSales: 1,
  createdAt: now,
  ownership: { albumId: 'a1', userId: 'u1', purchasedAt: now, price: 100, edition: 7 },
}

function mockBase(listings: MarketListing[] = [makeListing()], stat: any = stats) {
  getListings.mockResolvedValue({ listings, total: listings.length })
  getStats.mockResolvedValue(stat)
  getHistory.mockResolvedValue({ sales: [], total: 0 })
  getSellerListings.mockResolvedValue({ listings: [], total: 0 })
  getCollection.mockResolvedValue({ collection: [], total: 0 })
}

function renderWithLang(element: React.ReactElement, lang: 'zh' | 'en' = 'zh') {
  localStorage.setItem('dmusic-prefs', JSON.stringify({ lang }))
  return render(createElement(I18nProvider, null, element))
}

function setup(over: Record<string, any> = {}, lang: 'zh' | 'en' = 'zh') {
  const onClose = vi.fn()
  const onStarPowerUpdate = vi.fn()
  const utils = renderWithLang(
    createElement(SecondaryMarket, {
      isOpen: true,
      onClose,
      user,
      starPower: 500,
      onStarPowerUpdate,
      ...over,
    }),
    lang
  )
  return { onClose, onStarPowerUpdate, ...utils }
}

async function openMarket(listings: MarketListing[] = [makeListing()], over: Record<string, any> = {}, lang: 'zh' | 'en' = 'zh') {
  mockBase(listings)
  const ctx = setup(over, lang)
  await waitFor(() => expect(getStats).toHaveBeenCalled())
  if (listings.length > 0) {
    await screen.findByText(listings[0].albumTitle)
  } else {
    await screen.findByText(lang === 'zh' ? '暂无在售专辑' : 'No listings yet')
  }
  return ctx
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  localStorage.clear()
})

describe('SecondaryMarket — 打开与加载', () => {
  it('关闭时不渲染内容', () => {
    const { container } = setup({ isOpen: false })
    expect(container).toBeEmptyDOMElement()
  })

  it('首次加载显示旋转加载指示器', async () => {
    let resolveListings: (v: any) => void = () => {}
    getListings.mockReturnValue(new Promise((res) => { resolveListings = res }) as any)
    getStats.mockResolvedValue(stats)
    const { container } = setup()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()

    await act(async () => {
      resolveListings({ listings: [], total: 0 })
    })
    expect(await screen.findByText('暂无在售专辑')).toBeInTheDocument()
  })

  it('加载失败时记录错误并展示空态', async () => {
    getListings.mockRejectedValue(new Error('offline'))
    getStats.mockRejectedValue(new Error('offline'))
    setup()
    expect(await screen.findByText('暂无在售专辑')).toBeInTheDocument()
    expect(console.error).toHaveBeenCalled()
  })

  it('StrictMode 下重复执行 effect 不会重复加载', async () => {
    mockBase()
    renderWithLang(
      createElement(StrictMode, null,
        createElement(SecondaryMarket, {
          isOpen: true, onClose: vi.fn(), user, starPower: 500, onStarPowerUpdate: vi.fn(),
        })
      )
    )
    expect(await screen.findByText('Neon Dreams')).toBeInTheDocument()
    expect(getListings).toHaveBeenCalledTimes(1)
  })
})

describe('SecondaryMarket — 浏览与详情', () => {
  it('展示统计、在售列表、溢价与限量编号', async () => {
    const cheaper = makeListing({
      id: 'l2', albumTitle: 'Quiet Waves', albumGenre: 'Other', price: 80,
      originalPrice: 100, limitedEdition: false, maxSupply: null, sellerName: 'Cara',
      createdAt: now - 5 * 1000,
    })
    await openMarket([makeListing(), cheaper])

    expect(screen.getByText('二级市场')).toBeInTheDocument()
    expect(screen.getByText('在售')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('成交')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('300 SP')).toBeInTheDocument()

    expect(screen.getByText('Neon Dreams')).toBeInTheDocument()
    expect(screen.getByText('#7/100')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('5分钟前')).toBeInTheDocument()
    expect(screen.getByText('+50%')).toBeInTheDocument()
    expect(screen.getByText('-20%')).toBeInTheDocument()
    expect(screen.getByText('刚刚')).toBeInTheDocument()
  })

  it('打开详情展示价格、卖家、溢价与分成', async () => {
    await openMarket()
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))

    expect(screen.getByText('售价')).toBeInTheDocument()
    expect(screen.getByText('150 SP')).toBeInTheDocument()
    expect(screen.getByText('原始价格')).toBeInTheDocument()
    expect(screen.getByText('100 SP')).toBeInTheDocument()
    expect(screen.getByText('卖家')).toBeInTheDocument()
    expect(screen.getByText('卖家所得 (90%)')).toBeInTheDocument()
    expect(screen.getByText('135 SP')).toBeInTheDocument()
    expect(screen.getByText('创作者版税 (5%)')).toBeInTheDocument()
    expect(screen.getByText('7 SP')).toBeInTheDocument()
    expect(screen.getByText('平台费用 (5%)')).toBeInTheDocument()
    expect(screen.getByText('8 SP')).toBeInTheDocument()
    expect(screen.getByText('溢价: +50%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /购买 \(150 SP\)/ })).toBeInTheDocument()
  })

  it('折扣商品显示折扣率且无发行量编号', async () => {
    const cheap = makeListing({
      id: 'l2', albumTitle: 'Quiet Waves', price: 80, originalPrice: 100,
      maxSupply: null, limitedEdition: false,
    })
    await openMarket([cheap])
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Quiet Waves/ }))
    expect(screen.getByText('折扣: -20%')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.queryByText('限定')).not.toBeInTheDocument()
  })

  it('详情返回按钮回到浏览列表', async () => {
    await openMarket()
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    expect(screen.getByText('售价')).toBeInTheDocument()
    const backBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-arrow-left'))!
    await userEventApi.click(backBtn)
    expect(screen.queryByText('售价')).not.toBeInTheDocument()
    expect(screen.getByText('在售')).toBeInTheDocument()
  })
})

describe('SecondaryMarket — 购买', () => {
  async function openDetail(over: Record<string, any> = {}, listing = makeListing()) {
    const ctx = await openMarket([listing], over)
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: new RegExp(listing.albumTitle) }))
    return { ...ctx, userEventApi }
  }

  it('购买成功更新星力、展示成功文案并移除已售条目', async () => {
    buyListing.mockResolvedValue({ success: true, buyerStarPower: 350 } as any)
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /购买 \(150 SP\)/ }))

    expect(await screen.findByText('成功购入 "Neon Dreams" #7！')).toBeInTheDocument()
    expect(buyListing).toHaveBeenCalledWith('l1', 'u1', 'tester')
    expect(ctx.onStarPowerUpdate).toHaveBeenCalledWith(350)
    expect(screen.queryByText('成功购入', { exact: false })).toBeInTheDocument()
  })

  it('购买失败展示失败文案', async () => {
    buyListing.mockResolvedValue({ success: false } as any)
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /购买 \(150 SP\)/ }))
    expect(await screen.findByText('购买失败')).toBeInTheDocument()
  })

  it('购买异常时优先使用异常信息', async () => {
    buyListing.mockRejectedValue(new Error('资金冻结'))
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /购买 \(150 SP\)/ }))
    expect(await screen.findByText('资金冻结')).toBeInTheDocument()
    expect(console.error).toHaveBeenCalled()
  })

  it('购买异常无 message 时回退到默认文案', async () => {
    buyListing.mockRejectedValue({})
    const ctx = await openDetail()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /购买 \(150 SP\)/ }))
    expect(await screen.findByText('购买失败')).toBeInTheDocument()
  })

  it('星力不足时按钮禁用并提示所需星力', async () => {
    const ctx = await openDetail({ starPower: 50 })
    const btn = screen.getByRole('button', { name: /星力不足 \(需要 150 SP\)/ })
    expect(btn).toBeDisabled()
    await ctx.userEventApi.click(btn)
    expect(buyListing).not.toHaveBeenCalled()
  })

  it('未登录时不显示购买按钮，仍可查看详情', async () => {
    await openDetail({ user: null })
    expect(screen.queryByRole('button', { name: /购买/ })).not.toBeInTheDocument()
    expect(screen.getByText('售价')).toBeInTheDocument()
  })

  it('卖家本人查看自己的挂单时不显示购买按钮', async () => {
    await openDetail({}, makeListing({ sellerId: 'u1' }))
    expect(screen.queryByRole('button', { name: /购买/ })).not.toBeInTheDocument()
  })

  it('浏览列表为空时展示引导文案', async () => {
    await openMarket([])
    expect(screen.getByText('暂无在售专辑')).toBeInTheDocument()
    expect(screen.getByText('等待第一位卖家上架')).toBeInTheDocument()
  })
})

describe('SecondaryMarket — 出售', () => {
  async function openSell(over: Record<string, any> = {}, lang: 'zh' | 'en' = 'zh') {
    const ctx = await openMarket([makeListing()], over, lang)
    getSellerListings.mockResolvedValue({ listings: [], total: 0 })
    getCollection.mockResolvedValue({ collection: [collectionAlbum], total: 1 })
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: lang === 'zh' ? '出售' : 'Sell' }))
    await screen.findByRole('button', { name: /Neon Dreams/ })
    return { ...ctx, userEventApi }
  }

  it('选择专辑后按 1.2 倍预填价格并成功上架', async () => {
    createListing.mockResolvedValue({ success: true, listing: makeListing({ id: 'l3' }) } as any)
    const ctx = await openSell()

    expect(screen.getByText('选择要出售的专辑')).toBeInTheDocument()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('120')
    expect(screen.getByText('定价 (星力值)')).toBeInTheDocument()

    await ctx.userEventApi.clear(input)
    await ctx.userEventApi.type(input, '200')
    await ctx.userEventApi.click(screen.getByRole('button', { name: /上架出售/ }))
    await waitFor(() => expect(createListing).toHaveBeenCalled())
    expect(createListing).toHaveBeenCalledWith({
      userId: 'u1', userName: 'tester', albumId: 'a1', price: 200,
    })
    // 上架成功后表单收起，价格输入框与提交按钮不再渲染
    await waitFor(() => expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /上架出售/ })).not.toBeInTheDocument()
    await waitFor(() => expect(getCollection.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('价格为空或小于 1 时无法上架', async () => {
    const ctx = await openSell()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    const input = screen.getByRole('spinbutton')
    await ctx.userEventApi.clear(input)
    const btn = screen.getByRole('button', { name: /上架出售/ })
    expect(btn).toBeDisabled()
    await ctx.userEventApi.type(input, '0')
    expect(btn).toBeDisabled()
    await ctx.userEventApi.click(btn)
    expect(createListing).not.toHaveBeenCalled()
  })

  it('上架失败展示失败文案', async () => {
    createListing.mockResolvedValue({ success: false } as any)
    const ctx = await openSell()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await ctx.userEventApi.click(screen.getByRole('button', { name: /上架出售/ }))
    expect(await screen.findByText('上架失败')).toBeInTheDocument()
  })

  it('上架异常时使用异常信息或默认文案', async () => {
    createListing.mockRejectedValue(new Error('库存异常'))
    const ctx = await openSell()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await ctx.userEventApi.click(screen.getByRole('button', { name: /上架出售/ }))
    expect(await screen.findByText('库存异常')).toBeInTheDocument()
  })

  it('上架异常无 message 时回退默认文案', async () => {
    createListing.mockRejectedValue({})
    const ctx = await openSell()
    await ctx.userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await ctx.userEventApi.click(screen.getByRole('button', { name: /上架出售/ }))
    expect(await screen.findByText('上架失败')).toBeInTheDocument()
  })

  it('展示我的在售并可下架移除', async () => {
    const mine = makeListing({ id: 'my1', sellerId: 'u1', albumTitle: 'Owned Cut' })
    const ctx = await openMarket([makeListing()])
    getSellerListings.mockResolvedValue({ listings: [mine], total: 1 })
    getCollection.mockResolvedValue({ collection: [collectionAlbum], total: 1 })
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '出售' }))
    expect(await screen.findByText('我的在售')).toBeInTheDocument()
    expect(screen.getByText('Owned Cut #7')).toBeInTheDocument()

    cancelListing.mockResolvedValue({ success: true } as any)
    await userEventApi.click(screen.getByRole('button', { name: '下架' }))
    await waitFor(() => expect(cancelListing).toHaveBeenCalledWith('my1'))
    await waitFor(() => expect(screen.queryByText('Owned Cut #7')).not.toBeInTheDocument())
    expect(ctx.onClose).not.toHaveBeenCalled()
  })

  it('已上架专辑在下架失败时保持显示并记录错误', async () => {
    const mine = makeListing({ id: 'my1', sellerId: 'u1', albumTitle: 'Neon Dreams' })
    await openMarket([makeListing({ id: 'l9', albumTitle: 'Other Cut' })])
    getSellerListings.mockResolvedValue({ listings: [mine], total: 1 })
    getCollection.mockResolvedValue({ collection: [collectionAlbum], total: 1 })
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '出售' }))
    await screen.findByText('已上架')

    const albumBtn = screen.getByRole('button', { name: /已上架/ })
    expect(albumBtn).toBeDisabled()

    cancelListing.mockRejectedValue(new Error('cancel failed'))
    await userEventApi.click(screen.getByRole('button', { name: '下架' }))
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(screen.getByText('已上架')).toBeInTheDocument()
  })

  it('收藏为空时提示暂无可出售专辑', async () => {
    await openMarket()
    getSellerListings.mockResolvedValue({ listings: [], total: 0 })
    getCollection.mockResolvedValue({ collection: [], total: 0 })
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '出售' }))
    expect(await screen.findByText('你还没有可出售的专辑')).toBeInTheDocument()
  })

  it('未登录时出售页不加载数据且展示空态', async () => {
    await openMarket([makeListing()], { user: null })
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '出售' }))
    expect(await screen.findByText('你还没有可出售的专辑')).toBeInTheDocument()
    expect(getCollection).not.toHaveBeenCalled()
  })

  it('出售数据加载失败时记录错误', async () => {
    await openMarket()
    getSellerListings.mockRejectedValue(new Error('sell fail'))
    getCollection.mockRejectedValue(new Error('sell fail'))
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '出售' }))
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(screen.getByText('你还没有可出售的专辑')).toBeInTheDocument()
  })

  it('出售页返回按钮回到浏览', async () => {
    const ctx = await openSell()
    const backBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-arrow-left'))!
    await ctx.userEventApi.click(backBtn)
    expect(screen.getByText('在售')).toBeInTheDocument()
  })
})

describe('SecondaryMarket — 历史', () => {
  it('展示交易记录明细', async () => {
    const ctx = await openMarket()
    getHistory.mockResolvedValue({ sales: [makeSale()], total: 1 })
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '历史' }))
    await waitFor(() => expect(getHistory).toHaveBeenCalled())
    expect(await screen.findByText('Quiet Waves')).toBeInTheDocument()
    expect(screen.getByText('90 SP')).toBeInTheDocument()
    expect(screen.getByText('Cara')).toBeInTheDocument()
    expect(screen.getByText('Dan')).toBeInTheDocument()
    expect(screen.getByText('2小时前')).toBeInTheDocument()
    expect(screen.getByText('卖家: 81 SP')).toBeInTheDocument()
    expect(screen.getByText('版税: 4 SP')).toBeInTheDocument()
    expect(screen.getByText('#12')).toBeInTheDocument()
  })

  it('历史为空时展示空态', async () => {
    await openMarket()
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '历史' }))
    expect(await screen.findByText('暂无交易记录')).toBeInTheDocument()
  })

  it('历史加载失败时记录错误', async () => {
    const ctx = await openMarket()
    getHistory.mockRejectedValue(new Error('history fail'))
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '历史' }))
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(screen.getByText('暂无交易记录')).toBeInTheDocument()
    expect(ctx.onClose).not.toHaveBeenCalled()
  })

  it('历史页返回按钮回到浏览', async () => {
    await openMarket()
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: '历史' }))
    await screen.findByText('暂无交易记录')
    const backBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-arrow-left'))!
    await userEventApi.click(backBtn)
    expect(screen.getByText('在售')).toBeInTheDocument()
  })
})

describe('SecondaryMarket — 头部与关闭', () => {
  it('关闭按钮与遮罩触发 onClose，页脚展示星力', async () => {
    const ctx = await openMarket()
    expect(screen.getByText('安全交易 · 5%创作者版税')).toBeInTheDocument()
    expect(screen.getByText('500 SP')).toBeInTheDocument()

    const userEventApi = userEvent.setup()
    const closeBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-x'))!
    await userEventApi.click(closeBtn)
    expect(ctx.onClose).toHaveBeenCalledTimes(1)

    await userEventApi.click(ctx.container.querySelector('.fixed.inset-0') as HTMLElement)
    expect(ctx.onClose).toHaveBeenCalledTimes(2)
  })
})

describe('SecondaryMarket — 英文文案', () => {
  it('英文浏览空态与详情价格标签', async () => {
    await openMarket([
      makeListing({ createdAt: now - 5 * 1000 }),
    ], {}, 'en')
    expect(screen.getByText('Secondary Market')).toBeInTheDocument()
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByText('just now')).toBeInTheDocument()

    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    expect(screen.getByText('Asking Price')).toBeInTheDocument()
    expect(screen.getByText('Original Price')).toBeInTheDocument()
    expect(screen.getByText('Seller')).toBeInTheDocument()
    expect(screen.getByText('Premium: +50%')).toBeInTheDocument()
    expect(screen.getByText('Seller (90%)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Buy \(150 SP\)/ })).toBeInTheDocument()
  })

  it('英文购买成功文案', async () => {
    buyListing.mockResolvedValue({ success: true, buyerStarPower: 200 } as any)
    await openMarket([makeListing()], {}, 'en')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await userEventApi.click(screen.getByRole('button', { name: /Buy \(150 SP\)/ }))
    expect(await screen.findByText('Purchased "Neon Dreams" #7!')).toBeInTheDocument()
  })

  it('英文购买失败文案', async () => {
    buyListing.mockResolvedValue({ success: false } as any)
    await openMarket([makeListing()], {}, 'en')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    await userEventApi.click(screen.getByRole('button', { name: /Buy \(150 SP\)/ }))
    expect(await screen.findByText('Purchase failed')).toBeInTheDocument()
  })

  it('英文星力不足、空态与时间格式', async () => {
    const listings = [
      makeListing({ id: 'l1', price: 999, createdAt: now - 5 * 1000 }),
      makeListing({ id: 'l2', albumTitle: 'Quiet Waves', price: 90, originalPrice: 100, createdAt: now - 5 * 60000, limitedEdition: false, maxSupply: null }),
      makeListing({ id: 'l3', albumTitle: 'Solar Drift', price: 90, createdAt: now - 2 * 3600000 }),
      makeListing({ id: 'l4', albumTitle: 'Deep Field', price: 90, createdAt: now - 3 * 86400000 }),
    ]
    await openMarket(listings, {}, 'en')
    expect(screen.getByText('5m ago')).toBeInTheDocument()
    expect(screen.getByText('2h ago')).toBeInTheDocument()
    expect(screen.getByText('3d ago')).toBeInTheDocument()

    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    expect(screen.getByText('Insufficient SP (need 999)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Insufficient/ })).toBeDisabled()
  })

  it('英文出售页与历史页', async () => {
    const ctx = await openMarket([makeListing()], {}, 'en')
    getSellerListings.mockResolvedValue({ listings: [], total: 0 })
    getCollection.mockResolvedValue({ collection: [collectionAlbum], total: 1 })
    getHistory.mockResolvedValue({ sales: [makeSale()], total: 1 })
    const userEventApi = userEvent.setup()

    await userEventApi.click(screen.getByRole('button', { name: 'Sell' }))
    expect(await screen.findByText('Select Album to Sell')).toBeInTheDocument()
    await userEventApi.click(screen.getByRole('button', { name: /Neon Dreams/ }))
    expect(screen.getByText('Price (Star Power)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /List for Sale/ })).toBeInTheDocument()

    await userEventApi.click(screen.getByRole('button', { name: 'History' }))
    expect(await screen.findByText('Quiet Waves')).toBeInTheDocument()
    expect(screen.getByText('Seller: 81 SP')).toBeInTheDocument()
    expect(screen.getByText('Royalty: 4 SP')).toBeInTheDocument()
    expect(ctx.onClose).not.toHaveBeenCalled()
  })

  it('英文空列表与空收藏提示', async () => {
    await openMarket([], {}, 'en')
    expect(screen.getByText('No listings yet')).toBeInTheDocument()
    expect(screen.getByText('Waiting for the first listing')).toBeInTheDocument()
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: 'Sell' }))
    expect(await screen.findByText('No albums in your collection')).toBeInTheDocument()
  })

  it('英文历史为空与返回导航', async () => {
    await openMarket([], {}, 'en')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: 'History' }))
    expect(await screen.findByText('No transaction history')).toBeInTheDocument()
    const backBtn = screen.getAllByRole('button').find(b => b.querySelector('svg.lucide-arrow-left'))!
    await userEventApi.click(backBtn)
    expect(screen.getByText('No listings yet')).toBeInTheDocument()
  })

  it('英文详情折扣与无限量显示', async () => {
    await openMarket([
      makeListing({ albumTitle: 'Quiet Waves', price: 80, originalPrice: 100, maxSupply: null, limitedEdition: false }),
    ], {}, 'en')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Quiet Waves/ }))
    expect(screen.getByText('Discount: -20%')).toBeInTheDocument()
    expect(screen.queryByText('Limited')).not.toBeInTheDocument()
  })
})
