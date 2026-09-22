import { expect, test } from '@playwright/test'

test('district funding claim and inspection fan-out persist across routes', async ({ page }) => {
  await page.goto('/projects/intervention-workspace?intervention=ROAD-143')
  await expect(page.getByLabel('Finance queue')).toContainText('ROAD-143')
  await page.getByRole('button', { name: 'Claim selected funding review' }).click()
  await expect(page.getByRole('status')).toContainText('claimed')
  await page.goto('/operations')
  await page.goto('/projects/intervention-workspace?intervention=ROAD-143')
  await expect(page.getByLabel('Selected intervention')).toContainText('finance-amira')
  await page.getByRole('button', { name: 'Revise linked inspection evidence' }).click()
  await expect(page.getByRole('status')).toContainText('related interventions updated')
  await expect(page.getByLabel('Selected intervention')).toContainText('inspection invalid')
  await page.reload()
  await expect(page.getByLabel('Selected intervention')).toContainText('inspection invalid')
  await page.getByLabel('Intervention collection').getByRole('button', { name: /ROAD-310/ }).click()
  await expect(page.getByLabel('Selected intervention')).toContainText('inspection valid')
})
