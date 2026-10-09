import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('halaman sambutan tampil', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/Pohon Baik/)
    await expect(page.locator('h1').first()).toHaveText("Assalamu'alaikum")
  })

  test('rute aplikasi tanpa sesi diarahkan ke halaman masuk', async ({ page }) => {
    await page.goto('http://localhost:3000/hari-ini')
    await expect(page).toHaveURL(/\/masuk$/)
  })
})
