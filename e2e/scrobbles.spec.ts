import { test, expect } from '@playwright/test';

test.describe('Scrobbles tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/testuser/scrobbles');
    await expect(page.locator('app-top10list').first()).toBeVisible();
  });

  test('displays 5 top 10 list cards', async ({ page }) => {
    // lists outside the viewport are deferred, count their placeholders as well
    const cards = page.locator('app-top10list, .top10list-placeholder');
    await expect(cards).toHaveCount(5);
  });

  test('list cards contain list items', async ({ page }) => {
    const firstCard = page.locator('app-top10list').first();
    await expect(firstCard.locator('mat-list-item').first()).toBeVisible();
  });
});
