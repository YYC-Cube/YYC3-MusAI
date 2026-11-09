// YYC³ music-utils — 领域 API 封装层测试
// api.ts 为纯委托层：断言每个封装方法生成的请求路径 / 方法 / 请求头 / 请求体
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../src/supabase', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../src/supabase'
import {
  playerApi,
  commentApi,
  userApi,
  starPowerApi,
  leaderboardApi,
  recommendationApi,
  aiApi,
  socialApi,
  spaceTimeApi,
  voiceApi,
  achievementApi,
  themeApi,
  sttApi,
  notificationApi,
  albumApi,
  pkiApi,
  marketApi,
} from '../src/api'

const apiFetchMock = apiFetch as unknown as ReturnType<typeof vi.fn>

function lastCall(): [string, any] {
  return apiFetchMock.mock.calls[apiFetchMock.mock.calls.length - 1] as [string, any]
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

beforeEach(() => {
  apiFetchMock.mockReset()
  apiFetchMock.mockResolvedValue({ ok: true, marker: 'resolved' })
})

describe('播放器与互动 API', () => {
  it('playerApi 各方法路径与方法动词正确', async () => {
    await expect(playerApi.getLikes('s1')).resolves.toEqual({ ok: true, marker: 'resolved' })
    expect(lastCall()).toEqual(['/likes/s1'])

    await playerApi.likeSong('s1')
    expect(lastCall()).toEqual(['/likes/s1', { method: 'POST' }])

    await playerApi.recordPlay('s2')
    expect(lastCall()).toEqual(['/play/s2', { method: 'POST' }])

    await playerApi.getAnnotations('s3')
    expect(lastCall()[0]).toBe('/annotations/s3')

    await playerApi.addAnnotation('s3', 4, 'nostalgic')
    const [path, init] = lastCall()
    expect(path).toBe('/annotations/s3')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual(JSON_HEADERS)
    expect(JSON.parse(init.body)).toEqual({ lineIndex: 4, emotion: 'nostalgic' })

    await playerApi.getSongStats('s4')
    expect(lastCall()[0]).toBe('/song/stats/s4')
    expect(apiFetchMock).toHaveBeenCalledTimes(6)
  })

  it('commentApi 查询 / 发布 / 点赞', async () => {
    await commentApi.getComments('s1')
    expect(lastCall()[0]).toBe('/comments/s1')

    await commentApi.postComment('s1', { userId: 'u1', userName: 'Ann', content: 'nice', timestamp: 12 })
    let [path, init] = lastCall()
    expect(path).toBe('/comments/s1')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ userId: 'u1', userName: 'Ann', content: 'nice', timestamp: 12 })

    await commentApi.likeComment('s1', 'c9')
    expect(lastCall()).toEqual(['/comments/s1/c9/like', { method: 'POST' }])
  })
})

