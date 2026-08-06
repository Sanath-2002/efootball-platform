import { test, expect } from '@playwright/test';

test.describe('eFootball SaaS Competition Platform End-to-End Tests', () => {
  const BASE_URL = process.env.TEST_URL || 'https://efootball-platform.vercel.app';

  test('Homepage loads with title and core capabilities', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/eFootball Competition Manager/);
    await expect(page.getByText('Automated League Standings & Tournament Draw Sheets')).toBeVisible();
  });

  test('Coordinator login with default test admin credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByText('Default Test Admin')).toBeVisible();

    await page.getByRole('button', { name: 'Sign In' }).first().click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Competitions Directory')).toBeVisible();

    // Verify navigating to root '/' while authenticated redirects back to /dashboard
    await page.goto(BASE_URL);
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Competitions Directory')).toBeVisible();
  });
});

