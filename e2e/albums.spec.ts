import { test, expect } from '@playwright/test';

test.describe('Albums tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/testuser/albums');
    await expect(page.locator('app-top10list').first()).toBeVisible();
  });

  test('displays multiple top 10 list cards', async ({ page }) => {
    // lists outside the viewport are deferred, count their placeholders as well
    const cards = page.locator('app-top10list, .top10list-placeholder');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('displays tracks without album (lastfm specific)', async ({ page }) => {
    // the last list is deferred until it is scrolled into view
    await page.locator('.top10list-placeholder').last().scrollIntoViewIfNeeded();
    await expect(page.getByText('Tracks without album')).toBeVisible();
  });

  test('list cards contain list items', async ({ page }) => {
    const firstCard = page.locator('app-top10list').first();
    await expect(firstCard.locator('mat-list-item').first()).toBeVisible();
  });
});
