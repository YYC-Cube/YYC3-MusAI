/**
 * @file React 组件交互测试
 * @description 覆盖 EmotionAudioPlayer、SmartTip、InteractiveCodeBlock、InteractiveMindMap 的渲染、交互与分支
 */
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EmotionAudioPlayer from '../src/EmotionAudioPlayer'
import SmartTip from '../src/SmartTip'
import InteractiveCodeBlock from '../src/InteractiveCodeBlock'
import InteractiveMindMap from '../src/InteractiveMindMap'

vi.mock('reactflow', async () => {
  const actual = await vi.importActual<any>('reactflow')

  const MockReactFlow = ({
    nodes = [],
    edges = [],
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    nodeTypes = {},
    style,
    children,
  }: any) => (
    <div data-testid="reactflow" style={style}>
      {nodes.map((node: any) => {
        const NodeComponent = nodeTypes[node.type]
        return (
          <div
            key={node.id}
            data-testid={`node-${node.id}`}
            data-x={node.position?.x}
            onClick={(event) => onNodeClick?.(event, node)}
          >
            {NodeComponent ? (
              <NodeComponent data={node.data} selected={Boolean(node.selected)} />
            ) : (
              node.data?.title
            )}
          </div>
        )
      })}
      <span data-testid="edge-count">{edges.length}</span>
      <button
        data-testid="nodes-change"
        onClick={() =>
          onNodesChange?.([
            { id: nodes[0]?.id, type: 'position', position: { x: 99, y: 99 }, dragging: false },
          ])
        }
      />
      <button
        data-testid="edges-remove"
        onClick={() => onEdgesChange?.([{ id: edges[0]?.id, type: 'remove' }])}
      />
      <button
        data-testid="connect"
        onClick={() => onConnect?.({ source: 'n1', target: 'n3' })}
      />
      {children}
    </div>
  )

  return {
    ...actual,
    default: MockReactFlow,
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
  }
})

const notebooks = () => {
  const writeText = vi.fn()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  return writeText
}

const mindMapNode = (dataOverrides: Record<string, any> = {}, nodeOverrides: Record<string, any> = {}) => ({
  id: 'n1',
  type: 'custom',
  position: { x: 0, y: 0 },
  ...nodeOverrides,
  data: { title: '概念节点', type: 'concept', ...dataOverrides },
})

describe('EmotionAudioPlayer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })

  it('点击按钮在播放与暂停之间切换并回调', () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const { container } = render(
      <EmotionAudioPlayer url="/happy.mp3" emotion="happy" onPlay={onPlay} onPause={onPause} />
    )

    const audio = container.querySelector('audio') as HTMLAudioElement
    expect(audio).not.toBeNull()
    expect(audio.src).toContain('/happy.mp3')

    const button = screen.getByRole('button')
    expect(button.textContent).toBe('▶️ 播放')

    fireEvent.click(button)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(audio.volume).toBe(0.6)
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(button.textContent).toBe('⏸ 暂停')

    fireEvent.click(button)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(button.textContent).toBe('▶️ 播放')
  })

  it.each([
    ['calm', 0.3],
    ['sad', 0.3],
    ['default', 0.5],
  ])('情感 %s 应用音量 %s 并渲染情感文案', (emotion, expectedVolume) => {
    const { container } = render(
      <EmotionAudioPlayer url="/e.mp3" emotion={emotion as any} />
    )

    fireEvent.click(screen.getByRole('button'))

    const audio = container.querySelector('audio') as HTMLAudioElement
    expect(audio.volume).toBe(expectedVolume)
    expect(screen.getByText(`情感: ${emotion}`)).toBeInTheDocument()
  })

  it('autoPlay 时挂载即播放并支持 onEnded 回调', () => {
    const onPlay = vi.fn()
    const onEnded = vi.fn()
    const { container } = render(
      <EmotionAudioPlayer url="/auto.mp3" autoPlay onPlay={onPlay} onEnded={onEnded} />
    )

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button').textContent).toBe('⏸ 暂停')

    const audio = container.querySelector('audio') as HTMLAudioElement
    fireEvent(audio, new Event('ended'))

    expect(onEnded).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button').textContent).toBe('▶️ 播放')
  })

  it('showControls 为 false 时不渲染按钮，悬停改变按钮样式', () => {
    const { rerender } = render(<EmotionAudioPlayer url="/a.mp3" showControls={false} />)
    expect(screen.queryByRole('button')).toBeNull()

    rerender(<EmotionAudioPlayer url="/a.mp3" showControls />)
    const button = screen.getByRole('button')
    fireEvent.mouseEnter(button)
    expect(button.style.transform).toBe('scale(1.05)')
    fireEvent.mouseLeave(button)
    expect(button.style.transform).toBe('scale(1)')
  })
})

