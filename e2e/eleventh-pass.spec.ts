import { expect, test } from '@playwright/test'

test('permit approval enters independent finance review before funding adoption', async ({ page }) => {
  await page.goto('/assets/ROAD-142/network')
  await page.getByRole('button', { name: 'Record permit approval' }).click()
  await page.goto('/programs/NORTH-ROADS/budget/2027-2029?inflation=0')
  await expect(page.getByText('Queue: finance-review')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adopt funding scenario' })).toBeDisabled()
  await page.getByLabel('Decision authority').selectOption('finance authority')
  await page.getByRole('button', { name: 'Adopt funding scenario' }).click()
  await expect(page.getByText('Queue: funded')).toBeVisible()
})
