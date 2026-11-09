/**
 * @file music-ui 基础组件交互测试
 * @description 覆盖 shadcn/Radix 基础组件的渲染、可访问性与点击/输入交互
 */
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../src/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '../src/ui/alert'
import { Badge } from '../src/ui/badge'
import { Button } from '../src/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../src/ui/card'
import { Checkbox } from '../src/ui/checkbox'
import { Input } from '../src/ui/input'
import { Label } from '../src/ui/label'
import { Progress } from '../src/ui/progress'
import { Separator } from '../src/ui/separator'
import { Switch } from '../src/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/ui/tabs'
import { Textarea } from '../src/ui/textarea'

describe('Button', () => {
  it('渲染文本并响应点击', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(createElement(Button, { onClick }, '开始播放'))
    await user.click(screen.getByRole('button', { name: '开始播放' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disabled 时阻止点击并应用变体样式', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(createElement(Button, { onClick, disabled: true, variant: 'destructive' }, '删除'))
    const button = screen.getByRole('button', { name: '删除' })
    expect(button).toBeDisabled()
    expect(button.className).toContain('bg-destructive')
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('表单基础组件', () => {
  it('Label 与 Input 关联后可输入', async () => {
    const user = userEvent.setup()
    render(
      createElement('div', null,
        createElement(Label, { htmlFor: 'nickname' }, '昵称'),
        createElement(Input, { id: 'nickname' })
      )
    )
    const input = screen.getByLabelText('昵称')
    await user.type(input, 'MusAI')
    expect(input).toHaveValue('MusAI')
  })

  it('Textarea 支持多行输入', async () => {
    const user = userEvent.setup()
    render(createElement(Textarea, { placeholder: '写下评论' }))
    await user.type(screen.getByPlaceholderText('写下评论'), '第一行{enter}第二行')
    expect(screen.getByPlaceholderText('写下评论')).toHaveValue('第一行\n第二行')
  })

  it('Checkbox 点击切换选中态', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(createElement(Checkbox, { 'aria-label': '同意条款', onCheckedChange }))
    const checkbox = screen.getByRole('checkbox', { name: '同意条款' })
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
    await user.click(checkbox)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('Switch 点击切换状态', async () => {
    const user = userEvent.setup()
    render(createElement(Switch, { 'aria-label': '随机播放' }))
    const switchButton = screen.getByRole('switch', { name: '随机播放' })
    expect(switchButton).toHaveAttribute('data-state', 'unchecked')
    await user.click(switchButton)
    expect(switchButton).toHaveAttribute('data-state', 'checked')
  })
})

describe('展示类组件', () => {
  it('Badge 渲染变体类名', () => {
    render(createElement(Badge, { variant: 'secondary' }, 'Beta'))
    const badge = screen.getByText('Beta')
    expect(badge).toHaveAttribute('data-slot', 'badge')
    expect(badge.className).toContain('bg-secondary')
  })

  it('Card 组合渲染标题/描述/操作/页脚', () => {
    render(
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement(CardTitle, null, '月度回顾'),
          createElement(CardDescription, null, '你的 11 月听歌数据'),
          createElement(CardAction, null, createElement('span', null, 'NEW'))
        ),
        createElement(CardContent, null, '共 128 首'),
        createElement(CardFooter, null, '更新于今天')
      )
    )
    expect(screen.getByText('月度回顾')).toBeInTheDocument()
    expect(screen.getByText('你的 11 月听歌数据')).toBeInTheDocument()
    expect(screen.getByText('共 128 首')).toBeInTheDocument()
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('Alert、Separator、Progress 正常渲染', () => {
    render(
      createElement('div', null,
        createElement(Alert, null,
          createElement(AlertTitle, null, '提示'),
          createElement(AlertDescription, null, '本地模式已启用')
        ),
        createElement(Separator, { 'data-testid': 'sep' }),
        createElement(Progress, { value: 60, 'aria-label': '上传进度' })
      )
    )
    expect(screen.getByText('本地模式已启用')).toBeInTheDocument()
    expect(screen.getByTestId('sep')).toHaveAttribute('data-slot', 'separator-root')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60')
  })
})

describe('复合交互组件', () => {
  it('Tabs 默认展示首个面板并支持切换', async () => {
    const user = userEvent.setup()
    render(
      createElement(Tabs, { defaultValue: 'overview' },
        createElement(TabsList, null,
          createElement(TabsTrigger, { value: 'overview' }, '概览'),
          createElement(TabsTrigger, { value: 'songs' }, '曲目')
        ),
        createElement(TabsContent, { value: 'overview' }, '概览内容'),
        createElement(TabsContent, { value: 'songs' }, '曲目内容')
      )
    )
    expect(screen.getByText('概览内容')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '曲目' }))
    expect(screen.getByText('曲目内容')).toBeInTheDocument()
    expect(screen.queryByText('概览内容')).not.toBeInTheDocument()
  })

  it('Accordion 点击触发器展开内容', async () => {
    const user = userEvent.setup()
    render(
      createElement(Accordion, { type: 'single', collapsible: true },
        createElement(AccordionItem, { value: 'faq-1' },
          createElement(AccordionTrigger, null, '如何导入音乐？'),
          createElement(AccordionContent, null, '支持拖拽本地音频文件')
        )
      )
    )
    expect(screen.queryByText('支持拖拽本地音频文件')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '如何导入音乐？' }))
    expect(screen.getByText('支持拖拽本地音频文件')).toBeInTheDocument()
  })
})
