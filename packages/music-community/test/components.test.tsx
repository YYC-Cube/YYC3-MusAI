/**
 * @file 社区组件渲染冒烟测试
 * @description 以 SSR 渲染 11 个社区组件，验证展开态/空数据态渲染契约
 */
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ChallengePanel,
  CommentSystem,
  CommunityFeed,
  E2EKeySetup,
  ForkTree,
  LiveSessionPanel,
  MHeartSystem,
  ShareWorkModal,
  SpaceTimePanel,
  TimelineComments,
  UploadPanel,
} from '../src'

const user = { id: 'u1', name: 'Tester', email: 't@example.com' }
const noop = () => {}

describe('music-community 组件渲染', () => {
  it('CommunityFeed 空数据与加载态渲染', () => {
    const empty = renderToString(
      createElement(CommunityFeed, {
        isOpen: true,
        onClose: noop,
        activities: [],
        onRefresh: noop,
        isLoading: false,
      })
    )
    expect(empty.length).toBeGreaterThan(0)

    const loading = renderToString(
      createElement(CommunityFeed, {
        isOpen: true,
        onClose: noop,
        activities: [],
        onRefresh: noop,
        isLoading: true,
      })
    )
    expect(loading.length).toBeGreaterThan(0)
  })

  it('CommentSystem 渲染曲目评论面板', () => {
    const html = renderToString(
      createElement(CommentSystem, {
        isOpen: true,
        onClose: noop,
        songId: 'track-1',
        songTitle: 'Cosmic Dreams',
        currentTime: 12,
        user,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('TimelineComments 渲染时间轴评论', () => {
    const html = renderToString(
      createElement(TimelineComments, {
        songId: 'track-1',
        currentTime: 10,
        duration: 180,
        isPlaying: true,
        user,
        lang: 'zh',
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('ForkTree 渲染二创树', () => {
    const html = renderToString(
      createElement(ForkTree, { isOpen: true, onClose: noop, lang: 'zh' })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('ChallengePanel 渲染挑战面板', () => {
    const html = renderToString(
      createElement(ChallengePanel, {
        isOpen: true,
        onClose: noop,
        user,
        onOpenCreationStudio: noop,
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('LiveSessionPanel 渲染实时会话', () => {
    const html = renderToString(
      createElement(LiveSessionPanel, {
        isOpen: true,
        onClose: noop,
        userId: 'u1',
        userName: 'Tester',
        currentTrackId: 'track-1',
        currentTrackTitle: 'Cosmic Dreams',
        isPlaying: true,
        currentEmotion: 'happy',
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('SpaceTimePanel 渲染时空信箱', () => {
    const html = renderToString(
      createElement(SpaceTimePanel, {
        isOpen: true,
        onClose: noop,
        user,
        currentTrackId: 'track-1',
        currentTrackTitle: 'Cosmic Dreams',
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('UploadPanel 渲染上传面板', () => {
    const html = renderToString(
      createElement(UploadPanel, {
        onClose: noop,
        userId: 'u1',
        userName: 'Tester',
        lang: 'zh',
      })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('ShareWorkModal 无作品时直接不渲染', () => {
    const html = renderToString(
      createElement(ShareWorkModal, {
        isOpen: true,
        onClose: noop,
        work: null,
        userName: 'Tester',
        userId: 'u1',
      })
    )
    expect(html).toBe('')
  })

  it('E2EKeySetup 渲染密钥设置引导', () => {
    const html = renderToString(
      createElement(E2EKeySetup, { isOpen: true, onClose: noop, user, lang: 'zh' })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('MHeartSystem 渲染心动值面板', () => {
    const html = renderToString(
      createElement(MHeartSystem, { isOpen: true, onClose: noop, userId: 'u1', lang: 'zh' })
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('全部弹层关闭时输出为空', () => {
    const elements = [
      createElement(CommunityFeed, { isOpen: false, onClose: noop, activities: [], onRefresh: noop, isLoading: false }),
      createElement(CommentSystem, {
        isOpen: false,
        onClose: noop,
        songId: 's',
        songTitle: 's',
        currentTime: 0,
        user,
      }),
      createElement(ForkTree, { isOpen: false, onClose: noop, lang: 'en' }),
      createElement(ChallengePanel, { isOpen: false, onClose: noop, user, onOpenCreationStudio: noop }),
      createElement(LiveSessionPanel, {
        isOpen: false,
        onClose: noop,
        currentTrackId: 's',
        currentTrackTitle: 's',
        isPlaying: false,
        currentEmotion: 'neutral',
      }),
      createElement(SpaceTimePanel, { isOpen: false, onClose: noop, user }),
      createElement(ShareWorkModal, { isOpen: false, onClose: noop, work: null }),
      createElement(E2EKeySetup, { isOpen: false, onClose: noop, user }),
      createElement(MHeartSystem, { isOpen: false, onClose: noop }),
    ]
    elements.forEach((element) => expect(renderToString(element)).toBe(''))
  })
})
