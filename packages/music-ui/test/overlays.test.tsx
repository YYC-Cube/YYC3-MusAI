/**
 * @file 浮层类组件测试
 * @description Dialog / Sheet / Drawer / AlertDialog / Popover / Tooltip / HoverCard 的打开、关闭与可访问性
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../src/ui/dialog'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../src/ui/sheet'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../src/ui/drawer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../src/ui/alert-dialog'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../src/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../src/ui/tooltip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../src/ui/hover-card'

describe('Dialog', () => {
  it('点击触发器打开，关闭按钮与 Escape 关闭', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>打开设置</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>调整播放偏好</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>完成</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    await user.click(screen.getByRole('button', { name: '打开设置' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('设置')).toBeInTheDocument()
    expect(within(dialog).getByText('调整播放偏好')).toBeInTheDocument()
    expect(dialog).toHaveAttribute('data-slot', 'dialog-content')
    expect(document.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Escape 关闭并可受控打开', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>受控</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('Sheet', () => {
  it.each(['right', 'left', 'top', 'bottom'] as const)('%s 方向可打开并关闭', async (side) => {
    const user = userEvent.setup()
    render(
      <Sheet>
        <SheetTrigger>打开{side}</SheetTrigger>
        <SheetContent side={side}>
          <SheetHeader>
            <SheetTitle>面板标题</SheetTitle>
            <SheetDescription>面板描述</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>关闭面板</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
    await user.click(screen.getByRole('button', { name: `打开${side}` }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-slot', 'sheet-content')
    expect(dialog.className).toContain(`data-[state=open]:slide-in-from-${side}`)
    expect(screen.getByText('面板标题')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="sheet-overlay"]')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: '关闭面板' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('Drawer', () => {
  it('点击触发器打开抽屉并展示标题/描述/底部', async () => {
    const user = userEvent.setup()
    render(
      <Drawer>
        <DrawerTrigger>打开抽屉</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>抽屉标题</DrawerTitle>
            <DrawerDescription>抽屉描述</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>关闭抽屉</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
    fireEvent.click(screen.getByRole('button', { name: '打开抽屉' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-slot', 'drawer-content')
    expect(within(dialog).getByText('抽屉标题')).toBeInTheDocument()
    expect(within(dialog).getByText('抽屉描述')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="drawer-overlay"]')).not.toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭抽屉' }))
    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'closed'))
  })

  it('受控打开并响应 onOpenChange', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle>受控抽屉</DrawerTitle>
        </DrawerContent>
      </Drawer>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalled()
  })
})

describe('AlertDialog', () => {
  it('确认与取消按钮分别关闭并触发回调', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <AlertDialog>
        <AlertDialogTrigger>删除歌曲</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>此操作不可撤销</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
    await user.click(screen.getByRole('button', { name: '删除歌曲' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('确认删除')).toBeInTheDocument()
    expect(within(dialog).getByText('此操作不可撤销')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).not.toBeNull()
    await user.click(within(dialog).getByRole('button', { name: '确认' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('取消按钮关闭对话框', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger>打开</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>标题</AlertDialogTitle>
          <AlertDialogCancel>取消</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    )
    await user.click(screen.getByRole('button', { name: '打开' }))
    await user.click(await screen.findByRole('button', { name: '取消' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})

describe('Popover', () => {
  it('点击触发器展示内容并可通过 Escape 关闭', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>筛选</PopoverTrigger>
        <PopoverContent>
          <p>筛选条件</p>
        </PopoverContent>
      </Popover>
    )
    expect(screen.queryByText('筛选条件')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '筛选' }))
    expect(await screen.findByText('筛选条件')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="popover-content"]')).not.toBeNull()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('筛选条件')).not.toBeInTheDocument())
  })

  it('渲染 PopoverAnchor 锚点', () => {
    render(
      <Popover>
        <PopoverAnchor asChild>
          <span data-testid="anchor">锚点</span>
        </PopoverAnchor>
        <PopoverContent>锚点内容</PopoverContent>
      </Popover>
    )
    expect(screen.getByTestId('anchor')).toHaveAttribute('data-slot', 'popover-anchor')
  })
})

describe('Tooltip', () => {
  it('悬停触发器展示提示并在移出后隐藏', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>收藏</TooltipTrigger>
          <TooltipContent>加入收藏夹</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    await user.hover(screen.getByRole('button', { name: '收藏' }))
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('加入收藏夹')
    )
  })

  it('内置 TooltipProvider 包装器可直接使用', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip>
        <TooltipTrigger>分享</TooltipTrigger>
        <TooltipContent>分享给好友</TooltipContent>
      </Tooltip>
    )
    await user.hover(screen.getByRole('button', { name: '分享' }))
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('分享给好友')
    )
  })
})

describe('HoverCard', () => {
  it('悬停展示卡片内容', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard>
        <HoverCardTrigger>创作者</HoverCardTrigger>
        <HoverCardContent>
          <p>创作者简介</p>
        </HoverCardContent>
      </HoverCard>
    )
    await user.hover(screen.getByText('创作者'))
    expect(await screen.findByText('创作者简介')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="hover-card-content"]')).not.toBeNull()
  })
})
