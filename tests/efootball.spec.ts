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

  test('Logged-out Create Competition flow shows banner and redirects post-auth to competition form', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('link', { name: 'Create Competition' }).click();

    // Should land on register with contextual banner and redirect query param
    await expect(page).toHaveURL(/.*register\?redirect=.*competitions.*/);
    await expect(page.getByText('Create an account to set up your competition.')).toBeVisible();

    // Switch to sign in and verify banner remains
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/.*login\?redirect=.*competitions.*/);
    await expect(page.getByText('Sign in to set up your competition.')).toBeVisible();

    // Sign in using quick demo admin button
    await page.getByRole('button', { name: 'Sign In' }).first().click();

    // Should land directly on /competitions/new creation form
    await expect(page).toHaveURL(/.*competitions\/new/);
    await expect(page.getByRole('heading', { name: 'Create Competition' })).toBeVisible();
  });
});

