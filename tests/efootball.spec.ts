import { test, expect } from '@playwright/test';

test.describe('eFootball SaaS Competition Platform End-to-End Tests', () => {
  const BASE_URL = process.env.TEST_URL || 'https://efootball-platform.vercel.app';

  test('Homepage loads with title and core capabilities', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/eFootball Competition Manager/);
    await expect(page.getByText('Automated League Standings & Tournament Draw Sheets')).toBeVisible();
  });

  test('Coordinator login with 1-click test admin credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByText('1-Click Test Admin Sign In')).toBeVisible();

    await page.getByRole('button', { name: '1-Click Test Admin Sign In' }).click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Competitions Directory')).toBeVisible();
  });
});