describe('SmartTip', () => {
  it('不可见时不渲染内容', () => {
    const { container } = render(<SmartTip isVisible={false} message="提示" />)

    expect(container.querySelector('.smart-tip')).toBeNull()
  })

  it.each([
    ['encouraging', '🌟'],
    ['calm', '🌊'],
    ['neutral', '💡'],
  ])('情感 %s 渲染表情 %s 与消息文本', (emotion, emoji) => {
    const { container } = render(
      <SmartTip isVisible message="继续前进" emotion={emotion as any} />
    )

    expect(container.querySelector('.smart-tip')).not.toBeNull()
    expect(container.querySelector('.tip-emoji')?.textContent).toBe(emoji)
    expect(container.querySelector('.tip-message')?.textContent).toBe('继续前进')
  })

  it.each([
    ['top', 'marginBottom', '8px'],
    ['bottom', 'marginTop', '8px'],
    ['left', 'marginRight', '8px'],
    ['right', 'marginLeft', '8px'],
  ])('位置 %s 应用 %s=%s', (position, property, value) => {
    const { container } = render(
      <SmartTip isVisible message="定位提示" position={position as any} />
    )

    const tip = container.querySelector('.smart-tip') as HTMLElement
    expect(tip.style[property as any]).toBe(value)
    expect(tip.style.position).toBe('absolute')
    expect(tip.style.maxWidth).toBe('300px')
  })

  it('默认使用 neutral 与 bottom 配置', () => {
    const { container } = render(<SmartTip isVisible message="默认提示" />)

    const tip = container.querySelector('.smart-tip') as HTMLElement
    expect(container.querySelector('.tip-emoji')?.textContent).toBe('💡')
    expect(tip.style.top).toBe('100%')
    expect(tip.style.marginTop).toBe('8px')
  })
})

