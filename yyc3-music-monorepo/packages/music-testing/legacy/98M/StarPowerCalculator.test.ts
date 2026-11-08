// tests/unit/StarPowerCalculator.test.ts
import { describe, it, expect } from 'vitest'
import { WilsonScoreCalculator } from '@/utils/starPowerAlgorithm'

describe('WilsonScoreCalculator', () => {
  describe('calculateWilsonScore', () => {
    it('should return 0 for zero total votes', () => {
      const result = WilsonScoreCalculator.calculateWilsonScore(0, 0)
      expect(result).toBe(0)
    })

    it('should handle perfect scores correctly', () => {
      const result = WilsonScoreCalculator.calculateWilsonScore(100, 100)
      expect(result).toBeGreaterThan(0.95)
    })

    it('should handle small sample sizes appropriately', () => {
      const result1 = WilsonScoreCalculator.calculateWilsonScore(1, 1)
      const result2 = WilsonScoreCalculator.calculateWilsonScore(10, 10)
      
      // Small samples should have lower confidence
      expect(result1).toBeLessThan(result2)
    })

    it('should calculate different confidence levels correctly', () => {
      const score95 = WilsonScoreCalculator.calculateWilsonScore(50, 100, 0.95)
      const score99 = WilsonScoreCalculator.calculateWilsonScore(50, 100, 0.99)
      
      // 99% confidence should be lower (more conservative)
      expect(score99).toBeLessThan(score95)
    })
  })

  describe('calculateStarPower', () => {
    it('should calculate star power with all metrics', () => {
      const data = {
        likes: 100,
        dislikes: 20,
        comments: 30,
        shares: 15,
        plays: 1000,
        duration: 24,
        quality: 85
      }
      
      const result = WilsonScoreCalculator.calculateStarPower(data)
      
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(10000) // Should be reasonable range
    })

    it('should handle zero values gracefully', () => {
      const data = {
        likes: 0,
        dislikes: 0,
        comments: 0,
        shares: 0,
        plays: 0,
        duration: 1,
        quality: 0
      }
      
      const result = WilsonScoreCalculator.calculateStarPower(data)
      expect(result).toBe(0)
    })

    it('should weight different factors appropriately', () => {
      const baseData = {
        likes: 50,
        dislikes: 10,
        comments: 10,
        shares: 5,
        plays: 500,
        duration: 24,
        quality: 70
      }
      
      const baseScore = WilsonScoreCalculator.calculateStarPower(baseData)
      
      // Increase likes should increase score
      const highLikesData = { ...baseData, likes: 100 }
      const highLikesScore = WilsonScoreCalculator.calculateStarPower(highLikesData)
      expect(highLikesScore).toBeGreaterThan(baseScore)
      
      // Increase quality should increase score
      const highQualityData = { ...baseData, quality: 95 }
      const highQualityScore = WilsonScoreCalculator.calculateStarPower(highQualityData)
      expect(highQualityScore).toBeGreaterThan(baseScore)
    })
  })
})

// tests/unit/AudioManager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioManager } from '@/utils/audioManager'

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBufferSource: vi.fn().mockReturnValue({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  }),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    gain: { value: 0 }
  }),
  decodeAudioData: vi.fn().mockResolvedValue({}),
  destination: {},
  currentTime: 0
}))

global.fetch = vi.fn()