describe('用户 / 星力 / 榜单 / 推荐 API', () => {
  it('userApi 资料读取、更新与注册', async () => {
    await userApi.getProfile('u1')
    expect(lastCall()[0]).toBe('/profile/u1')

    await userApi.updateProfile('u1', { nickname: 'Neo', bio: 'hi' })
    let [, init] = lastCall()
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ nickname: 'Neo', bio: 'hi' })

    await userApi.signup('a@b.c', 'pass', 'Neo')
    ;[, init] = lastCall()
    expect(lastCall()[0]).toBe('/signup')
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.c', password: 'pass', name: 'Neo' })
  })

  it('starPowerApi 余额 / 增加 / 消费', async () => {
    await starPowerApi.getBalance('u1')
    expect(lastCall()[0]).toBe('/starpower/u1')

    await starPowerApi.add('u1', 50, 'daily')
    let [path, init] = lastCall()
    expect(path).toBe('/starpower/u1')
    expect(JSON.parse(init.body)).toEqual({ amount: 50, reason: 'daily' })

    await starPowerApi.consume('u1', 20, 'boost')
    ;[path, init] = lastCall()
    expect(path).toBe('/starpower/u1/consume')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ amount: 20, reason: 'boost' })
  })

  it('leaderboardApi 读取与助推', async () => {
    await leaderboardApi.get()
    expect(lastCall()).toEqual(['/leaderboard'])

    await leaderboardApi.boost('s1', 'u1', 30)
    const [path, init] = lastCall()
    expect(path).toBe('/leaderboard/boost')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ songId: 's1', userId: 'u1', starPowerCost: 30 })
  })

  it('recommendationApi 推荐 / 偏好 / AI 分析 / 收听历史', async () => {
    await recommendationApi.get('u1')
    expect(lastCall()[0]).toBe('/recommendations/u1')

    await recommendationApi.getPreferences('u1')
    expect(lastCall()[0]).toBe('/recommendations/u1/preferences')

    await recommendationApi.getAIAnalysis('u1')
    expect(lastCall()[0]).toBe('/recommendations/u1/ai-analysis')

    await recommendationApi.recordHistory({
      userId: 'u1', songId: 's1', songTitle: 'T', emotion: 'calm',
      listenDuration: 30, totalDuration: 60, completionRate: 0.5, skipped: false,
    })
    const [path, init] = lastCall()
    expect(path).toBe('/listening-history')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toMatchObject({ userId: 'u1', completionRate: 0.5, skipped: false })
  })

  it('aiApi 歌词与编曲生成', async () => {
    await aiApi.generateLyrics('space', 'calm', ['star', 'sea'], 'zh')
    let [path, init] = lastCall()
    expect(path).toBe('/ai/lyrics')
    expect(JSON.parse(init.body)).toEqual({ theme: 'space', mood: 'calm', keywords: ['star', 'sea'], lang: 'zh' })

    await aiApi.compose('space', 'calm', 'en')
    ;[path, init] = lastCall()
    expect(path).toBe('/ai/compose')
    expect(JSON.parse(init.body)).toEqual({ theme: 'space', mood: 'calm', lang: 'en' })
  })
})

describe('社交 / IP 矩阵 API', () => {
  const forkPayload = {
    userId: 'u1', userName: 'Ann', originalWorkId: 'w1',
    originalAuthor: 'Bob', title: 'Remix', theme: 'space', lyrics: ['a', 'b'],
  }

  it('作品查询 / 分享 / 点赞 / 播放', async () => {
    await socialApi.getSharedWorks()
    expect(lastCall()[0]).toBe('/shared-works')

    await socialApi.shareWork({ title: 'W' })
    expect(lastCall()[0]).toBe('/shared-works')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ title: 'W' })

    await socialApi.likeWork('w1')
    expect(lastCall()).toEqual(['/shared-works/w1/like', { method: 'POST' }])

    await socialApi.playWork('w1')
    expect(lastCall()).toEqual(['/shared-works/w1/play', { method: 'POST' }])
  })

  it('创作者 / 作品 / 分支链（用户名 URL 编码）', async () => {
    await socialApi.getCreators()
    expect(lastCall()[0]).toBe('/creators')

    await socialApi.getCreatorWorks('张 三')
    expect(lastCall()[0]).toBe(`/creators/${encodeURIComponent('张 三')}/works`)

    await socialApi.forkWork(forkPayload)
    expect(lastCall()[0]).toBe('/works/fork')
    expect(JSON.parse(lastCall()[1].body)).toEqual(forkPayload)

    await socialApi.getForkChain('w1')
    expect(lastCall()[0]).toBe('/works/w1/forks')
  })
})

