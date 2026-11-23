/**
 * @file D-Music 设计层 axe-core 无障碍门禁（W8 §量化验收 — 离线可测部分）
 * @description 渲染 dmusic 代表性组件矩阵，axe.run（wcag2a/wcag2aa/wcag21a/wcag21aa）
 *              断言无 serious/critical 违规；moderate/minor 仅 console.warn 留档不阻塞门禁
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import * as axe from 'axe-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DButton,
  DCard,
  DEmptyState,
  DInput,
  DList,
  DListItem,
  DModal,
  DMusicCard,
  DTabBar,
  DToast,
  RankingList,
  StatCard,
} from '../src'

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
}

beforeEach(() => {
  // jsdom 未实现 canvas：axe color-contrast 的 icon-ligature 探测会调 getContext
  // 触发 "Not implemented" 虚拟控制台噪声。桩一个最小 2D 上下文（非零像素数据 →
  // 非图标连字 → 走真实对比度路径，jsdom 下退化为 incomplete，非阻塞）。
  // 参照 music-ai / music-community 既有 canvas 桩模式。
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    canvas: document.createElement('canvas'),
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    clearRect() {},
    fillText() {},
    measureText: () => ({ width: 10 }),
    getImageData: (_x: unknown, _y: unknown, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4).fill(128),
    }),
  } as never)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const A11Y_TAGS = { type: 'tags' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }

function formatViolation(v: axe.AxeResults['violations'][number]): string {
  const sample = v.nodes[0]?.html ?? ''
  return `${v.id}(${v.impact}) x${v.nodes.length}: ${v.help} — ${sample}`
}

/**
 * 门禁断言：serious/critical 阻塞；moderate/minor 仅 console.warn 留档。
 * 统一扫 document.body —— DModal/DToast 等若挂 portal 也能覆盖到。
 */
async function expectNoBlockingViolations() {
  const results = await axe.run(document.body, { runOnly: A11Y_TAGS })
  const blocking = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )
  const noted = results.violations.filter(
    v => v.impact === 'moderate' || v.impact === 'minor'
  )
  if (noted.length > 0) {
    console.warn(`[a11y] 非阻塞违规（moderate/minor）: ${noted.map(formatViolation).join(' | ')}`)
  }
  expect(blocking, blocking.map(formatViolation).join('\n')).toEqual([])
}

describe('D-Music axe-core 门禁（wcag2a/2aa/21a/21aa）', () => {
  it('DButton — 全 variant/size/loading/disabled 矩阵', async () => {
    render(
      <>
        <DButton variant="primary">主要按钮</DButton>
        <DButton variant="secondary" size="sm">次要按钮</DButton>
        <DButton variant="ghost" size="lg">幽灵按钮</DButton>
        <DButton variant="danger">危险按钮</DButton>
        <DButton variant="accent" icon={<span>▶</span>}>强调按钮</DButton>
        <DButton variant="primary" loading>加载中</DButton>
        <DButton variant="secondary" disabled>禁用按钮</DButton>
      </>
    )
    await expectNoBlockingViolations()
  })

  it('DInput — default/search/password/error 变体', async () => {
    render(
      <>
        <DInput label="用户名" hint="支持中英文" placeholder="请输入" />
        <DInput label="搜索" variant="search" placeholder="搜索歌曲" />
        <DInput label="密码" variant="password" defaultValue="secret" />
        <DInput id="email-a11y" label="邮箱" error="格式错误" />
      </>
    )
    await expectNoBlockingViolations()
  })

  it('DCard — 静态与 interactive 卡片', async () => {
    render(
      <>
        <DCard variant="default" padding="md">静态卡片</DCard>
        <DCard variant="glass">毛玻璃卡片</DCard>
        <DCard variant="music" interactive onClick={() => {}}>可点击卡片</DCard>
      </>
    )
    await expectNoBlockingViolations()
  })

  it('DMusicCard — 封面/播放态与无封面占位', async () => {
    render(
      <>
        <DMusicCard
          title="星际漫游"
          artist="Echo Chamber"
          coverUrl="/cover.png"
          duration="3:42"
          emotion="calm"
          isPlaying
          onClick={() => {}}
        />
        <DMusicCard title="无封面曲" artist="Nova" />
      </>
    )
    await expectNoBlockingViolations()
  })

  it('DModal — 开态（含遮罩/关闭按钮/页脚，扫 document.body）', async () => {
    render(
      <DModal
        isOpen
        onClose={() => {}}
        title="确认操作"
        description="此操作不可撤销"
        footer={<button type="button">确定</button>}
      >
        <p>模态框正文内容</p>
        <input aria-label="确认输入" />
      </DModal>
    )
    await expectNoBlockingViolations()
  })

  it('DTabBar — default 变体（badge/disabled/icon）', async () => {
    render(
      <DTabBar
        tabs={[
          { id: 'all', label: '全部' },
          { id: 'hot', label: '热门', badge: 12, icon: <span>H</span> },
          { id: 'mine', label: '我的' },
          { id: 'offline', label: '离线', disabled: true },
        ]}
        activeTab="all"
        onTabChange={() => {}}
      />
    )
    await expectNoBlockingViolations()
  })

  it('DTabBar — underline 与 pills 变体', async () => {
    render(
      <>
        <DTabBar
          variant="underline"
          tabs={[{ id: 'songs', label: '歌曲' }, { id: 'albums', label: '专辑' }]}
          activeTab="songs"
          onTabChange={() => {}}
        />
        <DTabBar
          variant="pills"
          size="sm"
          tabs={[{ id: 'a', label: '推荐' }, { id: 'b', label: '附近' }]}
          activeTab="a"
          onTabChange={() => {}}
        />
      </>
    )
    await expectNoBlockingViolations()
  })

  it('DToast — 四种 variant', async () => {
    render(
      <>
        <DToast variant="success" message="已同步" description="同步完成" onDismiss={() => {}} />
        <DToast variant="error" message="失败" onDismiss={() => {}} />
        <DToast variant="warning" message="警告" onDismiss={() => {}} />
        <DToast variant="info" message="提示" onDismiss={() => {}} />
      </>
    )
    await expectNoBlockingViolations()
  })

  it('DEmptyState — 图标/描述/操作按钮', async () => {
    render(
      <DEmptyState
        title="暂无音乐"
        description="先去曲库挑几首"
        action={<button type="button">去曲库</button>}
      />
    )
    await expectNoBlockingViolations()
  })

  it('DList/DListItem — 列表语义与可激活项', async () => {
    render(
      <DList label="播放队列">
        <DListItem onClick={() => {}} active>正在播放 · 星际漫游</DListItem>
        <DListItem onClick={() => {}}>深海之声</DListItem>
        <DListItem>静态项</DListItem>
      </DList>
    )
    await expectNoBlockingViolations()
  })

  it('DataViz — StatCard 与 RankingList', async () => {
    render(
      <>
        <StatCard label="播放量" value="12K" change={15} trend={[1, 2, 3, 4, 5]} icon={<span>S</span>} />
        <StatCard label="收藏" value={3} change={-8} />
        <RankingList
          valueLabel="星力值"
          items={[
            { rank: 1, name: 'Star', score: 12800, change: 'up' },
            { rank: 2, name: 'Nebula', score: 9650, change: 'down', avatar: '/a.png' },
            { rank: 3, name: 'Cosmic', score: 8420, change: 'new' },
            { rank: 4, name: 'Pixel', score: 7100, highlight: true },
          ]}
        />
      </>
    )
    await expectNoBlockingViolations()
  })
})