describe('AudioManager', () => {
  let audioManager: AudioManager

  beforeEach(() => {
    audioManager = new AudioManager()
    vi.clearAllMocks()
  })

  describe('playUISound', () => {
    it('should not play sound if sound not loaded', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      audioManager.playUISound('nonexistent')
      
      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should play sound with correct volume', () => {
      // Mock loaded sound
      const mockBuffer = {}
      audioManager['soundLibrary'].set('click', mockBuffer as any)
      
      const mockSource = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn()
      }
      
      const mockGain = {
        connect: vi.fn(),
        gain: { value: 0 }
      }
      
      audioManager['audioContext'].createBufferSource = vi.fn().mockReturnValue(mockSource)
      audioManager['audioContext'].createGain = vi.fn().mockReturnValue(mockGain)
      
      audioManager.playUISound('click', 0.5)
      
      expect(mockGain.gain.value).toBe(0.5)
      expect(mockSource.start).toHaveBeenCalledWith(0)
    })
  })

  describe('generateAtmosphereFromEmotion', () => {
    it('should select correct atmosphere for emotion', async () => {
      const playAtmosphereSpy = vi.spyOn(audioManager, 'playAtmosphere')
      
      await audioManager.generateAtmosphereFromEmotion('happy', 0.8)
      
      expect(playAtmosphereSpy).toHaveBeenCalledWith('concert', 0.12)
    })

    it('should handle unknown emotions', async () => {
      const playAtmosphereSpy = vi.spyOn(audioManager, 'playAtmosphere')
      
      await audioManager.generateAtmosphereFromEmotion('unknown', 0.5)
      
      expect(playAtmosphereSpy).toHaveBeenCalledWith('rain', 0.05)
    })
  })

  describe('generateAISound', () => {
    it('should create oscillator with correct parameters', () => {
      const mockOscillator = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      }
      
      const mockGain = {
        connect: vi.fn(),
        gain: { 
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        }
      }
      
      audioManager['audioContext'].createOscillator = vi.fn().mockReturnValue(mockOscillator)
      audioManager['audioContext'].createGain = vi.fn().mockReturnValue(mockGain)
      
      audioManager.generateAISound(440, 1, 'square')
      
      expect(mockOscillator.type).toBe('square')
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0)
      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.3, 0)
    })
  })
})

// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test'

test.describe('D-Music User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('complete music discovery and interaction flow', async ({ page }) => {
    // 1. 用户登录
    await page.click('[data-testid="login-button"]')
    await page.fill('[data-testid="username-input"]', 'testuser')
    await page.fill('[data-testid="password-input"]', ['legacy', 'fixture', 'pw98'].join('-'))
    await page.click('[data-testid="submit-login"]')
    
    // 验证登录成功
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
    
    // 2. 浏览音乐推荐
    await page.click('[data-testid="discover-tab"]')
    await expect(page.locator('[data-testid="music-grid"]')).toBeVisible()
    
    // 点击第一首歌曲
    await page.click('[data-testid="music-item"]:first-child')
    
    // 3. 播放音乐并验证播放器
    await expect(page.locator('[data-testid="player-controls"]')).toBeVisible()
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible()
    
    await page.click('[data-testid="play-button"]')
    await expect(page.locator('[data-testid="play-button"]')).toHaveAttribute('data-state', 'playing')
    
    // 4. 测试音频可视化
    await expect(page.locator('[data-testid="audio-visualizer"]')).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
    
    // 5. 点赞歌曲
    await page.click('[data-testid="like-button"]')
    await expect(page.locator('[data-testid="like-button"]')).toHaveClass(/liked/)
    
    // 6. 添加评论
    await page.click('[data-testid="comment-tab"]')
    await page.fill('[data-testid="comment-input"]', '这首歌太棒了！')
    await page.click('[data-testid="submit-comment"]')
    
    // 验证评论出现
    await expect(page.locator('[data-testid="comment-item"]')).toContainText('这首歌太棒了！')
    
    // 7. 测试AI歌词生成
    await page.click('[data-testid="create-tab"]')
    await page.click('[data-testid="ai-lyrics-generator"]')
    
    await page.fill('[data-testid="theme-input"]', '青春')
    await page.selectOption('[data-testid="emotion-select"]', 'happy')
    await page.click('[data-testid="generate-lyrics"]')
    
    // 等待生成完成
    await expect(page.locator('[data-testid="lyrics-result"]')).toBeVisible({ timeout: 10000 })
    
    // 8. 查看星力值排行榜
    await page.click('[data-testid="ranking-tab"]')
    await expect(page.locator('[data-testid="ranking-list"]')).toBeVisible()
    
    // 验证星力值显示
    await expect(page.locator('[data-testid="star-power-value"]').first()).toBeVisible()
    
    // 9. 测试数据分析
    await page.click('[data-testid="analytics-tab"]')
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible()
    
    // 验证图表加载
    await expect(page.locator('[data-testid="user-activity-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="genre-distribution-chart"]')).toBeVisible()
    
    // 10. 测试设置页面
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="settings-option"]')
    
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible()
    
    // 更新音频设置
    await page.selectOption('[data-testid="ui-sound-pack"]', 'nature')
    await page.click('[data-testid="save-settings"]')
    
    // 验证保存成功
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    
    // 11. 退出登录
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-option"]')
    
    // 验证返回首页
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('mobile responsive design', async ({ page }) => {
    // 模拟移动设备
    await page.setViewportSize({ width: 375, height: 667 })
    
    // 验证移动端导航
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
    
    // 验证移动端播放器
    await page.click('[data-testid="music-item"]:first-child')
    await expect(page.locator('[data-testid="mobile-player"]')).toBeVisible()
    
    // 验证触摸手势
    const player = page.locator('[data-testid="mobile-player"]')
    await player.swipe('up')
    
    await expect(page.locator('[data-testid="player-expanded"]')).toBeVisible()
  })

  test('accessibility features', async ({ page }) => {
    // 启用无障碍模式
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    // 验证键盘导航
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
    
    // 验证ARIA标签
    const playButton = page.locator('[data-testid="play-button"]')
    await expect(playButton).toHaveAttribute('aria-label')
    
    // 验证屏幕阅读器支持
    const musicItem = page.locator('[data-testid="music-item"]:first-child')
    await expect(musicItem).toHaveAttribute('aria-label')
  })
})

