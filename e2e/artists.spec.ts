import { test, expect } from '@playwright/test';

test.describe('Artists tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/testuser/artists');
    // Wait for list cards to appear
    await expect(page.locator('app-top10list').first()).toBeVisible();
  });

  test('displays multiple top 10 list cards', async ({ page }) => {
    await expect(page.getByText('Gaps between artists').first()).toBeVisible();
    await expect(page.getByText('Ongoing gaps between artists')).toBeVisible();
    // lists outside the viewport are deferred, count their placeholders as well
    const cards = page.locator('app-top10list, .top10list-placeholder');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('list cards contain list items', async ({ page }) => {
    const firstCard = page.locator('app-top10list').first();
    await expect(firstCard.locator('mat-list-item').first()).toBeVisible();
  });

  test('info buttons show explanation snackbar', async ({ page }) => {
    const infoButton = page.locator('app-top10list button mat-icon', { hasText: 'info_outline' }).first();
    await infoButton.click();
    await expect(page.locator('mat-snack-bar-container')).toBeVisible();
  });
});
