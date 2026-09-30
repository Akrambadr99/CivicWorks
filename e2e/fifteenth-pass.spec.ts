import { expect, test } from '@playwright/test'

test('detail changes reach the selected workspace record and survive reload', async ({ page }) => {
  await page.goto('/projects/intervention-workspace?intervention=ROAD-142')
  const selected = page.getByLabel('Selected intervention', { exact: true })
  const before = await selected.textContent()
  await page.getByRole('link', { name: 'Open record details' }).click()
  await expect(page.getByLabel('Selected record context')).toContainText('ROAD-142')
  await page.getByRole('button', { name: 'Record permit approval' }).click()
  await page.getByRole('link', { name: 'Back to workspace' }).click()
  await expect(selected).not.toHaveText(before ?? '')
  const after = await selected.textContent()
  await page.reload()
  await expect(selected).toHaveText(after ?? '')
  await page.getByRole('link', { name: 'Open record details' }).click()
  await expect(page.getByLabel('Selected record context')).toContainText('ROAD-142')
})

test('secondary record selection and return navigation work at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/projects/intervention-workspace?intervention=ROAD-143')
  await page.getByRole('link', { name: 'Open record details' }).click()
  await expect(page.getByLabel('Selected record context')).toContainText('ROAD-143')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(() => page.evaluate<number>('window.scrollY')).toBe(0)
  await page.screenshot({ path: '../UI_SCREENSHOTS/fifteenth-CivicWorks-detail.png', fullPage: true })
  await page.reload()
  await expect(page.getByLabel('Selected record context')).toContainText('ROAD-143')
  await page.getByRole('link', { name: 'Back to workspace' }).click()
  await expect(page.getByLabel('Selected intervention', { exact: true })).toContainText('ROAD-143')
})

test('unknown record recovery never opens the default record', async ({ page }) => {
  await page.goto('/assets/ROAD-142/network?record=MISSING')
  await expect(page.getByRole('alert')).toContainText('not found')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to workspace' }).click()
  await expect(page.getByRole('button', { name: 'Refresh workspace' })).toBeVisible()
})