// tests/integration/api.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { apiClient } from '@/utils/api'

const server = setupServer(
  // Mock API endpoints
  rest.get('/api/music/recommendations', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: '1',
            title: 'Test Song',
            artist: 'Test Artist',
            duration: 180,
            cover: '/test-cover.jpg'
          }
        ]
      })
    )
  }),
  
  rest.post('/api/comments', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'comment-1',
        text: req.body.text,
        createdAt: new Date().toISOString()
      })
    )
  }),
  
  rest.post('/api/ai/generate-lyrics', (req, res, ctx) => {
    return res(
      ctx.json({
        lines: [
          { text: 'Generated line 1', emotion: 'happy' },
          { text: 'Generated line 2', emotion: 'calm' }
        ],
        emotionAnalysis: [
          { type: 'happy', percentage: 60 },
          { type: 'calm', percentage: 40 }
        ],
        rhymeScore: 85,
        innovationScore: 7.5
      })
    )
  })
)

describe('API Integration Tests', () => {
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  it('should fetch music recommendations', async () => {
    const response = await apiClient.get('/music/recommendations')
    
    expect(response.status).toBe(200)
    expect(response.data.data).toHaveLength(1)
    expect(response.data.data[0].title).toBe('Test Song')
  })

  it('should create comment successfully', async () => {
    const commentData = {
      contentId: 'music-1',
      text: 'Great song!'
    }
    
    const response = await apiClient.post('/comments', commentData)
    
    expect(response.status).toBe(201)
    expect(response.data.text).toBe(commentData.text)
  })

  it('should generate AI lyrics', async () => {
    const lyricsRequest = {
      theme: 'love',
      emotions: ['happy', 'romantic'],
      keywords: ['heart', 'dream'],
      style: 'pop'
    }
    
    const response = await apiClient.post('/ai/generate-lyrics', lyricsRequest)
    
    expect(response.status).toBe(200)
    expect(response.data.lines).toHaveLength(2)
    expect(response.data.rhymeScore).toBeGreaterThan(0)
  })
})
