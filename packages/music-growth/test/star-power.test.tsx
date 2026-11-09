/**
 * @file StarPowerPanel / StarPowerShop 深度测试
 * @description 覆盖星力等级/签到/交易流水、商城分类/确认购买/购买结果等分支
 */
import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@yyc3/music-hooks'
import { apiFetch } from '@yyc3/music-utils'
import { StarPowerPanel, StarPowerShop } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch)
const user = { id: 'u1', email: 'tester@example.com' }
const NOW = Date.UTC(2026, 0, 1)

type Handler = (path: string, options?: any) => any

function mockApi(routes: Record<string, Handler | unknown>) {
  api.mockImplementation(async (path: any, options?: any) => {
    const key = `${options?.method ?? 'GET'} ${path}`
    const handler = routes[key] ?? routes[path as string]
    if (handler === undefined) return null
    return typeof handler === 'function' ? handler(path, options) : handler
  })
}

const levelData = {
  vipLevel: {
    level: 2,
    label: '星尘',
    labelEn: 'Stardust',
    threshold: 1000,
    color: '#FFD700',
    dailyReward: 20,
    nextThreshold: 5000,
    nextLabel: '星云',
  },
  allLevels: [
    {
      level: 1,
      label: '新星',
      labelEn: 'Nova',
      threshold: 0,
      color: '#AAAAAA',
      dailyReward: 10,
      nextThreshold: 1000,
      nextLabel: '星尘',
    },
    {
      level: 2,
      label: '星尘',
      labelEn: 'Stardust',
      threshold: 1000,
      color: '#FFD700',
      dailyReward: 20,
      nextThreshold: 5000,
      nextLabel: '星云',
    },
  ],
  checkedInToday: false,
  streak: 3,
}

function transactionsData() {
  return {
    transactions: [
      {
        id: 't1',
        type: 'earn',
        amount: 50,
        reason: 'daily_checkin',
        detail: '签到',
        timestamp: NOW - 10_000,
        balance: 3250,
      },
      {
        id: 't2',
        type: 'spend',
        amount: 100,
        reason: 'like',
        detail: '点赞',
        timestamp: NOW - 5 * 60_000,
        balance: 3200,
      },
      {
        id: 't3',
        type: 'earn',
        amount: 5,
        reason: 'custom_reason',
        detail: '其他',
        timestamp: NOW - 2 * 3_600_000,
        balance: 3205,
      },
      {
        id: 't4',
        type: 'spend',
        amount: 5,
        reason: 'welcome',
        detail: '旧记录',
        timestamp: NOW - 3 * 86_400_000,
        balance: 3200,
      },
    ],
  }
}

const panelProps = {
  isOpen: true,
  onClose: vi.fn(),
  user,
  starPower: 3200,
  onStarPowerUpdate: vi.fn(),
  onOpenShop: vi.fn(),
}

beforeEach(() => {
  api.mockReset()
  api.mockResolvedValue(null)
  localStorage.clear()
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  panelProps.onClose = vi.fn()
  panelProps.onStarPowerUpdate = vi.fn()
  panelProps.onOpenShop = vi.fn()
})

