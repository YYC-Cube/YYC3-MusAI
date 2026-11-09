/**
 * @file CopyrightPanel 版权认证中心测试
 * @description 覆盖加载/空态/错误态、证书列表、证书详情、复制编号与复位、
 *              认证/审核状态、主题显示、中英文文案与关闭行为。
 */
import { createElement } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@yyc3/music-utils'
import { I18nProvider } from '@yyc3/music-hooks'
import { CopyrightPanel } from '../src'

vi.mock('@yyc3/music-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@yyc3/music-utils')>()
  return { ...actual, apiFetch: vi.fn() }
})

const api = vi.mocked(apiFetch) as unknown as ReturnType<typeof vi.fn>

const user = { id: 'u1', name: 'Alice', email: 'alice@example.com' }
const certifiedAt = new Date(2025, 0, 15, 12, 0, 0).getTime()

function makeCert(over: Record<string, any> = {}) {
  return {
    certId: 'c1',
    userId: 'u1',
    userName: 'Alice',
    workId: 'w1',
    workTitle: 'Starlight',
    workTheme: 'space',
    workLyrics: ['line one'],
    contentHash: 'abc123hash',
    status: 'certified',
    appliedAt: certifiedAt - 1000,
    certifiedAt,
    certNumber: 'DM-2025-0001',
    ...over,
  }
}

function renderWithLang(element: React.ReactElement, lang: 'zh' | 'en' = 'zh') {
  localStorage.setItem('dmusic-prefs', JSON.stringify({ lang }))
  return render(createElement(I18nProvider, null, element))
}

function setup(over: Record<string, any> = {}, lang: 'zh' | 'en' = 'zh') {
  const onClose = vi.fn()
  const utils = renderWithLang(
    createElement(CopyrightPanel, { isOpen: true, onClose, user, ...over }),
    lang
  )
  return { onClose, ...utils }
}

async function openWithCerts(certs: any[], lang: 'zh' | 'en' = 'zh') {
  api.mockResolvedValue({ certs })
  const ctx = setup({}, lang)
  await waitFor(() => expect(api).toHaveBeenCalled())
  if (certs.length > 0) {
    await screen.findByText(certs[0].workTitle)
  } else {
    await screen.findByText(lang === 'zh' ? '暂无版权认证' : 'No certifications yet')
  }
  return ctx
}

beforeEach(() => {
  localStorage.clear()
  api.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('CopyrightPanel — 打开与加载', () => {
  it('关闭时不渲染内容', () => {
    const { container } = setup({ isOpen: false })
    expect(container).toBeEmptyDOMElement()
  })

  it('未登录时不请求数据并展示空态', async () => {
    setup({ user: null })
    expect(await screen.findByText('暂无版权认证')).toBeInTheDocument()
    expect(api).not.toHaveBeenCalled()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('加载中展示旋转指示器，完成后展示证书数量', async () => {
    let resolveCerts: (v: any) => void = () => {}
    api.mockReturnValue(new Promise((res) => { resolveCerts = res }) as any)
    const { container } = setup()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()

    await act(async () => {
      resolveCerts({ certs: [makeCert()] })
    })
    expect(await screen.findByText('Starlight')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('已认证作品')).toBeInTheDocument()
    expect(screen.getByText('区块链存证')).toBeInTheDocument()
  })

  it('请求失败时记录错误并展示空态', async () => {
    api.mockRejectedValue(new Error('network down'))
    setup()
    expect(await screen.findByText('暂无版权认证')).toBeInTheDocument()
    expect(console.error).toHaveBeenCalled()
    expect(api).toHaveBeenCalledWith('/copyright/user/u1')
  })

  it('用户变化时重新拉取证书', async () => {
    api.mockResolvedValue({ certs: [makeCert()] })
    const { rerender } = setup()
    await screen.findByText('Starlight')
    expect(api).toHaveBeenCalledTimes(1)

    rerender(
      createElement(I18nProvider, null,
        createElement(CopyrightPanel, {
          isOpen: true, onClose: vi.fn(), user: { id: 'u2', name: 'Bob' },
        })
      )
    )
    await waitFor(() => expect(api).toHaveBeenCalledWith('/copyright/user/u2'))
    expect(api).toHaveBeenCalledTimes(2)
  })

  it('展示认证流程说明', async () => {
    await openWithCerts([])
    expect(screen.getByText('认证流程')).toBeInTheDocument()
    expect(screen.getByText('① 发布作品')).toBeInTheDocument()
    expect(screen.getByText('② 申请认证')).toBeInTheDocument()
    expect(screen.getByText('③ 获得证书')).toBeInTheDocument()
    expect(screen.getByText(/在「IP矩阵」面板中选择你的作品/)).toBeInTheDocument()
  })
})

describe('CopyrightPanel — 证书列表', () => {
  it('渲染证书标题、编号、日期与内容指纹', async () => {
    await openWithCerts([makeCert()])
    expect(screen.getByText('我的证书')).toBeInTheDocument()
    expect(screen.getByText('Starlight')).toBeInTheDocument()
    expect(screen.getByText('DM-2025-0001')).toBeInTheDocument()
    expect(screen.getByText('2025年1月15日')).toBeInTheDocument()
    expect(screen.getByText('abc123hash')).toBeInTheDocument()
  })

  it('点击证书打开详情并返回列表', async () => {
    await openWithCerts([makeCert()])
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Starlight/ }))

    expect(screen.getByText('原创版权证书')).toBeInTheDocument()
    expect(screen.getByText('D-MUSIC ORIGINAL CERTIFICATION')).toBeInTheDocument()
    expect(screen.getByText('证书编号')).toBeInTheDocument()
    expect(screen.getAllByText('DM-2025-0001').length).toBeGreaterThan(0)
    expect(screen.getByText('作品名称')).toBeInTheDocument()
    expect(screen.getByText('作者')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('内容指纹')).toBeInTheDocument()
    expect(screen.getByText('认证时间')).toBeInTheDocument()
    expect(screen.getByText('创作主题')).toBeInTheDocument()
    expect(screen.getByText('space')).toBeInTheDocument()
    expect(screen.getByText('已认证')).toBeInTheDocument()
    expect(screen.getByText('VERIFIED BY D-MUSIC BLOCKCHAIN')).toBeInTheDocument()

    await userEventApi.click(screen.getByRole('button', { name: /← 返回/ }))
    await waitFor(() => expect(screen.queryByText('原创版权证书')).not.toBeInTheDocument())
    expect(screen.getByText('我的证书')).toBeInTheDocument()
  })

  it('审核中且无主题的证书不展示主题区块', async () => {
    await openWithCerts([makeCert({ status: 'pending', workTheme: '' })])
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Starlight/ }))
    expect(screen.getByText('审核中')).toBeInTheDocument()
    expect(screen.queryByText('创作主题')).not.toBeInTheDocument()
  })
})

