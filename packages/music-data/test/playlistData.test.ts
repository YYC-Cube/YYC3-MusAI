// YYC³ music-data — 演示数据完整性测试（对应 full-test-suite §T-2 演示歌单用例的 Vitest 化）
import { describe, it, expect } from 'vitest'
import { DEMO_PLAYLIST, ACHIEVEMENTS } from '../src/playlistData'

describe('DEMO_PLAYLIST 演示歌单', () => {
  it('非空且字段完整', () => {
    expect(DEMO_PLAYLIST.length).toBeGreaterThan(0)
    for (const track of DEMO_PLAYLIST) {
      expect(typeof track.id).toBe('string')
      expect(track.id.length).toBeGreaterThan(0)
      expect(typeof track.title).toBe('string')
      expect(typeof track.artist).toBe('string')
      expect(typeof track.album).toBe('string')
      expect(typeof track.duration).toBe('number')
      expect(track.duration).toBeGreaterThan(0)
      expect(typeof track.albumArt).toBe('string')
      expect(Array.isArray(track.lyrics)).toBe(true)
      expect([0, 1, 2, 3]).toContain(track.chordSet)
    }
  })

  it('曲目 id 全局唯一', () => {
    const ids = DEMO_PLAYLIST.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('歌词行按时间升序（含歌词的曲目）', () => {
    for (const track of DEMO_PLAYLIST) {
      if (track.lyrics.length > 1) {
        const times = track.lyrics.map(l => l.time)
        const sorted = [...times].sort((a, b) => a - b)
        expect(times).toEqual(sorted)
      }
    }
  })
})

describe('ACHIEVEMENTS 成就数据', () => {
  it('非空且含必要字段', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0)
    for (const a of ACHIEVEMENTS) {
      expect(a).toBeTruthy()
      expect(typeof a).toBe('object')
    }
  })
})
