/**
 * @file 复杂组件测试
 * @description Sidebar 全家桶、useIsMobile、Carousel、Chart 包装组件
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '../src/ui/sidebar'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../src/ui/carousel'
import {
  ChartContainer,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
} from '../src/ui/chart'
import { useIsMobile } from '../src/ui/use-mobile'

const originalInnerWidth = window.innerWidth

// jsdom 无布局能力，ResponsiveContainer 不会渲染子节点；替换为直接渲染的容器以测试图表包装组件。
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  window.innerWidth = 1280
  document.cookie = 'sidebar_state=; max-age=0; path=/'
  globalThis.IntersectionObserver =
    StubIntersectionObserver as unknown as typeof IntersectionObserver
})

afterEach(() => {
  window.innerWidth = originalInnerWidth
  document.cookie = 'sidebar_state=; max-age=0; path=/'
  vi.restoreAllMocks()
})

function SidebarDemo() {
  const { state, toggleSidebar } = useSidebar()
  return (
    <>
      <button onClick={toggleSidebar}>外部切换</button>
      <span data-testid="state">{state}</span>
    </>
  )
}

function FullSidebar({ variant = 'sidebar', side = 'left', collapsible = 'offcanvas' } = {}) {
  return (
    <SidebarProvider>
      <Sidebar variant={variant as 'sidebar'} side={side as 'left'} collapsible={collapsible as 'offcanvas'}>
        <SidebarHeader>
          <SidebarInput aria-label="搜索" placeholder="搜索" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>音乐库</SidebarGroupLabel>
            <SidebarGroupAction aria-label="新建歌单">+</SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="播放列表">
                    <span>播放列表</span>
                  </SidebarMenuButton>
                  <SidebarMenuAction showOnHover aria-label="更多">
                    …
                  </SidebarMenuAction>
                  <SidebarMenuBadge>12</SidebarMenuBadge>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#a" isActive size="sm">
                        子项 A
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#b">子项 B</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton variant="outline" size="lg">
                    专辑
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
        </SidebarContent>
        <SidebarFooter>版权</SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>主内容</SidebarInset>
      <SidebarTrigger />
      <SidebarDemo />
    </SidebarProvider>
  )
}

describe('SidebarProvider / Sidebar', () => {
  it('渲染完整侧边栏结构并支持触发器/快捷键/导轨切换', async () => {
    const user = userEvent.setup()
    render(<FullSidebar />)
    expect(screen.getByTestId('state')).toHaveTextContent('expanded')
    expect(document.querySelector('[data-slot="sidebar-wrapper"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'expanded')
    expect(document.querySelector('[data-slot="sidebar-gap"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="sidebar-container"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="sidebar-inner"]')).not.toBeNull()
    expect(screen.getByLabelText('搜索')).toBeInTheDocument()
    expect(screen.getByText('音乐库')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建歌单' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '播放列表' })).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('button', { name: '更多' })).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '子项 A' })).toHaveAttribute('data-active', 'true')
    expect(document.querySelectorAll('[data-slot="sidebar-menu-skeleton"]')).toHaveLength(2)
    expect(document.querySelectorAll('[data-sidebar="menu-skeleton-icon"]')).toHaveLength(1)
    expect(screen.getByText('主内容')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="sidebar-rail"]')).not.toBeNull()

    await user.click(document.querySelector('[data-slot="sidebar-trigger"]') as HTMLElement)
    expect(screen.getByTestId('state')).toHaveTextContent('collapsed')
    expect(document.cookie).toContain('sidebar_state=false')

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('expanded'))

    await user.click(screen.getByRole('button', { name: '外部切换' }))
    expect(screen.getByTestId('state')).toHaveTextContent('collapsed')

    fireEvent.click(screen.getByTitle('Toggle Sidebar'))
    expect(screen.getByTestId('state')).toHaveTextContent('expanded')
  })

  it('collapsed 状态下菜单按钮显示 tooltip', async () => {
    const user = userEvent.setup()
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="收藏">收藏</SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={{
                  children: '对象 tooltip',
                  side: 'right',
                  className: 'custom-tip',
                }}
              >
                最近
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton>无提示</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>
    )
    await user.hover(screen.getByRole('button', { name: '收藏' }))
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('收藏')
    )
    await user.hover(screen.getByRole('button', { name: '最近' }))
    await waitFor(() => {
      const tip = document.querySelector('[data-slot="tooltip-content"].custom-tip')
      expect(tip).toHaveTextContent('对象 tooltip')
    })
  })

  it('collapsible=none 渲染简单容器', () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none" className="simple">
          内容
        </Sidebar>
      </SidebarProvider>
    )
    const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement
    expect(sidebar.className).toContain('simple')
    expect(sidebar.className).toContain('w-(--sidebar-width)')
    expect(sidebar).toHaveTextContent('内容')
  })

  it('floating/inset 变体与右侧布局应用对应类名', () => {
    const { rerender } = render(<FullSidebar variant="floating" side="right" />)
    const container = document.querySelector('[data-slot="sidebar-container"]') as HTMLElement
    expect(container.className).toContain('right-0')
    expect(container.className).toContain('p-2')
    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-variant', 'floating')
    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-side', 'right')

    rerender(<FullSidebar variant="inset" />)
    expect(document.querySelector('[data-slot="sidebar-container"]')?.className).toContain('p-2')
  })

  it('collapsible=icon 时折叠状态写入 data-collapsible', async () => {
    const user = userEvent.setup()
    render(<FullSidebar collapsible="icon" />)
    await user.click(document.querySelector('[data-slot="sidebar-trigger"]') as HTMLElement)
    const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')
    expect(sidebar).toHaveAttribute('data-collapsible', 'icon')
  })

  it('移动端渲染 Sheet 并通过触发器打开', async () => {
    window.innerWidth = 500
    const user = userEvent.setup()
    render(<FullSidebar />)
    // 移动端关闭时 Sheet 内容未挂载
    expect(await screen.findByTestId('state')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(document.querySelector('[data-slot="sidebar-trigger"]') as HTMLElement)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-mobile', 'true')
    expect(dialog.className).toContain('w-(--sidebar-width)')
    expect(screen.getByText('Displays the mobile sidebar.')).toBeInTheDocument()
  })

  it('asChild 变体将样式传递给子元素', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <a href="#group">分组链接</a>
            </SidebarGroupLabel>
            <SidebarGroupAction asChild>
              <a href="#action">动作</a>
            </SidebarGroupAction>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#menu">菜单链接</a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <a href="#sub">子菜单链接</a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenu>
          </SidebarGroup>
        </Sidebar>
      </SidebarProvider>
    )
    expect(screen.getByRole('link', { name: '分组链接' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '动作' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '菜单链接' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '子菜单链接' })).toBeInTheDocument()
  })

  it('脱离 Provider 使用 useSidebar 会抛错', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<SidebarTrigger />)).toThrow(
      'useSidebar must be used within a SidebarProvider.'
    )
    errorSpy.mockRestore()
  })
})

describe('Carousel', () => {
  it('渲染水平轮播、滑块与禁用箭头，并支持键盘导航', async () => {
    const setApi = vi.fn()
    render(
      <Carousel setApi={setApi} className="custom-carousel">
        <CarouselContent>
          <CarouselItem>第一辑</CarouselItem>
          <CarouselItem>第二辑</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
    expect(region.className).toContain('custom-carousel')
    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
    expect(setApi).toHaveBeenCalled()

    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    fireEvent.keyDown(region, { key: 'Enter' })
    expect(region).toBeInTheDocument()
  })

  it('垂直方向应用垂直布局类名', () => {
    render(
      <Carousel orientation="vertical">
        <CarouselContent>
          <CarouselItem>垂直项</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )
    expect(screen.getByRole('group').className).toContain('pt-4')
    expect(screen.getByRole('button', { name: 'Previous slide' }).className).toContain('-top-12')
    expect(screen.getByRole('button', { name: 'Next slide' }).className).toContain('-bottom-12')
  })

  it('脱离 Carousel 使用子组件会抛错', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<CarouselItem />)).toThrow('useCarousel must be used within a <Carousel />')
    errorSpy.mockRestore()
  })
})

describe('Chart', () => {
  const config = {
    desktop: { label: '桌面端', color: '#2563EB' },
    mobile: { label: '移动端', theme: { light: '#F59E0B', dark: '#FBBF24' } },
  }

  it('ChartContainer 注入 CSS 变量并渲染图表容器', () => {
    render(
      <ChartContainer id="demo" config={config} className="my-chart">
        <div>图表</div>
      </ChartContainer>
    )
    const container = document.querySelector('[data-slot="chart"]') as HTMLElement
    expect(container).toHaveAttribute('data-chart', 'chart-demo')
    expect(container.className).toContain('my-chart')
    expect(screen.getByText('图表')).toBeInTheDocument()
  })

  it('ChartStyle 同时输出明暗主题变量，无颜色配置时不渲染', () => {
    const { container, rerender } = render(<ChartStyle id="chart-x" config={config} />)
    const css = container.querySelector('style')?.innerHTML ?? ''
    expect(css).toContain('--color-desktop: #2563EB')
    expect(css).toContain('--color-mobile: #FBBF24')
    expect(css).toContain('.dark')

    rerender(<ChartStyle id="chart-y" config={{ empty: { label: '无颜色' } }} />)
    expect(container.querySelector('style')).toBeNull()
  })

  it('未使用 ChartContainer 时 useChart 抛错', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(<ChartTooltipContent active payload={[{ dataKey: 'a', value: 1 }]} />)
    ).toThrow('useChart must be used within a <ChartContainer />')
    errorSpy.mockRestore()
  })

  it('ChartTooltipContent 渲染标签、数值与指示条', () => {
    const tooltipConfig = {
      desktop: { label: '桌面端', color: '#2563EB' },
      mobile: { label: '移动端', color: '#F59E0B', icon: () => <span>ICON</span> },
    }
    const { rerender } = render(
      <ChartContainer config={tooltipConfig}>
        <div>
          <ChartTooltipContent
            active
            indicator="dashed"
            label="desktop"
            labelClassName="lbl"
            payload={[
              {
                dataKey: 'desktop',
                name: '桌面端',
                value: 1234,
                color: '#2563EB',
                payload: { fill: '#000' },
              },
            ]}
          />
        </div>
      </ChartContainer>
    )
    expect(screen.getAllByText('桌面端').length).toBeGreaterThan(0)
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(document.querySelector('.lbl')).not.toBeNull()
    expect(document.querySelector('.border-dashed')).not.toBeNull()

    rerender(
      <ChartContainer config={tooltipConfig}>
        <div>
          <ChartTooltipContent
            active
            hideLabel
            hideIndicator
            nameKey="label"
            labelKey="label"
            labelFormatter={(value) => `格式化：${String(value)}`}
            formatter={(value, name) => (
              <span>
                自定义 {String(value)}-{String(name)}
              </span>
            )}
            payload={[
              { dataKey: 'mobile', name: '移动端', value: 320, payload: { label: 'mobile' } },
            ]}
          />
        </div>
      </ChartContainer>
    )
    expect(screen.getByText(/自定义 320-移动端/)).toBeInTheDocument()
  })

  it('ChartTooltipContent 非激活或无数据时不渲染', () => {
    render(
      <ChartContainer config={config}>
        <div>
          <ChartTooltipContent active={false} payload={[{ dataKey: 'x', value: 1 }]} />
          <ChartTooltipContent active payload={[]} />
        </div>
      </ChartContainer>
    )
    expect(document.querySelector('[data-slot="chart"]')).not.toBeNull()
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('ChartLegendContent 渲染图标/色块与空状态', () => {
    const Icon = () => <span>ICON</span>
    const legendConfig = {
      desktop: { label: '桌面端', color: '#2563EB' },
      mobile: { label: '移动端', color: '#F59E0B', icon: Icon },
    }
    const { rerender } = render(
      <ChartContainer config={legendConfig}>
        <ChartLegendContent
          verticalAlign="top"
          payload={[
            { value: 'd', dataKey: 'desktop', color: '#2563EB' },
            { value: 'm', dataKey: 'mobile' },
          ]}
        />
      </ChartContainer>
    )
    expect(screen.getByText('桌面端')).toBeInTheDocument()
    expect(screen.getByText('移动端')).toBeInTheDocument()
    expect(screen.getByText('ICON')).toBeInTheDocument()
    const legend = screen.getByText('桌面端').parentElement as HTMLElement
    expect(legend.className).toContain('pb-3')

    rerender(
      <ChartContainer config={legendConfig}>
        <ChartLegendContent verticalAlign="bottom" hideIcon nameKey="label" payload={[]} />
      </ChartContainer>
    )
    expect(screen.queryByText('桌面端')).not.toBeInTheDocument()
  })

  it('getPayloadConfigFromPayload 支持多种 payload 结构', () => {
    const branchConfig = {
      desktop: { label: '桌面端', color: '#111' },
      mobile: { label: '移动端', color: '#222' },
    }
    const { rerender } = render(
      <ChartContainer config={branchConfig}>
        <ChartLegendContent
          nameKey="label"
          payload={[
            { value: 'a', dataKey: 'desktop', payload: { label: 'mobile' } },
            { value: 'b', dataKey: 'desktop', payload: null },
            { value: 'c', dataKey: 'desktop', desktop: 'mobile' },
          ]}
        />
      </ChartContainer>
    )
    expect(screen.getByText('移动端')).toBeInTheDocument()
    expect(screen.queryByText('桌面端')).not.toBeInTheDocument()

    rerender(
      <ChartContainer config={branchConfig}>
        <ChartLegendContent
          nameKey="desktop"
          payload={[{ value: 'd', dataKey: 'x', desktop: 'mobile' }]}
        />
      </ChartContainer>
    )
    expect(screen.getByText('移动端')).toBeInTheDocument()

    rerender(
      <ChartContainer config={branchConfig}>
        <ChartLegendContent payload={[{ value: 'desktop' }]} />
      </ChartContainer>
    )
    expect(screen.getByText('桌面端')).toBeInTheDocument()
  })
})

describe('useIsMobile', () => {
  it('随媒体查询变化更新并清理监听器', () => {
    const listeners: Array<() => void> = []
    const removeEventListener = vi.fn()
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(max-width: 767px)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_event: string, cb: () => void) => listeners.push(cb),
      removeEventListener,
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)

    function Probe() {
      const isMobile = useIsMobile()
      return <span>{isMobile ? 'mobile' : 'desktop'}</span>
    }

    const { unmount } = render(<Probe />)
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 767px)')
    expect(screen.getByText('desktop')).toBeInTheDocument()

    act(() => {
      window.innerWidth = 400
      listeners.forEach((cb) => cb())
    })
    expect(screen.getByText('mobile')).toBeInTheDocument()

    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
