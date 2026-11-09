// YYC³ music-lyrics — parseLrc 单元测试
import { describe, it, expect } from 'vitest'
import { parseLrc } from '../src/parseLrc'

describe('parseLrc', () => {
  it('解析基础时间标签与文本', () => {
    const { lines } = parseLrc('[00:01.00]第一句\n[00:05.50]第二句')
    expect(lines).toEqual([
      { time: 1, text: '第一句' },
      { time: 5.5, text: '第二句' },
    ])
  })

  it('解析元数据与 offset', () => {
    const lrc = [
      '[ti:夜航]',
      '[ar:YYC³]',
      '[al:MusAI]',
      '[by:yyc3]',
      '[00:10.00]歌词',
    ].join('\n')

    const { metadata, lines } = parseLrc(lrc)
    expect(metadata).toEqual({
      title: '夜航',
      artist: 'YYC³',
      album: 'MusAI',
      by: 'yyc3',
      offset: 0,
    })
    expect(lines).toEqual([{ time: 10, text: '歌词' }])
  })

  it('offset 正值使歌词提前并钳制到 0', () => {
    const { metadata, lines } = parseLrc('[offset:500]\n[00:00.20]开场\n[00:02.00]正文')
    expect(metadata.offset).toBe(500)
    expect(lines).toEqual([
      { time: 0, text: '开场' },
      { time: 1.5, text: '正文' },
    ])
  })

  it('offset 可为负数（歌词延后）', () => {
    const { lines } = parseLrc('[offset:-200]\n[00:01.00]延后')
    expect(lines[0].time).toBe(1.2)
  })

  it('options.offset 覆盖文件内 offset', () => {
    const { lines } = parseLrc('[offset:1000]\n[00:02.00]校准', { offset: 500 })
    expect(lines[0].time).toBe(1.5)
  })

  it('一行多时间标签展开为多行', () => {
    const { lines } = parseLrc('[00:01.00][00:05.00][01:00.00]副歌')
    expect(lines.map((l) => l.time)).toEqual([1, 5, 60])
    expect(lines.every((l) => l.text === '副歌')).toBe(true)
  })

  it('两位与三位毫秒精度', () => {
    const { lines } = parseLrc('[00:01.3]a\n[00:02.34]b\n[00:03.345]c')
    expect(lines.map((l) => l.time)).toEqual([1.3, 2.34, 3.345])
  })

  it('乱序时间标签按时间升序输出', () => {
    const { lines } = parseLrc('[00:09.00]后\n[00:03.00]前\n[00:06.00]中')
    expect(lines.map((l) => l.text)).toEqual(['前', '中', '后'])
  })

  it('忽略空行、纯元数据行与无时间标签的文本', () => {
    const lrc = ['[ti:标题]', '', '没有时间标签的说明文字', '[00:01.00]有效'].join('\r\n')
    const { lines } = parseLrc(lrc)
    expect(lines).toEqual([{ time: 1, text: '有效' }])
  })

  it('时间标签存在但文本为空时跳过', () => {
    const { lines } = parseLrc('[00:01.00]\n[00:02.00]有文本')
    expect(lines).toEqual([{ time: 2, text: '有文本' }])
  })

  it('分钟位超过两位仍可解析', () => {
    const { lines } = parseLrc('[123:45.00]长音频')
    expect(lines[0].time).toBe(123 * 60 + 45)
  })

  it('空输入返回空结果', () => {
    expect(parseLrc('')).toEqual({ metadata: { offset: 0 }, lines: [] })
  })

  it('无效 offset 回退为 0', () => {
    const { metadata } = parseLrc('[offset:abc]\n[00:01.00]x')
    expect(metadata.offset).toBe(0)
  })

  it('元数据大小写不敏感', () => {
    const { metadata } = parseLrc('[TI:标题]\n[AR:歌手]\n[00:01.00]x')
    expect(metadata.title).toBe('标题')
    expect(metadata.artist).toBe('歌手')
  })
})