describe('时空胶囊与语音 API', () => {
  it('时空消息读取 / 发送 / 点赞 / 回复', async () => {
    await spaceTimeApi.getMessages()
    expect(lastCall()[0]).toBe('/spacetime/messages')

    await spaceTimeApi.sendMessage({ content: 'hi' })
    expect(lastCall()[1].method).toBe('POST')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ content: 'hi' })

    await spaceTimeApi.likeMessage('m1', 'u1')
    expect(lastCall()[0]).toBe('/spacetime/messages/m1/like')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ userId: 'u1' })

    await spaceTimeApi.getReplies('m1')
    expect(lastCall()[0]).toBe('/spacetime/messages/m1/replies')

    await spaceTimeApi.postReply('m1', { content: 'yo' })
    expect(JSON.parse(lastCall()[1].body)).toEqual({ content: 'yo' })
  })

  it('附近消息半径：显式值与默认 50 兜底', async () => {
    await spaceTimeApi.getNearby(31.2, 121.5, 10)
    expect(lastCall()[0]).toBe('/spacetime/messages/nearby?lat=31.2&lng=121.5&radius=10')

    await spaceTimeApi.getNearby(0, 0)
    expect(lastCall()[0]).toBe('/spacetime/messages/nearby?lat=0&lng=0&radius=50')

    await spaceTimeApi.getNearby(1, 2, 0)
    expect(lastCall()[0]).toContain('radius=50')
  })

  it('胶囊列表 / 创建 / 点赞', async () => {
    await spaceTimeApi.getCapsules()
    expect(lastCall()[0]).toBe('/spacetime/capsules')

    await spaceTimeApi.createCapsule({ title: '未来' })
    expect(JSON.parse(lastCall()[1].body)).toEqual({ title: '未来' })

    await spaceTimeApi.likeCapsule('c1')
    expect(lastCall()).toEqual(['/spacetime/capsules/c1/like', { method: 'POST' }])
  })

  it('voiceApi 上传与签名 URL（路径编码）', async () => {
    await voiceApi.upload('u1', 'base64data', 'audio/webm')
    expect(lastCall()[0]).toBe('/voice/upload')
    expect(JSON.parse(lastCall()[1].body)).toEqual({
      userId: 'u1', audioBase64: 'base64data', mimeType: 'audio/webm',
    })

    await voiceApi.getUrl('a b/c.webm')
    expect(lastCall()[0]).toBe(`/voice/url?path=${encodeURIComponent('a b/c.webm')}`)
  })
})

describe('成就 / 主题解锁 / STT / 通知 API', () => {
  it('achievementApi 读取与埋点（含/不含额外字段）', async () => {
    await achievementApi.get('u1')
    expect(lastCall()[0]).toBe('/achievements/u1')

    await achievementApi.track('u1', 'play', { count: 2 })
    expect(lastCall()[0]).toBe('/achievements/u1/track')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ action: 'play', count: 2 })

    await achievementApi.track('u1', 'share')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ action: 'share' })
  })

  it('themeApi 解锁主题', async () => {
    await themeApi.getUnlocked('u1')
    expect(lastCall()[0]).toBe('/user/u1/unlocked-themes')

    await themeApi.unlock('u1', 'aurora')
    expect(lastCall()[0]).toBe('/user/u1/unlocked-themes')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ themeId: 'aurora' })
  })

  it('sttApi 单次转写与流式转写', async () => {
    await sttApi.transcribe('BASE64', 'zh', 'audio/webm')
    expect(lastCall()[0]).toBe('/stt/transcribe')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ audio: 'BASE64', language: 'zh', mimeType: 'audio/webm' })

    await sttApi.transcribe('B64', 'en')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ audio: 'B64', language: 'en', mimeType: undefined })

    await sttApi.stream([{ audioBase64: 'A', index: 0 }], 'zh', 'audio/webm', 'sess-1')
    expect(lastCall()[0]).toBe('/stt/stream')
    expect(JSON.parse(lastCall()[1].body)).toEqual({
      chunks: [{ audioBase64: 'A', index: 0 }],
      language: 'zh',
      mimeType: 'audio/webm',
      sessionId: 'sess-1',
    })
  })

  it('notificationApi 使用 URL 编码后的 userId', async () => {
    await notificationApi.get('user/1')
    expect(lastCall()[0]).toBe(`/notifications/${encodeURIComponent('user/1')}`)

    await notificationApi.markRead('user/1')
    expect(lastCall()).toEqual([`/notifications/${encodeURIComponent('user/1')}/read`, { method: 'POST' }])
  })
})