describe('StarPowerPanel 数据展示', () => {
  it('关闭时为空，未登录显示登录提示且不请求', () => {
    const { container, rerender } = render(<StarPowerPanel {...panelProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()

    rerender(<StarPowerPanel {...panelProps} user={null} />)
    expect(screen.getByText('starpower.signInRequired')).toBeInTheDocument()
    expect(api).not.toHaveBeenCalled()
  })

  it('渲染余额、等级、续期进度与交易流水', async () => {
    mockApi({
      'GET /starpower/u1/level': levelData,
      'GET /starpower/u1/transactions': transactionsData(),
    })
    render(<StarPowerPanel {...panelProps} />)

    expect(await screen.findByText('3,200')).toBeInTheDocument()
    expect(screen.getByText('星尘')).toBeInTheDocument()
    expect(screen.getByText('Lv.2')).toBeInTheDocument()
    expect(screen.getByText(/starpower\.needMore/)).toBeInTheDocument()
    expect(screen.getByText(/1,800/)).toBeInTheDocument()
    expect(screen.getByText(/starpower\.streak: 3 天/)).toBeInTheDocument()

    expect(screen.getByText('每日签到')).toBeInTheDocument()
    expect(screen.getByText('歌曲点赞')).toBeInTheDocument()
    expect(screen.getByText('custom_reason')).toBeInTheDocument()
    expect(screen.getByText('注册奖励')).toBeInTheDocument()
    expect(screen.getByText('+50')).toBeInTheDocument()
    expect(screen.getByText('-100')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('-5')).toBeInTheDocument()
    expect(screen.getByText('3250 SP')).toBeInTheDocument()

    expect(screen.getByText(/刚刚/)).toBeInTheDocument()
    expect(screen.getByText(/5分钟前/)).toBeInTheDocument()
    expect(screen.getByText(/2小时前/)).toBeInTheDocument()
    expect(screen.getByText(/3天前/)).toBeInTheDocument()
  })

  it('展开全部等级列表并可收起', async () => {
    mockApi({
      'GET /starpower/u1/level': levelData,
      'GET /starpower/u1/transactions': { transactions: [] },
    })
    render(<StarPowerPanel {...panelProps} />)
    await screen.findByText('星尘')

    fireEvent.click(screen.getByRole('button', { name: /starpower\.allLevels/ }))
    expect(await screen.findByText('新星')).toBeInTheDocument()
    expect(screen.getByText(/1,000 SP/)).toBeInTheDocument()
    expect(screen.getByText('+10/day')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /starpower\.allLevels/ }))
    await waitFor(() => expect(screen.queryByText('新星')).toBeNull())
  })

  it('满级时展示 maxLevel 与 100% 进度', async () => {
    mockApi({
      'GET /starpower/u1/level': {
        ...levelData,
        vipLevel: { ...levelData.vipLevel, nextThreshold: null, nextLabel: null },
      },
      'GET /starpower/u1/transactions': { transactions: [] },
    })
    render(<StarPowerPanel {...panelProps} />)
    expect(await screen.findByText('starpower.maxLevel')).toBeInTheDocument()
    expect(screen.getByText('starpower.noTransactions')).toBeInTheDocument()
  })

  it('点击商城入口先关闭面板再打开商城', async () => {
    mockApi({
      'GET /starpower/u1/level': levelData,
      'GET /starpower/u1/transactions': { transactions: [] },
    })
    render(<StarPowerPanel {...panelProps} />)
    await screen.findByText('3,200')

    fireEvent.click(screen.getByRole('button', { name: /星力商城/ }))
    expect(panelProps.onClose).toHaveBeenCalled()
    await waitFor(() => expect(panelProps.onOpenShop).toHaveBeenCalled(), { timeout: 1000 })
  })

  it('接口失败时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockApi({
      'GET /starpower/u1/level': () => Promise.reject(new Error('level down')),
      'GET /starpower/u1/transactions': () => Promise.reject(new Error('txn down')),
    })
    render(<StarPowerPanel {...panelProps} />)
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('StarPower fetch error:', expect.any(Error))
    )
  })
})

describe('StarPowerPanel 签到', () => {
  function setup(overrides: Record<string, Handler | unknown> = {}) {
    mockApi({
      'GET /starpower/u1/level': levelData,
      'GET /starpower/u1/transactions': { transactions: [] },
      ...overrides,
    })
    render(<StarPowerPanel {...panelProps} />)
  }

  it('签到成功更新星力并展示奖励与连续天数', async () => {
    let levelCalls = 0
    setup({
      'GET /starpower/u1/level': () => {
        levelCalls += 1
        return levelCalls === 1 ? levelData : { ...levelData, checkedInToday: true, streak: 4 }
      },
      'POST /starpower/u1/checkin': { success: true, streak: 4, reward: 50, starPower: 3250 },
    })
    const checkinButton = await screen.findByRole('button', { name: 'starpower.checkin' })
    fireEvent.click(checkinButton)

    await waitFor(() => expect(panelProps.onStarPowerUpdate).toHaveBeenCalledWith(3250))
    expect(await screen.findByText(/starpower\.checkinReward/)).toBeInTheDocument()
    expect(screen.getByText(/\+50 SP/)).toBeInTheDocument()
    expect(screen.getByText(/×4/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'starpower.checkinDone' })).toBeDisabled()

    expect(
      api.mock.calls.filter(([path]) => path === '/starpower/u1/level').length
    ).toBeGreaterThanOrEqual(2)
  })

  it('连续签到 1 天时不展示倍数', async () => {
    setup({
      'POST /starpower/u1/checkin': { success: true, streak: 1, reward: 10, starPower: 3210 },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'starpower.checkin' }))

    expect(await screen.findByText(/\+10 SP/)).toBeInTheDocument()
    expect(screen.queryByText(/×1/)).toBeNull()
  })

  it('后端提示已签到时直接置为已签到', async () => {
    setup({ 'POST /starpower/u1/checkin': { alreadyCheckedIn: true } })
    fireEvent.click(await screen.findByRole('button', { name: 'starpower.checkin' }))
    expect(await screen.findByRole('button', { name: 'starpower.checkinDone' })).toBeDisabled()
    expect(panelProps.onStarPowerUpdate).not.toHaveBeenCalled()
  })

  it('今日已签到时按钮禁用且不发请求', async () => {
    setup({
      'GET /starpower/u1/level': { ...levelData, checkedInToday: true },
    })
    const button = await screen.findByRole('button', { name: 'starpower.checkinDone' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(api.mock.calls.some(([path]) => String(path).includes('/checkin'))).toBe(false)
  })

  it('签到请求异常时记录错误', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setup({ 'POST /starpower/u1/checkin': () => Promise.reject(new Error('down')) })
    fireEvent.click(await screen.findByRole('button', { name: 'starpower.checkin' }))
    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith('Check-in error:', expect.any(Error)))
  })

  it('英文环境展示商城入口与相对时间', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    mockApi({
      'GET /starpower/u1/level': levelData,
      'GET /starpower/u1/transactions': transactionsData(),
    })
    render(
      <I18nProvider>
        <StarPowerPanel {...panelProps} />
      </I18nProvider>
    )

    expect(await screen.findByText('SP Shop — Redeem virtual items')).toBeInTheDocument()
    expect(screen.getByText(/just now/)).toBeInTheDocument()
    expect(screen.getByText(/m ago/)).toBeInTheDocument()
    expect(screen.getByText(/h ago/)).toBeInTheDocument()
    expect(screen.getByText(/d ago/)).toBeInTheDocument()
    expect(screen.getByText(/days/)).toBeInTheDocument()
  })
})

