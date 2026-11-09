/**
 * @file 数据展示与表单控件测试
 * @description Table / Pagination / Breadcrumb / Avatar / Skeleton / AspectRatio / ScrollArea / RadioGroup /
 * Slider / Toggle / ToggleGroup / Collapsible / InputOTP / Calendar / Form / Resizable / Sonner
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../src/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../src/ui/pagination'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../src/ui/breadcrumb'
import { Avatar, AvatarFallback, AvatarImage } from '../src/ui/avatar'
import { Skeleton } from '../src/ui/skeleton'
import { AspectRatio } from '../src/ui/aspect-ratio'
import { ScrollArea, ScrollBar } from '../src/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '../src/ui/radio-group'
import { Slider } from '../src/ui/slider'
import { Toggle } from '../src/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '../src/ui/toggle-group'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../src/ui/collapsible'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '../src/ui/input-otp'
import { Calendar } from '../src/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../src/ui/form'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../src/ui/resizable'
import { Toaster } from '../src/ui/sonner'
import { Badge } from '../src/ui/badge'
import { Button } from '../src/ui/button'
import { Progress } from '../src/ui/progress'

const originalElementFromPoint = document.elementFromPoint

beforeEach(() => {
  // input-otp 的选区徽标会调用该 API，jsdom 未实现
  document.elementFromPoint = vi.fn(() => null)
})

afterEach(() => {
  document.elementFromPoint = originalElementFromPoint
  vi.restoreAllMocks()
})

describe('基础元素 asChild 与零值', () => {
  it('Badge/Button 通过 asChild 渲染为链接', () => {
    render(
      <>
        <Badge asChild variant="outline">
          <a href="#badge">徽章链接</a>
        </Badge>
        <Button asChild size="icon" variant="ghost">
          <a href="#button">按钮链接</a>
        </Button>
      </>
    )
    expect(screen.getByRole('link', { name: '徽章链接' })).toHaveAttribute('data-slot', 'badge')
    expect(screen.getByRole('link', { name: '按钮链接' })).toHaveAttribute('data-slot', 'button')
  })

  it('Progress 在 value=0 时指示条不位移', () => {
    render(<Progress value={0} />)
    const indicator = document.querySelector('[data-slot="progress-indicator"]') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(-100%)')
  })
})

describe('Table', () => {
  it('渲染完整表格结构与无障碍角色', () => {
    render(
      <Table>
        <TableCaption>播放记录</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>歌曲</TableHead>
            <TableHead>次数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>星际漫游</TableCell>
            <TableCell>12</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>合计</TableCell>
            <TableCell>12</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('data-slot', 'table')
    expect(screen.getByRole('caption')).toHaveTextContent('播放记录')
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('星际漫游')).toBeInTheDocument()
    expect(screen.getByText('合计')).toBeInTheDocument()
    expect(screen.getAllByRole('row')[1]).toHaveAttribute('data-state', 'selected')
  })
})

describe('Pagination', () => {
  it('渲染上一页/页码/下一页/省略号', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#prev" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    const nav = screen.getByRole('navigation', { name: 'pagination' })
    expect(nav).toHaveAttribute('data-slot', 'pagination')
    expect(screen.getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to next page' })).toBeInTheDocument()
    const current = screen.getByRole('link', { name: '2' })
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('link', { name: '1' })).not.toHaveAttribute('aria-current')
    expect(document.querySelector('[data-slot="pagination-ellipsis"]')).toHaveTextContent('More pages')
  })
})

describe('Breadcrumb', () => {
  it('渲染链接、当前页、默认分隔符与省略号', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">首页</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <span data-testid="slash">/</span>
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>当前</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '当前' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: '当前' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('slash')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(2)
  })

  it('asChild 将样式传递给子元素', () => {
    render(
      <BreadcrumbLink asChild>
        <a href="/custom">自定义</a>
      </BreadcrumbLink>
    )
    expect(screen.getByRole('link', { name: '自定义' })).toHaveClass('hover:text-foreground')
    expect(document.querySelector('[data-slot="breadcrumb-link"]')).not.toBeNull()
  })
})

describe('Avatar', () => {
  it('渲染头像根节点与回退文本', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="用户头像" />
        <AvatarFallback>YY</AvatarFallback>
      </Avatar>
    )
    const root = container.querySelector('[data-slot="avatar"]')
    expect(root).not.toBeNull()
    expect(root?.className).toContain('rounded-full')
    expect(screen.getByText('YY')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="avatar-fallback"]')).not.toBeNull()
  })
})

describe('Skeleton / AspectRatio', () => {
  it('Skeleton 渲染占位样式', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveAttribute('data-slot', 'skeleton')
    expect(el.className).toContain('animate-pulse')
    expect(el.className).toContain('h-4')
  })

  it('AspectRatio 渲染比例容器', () => {
    render(
      <AspectRatio ratio={16 / 9}>
        <div>封面</div>
      </AspectRatio>
    )
    const root = screen.getByText('封面').closest('[data-slot="aspect-ratio"]')
    expect(root).not.toBeNull()
    expect((root as HTMLElement).parentElement?.getAttribute('style')).toContain('padding-bottom')
  })
})

describe('ScrollArea', () => {
  it('渲染视口、垂直与水平滚动条', () => {
    render(
      <ScrollArea className="h-40">
        <div>滚动内容</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    )
    expect(screen.getByText('滚动内容')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="scroll-area-viewport"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="scroll-area"]')).not.toBeNull()
  })
})

describe('RadioGroup', () => {
  it('选择项后更新 aria-checked 并触发回调', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <RadioGroup defaultValue="a" onValueChange={onValueChange} aria-label="音质">
        <div>
          <RadioGroupItem value="a" id="a" />
          <label htmlFor="a">标准</label>
        </div>
        <div>
          <RadioGroupItem value="b" id="b" />
          <label htmlFor="b">高品</label>
        </div>
      </RadioGroup>
    )
    const group = screen.getByRole('radiogroup', { name: '音质' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '标准' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: '高品' }))
    expect(onValueChange).toHaveBeenCalledWith('b')
    expect(screen.getByRole('radio', { name: '高品' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Slider', () => {
  it('键盘调整数值并支持单值/多值', () => {
    const onValueChange = vi.fn()
    const { rerender } = render(
      <Slider defaultValue={[30]} min={0} max={100} onValueChange={onValueChange} />
    )
    const thumb = screen.getByRole('slider')
    expect(thumb).toHaveAttribute('aria-valuenow', '30')
    fireEvent.keyDown(thumb, { key: 'ArrowRight' })
    expect(onValueChange).toHaveBeenCalled()
    expect(thumb).toHaveAttribute('aria-valuenow', '31')

    rerender(<Slider value={[10, 60]} min={0} max={100} />)
    expect(screen.getAllByRole('slider')).toHaveLength(2)
    expect(document.querySelector('[data-slot="slider-range"]')).not.toBeNull()
  })

  it('未提供值时使用 min/max 渲染', () => {
    render(<Slider min={10} max={20} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '10')
  })
})

describe('Toggle / ToggleGroup', () => {
  it('Toggle 点击切换 on 状态', async () => {
    const user = userEvent.setup()
    const onPressedChange = vi.fn()
    render(
      <Toggle variant="outline" size="sm" onPressedChange={onPressedChange} aria-label="收藏">
        ★
      </Toggle>
    )
    const toggle = screen.getByRole('button', { name: '收藏' })
    expect(toggle).toHaveAttribute('data-state', 'off')
    await user.click(toggle)
    expect(onPressedChange).toHaveBeenCalledWith(true)
    expect(toggle).toHaveAttribute('data-state', 'on')
    expect(toggle.className).toContain('border')
  })

  it('单选 ToggleGroup 只保留一个选中项', async () => {
    const user = userEvent.setup()
    render(
      <ToggleGroup type="single" variant="outline" size="lg" aria-label="视图">
        <ToggleGroupItem value="list">列表</ToggleGroupItem>
        <ToggleGroupItem value="grid">网格</ToggleGroupItem>
      </ToggleGroup>
    )
    const group = screen.getByRole('group', { name: '视图' })
    expect(group).toHaveAttribute('data-variant', 'outline')
    await user.click(screen.getByRole('radio', { name: '网格' }))
    expect(screen.getByRole('radio', { name: '网格' })).toHaveAttribute('data-state', 'on')
  })

  it('多选 ToggleGroup 支持同时选中并回退到单项变体', async () => {
    const user = userEvent.setup()
    render(
      <ToggleGroup type="multiple" aria-label="筛选">
        <ToggleGroupItem value="a" variant="outline" size="sm">
          A
        </ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    )
    await user.click(screen.getByRole('button', { name: 'A' }))
    await user.click(screen.getByRole('button', { name: 'B' }))
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('data-state', 'on')
  })
})

describe('Collapsible', () => {
  it('点击触发器展开/收起内容', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <CollapsibleTrigger>更多信息</CollapsibleTrigger>
        <CollapsibleContent>隐藏内容</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.queryByText('隐藏内容')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '更多信息' }))
    expect(await screen.findByText('隐藏内容')).toBeInTheDocument()
    expect(screen.getByText('隐藏内容')).toHaveAttribute('data-state', 'open')
    await user.click(screen.getByRole('button', { name: '更多信息' }))
    await waitFor(() =>
      expect(document.querySelector('[data-slot="collapsible-content"]')).toHaveAttribute(
        'data-state',
        'closed'
      )
    )
  })
})

describe('InputOTP', () => {
  it('输入数字后填充插槽并显示分隔符', async () => {
    render(
      <InputOTP maxLength={4} aria-label="验证码">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(document.querySelectorAll('[data-slot="input-otp-slot"]')).toHaveLength(4)
    expect(screen.getByRole('separator')).toBeInTheDocument()
    const input = document.querySelector('input') as HTMLInputElement
    input.focus()
    fireEvent.input(input, { target: { value: '12' } })
    await waitFor(() => {
      const slots = document.querySelectorAll('[data-slot="input-otp-slot"]')
      expect(slots[0]).toHaveTextContent('1')
      expect(slots[1]).toHaveTextContent('2')
    })
    expect(document.querySelector('.animate-caret-blink')).not.toBeNull()
  })
})

describe('Calendar', () => {
  it('单选模式下选择日期', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Calendar
        mode="single"
        defaultMonth={new Date(2024, 0, 1)}
        onSelect={onSelect}
        className="custom"
      />
    )
    expect(document.querySelector('.custom')).not.toBeNull()
    const cell = document.querySelector('[data-day="2024-01-15"]') as HTMLElement | null
    expect(cell).not.toBeNull()
    const day = cell!.querySelector('button') as HTMLElement
    await user.click(day)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toBeInstanceOf(Date)
    expect((onSelect.mock.calls[0][0] as Date).getDate()).toBe(15)
  })

  it('range 模式与隐藏外部日期', () => {
    const { container } = render(
      <Calendar
        mode="range"
        defaultMonth={new Date(2024, 0, 1)}
        showOutsideDays={false}
        selected={{ from: new Date(2024, 0, 10), to: new Date(2024, 0, 12) }}
      />
    )
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelectorAll('[aria-selected="true"]').length).toBeGreaterThan(0)
    // v10 起 showOutsideDays=false 仍渲染外部日期单元格，但以 data-hidden 标记隐藏
    const outsideDays = Array.from(container.querySelectorAll('[data-outside="true"]'))
    expect(outsideDays.length).toBeGreaterThan(0)
    expect(outsideDays.every((el) => el.getAttribute('data-hidden') === 'true')).toBe(true)
  })

  it('支持自定义 classNames 合并', () => {
    render(
      <Calendar
        mode="single"
        defaultMonth={new Date(2024, 0, 1)}
        classNames={{ month: 'my-month' }}
      />
    )
    expect(document.querySelector('.my-month')).not.toBeNull()
  })
})

type FormValues = { email: string }

function DemoForm({ onSubmit }: { onSubmit: (v: FormValues) => void }) {
  const form = useForm<FormValues>({ defaultValues: { email: '' } })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          rules={{ required: '请输入邮箱' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>用于登录通知</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">提交</button>
      </form>
    </Form>
  )
}

describe('Form', () => {
  it('校验失败展示错误并更新 aria 属性，成功后提交', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<DemoForm onSubmit={onSubmit} />)
    const input = screen.getByLabelText('邮箱')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('description'))
    expect(screen.getByText('用于登录通知')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '提交' }))
    expect(await screen.findByText('请输入邮箱')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain('message')
    expect(screen.getByText('邮箱')).toHaveAttribute('data-error', 'true')

    await user.type(input, 'hi@example.com')
    await user.click(screen.getByRole('button', { name: '提交' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'hi@example.com' }, expect.anything()))
  })

  it('FormMessage 无错误时渲染 children', () => {
    function Plain() {
      const form = useForm()
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="nick"
            render={() => (
              <FormItem>
                <FormMessage>提示文本</FormMessage>
              </FormItem>
            )}
          />
        </Form>
      )
    }
    render(<Plain />)
    expect(screen.getByText('提示文本')).toBeInTheDocument()
  })
})

describe('Resizable', () => {
  it('渲染水平分组、面板与带手柄的拖动条', () => {
    render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={40}>左侧</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>右侧</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText('左侧')).toBeInTheDocument()
    expect(screen.getByText('右侧')).toBeInTheDocument()
    const group = document.querySelector('[data-slot="resizable-panel-group"]') as HTMLElement
    expect(group).toHaveAttribute('data-panel-group-direction', 'horizontal')
    expect(document.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(2)
    const handle = document.querySelector('[data-slot="resizable-handle"]') as HTMLElement
    expect(handle).not.toBeNull()
    expect(handle.querySelector('svg')).not.toBeNull()
  })

  it('渲染垂直分组且无手柄图标', () => {
    render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel>上</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>下</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(document.querySelector('[data-slot="resizable-panel-group"]')).toHaveAttribute(
      'data-panel-group-direction',
      'vertical'
    )
    expect(document.querySelector('[data-slot="resizable-handle"]')?.querySelector('svg')).toBeNull()
  })
})

describe('Toaster', () => {
  it('渲染通知区域并应用主题', async () => {
    render(<Toaster theme="dark" />)
    const section = document.querySelector('section[aria-label^="Notifications"]')
    expect(section).not.toBeNull()
    expect(section).toHaveAttribute('aria-live', 'polite')
    expect(section).toHaveAttribute('aria-relevant', 'additions text')
  })

  it('未指定主题时使用系统默认值', () => {
    render(<Toaster />)
    expect(document.querySelector('section[aria-label^="Notifications"]')).not.toBeNull()
  })
})

describe('受控状态辅助组件', () => {
  it('受控 Collapsible 可被外部状态驱动', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger>切换</CollapsibleTrigger>
          <CollapsibleContent>内容区</CollapsibleContent>
        </Collapsible>
      )
    }
    const user = userEvent.setup()
    render(<Controlled />)
    await user.click(screen.getByRole('button', { name: '切换' }))
    expect(screen.getByText('内容区')).toHaveAttribute('data-state', 'open')
  })
})
