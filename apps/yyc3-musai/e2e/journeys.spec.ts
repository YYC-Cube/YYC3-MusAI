// YYC³ MusAI — 关键用户旅程 E2E（播放 / 切歌 / 歌单 / 评论 / 主题 / 快捷键 / 成就 / 移动端）
import { test, expect, type Page } from '@playwright/test'

const TOOLBAR = /音乐播放控制/

async function openApp(page: Page) {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('toolbar', { name: TOOLBAR })).toBeVisible({ timeout: 15_000 })
}

function trackTitle(toolbar: ReturnType<Page['getByRole']>) {
  return toolbar.locator('span.truncate.font-semibold').first()
}

test.describe('关键旅程 · 桌面端', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page)
  })

  test('播放与暂停：按钮状态切换且进度推进', async ({ page }) => {
    const progress = page.locator('[role="slider"]').first()
    const before = Number(await progress.getAttribute('aria-valuenow'))

    await page.getByRole('button', { name: '播放 / Play' }).click()
    await expect(page.getByRole('button', { name: '暂停 / Pause' })).toBeVisible()

    await expect.poll(
      async () => Number(await progress.getAttribute('aria-valuenow')),
      { timeout: 8_000 }
    ).toBeGreaterThan(before)

    await page.getByRole('button', { name: '暂停 / Pause' }).click()
    await expect(page.getByRole('button', { name: '播放 / Play' })).toBeVisible()
  })

  test('下一首：曲目标题发生变化', async ({ page }) => {
    const toolbar = page.getByRole('toolbar', { name: TOOLBAR })
    const title = trackTitle(toolbar)
    const before = (await title.textContent())?.trim()
    expect(before).toBeTruthy()

    await page.getByRole('button', { name: '下一首 / Next track' }).click()
    await expect.poll(async () => (await title.textContent())?.trim()).not.toBe(before)
  })

  test('播放列表：打开、选择曲目并同步标题', async ({ page }) => {
    await page.locator('button[title="播放列表"]').first().click()
    const dialog = page.getByRole('dialog', { name: '播放列表' })
    await expect(dialog).toBeVisible()

    const tracks = dialog.locator('button[aria-label*="—"]')
    expect(await tracks.count()).toBeGreaterThan(1)
    const label = await tracks.nth(1).getAttribute('aria-label')
    const expectedTitle = label?.split('—')[0].trim()
    expect(expectedTitle).toBeTruthy()

    await tracks.nth(1).click()

    const toolbar = page.getByRole('toolbar', { name: TOOLBAR })
    await expect(trackTitle(toolbar)).toHaveText(expectedTitle!)

    await page.getByRole('button', { name: '关闭播放列表 / Close playlist' }).click()
    await expect(dialog).toBeHidden()
  })

  test('播放列表：保存、加载与删除本地歌单', async ({ page }) => {
    await page.locator('button[title="播放列表"]').first().click()
    const dialog = page.getByRole('dialog', { name: '播放列表' })
    await expect(dialog).toBeVisible()

    await dialog.getByTestId('save-queue').click()
    await expect(dialog.getByRole('status')).toContainText('已保存')

    // 存储键对路径做了 encodeURIComponent，如 yyc3:music:local:%2Flibrary%2Fplaylists
    const keys = await page.evaluate(() => Object.keys(localStorage))
    expect(keys.some((key) => key.includes('playlists'))).toBe(true)

    // 已保存列表可见并可加载
    await dialog.getByTestId('toggle-saved-playlists').click()
    await expect(dialog.getByText('当前队列')).toBeVisible()
    await dialog.getByTestId(/^load-playlist-/).click()
    await expect(dialog.getByTestId('toggle-saved-playlists')).toHaveAttribute('aria-expanded', 'false')
    expect(await dialog.locator('button[aria-label*="—"]').count()).toBeGreaterThan(0)

    // 删除后列表回到空态
    await dialog.getByTestId('toggle-saved-playlists').click()
    await dialog.getByTestId(/^delete-playlist-/).click()
    await expect(dialog.getByText('暂无已保存歌单 / No saved playlists')).toBeVisible()
  })

  test('播放列表：本地导入曲目刷新后可恢复', async ({ page }) => {
    await page.locator('button[title="播放列表"]').first().click()
    const dialog = page.getByRole('dialog', { name: '播放列表' })
    await expect(dialog).toBeVisible()

    // 44 字节 WAV 头即可被识别为音频；重点验证不是播放而是持久化
    const wav = Buffer.alloc(44)
    wav.write('RIFF', 0, 'ascii')
    wav.write('WAVE', 8, 'ascii')

    // 文件输入在「添加曲目」菜单展开后才渲染
    await dialog.getByRole('button', { name: '添加曲目' }).click()
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'local-demo.wav',
      mimeType: 'audio/wav',
      buffer: wav,
    })
    await expect(dialog.getByText('local-demo')).toBeVisible()

    // 等待原始文件写入 IndexedDB
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const db = await new Promise<IDBDatabase>((resolve, reject) => {
              const req = indexedDB.open('yyc3-music-audio')
              req.onsuccess = () => resolve(req.result)
              req.onerror = () => reject(req.error)
            })
            return new Promise<number>((resolve) => {
              const req = db.transaction('tracks', 'readonly').objectStore('tracks').count()
              req.onsuccess = () => resolve(req.result)
              req.onerror = () => resolve(-1)
            })
          }),
        { timeout: 5000 }
      )
      .toBeGreaterThan(0)

    await dialog.getByTestId('save-queue').click()
    await expect(dialog.getByRole('status')).toContainText('已保存')
    await dialog.getByRole('button', { name: '关闭播放列表 / Close playlist' }).click()
    await expect(dialog).toBeHidden()

    // 用 goto 而非 reload：面板状态由 URL 承载，reload 会把面板重新打开
    await page.goto('/')
    const queueSnapshot = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) => item.includes('queue'))
      return key ? localStorage.getItem(key) : null
    })
    expect(queueSnapshot).toContain('local-demo')

    await page.locator('button[title="播放列表"]').first().click()
    const restored = page.getByRole('dialog', { name: '播放列表' })
    await expect(restored.getByText('local-demo')).toBeVisible()
  })

  test('播放列表：移除单条曲目并持久化', async ({ page }) => {
    await page.locator('button[title="播放列表"]').first().click()
    const dialog = page.getByRole('dialog', { name: '播放列表' })
    await expect(dialog).toBeVisible()

    const items = dialog.locator('[role="listitem"]')
    const before = await items.count()
    await dialog.getByTestId(/^remove-track-/).first().click()
    await expect(items).toHaveCount(before - 1)

    await page.goto('/')
    await page.locator('button[title="播放列表"]').first().click()
    await expect(page.getByRole('dialog', { name: '播放列表' }).locator('[role="listitem"]')).toHaveCount(before - 1)
  })

  test('评论面板：可从播放器工具条打开', async ({ page }) => {
    await page.locator('button[title="评论"]').first().click()
    await expect(page.getByRole('dialog', { name: '评论' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '评论' })).toBeVisible()
  })

  test('主题切换：选择后写入 data-theme', async ({ page }) => {
    const initial = await page.locator('html').getAttribute('data-theme')

    await page.getByRole('button', { name: '主题切换' }).click()
    const dialog = page.getByRole('dialog', { name: '选择主题' })
    await expect(dialog).toBeVisible()

    const options = dialog.locator('button[aria-pressed="false"]')
    expect(await options.count()).toBeGreaterThan(0)
    await options.first().click()

    await expect.poll(async () => page.locator('html').getAttribute('data-theme')).not.toBe(initial)
  })

  test('键盘快捷键：按 ? 打开面板，Esc 关闭', async ({ page }) => {
    await page.keyboard.press('?')
    const dialog = page.getByRole('dialog', { name: '键盘快捷键' })
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('成就面板：可从快速入口打开', async ({ page }) => {
    await page.locator('button[title="成就徽章"]').first().click()
    await expect(page.getByRole('heading', { name: '成就徽章' })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('关键旅程 · 移动端', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('底部导航打开全屏播放器并可关闭', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav')
    await expect(nav).toBeVisible({ timeout: 15_000 })

    await nav.getByRole('button', { name: '播放' }).click()
    const player = page.getByTestId('mobile-player')
    await expect(player).toBeVisible()
    await expect(player).toHaveAttribute('aria-label', /播放器/)

    await player.getByRole('button', { name: '关闭播放器 / Close player' }).click()
    await expect(player).toBeHidden()
  })
})
