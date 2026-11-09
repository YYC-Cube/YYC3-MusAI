// YYC³ music-data — 本地曲库（收藏 / 歌单 / 队列）测试
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getFavoriteIds,
  isFavorite,
  toggleFavorite,
  getSavedPlaylists,
  savePlaylist,
  deletePlaylist,
  getSavedQueue,
  saveQueue,
} from '../src/localLibrary'

/** 与 localMode 的存储键约定保持一致，用于注入损坏数据 */
const storageKey = (path: string) => `yyc3:music:local:${encodeURIComponent(path)}`

describe('收藏', () => {
  beforeEach(() => localStorage.clear())

  it('初始为空，切换后返回新状态并持久化', async () => {
    expect(await getFavoriteIds()).toEqual([])
    expect(await isFavorite('track-1')).toBe(false)

    expect(await toggleFavorite('track-1')).toBe(true)
    expect(await isFavorite('track-1')).toBe(true)
    expect(await getFavoriteIds()).toEqual(['track-1'])
  })

  it('再次切换取消收藏，列表回到空', async () => {
    await toggleFavorite('track-1')
    expect(await toggleFavorite('track-1')).toBe(false)
    expect(await getFavoriteIds()).toEqual([])
  })

  it('读取时对重复与非字符串 id 去重过滤', async () => {
    localStorage.setItem(
      storageKey('/library/favorites'),
      JSON.stringify({ trackIds: ['track-1', 'track-1', '', 42, null, 'track-2'] })
    )
    expect(await getFavoriteIds()).toEqual(['track-1', 'track-2'])
  })

  it('损坏的 JSON 返回空数组而不抛错', async () => {
    localStorage.setItem(storageKey('/library/favorites'), '{broken json')
    expect(await getFavoriteIds()).toEqual([])
    expect(await isFavorite('track-1')).toBe(false)
  })
})

describe('歌单', () => {
  beforeEach(() => localStorage.clear())

  it('保存同名歌单只保留一条，id 稳定且覆盖内容', async () => {
    const first = await savePlaylist('夜跑', ['track-1', 'track-2'])
    const second = await savePlaylist('夜跑', ['track-2', 'track-3'])

    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.trackIds).toEqual(['track-2', 'track-3'])

    const list = await getSavedPlaylists()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(first.id)
    expect(list[0].trackIds).toEqual(['track-2', 'track-3'])
  })

  it('不同名称各自新增，按 updatedAt 倒序返回', async () => {
    await savePlaylist('甲', ['track-1'])
    await new Promise((resolve) => setTimeout(resolve, 10))
    await savePlaylist('乙', ['track-2'])

    const list = await getSavedPlaylists()
    expect(list.map((item) => item.name)).toEqual(['乙', '甲'])
    expect(list[0].updatedAt).toBeGreaterThanOrEqual(list[1].updatedAt)
  })

  it('删除歌单返回是否命中，重复删除返回 false', async () => {
    const saved = await savePlaylist('待删', ['track-1'])
    expect(await deletePlaylist(saved.id)).toBe(true)
    expect(await getSavedPlaylists()).toEqual([])
    expect(await deletePlaylist(saved.id)).toBe(false)
  })

  it('损坏的歌单数据返回空数组，非法条目被跳过', async () => {
    localStorage.setItem(storageKey('/library/playlists'), 'not-json')
    expect(await getSavedPlaylists()).toEqual([])

    localStorage.setItem(
      storageKey('/library/playlists'),
      JSON.stringify({ playlists: [{ id: 'ok', name: '有效', trackIds: ['track-1', 'track-1'] }, { id: 1 }, null] })
    )
    const list = await getSavedPlaylists()
    expect(list).toHaveLength(1)
    expect(list[0].trackIds).toEqual(['track-1'])
  })
})

describe('播放队列', () => {
  beforeEach(() => localStorage.clear())

  it('初始为空，保存后可原样读回（对象曲目）', async () => {
    expect(await getSavedQueue()).toEqual([])

    const tracks = [{ id: 'track-1', title: 'A' }, { id: 'track-2', title: 'B' }]
    await saveQueue(tracks)
    expect(await getSavedQueue<{ id: string; title: string }>()).toEqual(tracks)
  })

  it('再次保存覆盖旧快照', async () => {
    await saveQueue([{ id: 'track-1' }])
    await saveQueue([{ id: 'track-3' }])
    expect(await getSavedQueue<{ id: string }>()).toEqual([{ id: 'track-3' }])
  })

  it('损坏的队列数据返回空数组', async () => {
    localStorage.setItem(storageKey('/library/queue'), '[1,2,3')
    expect(await getSavedQueue()).toEqual([])
    localStorage.setItem(storageKey('/library/queue'), JSON.stringify({ tracks: 'nope' }))
    expect(await getSavedQueue()).toEqual([])
  })
})
