import { test, expect } from '@playwright/test';

test('landing page renders sign-in redirect', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DayPlanner/);
});