describe('StarPowerShop', () => {
  const items = [
    { id: 'i1', category: 'theme', nameZh: '主题A', nameEn: 'Theme A', descZh: '描述A', descEn: 'Desc A', cost: 100, icon: '🎨', rarity: 'rare' },
    { id: 'i2', category: 'sound', nameZh: '音色B', nameEn: 'Sound B', descZh: '描述B', descEn: 'Desc B', cost: 500, icon: '🎵', rarity: 'common' },
    { id: 'i3', category: 'ai', nameZh: 'AI助手', nameEn: 'AI Helper', descZh: '描述C', descEn: 'Desc C', cost: 1000, icon: '✨', rarity: 'unknown' },
    { id: 'i4', category: 'badge', nameZh: '徽章D', nameEn: 'Badge D', descZh: '描述D', descEn: 'Desc D', cost: 200, icon: '🏅', rarity: 'epic' },
    { id: 'i5', category: 'boost', nameZh: '助推E', nameEn: 'Boost E', descZh: '描述E', descEn: 'Desc E', cost: 300, icon: '⚡', rarity: 'legendary' },
    { id: 'i6', category: 'theme', nameZh: '主题F', nameEn: 'Theme F', descZh: '描述F', descEn: 'Desc F', cost: 2000, icon: '🌙', rarity: 'common' },
  ]
  const inventory = [{ itemId: 'i2', purchasedAt: 1, expiresAt: null }]

  const shopProps = {
    isOpen: true,
    onClose: vi.fn(),
    user,
    starPower: 6400,
    onStarPowerUpdate: vi.fn(),
  }

  function setup(overrides: Record<string, Handler | unknown> = {}) {
    mockApi({
      'GET /starpower/shop/items': { items },
      'GET /starpower/shop/inventory/u1': { inventory },
      ...overrides,
    })
  }

  beforeEach(() => {
    shopProps.onClose = vi.fn()
    shopProps.onStarPowerUpdate = vi.fn()
  })

  it('关闭时为空；未登录时展示空商品态', async () => {
    setup()
    const { container, rerender } = render(<StarPowerShop {...shopProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()

    rerender(<StarPowerShop {...shopProps} user={null} />)
    expect(screen.getByText('此分类暂无商品')).toBeInTheDocument()
    expect(api).not.toHaveBeenCalled()
  })

  it('加载中显示 spinner，加载后按分类与稀有度渲染', async () => {
    let resolveItems: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => {
      resolveItems = resolve
    })
    setup({ 'GET /starpower/shop/items': () => pending })

    const { container } = render(<StarPowerShop {...shopProps} />)
    expect(container.querySelector('.animate-spin')).not.toBeNull()

    await act(async () => {
      resolveItems({ items })
    })

    expect(await screen.findByText('主题A')).toBeInTheDocument()
    expect(screen.getByText('音色B')).toBeInTheDocument()
    expect(screen.getByText('稀有')).toBeInTheDocument()
    expect(screen.getByText('传说')).toBeInTheDocument()
    expect(screen.getAllByText('普通').length).toBeGreaterThan(0)
    // 已拥有商品
    expect(screen.getByText('已拥有')).toBeInTheDocument()
    expect(screen.getByText(/1 件已拥有/)).toBeInTheDocument()

    // 分类筛选
    fireEvent.click(screen.getByRole('button', { name: '音色' }))
    expect(screen.queryByText('主题A')).toBeNull()
    expect(screen.getByText('音色B')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'AI' }))
    expect(screen.getByText('AI助手')).toBeInTheDocument()
    expect(screen.queryByText('音色B')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '全部' }))
    expect(screen.getByText('主题A')).toBeInTheDocument()
  })

  it('空分类展示占位提示', async () => {
    setup({ 'GET /starpower/shop/items': { items: [] } })
    render(<StarPowerShop {...shopProps} />)
    expect(await screen.findByText('此分类暂无商品')).toBeInTheDocument()
  })

  it('点击商品打开确认弹窗并可取消', async () => {
    setup()
    render(<StarPowerShop {...shopProps} />)
    fireEvent.click(await screen.findByText('主题A'))

    expect(screen.getAllByText('描述A').length).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: '确认购买' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '确认购买' })).toBeNull())
  })

  it('星力不足时提示差额并禁用确认', async () => {
    setup()
    render(<StarPowerShop {...shopProps} starPower={50} />)
    fireEvent.click(await screen.findByText('主题A'))

    expect(screen.getByText(/星力值不足（需 100，当前 50）/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认购买' })).toBeDisabled()
  })

  it('购买成功更新星力、库存并展示成功提示', async () => {
    setup({ 'POST /starpower/shop/purchase': { success: true, starPower: 400 } })
    render(<StarPowerShop {...shopProps} starPower={500} />)
    fireEvent.click(await screen.findByText('主题A'))
    fireEvent.click(screen.getByRole('button', { name: '确认购买' }))

    await waitFor(() => expect(shopProps.onStarPowerUpdate).toHaveBeenCalledWith(400))
    expect(await screen.findByText('购买成功!')).toBeInTheDocument()
    expect(await screen.findByText(/2 件已拥有/)).toBeInTheDocument()
    expect(screen.getAllByText('已拥有')).toHaveLength(2)

    const purchaseCall = api.mock.calls.find(([path]) => path === '/starpower/shop/purchase')
    expect(JSON.parse((purchaseCall![1] as RequestInit).body as string)).toEqual({
      userId: 'u1',
      itemId: 'i1',
    })
  })

  it('购买失败展示后端错误，缺失错误时使用默认文案', async () => {
    setup({
      'POST /starpower/shop/purchase': { success: false, error: '余额不足' },
    })
    const { unmount } = render(<StarPowerShop {...shopProps} />)
    fireEvent.click(await screen.findByText('主题A'))
    fireEvent.click(screen.getByRole('button', { name: '确认购买' }))
    expect(await screen.findByText('余额不足')).toBeInTheDocument()
    unmount()

    setup({ 'POST /starpower/shop/purchase': { success: false } })
    render(<StarPowerShop {...shopProps} />)
    fireEvent.click(await screen.findByText('主题A'))
    fireEvent.click(screen.getByRole('button', { name: '确认购买' }))
    expect(await screen.findByText('购买失败')).toBeInTheDocument()
  })

  it('购买请求异常时展示网络错误', async () => {
    setup({ 'POST /starpower/shop/purchase': () => Promise.reject(new Error('offline')) })
    render(<StarPowerShop {...shopProps} />)
    fireEvent.click(await screen.findByText('主题A'))
    fireEvent.click(screen.getByRole('button', { name: '确认购买' }))
    expect(await screen.findByText('网络错误')).toBeInTheDocument()
  })

  it('购买请求进行中按钮显示省略号并禁用', async () => {
    let resolvePurchase: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => {
      resolvePurchase = resolve
    })
    setup({ 'POST /starpower/shop/purchase': () => pending })
    render(<StarPowerShop {...shopProps} />)
    fireEvent.click(await screen.findByText('主题A'))
    fireEvent.click(screen.getByRole('button', { name: '确认购买' }))

    const pendingButton = await screen.findByRole('button', { name: '...' })
    expect(pendingButton).toBeDisabled()

    await act(async () => {
      resolvePurchase({ success: true, starPower: 400 })
    })
    expect(await screen.findByText('购买成功!')).toBeInTheDocument()
  })

  it('英文环境渲染标题、余额与稀有度', async () => {
    localStorage.setItem('dmusic-prefs', JSON.stringify({ lang: 'en' }))
    setup()
    render(
      <I18nProvider>
        <StarPowerShop {...shopProps} />
      </I18nProvider>
    )

    expect(await screen.findByText('Theme A')).toBeInTheDocument()
    expect(screen.getByText('Star Power Shop')).toBeInTheDocument()
    expect(screen.getByText('SP available')).toBeInTheDocument()
    expect(screen.getByText('Owned')).toBeInTheDocument()
    expect(screen.getByText('Rare')).toBeInTheDocument()
    expect(screen.getByText('Legendary')).toBeInTheDocument()
  })
})
