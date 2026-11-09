// YYC³ MusAI — E2E 冒烟用例（对齐卷 03 目标测试体系：Playwright 承接 e2e-specs 职责）
import { test, expect } from '@playwright/test'

test.describe('应用冒烟', () => {
  test('页面加载：HTTP 200 + 标题正确', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/MusAI/)
  })

  test('根节点挂载：#root 存在且应用完成初始渲染', async ({ page }) => {
    await page.goto('/')
    const root = page.locator('#root')
    await expect(root).toHaveCount(1)
    // 应用 JS 执行后 root 内应有内容（网络失败也应渲染外壳）
    await expect(root).not.toBeEmpty({ timeout: 15_000 })
  })
})
