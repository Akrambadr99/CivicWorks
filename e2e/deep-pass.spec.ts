import { expect, test } from '@playwright/test'
test('asset network updates permit finding while retaining dependent impacts', async ({ page }) => {
  await page.goto('/assets/ROAD-142/network')
  await expect(page.getByText('Permit approval is pending.')).toBeVisible()
  await page.getByRole('button', { name: 'Record permit approval' }).click()
  await expect(page.getByText('Permit approval is pending.')).toHaveCount(0)
  await expect(page.getByText('Hospital access requires a continuity plan.')).toBeVisible()
})
