import { expect, test } from '@playwright/test'

test('permit approval enables funding adoption and cannot be revoked afterward', async ({ page }) => {
  await page.goto('/programs/NORTH-ROADS/budget/2027-2029?inflation=0')
  await page.getByLabel('Decision authority').selectOption('finance authority')
  await expect(page.getByRole('button', { name: 'Adopt funding scenario' })).toBeDisabled()
  await page.goto('/assets/ROAD-142/network')
  await page.getByRole('button', { name: 'Record permit approval' }).click()
  await page.goto('/programs/NORTH-ROADS/budget/2027-2029?inflation=0')
  await page.getByLabel('Decision authority').selectOption('finance authority')
  await page.getByRole('button', { name: 'Adopt funding scenario' }).click()
  await expect(page.getByText('Funding adopted')).toBeVisible()
  await page.goto('/assets/ROAD-142/network')
  await page.getByRole('button', { name: 'Revoke permit approval' }).click()
  await expect(page.getByRole('status')).toContainText('Adopted funding depends')
})
