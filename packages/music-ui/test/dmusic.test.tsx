/**
 * @file D-Music 设计层组件测试
 * @description 覆盖 DMusicUI / DataViz / DPanel / DMusicShowcase 的渲染与交互行为
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AchievementRing,
  DAchievementCard,
  DBadge,
  DBreadcrumb,
  DButton,
  DCard,
  DEmptyState,
  DFeedback,
  DInput,
  DList,
  DListItem,
  DModal,
  DMusicCard,
  DProgress,
  DSpinner,
  DTabBar,
  DTag,
  DToast,
  DUserCard,
} from '../src/dmusic/DMusicUI'
import {
  AchievementGrid,
  DataExportButton,
  EmotionPieChart,
  PlayStatsChart,
  RankingList,
  SparklineChart,
  StarPowerChart,
  StatCard,
} from '../src/dmusic/DataViz'
import { DPanel } from '../src/dmusic/DPanel'
import { DMusicShowcase } from '../src/dmusic/DMusicShowcase'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
  vi.restoreAllMocks()
})

describe('DButton', () => {
  it('默认渲染文本并响应点击', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<DButton onClick={onClick}>播放</DButton>)
    await user.click(screen.getByRole('button', { name: '播放' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('loading 时禁用并显示旋转图标而非右侧图标', () => {
    const { container } = render(
      <DButton loading iconRight={<span>R</span>} fullWidth variant="danger" size="lg">
        加载中
      </DButton>
    )
    const button = screen.getByRole('button', { name: '加载中' })
    expect(button).toBeDisabled()
    expect(button.className).toContain('w-full')
    expect(button.querySelector('.animate-spin')).not.toBeNull()
    expect(screen.queryByText('R')).not.toBeInTheDocument()
    expect(container.querySelector('span.flex-shrink-0')).toBeNull()
  })

  it('渲染左侧图标并应用尺寸/变体类名', () => {
    render(
      <DButton variant="accent" size="sm" icon={<span>I</span>}>
        强调
      </DButton>
    )
    const button = screen.getByRole('button', { name: '强调' })
    expect(screen.getByText('I')).toBeInTheDocument()
    expect(button.className).toContain('text-[var(--dm-accent-from)]')
    expect(button.className).toContain('h-8')
  })
})

describe('DInput', () => {
  it('label 关联输入框并支持输入', async () => {
    const user = userEvent.setup()
    render(<DInput label="用户名" placeholder="请输入" />)
    const input = screen.getByLabelText('用户名')
    await user.type(input, 'MusAI')
    expect(input).toHaveValue('MusAI')
  })

  it('错误状态设置 aria-invalid/aria-describedby 并显示 role=alert', () => {
    render(<DInput id="email" label="邮箱" error="格式错误" />)
    const input = screen.getByLabelText('邮箱')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'email-error')
    expect(screen.getByRole('alert')).toHaveTextContent('格式错误')
  })

  it('hint 在无错误时展示并可被描述', () => {
    render(<DInput id="nick" label="昵称" hint="支持中英文" />)
    expect(screen.getByText('支持中英文')).toHaveAttribute('id', 'nick-hint')
    expect(screen.getByLabelText('昵称')).toHaveAttribute('aria-describedby', 'nick-hint')
  })

  it('password 变体切换明文/密文', async () => {
    const user = userEvent.setup()
    render(<DInput label="密码" variant="password" defaultValue="secret" />)
    const input = screen.getByLabelText('密码')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('search 变体与 leftIcon 渲染前置图标', () => {
    const { container: searchContainer } = render(<DInput variant="search" placeholder="搜索" />)
    expect(searchContainer.querySelector('input')).toHaveClass('pl-9')
    const { container: iconContainer } = render(
      <DInput leftIcon={<span data-testid="left-icon">L</span>} placeholder="带图标" />
    )
    expect(within(iconContainer).getByTestId('left-icon')).toBeInTheDocument()
  })

  it('支持自定义 size 与 type', () => {
    render(<DInput inputSize="lg" type="number" placeholder="数量" />)
    const input = screen.getByPlaceholderText('数量')
    expect(input).toHaveAttribute('type', 'number')
    expect(input.className).toContain('h-12')
  })
})

describe('DCard', () => {
  it('静态卡片无 button 角色', () => {
    render(<DCard variant="glass" padding="lg">内容</DCard>)
    expect(screen.getByText('内容')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('interactive 卡片可点击并支持键盘 Enter/Space', () => {
    const onClick = vi.fn()
    render(
      <DCard interactive onClick={onClick} glowColor="#fff" padding="none">
        可交互
      </DCard>
    )
    const card = screen.getByRole('button', { name: '可交互' })
    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(card, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(3)
    fireEvent.keyDown(card, { key: 'a' })
    expect(onClick).toHaveBeenCalledTimes(3)
  })
})

describe('DMusicCard / DUserCard / DAchievementCard', () => {
  it('音乐卡片展示封面、时长与情绪标签', () => {
    render(
      <DMusicCard
        title="星际漫游"
        artist="Studio"
        coverUrl="/cover.png"
        duration="3:42"
        emotion="calm"
        isPlaying
      />
    )
    expect(screen.getByRole('img', { name: '星际漫游' })).toHaveAttribute('src', '/cover.png')
    expect(screen.getByText('3:42')).toBeInTheDocument()
    expect(screen.getByText('calm')).toBeInTheDocument()
    expect(screen.getByLabelText('Playing')).toBeInTheDocument()
  })

  it('音乐卡片无封面时显示占位符', () => {
    render(<DMusicCard title="无封面" artist="Echo" />)
    expect(screen.getByText('🎵')).toBeInTheDocument()
    expect(screen.queryByLabelText('Playing')).not.toBeInTheDocument()
  })

  it('用户卡片展示头像/徽章/副标题', () => {
    render(<DUserCard name="小星" avatar="/a.png" subtitle="金牌创作者" badge="金牌" />)
    expect(screen.getByRole('img', { name: '小星' })).toBeInTheDocument()
    expect(screen.getByText('金牌')).toBeInTheDocument()
    expect(screen.getByText('金牌创作者')).toBeInTheDocument()
    expect(screen.getByText('小星')).toBeInTheDocument()
  })

  it('用户卡片无头像时显示首字母', () => {
    render(<DUserCard name="echo" />)
    expect(screen.getByText('E')).toBeInTheDocument()
  })

  it('成就卡片按稀有度展示进度与标签', () => {
    render(
      <DAchievementCard
        title="灵感喷泉"
        description="连续创作"
        icon="💡"
        progress={75}
        unlocked
        rarity="legendary"
      />
    )
    expect(screen.getByRole('img', { name: '灵感喷泉' })).toBeInTheDocument()
    expect(screen.getByText('传说')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75')
  })

  it('未解锁成就卡片降低透明度', () => {
    const { container } = render(
      <DAchievementCard title="隐藏" icon="🔒" progress={10} />
    )
    expect(container.querySelector('.opacity-60')).not.toBeNull()
  })
})

describe('DProgress / AchievementRing', () => {
  it('进度条裁剪越界值并展示标签', () => {
    render(<DProgress value={150} variant="success" showLabel size="lg" aria-label="上传" />)
    const bar = screen.getByRole('progressbar', { name: '上传' })
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('负值被裁剪为 0 并使用默认标签', () => {
    render(<DProgress value={-20} variant="error" />)
    expect(screen.getByRole('progressbar', { name: 'Progress: 0%' })).toBeInTheDocument()
  })

  it('warning/default 变体均可渲染', () => {
    const { rerender } = render(<DProgress value={30} variant="warning" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
    rerender(<DProgress value={40} variant="default" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
  })

  it('环形进度支持子节点与自定义颜色', () => {
    render(
      <AchievementRing progress={200} size={64} strokeWidth={4} color="#22C55E" bgColor="#000">
        <span>100%</span>
      </AchievementRing>
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(document.querySelectorAll('circle')).toHaveLength(2)
  })
})

describe('DFeedback / DSpinner', () => {
  it.each(['loading', 'success', 'warning', 'info'] as const)(
    '%s 类型以 status 角色展示并支持关闭',
    async (type) => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      render(
        <DFeedback type={type} message={`${type} 消息`} description="描述" onDismiss={onDismiss} />
      )
      expect(screen.getByRole('status')).toHaveTextContent(`${type} 消息`)
      expect(screen.getByText('描述')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Dismiss' }))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    }
  )

  it('error 类型使用 alert 角色与 assertive', () => {
    render(<DFeedback type="error" message="失败" />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('失败')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  })

  it('Spinner 提供可访问标签与尺寸类', () => {
    render(<DSpinner size="lg" className="extra" />)
    const spinner = screen.getByLabelText('Loading')
    expect(spinner).toHaveClass('w-8', 'h-8', 'extra')
  })
})

describe('DBadge / DTag', () => {
  it('Badge 支持 dot 与 md 尺寸', () => {
    const { container } = render(
      <DBadge variant="success" size="md" dot>
        在线
      </DBadge>
    )
    expect(screen.getByText('在线')).toBeInTheDocument()
    expect(container.querySelector('.bg-current')).not.toBeNull()
    expect(screen.getByText('在线').className).toContain('text-xs')
  })

  it('Tag 三种变体均可渲染', () => {
    const { rerender } = render(<DTag variant="emotion">开心</DTag>)
    expect(screen.getByText('开心').className).toContain('bg-[var(--dm-accent-from)]/10')
    rerender(<DTag variant="outline">流行</DTag>)
    expect(screen.getByText('流行').className).toContain('bg-transparent')
    rerender(<DTag size="md">电子</DTag>)
    expect(screen.getByText('电子').className).toContain('text-xs')
  })

  it('Tag 可删除按钮触发回调', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<DTag onRemove={onRemove} size="xs">摇滚</DTag>)
    await user.click(screen.getByRole('button', { name: 'Remove 摇滚' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})

describe('DEmptyState / DList', () => {
  it('空状态展示标题/描述/操作', () => {
    render(
      <DEmptyState title="暂无数据" description="去听听歌" action={<button>探索</button>} />
    )
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(screen.getByText('去听听歌')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '探索' })).toBeInTheDocument()
  })

  it('空状态无描述与操作时仅展示标题', () => {
    const { container } = render(<DEmptyState title="空" />)
    expect(screen.getByText('空')).toBeInTheDocument()
    const icon = container.querySelector('[role="img"]')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveTextContent('🎵')
  })

  it('列表支持键盘激活且 active 项有样式', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <DList label="播放列表">
        <DListItem onClick={onClick} active>
          第一首
        </DListItem>
        <DListItem>静态项</DListItem>
      </DList>
    )
    const list = screen.getByRole('list', { name: '播放列表' })
    expect(list).toBeInTheDocument()
    const item = screen.getAllByRole('listitem')[0]
    expect(item.className).toContain('bg-[var(--dm-active-bg)]')
    fireEvent.keyDown(item, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
    await user.click(item)
    expect(onClick).toHaveBeenCalledTimes(2)
    expect(screen.getAllByRole('listitem')[1]).not.toHaveAttribute('tabindex')
  })
})

describe('DModal', () => {
  it('打开后渲染对话框内容并在 Escape 时关闭', () => {
    const onClose = vi.fn()
    render(
      <DModal isOpen onClose={onClose} title="确认" description="请确认" footer={<button>确定</button>}>
        <input aria-label="确认输入" />
      </DModal>
    )
    const dialog = screen.getByRole('dialog', { name: '确认' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('请确认')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('关闭按钮与遮罩可触发 onClose，closeOnBackdrop=false 时遮罩不关闭', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <DModal isOpen onClose={onClose} title="A">
        内容
      </DModal>
    )
    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <DModal isOpen onClose={onClose} title="B" closeOnBackdrop={false}>
        内容
      </DModal>
    )
    const backdrop = document.querySelector('.z-\\[70\\]') as HTMLElement
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('关闭状态不渲染', () => {
    const { container } = render(
      <DModal isOpen={false} onClose={() => {}} title="隐藏">
        内容
      </DModal>
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DTabBar', () => {
  const tabs = [
    { id: 'all', label: '全部' },
    { id: 'hot', label: '热门', badge: 120 },
    { id: 'offline', label: '离线', disabled: true },
  ]

  it('点击切换并渲染 badge 上限', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<DTabBar tabs={tabs} activeTab="all" onTabChange={onTabChange} variant="pills" fullWidth />)
    expect(screen.getByRole('tab', { name: /全部/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('99+')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /热门/ }))
    expect(onTabChange).toHaveBeenCalledWith('hot')
    await user.click(screen.getByRole('tab', { name: /离线/ }))
    expect(onTabChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('tab', { name: /离线/ })).toHaveAttribute('aria-disabled', 'true')
  })

  it('underline 变体渲染指示条与图标', () => {
    render(
      <DTabBar
        tabs={[{ id: 's', label: '歌曲', icon: <span>S</span> }]}
        activeTab="s"
        onTabChange={() => {}}
        variant="underline"
        size="sm"
      />
    )
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(document.querySelector('.absolute.bottom-0')).not.toBeNull()
  })

  it('default 变体渲染背景', () => {
    const { container } = render(<DTabBar tabs={tabs} activeTab="all" onTabChange={() => {}} />)
    expect(container.querySelector('[role="tablist"]')?.getAttribute('style')).toContain(
      'var(--dm-hover-bg)'
    )
  })
})

describe('DToast / DBreadcrumb', () => {
  it('Toast 以 alert 展示并可关闭', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<DToast variant="success" message="成功" description="已同步" onDismiss={onDismiss} />)
    const toast = screen.getByRole('alert')
    expect(toast).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByText('已同步')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('面包屑最后一项为当前页，前项可点击', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <DBreadcrumb
        items={[{ label: '首页', onClick }, { label: '分类' }, { label: '当前' }]}
        separator={<span data-testid="sep">/</span>}
      />
    )
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByText('当前')).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: '首页' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getAllByTestId('sep')).toHaveLength(2)
  })

  it('面包屑使用默认分隔符', () => {
    render(<DBreadcrumb items={[{ label: '首页' }, { label: '当前' }]} />)
    expect(screen.getByRole('button', { name: '首页' }).parentElement?.textContent).toContain('/')
  })
})

describe('DataViz 图表', () => {
  it('StarPowerChart 支持中文/英文与 earned 数据', () => {
    const data = [
      { date: '1月', value: 100, earned: 50 },
      { date: '2月', value: 200, earned: 60 },
    ]
    const { container, rerender } = render(<StarPowerChart data={data} height={180} />)
    expect(screen.getByRole('img', { name: '星力值增长曲线' })).toBeInTheDocument()
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull()
    rerender(<StarPowerChart data={[{ date: 'Jan', value: 10 }]} lang="en" />)
    expect(screen.getByRole('img', { name: 'Star Power Growth Curve' })).toBeInTheDocument()
  })

  it('EmotionPieChart 映射中文标签、未知情绪与 pct 缺省', () => {
    render(
      <EmotionPieChart
        data={[
          { emotion: 'happy', count: 35, pct: 35 },
          { emotion: 'unknown', count: 12 },
        ]}
      />
    )
    expect(screen.getByRole('img', { name: '情绪分布' })).toBeInTheDocument()
    expect(screen.getByText('开心')).toBeInTheDocument()
    expect(screen.getByText('unknown')).toBeInTheDocument()
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
  })

  it('EmotionPieChart 英文模式', () => {
    render(<EmotionPieChart data={[{ emotion: 'happy', count: 1 }]} lang="en" />)
    expect(screen.getByRole('img', { name: 'Emotion Distribution' })).toBeInTheDocument()
    expect(screen.getByText('happy')).toBeInTheDocument()
  })

  it('PlayStatsChart 支持 likes 与英文', () => {
    const { rerender, container } = render(
      <PlayStatsChart data={[{ name: '周一', plays: 10, likes: 2 }]} />
    )
    expect(screen.getByRole('img', { name: '播放统计' })).toBeInTheDocument()
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull()
    rerender(<PlayStatsChart data={[{ name: 'Mon', plays: 10 }]} lang="en" />)
    expect(screen.getByRole('img', { name: 'Play Statistics' })).toBeInTheDocument()
  })

  it('AchievementGrid 渲染进度环网格与自定义列数', () => {
    render(
      <AchievementGrid
        columns={2}
        items={[
          { id: '1', title: '初次', icon: '🎵', progress: 100 },
          { id: '2', title: '达人', icon: '⭐', progress: 40, color: '#F00' },
        ]}
      />
    )
    const list = screen.getByRole('list', { name: 'Achievements' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(list.getAttribute('style')).toContain('repeat(2,')
    expect(within(list).getAllByRole('progressbar')[1]).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('SparklineChart 支持关闭圆点', () => {
    const { container } = render(<SparklineChart data={[1, 2, 3]} showDot={false} color="#000" />)
    expect(screen.getByRole('img', { name: 'Trend' })).toBeInTheDocument()
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull()
  })

  it('StatCard 展示正负变化与迷你趋势线', () => {
    const { rerender } = render(
      <StatCard label="播放量" value="12K" change={15} trend={[1, 2, 3, 4]} icon={<span>I</span>} />
    )
    expect(screen.getByText('+15%')).toBeInTheDocument()
    expect(screen.getByText('I')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Trend' })).toBeInTheDocument()

    rerender(<StatCard label="收藏" value={3} change={-8} trend={[1, 2]} />)
    expect(screen.getByText('-8%')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Trend' })).not.toBeInTheDocument()

    rerender(<StatCard label="无变化" value={0} />)
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })
})

describe('RankingList', () => {
  it('渲染前三名奖牌、涨跌标记与高亮', () => {
    const onItemClick = vi.fn()
    render(
      <RankingList
        maxItems={4}
        valueLabel="星力值"
        onItemClick={onItemClick}
        items={[
          { rank: 1, name: 'Star', score: 12800, change: 'up' },
          { rank: 2, name: 'Nebula', score: 9650, change: 'down', avatar: '/a.png' },
          { rank: 3, name: 'Cosmic', score: 8420, change: 'new' },
          { rank: 4, name: 'Pixel', score: 7100, change: 'same', highlight: true },
        ]}
      />
    )
    expect(screen.getByRole('list', { name: '排行榜' })).toBeInTheDocument()
    expect(screen.getByText('星力值')).toBeInTheDocument()
    expect(screen.getByLabelText('Rank 1')).toBeInTheDocument()
    expect(screen.getByText('▲')).toBeInTheDocument()
    expect(screen.getByText('▼')).toBeInTheDocument()
    expect(screen.getByText('NEW')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Nebula' })).toBeInTheDocument()
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.getByText('12,800')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('listitem')[0])
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ rank: 1 }))
  })

  it('英文模式与默认分值标签', () => {
    render(<RankingList lang="en" items={[{ rank: 5, name: 'Echo', score: 10 }]} />)
    expect(screen.getByRole('list', { name: 'Rankings' })).toBeInTheDocument()
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

describe('DataExportButton', () => {
  it('CSV 导出生成 Blob 并触发下载', async () => {
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<DataExportButton data={[{ a: 1, b: 'x' }]} filename="stats" />)
    const button = screen.getByRole('button', { name: 'Export as CSV' })
    expect(button).toHaveTextContent('CSV')
    await user.click(button)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('空数据 CSV 不导出', async () => {
    const user = userEvent.setup()
    render(<DataExportButton data={[]} label="导出" />)
    await user.click(screen.getByRole('button', { name: '导出' }))
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('JSON 导出使用 application/json', async () => {
    const user = userEvent.setup()
    const createSpy = vi.spyOn(URL, 'createObjectURL')
    render(<DataExportButton data={[{ a: 1 }]} format="json" />)
    await user.click(screen.getByRole('button', { name: 'Export as JSON' }))
    expect(createSpy).toHaveBeenCalledTimes(1)
    const blob = createSpy.mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/json')
  })
})

describe('DPanel', () => {
  it('打开时渲染标题/副标题/图标/底部与分区标签', () => {
    render(
      <DPanel
        isOpen
        onClose={() => {}}
        title="播放列表"
        subtitle="副标题"
        icon={<span>M</span>}
        footer={<button>确定</button>}
        sectionLabel="§1.2"
        headerActions={<button>操作</button>}
      >
        面板内容
      </DPanel>
    )
    const panel = screen.getByRole('dialog', { name: '播放列表' })
    expect(panel).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('副标题')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('面板内容')).toBeInTheDocument()
    expect(screen.getByText('§1.2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确定' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument()
  })

  it('Escape 与关闭按钮触发 onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <DPanel isOpen onClose={onClose} title="面板">
        内容
      </DPanel>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Close panel' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('点击遮罩关闭，noBackdrop 时不渲染遮罩', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <DPanel isOpen onClose={onClose} title="面板" size="xl">
        内容
      </DPanel>
    )
    const backdrop = document.querySelector('[class*="z-[60]"]') as HTMLElement
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <DPanel isOpen onClose={onClose} title="无遮罩" noBackdrop>
        内容
      </DPanel>
    )
    expect(document.querySelector('[class*="z-[60]"]')).toBeNull()
  })

  it('mobileBottomSheet / full 尺寸与关闭态', async () => {
    const { rerender } = render(
      <DPanel isOpen onClose={() => {}} title="底部" mobileBottomSheet>
        内容
      </DPanel>
    )
    expect(screen.getByRole('dialog')).toHaveClass('bottom-0')
    rerender(
      <DPanel isOpen onClose={() => {}} title="全屏" size="full">
        内容
      </DPanel>
    )
    expect(screen.getByRole('dialog')).toHaveClass('max-w-full')
    rerender(<DPanel isOpen={false} onClose={() => {}} title="关闭">内容</DPanel>)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('鼠标悬停改变关闭按钮样式', () => {
    render(<DPanel isOpen onClose={() => {}} title="悬停">内容</DPanel>)
    const closeBtn = screen.getByRole('button', { name: 'Close panel' })
    fireEvent.mouseEnter(closeBtn)
    expect(closeBtn.style.background).toContain('var(--dm-hover-bg)')
    fireEvent.mouseLeave(closeBtn)
    expect(closeBtn.style.background).toBe('transparent')
  })
})

describe('DMusicShowcase', () => {
  it('渲染全部分区并可关闭反馈、切换标签', async () => {
    const user = userEvent.setup()
    render(<DMusicShowcase />)
    expect(screen.getByRole('heading', { name: 'D-Music 设计系统展示' })).toBeInTheDocument()
    expect(screen.getByText('按钮组件')).toBeInTheDocument()

    const dismissButtons = screen.getAllByRole('button', { name: 'Dismiss' })
    expect(dismissButtons.length).toBeGreaterThan(0)
    for (let i = 0; i < dismissButtons.length; i += 1) {
      await user.click(screen.getAllByRole('button', { name: 'Dismiss' })[0])
    }
    expect(screen.queryAllByRole('button', { name: 'Dismiss' })).toHaveLength(0)

    await user.click(screen.getByRole('tab', { name: /收藏/ }))
    expect(screen.getByRole('tab', { name: /收藏/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: /流行/ }))
    expect(screen.getByRole('tab', { name: /流行/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: /歌词/ }))
    expect(screen.getByRole('tab', { name: /歌词/ })).toHaveAttribute('aria-selected', 'true')

    await user.type(screen.getByPlaceholderText('请输入用户名'), 'MusAI')
    expect(screen.getByPlaceholderText('请输入用户名')).toHaveValue('MusAI')

    await user.click(screen.getByText('🎵 深空回响 — Echo Chamber'))
    await user.click(screen.getByRole('button', { name: '首页' }))
    await user.click(screen.getByRole('button', { name: '社区' }))
    await user.click(screen.getByRole('button', { name: '创作挑战赛' }))
    await user.click(screen.getByRole('button', { name: 'Remove 可删除标签' }))
  })

  it('导出按钮生成 CSV 文件', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:showcase')
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<DMusicShowcase />)
    await user.click(screen.getByRole('button', { name: '导出' }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('可打开并关闭模态框和面板', async () => {
    const user = userEvent.setup()
    render(<DMusicShowcase />)
    await user.click(screen.getByRole('button', { name: '打开模态框' }))
    expect(screen.getByRole('dialog', { name: '确认操作' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog', { name: '确认操作' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开模态框' }))
    await user.click(
      within(screen.getByRole('dialog', { name: '确认操作' })).getByRole('button', { name: '确认' })
    )
    expect(screen.queryByRole('dialog', { name: '确认操作' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开示例面板' }))
    expect(screen.getByRole('dialog', { name: '示例面板' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close panel' }))

    await user.click(screen.getByRole('button', { name: '打开示例面板' }))
    await user.click(
      within(screen.getByRole('dialog', { name: '示例面板' })).getByRole('button', { name: '确认' })
    )
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '示例面板' })).not.toBeInTheDocument())
  })

  it('支持的英文模式渲染', () => {
    render(<DMusicShowcase lang="en" />)
    expect(screen.getByRole('img', { name: 'Star Power Growth Curve' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Play Statistics' })).toBeInTheDocument()
  })
})
