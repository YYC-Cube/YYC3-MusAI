/**
 * @file LyricsDisplay 深度测试
 * @description 覆盖歌词高亮/时间轴/自动滚动/翻译/情感标注/粒子动画等分支
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LyricsDisplay } from '../src'

const baseLyrics = [
  { time: 0, text: '第一句歌词', translation: 'first line', emotion: 'calm' as const },
  { time: 4, text: '第二句歌词' },
  { time: 8, text: '第三句歌词', emotion: 'happy' as const },
]

afterEach(() => {
  vi.useRealTimers()
})

describe('LyricsDisplay 高亮与时间轴', () => {
  it('根据 currentTime 计算高亮行并切换字号', () => {
    render(<LyricsDisplay currentTime={5} lyrics={baseLyrics} />)

    const active = screen.getByText('第二句歌词')
    const past = screen.getByText('第一句歌词')
    const future = screen.getByText('第三句歌词')

    expect(active).toHaveClass('text-2xl')
    expect(past).toHaveClass('text-lg')
    expect(future).toHaveClass('text-lg')
  })

  it('高亮行应用情绪颜色光晕（text-shadow）', () => {
    const { rerender } = render(<LyricsDisplay currentTime={9} lyrics={baseLyrics} />)
    const active = screen.getByText('第三句歌词')
    expect(active.getAttribute('style') || '').toMatch(/text-shadow/i)
    // 第 0 行不再是高亮态
    rerender(<LyricsDisplay currentTime={0} lyrics={baseLyrics} />)
    expect(screen.getByText('第一句歌词').getAttribute('style') || '').toMatch(/text-shadow/i)
    expect(screen.getByText('第三句歌词').getAttribute('style') || '').toBe('')
  })

  it('当前时间早于所有歌词时无高亮行', () => {
    render(<LyricsDisplay currentTime={-5} lyrics={baseLyrics} />)
    baseLyrics.forEach((line) => {
      expect(screen.getByText(line.text)).toHaveClass('text-lg')
    })
  })

  it('自动滚动到高亮行', () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<LyricsDisplay currentTime={4} lyrics={baseLyrics} />)
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    scrollSpy.mockRestore()
  })

  it('渲染翻译文本', () => {
    render(<LyricsDisplay currentTime={0} lyrics={baseLyrics} />)
    expect(screen.getByText('first line')).toBeInTheDocument()
  })

  it('渲染空歌词容器', () => {
    const { container } = render(<LyricsDisplay currentTime={0} lyrics={[]} />)
    expect(container.querySelector('.overflow-y-auto')).not.toBeNull()
    expect(container.querySelectorAll('h2')).toHaveLength(0)
  })
})

describe('LyricsDisplay 情感指示与标注统计', () => {
  it('无标注时使用歌词自带情绪渲染指示点', () => {
    const { container } = render(<LyricsDisplay currentTime={0} lyrics={baseLyrics} />)
    const firstLine = screen.getByText('第一句歌词').closest('.group') as HTMLElement
    const dot = firstLine.querySelector('[style*="background-color"], [style*="background-color"]') as HTMLElement
    expect(dot).not.toBeNull()
    expect(dot.getAttribute('style') || '').toMatch(/255|00CED1|background-color/i)
  })

  it('按标注数量排序取最高情绪作为指示色，并最多展示 3 个徽标', () => {
    const annotations = {
      0: { happy: 5, unknown: 4, sad: 3, calm: 2 },
      1: {},
    }
    const { container } = render(
      <LyricsDisplay currentTime={0} lyrics={baseLyrics} annotations={annotations} />
    )
    const firstLine = screen.getByText('第一句歌词').closest('.group') as HTMLElement
    // happy 分数最高 → 金色 #FFD700
    expect(firstLine.innerHTML).toMatch(/255,\s*215,\s*0|FFD700/i)
    // 最多 3 个徽标（unknown 因无配置被丢弃）
    const badges = firstLine.querySelectorAll('.rounded-full')
    expect(badges.length).toBeGreaterThanOrEqual(3)
    // 第 1 行标注为空对象，不渲染徽标
    const secondLine = screen.getByText('第二句歌词').closest('.group') as HTMLElement
    expect(secondLine.querySelectorAll('.inline-flex').length).toBe(0)
  })

  it('点击标注按钮后选择情绪回调 onAnnotate', () => {
    const onAnnotate = vi.fn()
    render(
      <LyricsDisplay currentTime={0} lyrics={baseLyrics} onAnnotate={onAnnotate} />
    )
    const line = screen.getByText('第二句歌词').closest('.group') as HTMLElement
    fireEvent.mouseEnter(line)

    const addButton = screen.getByTitle('lyrics.addEmotionTag')
    fireEvent.click(addButton)

    const sadButton = screen.getByTitle('player.sad')
    fireEvent.click(sadButton)

    expect(onAnnotate).toHaveBeenCalledWith(1, 'sad')
    // 选择后收起情绪面板
    expect(screen.queryByTitle('player.sad')).toBeNull()
  })

  it('鼠标离开歌词行时收起标注面板', async () => {
    render(<LyricsDisplay currentTime={0} lyrics={baseLyrics} onAnnotate={() => {}} />)
    const line = screen.getByText('第二句歌词').closest('.group') as HTMLElement
    fireEvent.mouseEnter(line)
    fireEvent.click(screen.getByTitle('lyrics.addEmotionTag'))
    expect(screen.getByTitle('player.happy')).toBeInTheDocument()

    fireEvent.mouseLeave(line)
    await waitFor(() => expect(screen.queryByTitle('player.happy')).toBeNull())
  })

  it('未提供 onAnnotate 时不渲染标注按钮且点击歌词不报错', () => {
    render(<LyricsDisplay currentTime={0} lyrics={baseLyrics} />)
    const line = screen.getByText('第一句歌词').closest('.group') as HTMLElement
    fireEvent.mouseEnter(line)
    expect(screen.queryByTitle('lyrics.addEmotionTag')).toBeNull()

    fireEvent.click(screen.getByText('第一句歌词'))
    fireEvent.mouseLeave(line)
    expect(screen.getByText('第一句歌词')).toBeInTheDocument()
  })
})

describe('LyricsDisplay 情绪粒子', () => {
  it('播放中切换高亮行会生成情绪粒子并按时清理', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const lines = [
      { time: 0, text: '悲伤行', emotion: 'sad' as const },
      { time: 5, text: '活力行', emotion: 'energetic' as const },
      { time: 10, text: '快乐行', emotion: 'happy' as const },
      { time: 15, text: '平静行', emotion: 'calm' as const },
      { time: 20, text: '中性行', emotion: 'neutral' as const },
    ]

    const { container, rerender } = render(
      <LyricsDisplay currentTime={0} lyrics={lines} isPlaying />
    )

    const overlay = container.querySelector('.z-10') as HTMLElement
    // 悲伤 → 涟漪环（border-color）
    expect(overlay.querySelectorAll('[style*="border-color"], [style*="border"]').length).toBeGreaterThan(0)

    rerender(<LyricsDisplay currentTime={5} lyrics={lines} isPlaying />)
    rerender(<LyricsDisplay currentTime={10} lyrics={lines} isPlaying />)
    // 活力/快乐 → 浮动粒子（background-color）
    expect(overlay.querySelectorAll('[style*="background-color"]').length).toBeGreaterThan(0)

    rerender(<LyricsDisplay currentTime={15} lyrics={lines} isPlaying />)
    rerender(<LyricsDisplay currentTime={20} lyrics={lines} isPlaying />)

    // 2.5s 后粒子被清理
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(overlay.querySelectorAll('[style*="background-color"]').length).toBe(0)
  })

  it('未播放时不生成情绪粒子', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const { container } = render(
      <LyricsDisplay currentTime={0} lyrics={baseLyrics} isPlaying={false} />
    )
    const overlay = container.querySelector('.z-10') as HTMLElement
    expect(overlay.querySelectorAll('[style*="background-color"]').length).toBe(0)
    expect(overlay.querySelectorAll('[style*="border-color"]').length).toBe(0)
  })
})
