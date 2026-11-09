/**
 * @file 菜单 / 命令面板 / 下拉选择测试
 * @description DropdownMenu、ContextMenu、Menubar、NavigationMenu、Command、Select 的交互行为
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../src/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../src/ui/context-menu'
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '../src/ui/menubar'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '../src/ui/navigation-menu'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../src/ui/command'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../src/ui/select'

describe('DropdownMenu', () => {
  it('点击触发器打开完整菜单并处理各菜单项交互', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onChecked = vi.fn()
    const onRadio = vi.fn()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>更多操作</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel inset>我的账号</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem inset onSelect={onSelect}>
              播放
              <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked onCheckedChange={onChecked}>
            显示歌词
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="list" onValueChange={onRadio}>
            <DropdownMenuRadioItem value="list">列表</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="grid">网格</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>分享到</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>微信</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuPortal>
            <span data-testid="portal-slot" />
          </DropdownMenuPortal>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    await user.click(screen.getByRole('button', { name: '更多操作' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('我的账号')).toBeInTheDocument()
    expect(within(menu).getByText('⌘P')).toBeInTheDocument()
    expect(menu.querySelector('[data-variant="destructive"]')).not.toBeNull()
    expect(screen.getByTestId('portal-slot')).toBeInTheDocument()

    await user.click(within(menu).getByRole('menuitem', { name: /播放/ }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('勾选项回调', async () => {
    const user = userEvent.setup()
    const onChecked = vi.fn()
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false} onCheckedChange={onChecked}>
            显示歌词
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    await user.click(await screen.findByRole('menuitemcheckbox', { name: '显示歌词' }))
    expect(onChecked).toHaveBeenCalledWith(true)
  })

  it('单选项回调', async () => {
    const user = userEvent.setup()
    const onRadio = vi.fn()
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="list" onValueChange={onRadio}>
            <DropdownMenuRadioItem value="list">列表</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="grid">网格</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    await user.click(await screen.findByRole('menuitemradio', { name: '网格' }))
    expect(onRadio).toHaveBeenCalledWith('grid')
  })

  it('悬停子菜单触发器展开子项', async () => {
    const user = userEvent.setup()
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>分享到</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>微信</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    await user.hover(await screen.findByRole('menuitem', { name: '分享到' }))
    expect(await screen.findByText('微信')).toBeInTheDocument()
  })

  it('使用 defaultOpen 直接渲染内容', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>触发器</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>项目</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })
})

describe('ContextMenu', () => {
  it('右键打开菜单并触发选择/勾选/单选项', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onChecked = vi.fn()
    const onRadio = vi.fn()
    render(
      <ContextMenu>
        <ContextMenuTrigger>右键区域</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel inset>操作</ContextMenuLabel>
          <ContextMenuGroup>
            <ContextMenuItem inset onSelect={onSelect}>
              重命名
              <ContextMenuShortcut>F2</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem variant="destructive">删除</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked onCheckedChange={onChecked}>
            固定
          </ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value="a" onValueChange={onRadio}>
            <ContextMenuRadioItem value="a">A</ContextMenuRadioItem>
            <ContextMenuRadioItem value="b">B</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>子菜单</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>子项</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuPortal>
            <span data-testid="ctx-portal" />
          </ContextMenuPortal>
        </ContextMenuContent>
      </ContextMenu>
    )
    fireEvent.contextMenu(screen.getByText('右键区域'), { button: 2, clientX: 10, clientY: 10 })
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('操作')).toBeInTheDocument()
    expect(within(menu).getByText('F2')).toBeInTheDocument()
    expect(screen.getByTestId('ctx-portal')).toBeInTheDocument()

    await user.click(within(menu).getByRole('menuitem', { name: /重命名/ }))
    expect(onSelect).toHaveBeenCalledTimes(1)

    fireEvent.contextMenu(screen.getByText('右键区域'), { button: 2 })
    await user.click(await screen.findByRole('menuitemcheckbox', { name: '固定' }))
    expect(onChecked).toHaveBeenCalledWith(false)

    fireEvent.contextMenu(screen.getByText('右键区域'), { button: 2 })
    await user.click(await screen.findByRole('menuitemradio', { name: 'B' }))
    expect(onRadio).toHaveBeenCalledWith('b')
  })

  it('悬停子菜单触发器展开子项', async () => {
    const user = userEvent.setup()
    render(
      <ContextMenu>
        <ContextMenuTrigger>区域</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger>更多</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>深层项</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    )
    fireEvent.contextMenu(screen.getByText('区域'), { button: 2 })
    await user.hover(await screen.findByRole('menuitem', { name: '更多' }))
    expect(await screen.findByText('深层项')).toBeInTheDocument()
  })
})

describe('Menubar', () => {
  it('打开菜单并交互各类菜单项', async () => {
    const user = userEvent.setup()
    const onChecked = vi.fn()
    const onRadio = vi.fn()
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>文件</MenubarTrigger>
          <MenubarContent align="start">
            <MenubarLabel inset>文件操作</MenubarLabel>
            <MenubarGroup>
              <MenubarItem inset>
                新建
                <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem variant="destructive">退出</MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarCheckboxItem checked onCheckedChange={onChecked}>
              自动保存
            </MenubarCheckboxItem>
            <MenubarRadioGroup value="1" onValueChange={onRadio}>
              <MenubarRadioItem value="1">模式一</MenubarRadioItem>
              <MenubarRadioItem value="2">模式二</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSub>
              <MenubarSubTrigger inset>导出</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>导出为 MP3</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarPortal>
              <span data-testid="menubar-portal" />
            </MenubarPortal>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )
    await user.click(screen.getByRole('menuitem', { name: '文件' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('⌘N')).toBeInTheDocument()
    expect(screen.getByTestId('menubar-portal')).toBeInTheDocument()

    await user.click(within(menu).getByRole('menuitemcheckbox', { name: '自动保存' }))
    expect(onChecked).toHaveBeenCalledWith(false)
  })

  it('单选项与子菜单交互', async () => {
    const user = userEvent.setup()
    const onRadio = vi.fn()
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>视图</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value="1" onValueChange={onRadio}>
              <MenubarRadioItem value="1">模式一</MenubarRadioItem>
              <MenubarRadioItem value="2">模式二</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSub>
              <MenubarSubTrigger>导出</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>导出为 MP3</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )
    await user.click(screen.getByRole('menuitem', { name: '视图' }))
    await user.click(await screen.findByRole('menuitemradio', { name: '模式二' }))
    expect(onRadio).toHaveBeenCalledWith('2')

    await user.click(screen.getByRole('menuitem', { name: '视图' }))
    await user.hover(await screen.findByRole('menuitem', { name: '导出' }))
    expect(await screen.findByText('导出为 MP3')).toBeInTheDocument()
  })

  it('子菜单悬停展开', async () => {
    const user = userEvent.setup()
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>编辑</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>变换</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>旋转</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )
    await user.click(screen.getByRole('menuitem', { name: '编辑' }))
    await user.hover(await screen.findByRole('menuitem', { name: '变换' }))
    expect(await screen.findByText('旋转')).toBeInTheDocument()
  })
})

describe('NavigationMenu', () => {
  it('点击触发器展开内容并渲染指示器', async () => {
    const user = userEvent.setup()
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>发现</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink>每日推荐</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator />
      </NavigationMenu>
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '发现' }))
    expect(await screen.findByText('每日推荐')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="navigation-menu-viewport"]')).not.toBeNull()
    expect(navigationMenuTriggerStyle()).toContain('inline-flex')
  })

  it('viewport=false 时不渲染视口容器', () => {
    render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>帮助</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    )
    expect(document.querySelector('[data-slot="navigation-menu-viewport"]')).toBeNull()
    expect(document.querySelector('[data-slot="navigation-menu"]')).toHaveAttribute(
      'data-viewport',
      'false'
    )
  })
})

describe('Command', () => {
  it('输入过滤、点击条目与空状态', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Command>
        <CommandInput placeholder="搜索命令" />
        <CommandList>
          <CommandEmpty>无匹配结果</CommandEmpty>
          <CommandGroup heading="播放">
            <CommandItem onSelect={onSelect}>
              播放全部
              <CommandShortcut>⌘A</CommandShortcut>
            </CommandItem>
            <CommandItem>暂停</CommandItem>
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
      </Command>
    )
    expect(screen.getByText('⌘A')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('搜索命令'), '播放全部')
    await user.click(screen.getByRole('option', { name: /播放全部/ }))
    expect(onSelect).toHaveBeenCalledTimes(1)

    await user.clear(screen.getByPlaceholderText('搜索命令'))
    await user.type(screen.getByPlaceholderText('搜索命令'), 'zzz')
    expect(await screen.findByText('无匹配结果')).toBeInTheDocument()
  })

  it('CommandDialog 以对话框呈现并显示标题', () => {
    render(
      <CommandDialog open title="命令中心" description="搜索并执行">
        <CommandInput placeholder="输入命令" />
        <CommandList>
          <CommandItem>切换主题</CommandItem>
        </CommandList>
      </CommandDialog>
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('命令中心')).toBeInTheDocument()
    expect(within(dialog).getByText('搜索并执行')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入命令')).toBeInTheDocument()
  })
})

describe('Select', () => {
  it('打开下拉并选择选项后展示当前值', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger size="sm" aria-label="音质">
          <SelectValue placeholder="选择音质" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>标准</SelectLabel>
            <SelectItem value="128">128kbps</SelectItem>
            <SelectItem value="320">320kbps</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="lossless" disabled>
            无损
          </SelectItem>
        </SelectContent>
      </Select>
    )
    expect(screen.getByText('选择音质')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: '音质' }))
    const option = await screen.findByRole('option', { name: '320kbps' })
    await user.click(option)
    expect(onValueChange).toHaveBeenCalledWith('320')
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('320kbps'))
    expect(screen.getByRole('combobox')).toHaveAttribute('data-size', 'sm')
  })

  it('item-aligned 模式渲染内容', async () => {
    const user = userEvent.setup()
    render(
      <Select defaultValue="a">
        <SelectTrigger aria-label="布局">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          <SelectItem value="a">列表</SelectItem>
          <SelectItem value="b">网格</SelectItem>
        </SelectContent>
      </Select>
    )
    expect(screen.getByRole('combobox', { name: '布局' })).toHaveTextContent('列表')
    await user.click(screen.getByRole('combobox', { name: '布局' }))
    expect(await screen.findByRole('option', { name: '网格' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="select-content"]')).not.toBeNull()
  })
})