describe('数字专辑 API', () => {
  it('列表 / 详情 / 收藏 / 创作者 / 点赞', async () => {
    await albumApi.list()
    expect(lastCall()[0]).toBe('/albums')

    await albumApi.get('al1')
    expect(lastCall()[0]).toBe('/albums/al1')

    await albumApi.purchase('al1', 'u1')
    expect(lastCall()[0]).toBe('/albums/al1/purchase')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ userId: 'u1' })

    await albumApi.getCollection('u1')
    expect(lastCall()[0]).toBe('/albums/collection/u1')

    await albumApi.getByCreator('u2')
    expect(lastCall()[0]).toBe('/albums/creator/u2')

    await albumApi.like('al1')
    expect(lastCall()).toEqual(['/albums/al1/like', { method: 'POST' }])
  })

  it('创建专辑提交完整元数据', async () => {
    const payload = {
      creatorId: 'u1',
      creatorName: 'Ann',
      title: '星海',
      description: 'desc',
      genre: 'ambient',
      tracks: [{ title: 'T1', artist: 'Ann', duration: 200 }],
      price: 99,
      limitedEdition: true,
      maxSupply: 100,
      tags: ['space'],
    }
    await albumApi.create(payload)
    expect(lastCall()[0]).toBe('/albums')
    expect(lastCall()[1].method).toBe('POST')
    expect(JSON.parse(lastCall()[1].body)).toEqual(payload)
  })
})

describe('PKI 与二级市场 API', () => {
  it('pkiApi 公钥与备份 CRUD（含 DELETE）', async () => {
    const jwk = { kty: 'RSA', n: 'n', e: 'AQAB' }
    await pkiApi.uploadPublicKey('u1', jwk)
    expect(lastCall()[0]).toBe('/pki/public-key')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ userId: 'u1', publicKeyJwk: jwk })

    await pkiApi.getPublicKey('u1')
    expect(lastCall()[0]).toBe('/pki/public-key/u1')

    await pkiApi.deletePublicKey('u1')
    expect(lastCall()).toEqual(['/pki/public-key/u1', { method: 'DELETE' }])

    await pkiApi.storeKeyBackup({ userId: 'u1', encryptedPrivateKey: 'enc', salt: 's', iv: 'i' })
    expect(lastCall()[0]).toBe('/pki/key-backup')
    expect(JSON.parse(lastCall()[1].body)).toMatchObject({ encryptedPrivateKey: 'enc', salt: 's', iv: 'i' })

    await pkiApi.getKeyBackup('u1')
    expect(lastCall()[0]).toBe('/pki/key-backup/u1')

    await pkiApi.getStatus('u1')
    expect(lastCall()[0]).toBe('/pki/status/u1')
  })

  it('marketApi 挂单 / 购买 / 取消（DELETE）/ 历史 / 统计', async () => {
    await marketApi.getListings()
    expect(lastCall()[0]).toBe('/market/listings')

    await marketApi.getSellerListings('u1')
    expect(lastCall()[0]).toBe('/market/listings/u1')

    await marketApi.createListing({ userId: 'u1', userName: 'Ann', albumId: 'al1', price: 20 })
    expect(lastCall()[0]).toBe('/market/list')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ userId: 'u1', userName: 'Ann', albumId: 'al1', price: 20 })

    await marketApi.buyListing('l1', 'u2', 'Bob')
    expect(lastCall()[0]).toBe('/market/buy/l1')
    expect(JSON.parse(lastCall()[1].body)).toEqual({ userId: 'u2', userName: 'Bob' })

    await marketApi.cancelListing('l1')
    expect(lastCall()).toEqual(['/market/cancel/l1', { method: 'DELETE' }])

    await marketApi.getHistory()
    expect(lastCall()[0]).toBe('/market/history')

    await marketApi.getStats()
    expect(lastCall()[0]).toBe('/market/stats')
  })
})
