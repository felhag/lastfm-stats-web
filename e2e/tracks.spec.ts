import { test, expect } from '@playwright/test';

test.describe('Tracks tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/testuser/tracks');
    await expect(page.locator('app-top10list').first()).toBeVisible();
  });

  test('displays multiple top 10 list cards', async ({ page }) => {
    const cards = page.locator('app-top10list');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('list cards contain list items', async ({ page }) => {
    const firstCard = page.locator('app-top10list').first();
    const items = firstCard.locator('mat-list-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });
});
