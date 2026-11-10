// YYC³ music-data — 曲库扫描测试
// 覆盖文件名解析、扩展名过滤、路径去重、内容指纹去重、专辑归组、情绪/流派推断与统计
import { describe, it, expect } from 'vitest'
import { parseFileName, scanLibrary } from '../src/libraryScanner'

describe('parseFileName', () => {
  it('按「艺术家 - 标题」拆分并去掉扩展名', () => {
    expect(parseFileName('周杰伦 - 晴天.mp3')).toEqual({ artist: '周杰伦', title: '晴天' })
  })

  it('支持下划线替换与长破折号', () => {
    expect(parseFileName('Aurora_—_Runaway.flac')).toEqual({ artist: 'Aurora', title: 'Runaway' })
  })

  it('无分隔符时艺术家回落为未知', () => {
    expect(parseFileName('demo-track.m4a')).toEqual({ artist: '未知艺术家', title: 'demo-track' })
  })

  it('无艺术家时标题保留原样', () => {
    expect(parseFileName('标题.wav')).toEqual({ artist: '未知艺术家', title: '标题' })
  })
})

describe('scanLibrary', () => {
  it('过滤非音频扩展名并记录', () => {
    const report = scanLibrary([
      { path: '/music/albums/夜曲/A - B.mp3' },
      { path: '/music/cover.jpg' },
      { path: '/music/readme.txt' },
    ])
    expect(report.tracks).toHaveLength(1)
    expect(report.unsupported).toEqual(['/music/cover.jpg', '/music/readme.txt'])
  })

  it('路径重复只保留首条', () => {
    const report = scanLibrary([
      { path: '/music/x.mp3', sizeBytes: 100 },
      { path: '/music/x.mp3', sizeBytes: 100 },
    ])
    expect(report.tracks).toHaveLength(1)
    expect(report.duplicates).toEqual(['/music/x.mp3'])
  })

  it('跨目录同艺术家/标题/大小视为重复', () => {
    const report = scanLibrary([
      { path: '/a/周杰伦 - 晴天.mp3', sizeBytes: 4096 },
      { path: '/b/周杰伦 - 晴天.mp3', sizeBytes: 4096 },
    ])
    expect(report.tracks).toHaveLength(1)
    expect(report.duplicates).toEqual(['/b/周杰伦 - 晴天.mp3'])
  })

  it('缺少 sizeBytes 时不做内容指纹去重，避免误删同名不同曲', () => {
    const report = scanLibrary([
      { path: '/a/周杰伦 - 晴天.mp3' },
      { path: '/b/周杰伦 - 晴天.mp3' },
    ])
    expect(report.tracks).toHaveLength(2)
    expect(report.duplicates).toEqual([])
  })

  it('按 albums 目录归组，缺失时归入单曲', () => {
    const report = scanLibrary([
      { path: '/lib/albums/叶惠美/周杰伦 - 晴天.mp3' },
      { path: '/lib/singles/周杰伦 - 七里香.mp3' },
    ])
    expect(report.tracks[0].album).toBe('叶惠美')
    expect(report.tracks[1].album).toBe('单曲')
  })

  it('情绪只看标题，流派看完整文件名', () => {
    const report = scanLibrary([
      // 艺术家名含 Sad，但标题不含 → 情绪应为 neutral；文件名含 piano → 流派钢琴曲
      { path: '/x/Sad Piano - Moonlight.mp3' },
    ])
    expect(report.tracks[0].artist).toBe('Sad Piano')
    expect(report.tracks[0].emotion).toBe('neutral')
    expect(report.tracks[0].genre).toBe('钢琴曲')
  })

  it('能从标题推断情绪', () => {
    const report = scanLibrary([{ path: '/x/某某 - 晚安放松曲.mp3' }])
    expect(report.tracks[0].emotion).toBe('calm')
  })

  it('扩展名小写化，未标注时长回落为 0', () => {
    const report = scanLibrary([{ path: '/x/某某 - 燃向摇滚.FLAC' }])
    expect(report.tracks[0].ext).toBe('flac')
    expect(report.tracks[0].duration).toBe(0)
    expect(report.tracks[0].emotion).toBe('energetic')
  })

  it('统计歌手/专辑数量与总字节数', () => {
    const report = scanLibrary([
      { path: '/m/albums/A/甲 - 一.mp3', sizeBytes: 10 },
      { path: '/m/albums/A/甲 - 二.mp3', sizeBytes: 20 },
      { path: '/m/albums/B/乙 - 三.mp3', sizeBytes: 30 },
    ])
    expect(report.byArtist).toEqual({ 甲: 2, 乙: 1 })
    expect(report.byAlbum).toEqual({ A: 2, B: 1 })
    expect(report.totalBytes).toBe(60)
  })

  it('同一路径生成稳定 id，不同路径 id 不重复', () => {
    const first = scanLibrary([{ path: '/m/甲 - 一.mp3' }])
    const second = scanLibrary([{ path: '/m/甲 - 一.mp3' }])
    expect(first.tracks[0].id).toBe(second.tracks[0].id)

    const many = scanLibrary([
      { path: '/m/甲 - 一.mp3' },
      { path: '/m/甲 - 二.mp3' },
      { path: '/m/甲 - 三.mp3' },
    ])
    expect(new Set(many.tracks.map((t) => t.id)).size).toBe(3)
  })
})