describe('InteractiveCodeBlock', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    delete (navigator as any).clipboard
  })

  it('渲染标题与操作按钮，默认不展示代码内容', () => {
    render(<InteractiveCodeBlock code="const a = 1" language="javascript" />)

    expect(screen.getByText('代码示例')).toBeInTheDocument()
    expect(screen.getByText('📋 复制')).toBeInTheDocument()
    expect(screen.getByText('▼ 展开')).toBeInTheDocument()
    expect(screen.queryByText('const a = 1')).toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('复制代码写入剪贴板并在 2 秒后恢复按钮文案', () => {
    const writeText = notebooks()
    vi.useFakeTimers()
    try {
      render(<InteractiveCodeBlock code="print('hi')" language="python" title="示例" />)

      fireEvent.click(screen.getByText('📋 复制'))

      expect(writeText).toHaveBeenCalledWith("print('hi')")
      expect(screen.getByText('✓ 已复制')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(2100)
      })
      expect(screen.getByText('📋 复制')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('展开代码时渲染高亮内容，再次点击收起', () => {
    render(<InteractiveCodeBlock code="const sum = (a, b) => a + b" language="tsx" />)

    fireEvent.click(screen.getByText('▼ 展开'))
    expect(screen.getByText('▲ 收起')).toBeInTheDocument()
    expect(document.querySelector('.code-content')?.textContent).toContain(
      'const sum = (a, b) => a + b'
    )

    fireEvent.click(screen.getByText('▲ 收起'))
    expect(screen.getByText('▼ 展开')).toBeInTheDocument()
    expect(document.querySelector('.code-content')).toBeNull()
  })

  it('提供 onRun 时点击运行按钮回调代码', () => {
    const onRun = vi.fn()
    render(<InteractiveCodeBlock code="run()" language="js" onRun={onRun} />)

    fireEvent.click(screen.getByText('▶️ 运行'))

    expect(onRun).toHaveBeenCalledWith('run()')
  })

  it('未提供 onRun 或 showRunButton 为 false 时不显示运行按钮', () => {
    const { rerender } = render(<InteractiveCodeBlock code="a" language="js" />)
    expect(screen.queryByText('▶️ 运行')).toBeNull()

    rerender(
      <InteractiveCodeBlock code="a" language="js" onRun={vi.fn()} showRunButton={false} />
    )
    expect(screen.queryByText('▶️ 运行')).toBeNull()
  })

  it.each(['learning', 'creative', 'analytical', 'neutral'])(
    '情感 %s 均可渲染标题与复制按钮',
    (emotion) => {
      render(
        <InteractiveCodeBlock code="x" language="js" emotion={emotion as any} title="分支标题" />
      )

      expect(screen.getByText('分支标题')).toBeInTheDocument()
      expect(screen.getByText('📋 复制')).toBeInTheDocument()
    }
  )
})

describe('InteractiveMindMap', () => {
  const baseNodes = [
    mindMapNode({ title: '根节点', content: '根节点说明' }),
    mindMapNode(
      { title: '示例节点', type: 'example', emotion: 'important' },
      { id: 'n2', position: { x: 120, y: 0 } }
    ),
  ]

  const baseEdges = [{ id: 'e1', source: 'n1', target: 'n2' }]

  it('渲染初始节点、边、背景与控制组件', () => {
    const { container } = render(
      <InteractiveMindMap initialNodes={baseNodes as any} initialEdges={baseEdges as any} />
    )

    expect(screen.getByTestId('reactflow')).toBeInTheDocument()
    expect(screen.getByTestId('background')).toBeInTheDocument()
    expect(screen.getByTestId('controls')).toBeInTheDocument()
    expect(screen.getByText('根节点')).toBeInTheDocument()
    expect(screen.getByText('示例节点')).toBeInTheDocument()
    expect(screen.getByTestId('edge-count').textContent).toBe('1')
    expect((screen.getByTestId('reactflow') as HTMLElement).style.background).toBe(
      'rgb(230, 255, 237)'
    )

    const customNode = container.querySelector('.custom-node') as HTMLElement
    expect(customNode).not.toBeNull()
  })

  it.each([
    ['creative', 'rgb(243, 232, 255)'],
    ['analytical', 'rgb(230, 247, 255)'],
    ['learning', 'rgb(230, 255, 237)'],
  ])('主题 %s 应用背景 %s', (theme, background) => {
    render(
      <InteractiveMindMap
        initialNodes={baseNodes as any}
        initialEdges={baseEdges as any}
        theme={theme as any}
      />
    )

    expect((screen.getByTestId('reactflow') as HTMLElement).style.background).toBe(background)
  })

  it('主题缺省时使用默认背景', () => {
    render(
      <InteractiveMindMap
        initialNodes={baseNodes as any}
        initialEdges={baseEdges as any}
        theme={'unknown' as any}
      />
    )

    expect((screen.getByTestId('reactflow') as HTMLElement).style.background).toBe(
      'rgb(247, 249, 250)'
    )
  })

  it('点击节点展示详情面板并触发 onNodeClick，关闭按钮清除面板', () => {
    const onNodeClick = vi.fn()
    render(
      <InteractiveMindMap
        initialNodes={baseNodes as any}
        initialEdges={baseEdges as any}
        onNodeClick={onNodeClick}
      />
    )

    fireEvent.click(screen.getByTestId('node-n1'))

    expect(onNodeClick).toHaveBeenCalledTimes(1)
    expect(onNodeClick.mock.calls[0][0].data.title).toBe('根节点')
    const details = document.querySelector('.node-details') as HTMLElement
    expect(details).not.toBeNull()
    expect(details.textContent).toContain('根节点说明')
    expect(screen.getByText('类型: concept')).toBeInTheDocument()

    fireEvent.click(screen.getByText('关闭'))
    expect(document.querySelector('.node-details')).toBeNull()
  })

  it('带情感的节点展示情感标签与悬停样式', () => {
    render(
      <InteractiveMindMap initialNodes={baseNodes as any} initialEdges={baseEdges as any} />
    )

    fireEvent.click(screen.getByTestId('node-n2'))

    expect(screen.getByText('情感: important')).toBeInTheDocument()
    const closeButton = screen.getByText('关闭')
    fireEvent.mouseEnter(closeButton)
    expect(closeButton.style.background).toBe('rgb(58, 123, 200)')
    fireEvent.mouseLeave(closeButton)
    expect(closeButton.style.background).toBe('rgb(74, 144, 226)')
  })

  it('无内容与情感的节点详情不含描述段落', () => {
    render(
      <InteractiveMindMap
        initialNodes={[mindMapNode({ title: '纯标题' })] as any}
        initialEdges={[]}
      />
    )

    fireEvent.click(screen.getByTestId('node-n1'))

    const details = document.querySelector('.node-details') as HTMLElement
    expect(details.querySelector('p')).toBeNull()
    expect(screen.queryByText(/情感:/)).toBeNull()
  })

  it('节点变化更新位置，删除边与新增连接生效', () => {
    const { container } = render(
      <InteractiveMindMap initialNodes={baseNodes as any} initialEdges={baseEdges as any} />
    )

    fireEvent.click(screen.getByTestId('nodes-change'))
    expect(screen.getByTestId('node-n1').getAttribute('data-x')).toBe('99')

    fireEvent.click(screen.getByTestId('connect'))
    expect(screen.getByTestId('edge-count').textContent).toBe('2')

    fireEvent.click(screen.getByTestId('edges-remove'))
    expect(screen.getByTestId('edge-count').textContent).toBe('1')

    expect(container.querySelectorAll('.custom-node')).toHaveLength(2)
  })

  it.each([
    ['concept', '💡'],
    ['example', '📝'],
    ['exercise', '✏️'],
    ['resource', '📚'],
    ['other', '📌'],
  ])('节点类型 %s 渲染图标 %s', (type, icon) => {
    const { container } = render(
      <InteractiveMindMap
        initialNodes={[mindMapNode({ title: '类型节点', type })] as any}
        initialEdges={[]}
      />
    )

    const node = container.querySelector('.custom-node') as HTMLElement
    expect(node.querySelector('.node-icon')?.textContent).toBe(icon)
    expect(node.querySelector('.node-title')?.textContent).toBe('类型节点')
  })

  it.each([
    ['important', '⭐'],
    ['challenging', '🔥'],
    ['encouraging', '🌟'],
    ['neutral', '💡'],
  ])('节点情感 %s 渲染表情 %s 与内容', (emotion, emoji) => {
    const { container } = render(
      <InteractiveMindMap
        initialNodes={[
          mindMapNode({ title: '情感节点', emotion, content: '节点内容' }),
        ] as any}
        initialEdges={[]}
      />
    )

    const node = container.querySelector('.custom-node') as HTMLElement
    expect(node.querySelector('.node-emoji')?.textContent).toBe(emoji)
    expect(node.querySelector('.node-content')?.textContent).toBe('节点内容')
  })

  it('无情感与内容时节点不渲染附加区块', () => {
    const { container } = render(
      <InteractiveMindMap
        initialNodes={[mindMapNode({ title: '简洁节点' })] as any}
        initialEdges={[]}
      />
    )

    const node = container.querySelector('.custom-node') as HTMLElement
    expect(node.querySelector('.node-emoji')).toBeNull()
    expect(node.querySelector('.node-content')).toBeNull()
  })
})
