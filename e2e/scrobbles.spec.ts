import { test, expect } from '@playwright/test';

test.describe('Scrobbles tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/testuser/scrobbles');
    await expect(page.locator('app-top10list').first()).toBeVisible();
  });

  test('displays 5 top 10 list cards', async ({ page }) => {
    const cards = page.locator('app-top10list');
    await expect(cards).toHaveCount(5);
  });

  test('list cards contain list items', async ({ page }) => {
    const firstCard = page.locator('app-top10list').first();
    const items = firstCard.locator('mat-list-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });
});
