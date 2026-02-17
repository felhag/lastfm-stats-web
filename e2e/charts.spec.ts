import { test, expect } from '@playwright/test';

test.describe('Charts tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/testuser/charts');
    // Wait for chart cards to render
    await expect(page.locator('app-charts mat-card').first()).toBeVisible();
  });

  test('displays multiple chart cards', async ({ page }) => {
    const cards = page.locator('app-charts mat-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('chart cards have fullscreen buttons', async ({ page }) => {
    const fullscreenButtons = page.locator('app-charts button[mattooltip="Full screen"]');
    const count = await fullscreenButtons.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('chart cards have download buttons', async ({ page }) => {
    const downloadButtons = page.locator('app-charts button[mattooltip="Download"]');
    const count = await downloadButtons.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('race chart toolbar is present', async ({ page }) => {
    const toolbar = page.locator('#race-chart-toolbar');
    await expect(toolbar).toBeAttached();
  });

  test('race chart has play button', async ({ page }) => {
    const playButton = page.locator('#race-chart-toolbar .play');
    await expect(playButton).toBeAttached();
  });

  test('punchcard toolbar is present', async ({ page }) => {
    const toolbar = page.locator('#punchcard-toolbar');
    await expect(toolbar).toBeAttached();
  });

  test('toggleable scrobbles toolbar is present', async ({ page }) => {
    const toolbar = page.locator('#toggleable-scrobbles-toolbar');
    await expect(toolbar).toBeAttached();
  });

  test('scrobble moment toolbar is present', async ({ page }) => {
    const toolbar = page.locator('#scrobble-moment-toolbar');
    await expect(toolbar).toBeAttached();
  });
});