describe('CopyrightPanel — 复制证书编号', () => {
  it('复制编号写入剪贴板并在 2 秒后复位', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    await openWithCerts([makeCert()])
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Starlight/ }))
    // userEvent.setup 会注入自己的剪贴板桩，需在其后覆盖以断言真实调用
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await userEventApi.click(screen.getByRole('button', { name: /复制编号/ }))

    expect(writeText).toHaveBeenCalledWith('DM-2025-0001')
    expect(screen.getByRole('button', { name: /已复制/ })).toBeInTheDocument()

    await waitFor(
      () => expect(screen.getByRole('button', { name: /复制编号/ })).toBeInTheDocument(),
      { timeout: 2500 }
    )
  }, 10000)

  it('剪贴板不可用时仍展示已复制状态', async () => {
    await openWithCerts([makeCert()])
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Starlight/ }))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    await userEventApi.click(screen.getByRole('button', { name: /复制编号/ }))
    expect(screen.getByRole('button', { name: /已复制/ })).toBeInTheDocument()
  })
})

describe('CopyrightPanel — 头部与关闭', () => {
  it('关闭按钮与遮罩触发 onClose', async () => {
    const ctx = await openWithCerts([])
    const userEventApi = userEvent.setup()
    const closeBtn = screen.getByRole('button', { name: '' })
    await userEventApi.click(closeBtn)
    expect(ctx.onClose).toHaveBeenCalledTimes(1)

    await userEventApi.click(ctx.container.querySelector('.fixed.inset-0') as HTMLElement)
    expect(ctx.onClose).toHaveBeenCalledTimes(2)
  })
})

describe('CopyrightPanel — 英文文案', () => {
  it('英文空态与列表日期', async () => {
    await openWithCerts([], 'en')
    expect(screen.getByText('Copyright Center')).toBeInTheDocument()
    expect(screen.getByText('Original Protection & Certificates')).toBeInTheDocument()
    expect(screen.getByText('Certified Works')).toBeInTheDocument()
    expect(screen.getByText('Blockchain Verified')).toBeInTheDocument()
    expect(screen.getByText('No certifications yet')).toBeInTheDocument()
    expect(screen.getByText('Certify your works in the IP Matrix')).toBeInTheDocument()
    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByText('1. Publish')).toBeInTheDocument()
  })

  it('英文证书详情、复制与状态', async () => {
    await openWithCerts([makeCert()], 'en')
    expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument()
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Starlight/ }))

    expect(screen.getByText('Original Copyright Certificate')).toBeInTheDocument()
    expect(screen.getByText('Certificate No.')).toBeInTheDocument()
    expect(screen.getByText('Work Title')).toBeInTheDocument()
    expect(screen.getByText('Author')).toBeInTheDocument()
    expect(screen.getByText('Content Hash')).toBeInTheDocument()
    expect(screen.getByText('Certified At')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('CERTIFIED')).toBeInTheDocument()

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await userEventApi.click(screen.getByRole('button', { name: /Copy #/ }))
    expect(writeText).toHaveBeenCalledWith('DM-2025-0001')
    expect(screen.getByRole('button', { name: /Copied/ })).toBeInTheDocument()

    await userEventApi.click(screen.getByRole('button', { name: /← Back/ }))
    expect(screen.getByText('My Certificates')).toBeInTheDocument()
  })

  it('英文审核中状态', async () => {
    await openWithCerts([makeCert({ status: 'pending' })], 'en')
    const userEventApi = userEvent.setup()
    await userEventApi.click(screen.getByRole('button', { name: /Starlight/ }))
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })
})
