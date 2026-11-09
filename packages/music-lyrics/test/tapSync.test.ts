// YYC³ music-lyrics — 打拍生成歌词时间轴单元测试
import { describe, it, expect } from 'vitest'
import { normalizeTaps, assignTimestamps, serializeLrc } from '../src/tapSync'
import { parseLrc } from '../src/parseLrc'

describe('normalizeTaps', () => {
  it('过滤非有限数与负数', () => {
    expect(normalizeTaps([Number.NaN, Number.POSITIVE_INFINITY, -100, 500, 2000])).toEqual([500, 2000])
  })

  it('升序排序并丢弃间隔过小的抖动点', () => {
    expect(normalizeTaps([3000, 1000, 1050, 1200])).toEqual([1000, 1200, 3000])
    expect(normalizeTaps([1000, 1050])).toEqual([1000])
    expect(normalizeTaps([1000, 1050], 40)).toEqual([1000, 1050])
  })
})

describe('assignTimestamps', () => {
  it('拍点与歌词行等量时按序映射', () => {
    expect(assignTimestamps(['一', '二', '三'], [1000, 2500, 4000])).toEqual([
      { time: 1000, text: '一' },
      { time: 2500, text: '二' },
      { time: 4000, text: '三' },
    ])
  })

  it('拍点不足时按平均间隔补齐', () => {
    expect(assignTimestamps(['一', '二', '三', '四'], [1000, 2000, 3000])).toEqual([
      { time: 1000, text: '一' },
      { time: 2000, text: '二' },
      { time: 3000, text: '三' },
      { time: 4000, text: '四' },
    ])
    expect(assignTimestamps(['一', '二', '三'], [1000, 3000]).map((l) => l.time)).toEqual([1000, 3000, 5000])
  })

  it('pad:false 时剩余行时间为 null', () => {
    expect(assignTimestamps(['一', '二', '三'], [1000], { pad: false })).toEqual([
      { time: 1000, text: '一' },
      { time: null, text: '二' },
      { time: null, text: '三' },
    ])
  })

  it('拍点多于歌词行时忽略多余拍点', () => {
    expect(assignTimestamps(['一', '二'], [1000, 2000, 3000])).toEqual([
      { time: 1000, text: '一' },
      { time: 2000, text: '二' },
    ])
  })

  it('乱序拍点清洗后按升序映射并输出', () => {
    expect(assignTimestamps(['一', '二', '三'], [3000, 1000, 2000])).toEqual([
      { time: 1000, text: '一' },
      { time: 2000, text: '二' },
      { time: 3000, text: '三' },
    ])
  })

  it('offsetMs 为正表示整体提前并钳制到 0', () => {
    expect(assignTimestamps(['一', '二'], [2000, 3000], { offsetMs: 500 }).map((l) => l.time)).toEqual([1500, 2500])
    expect(assignTimestamps(['一'], [100], { offsetMs: 500 })[0].time).toBe(0)
  })

  it('offsetMs 为负表示延后', () => {
    expect(assignTimestamps(['一'], [1000], { offsetMs: -200 })[0].time).toBe(1200)
  })
})

describe('serializeLrc', () => {
  it('输出两位小数时间标签、稳定元数据顺序并跳过 null 行', () => {
    const lrc = serializeLrc(
      [
        { time: 65432, text: '第二句' },
        { time: null, text: '未分配' },
        { time: 1234, text: '第一句' },
      ],
      { title: '夜航', artist: 'YYC³', album: 'MusAI', by: 'yyc3', offset: 0 }
    )

    expect(lrc).toBe(
      [
        '[ti:夜航]',
        '[ar:YYC³]',
        '[al:MusAI]',
        '[by:yyc3]',
        '[offset:0]',
        '[01:05.43]第二句',
        '[00:01.23]第一句',
      ].join('\n')
    )
  })

  it('空元数据时不输出元数据标签', () => {
    expect(serializeLrc([{ time: 1000, text: '一' }])).toBe('[00:01.00]一')
  })
})

describe('serializeLrc 与 parseLrc 往返一致', () => {
  it('时间误差不超过 10ms 且文本一致', () => {
    const lines = assignTimestamps(['第一句', '第二句', '第三句'], [1500, 4250, 8900])
    const parsed = parseLrc(serializeLrc(lines))

    expect(parsed.lines.map((l) => l.text)).toEqual(['第一句', '第二句', '第三句'])
    parsed.lines.forEach((line, index) => {
      expect(Math.abs(line.time * 1000 - (lines[index].time as number))).toBeLessThanOrEqual(10)
    })
  })

  it('metadata.offset 往返后时间保持不变', () => {
    const lines = [
      { time: 2000, text: '一' },
      { time: 5000, text: '二' },
    ]
    const parsed = parseLrc(serializeLrc(lines, { offset: 300 }))

    expect(parsed.metadata.offset).toBe(300)
    parsed.lines.forEach((line, index) => {
      expect(Math.abs(line.time * 1000 - lines[index].time)).toBeLessThanOrEqual(10)
    })
  })
})
