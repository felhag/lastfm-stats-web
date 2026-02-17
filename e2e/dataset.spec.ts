import { test, expect } from '@playwright/test';

test.describe('Dataset tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/testuser/dataset');
    // Wait for search field to be visible (always rendered)
    await expect(page.getByLabel('Search artist')).toBeVisible();
  });

  test('displays radio buttons for grouping', async ({ page }) => {
    await expect(page.getByText('Artist').first()).toBeVisible();
    await expect(page.getByText('Album').first()).toBeVisible();
    await expect(page.getByText('Track').first()).toBeVisible();
  });

  test('displays download button', async ({ page }) => {
    await expect(page.locator('button[mattooltip="Download"]')).toBeVisible();
  });

  test('displays data table with data rows', async ({ page }) => {
    const rows = page.locator('tr.mat-mdc-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('table has sortable column headers', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: 'Rank' })).toBeVisible();
    // "Name" column header shows the groupedBy value (e.g. "Artist") via titlecase pipe
    await expect(page.locator('th').filter({ hasText: 'Artist' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Scrobbles' })).toBeVisible();
  });

  test('displays tracks column when grouped by artist', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: 'Tracks' })).toBeVisible();
  });

  test('can switch to album grouping', async ({ page }) => {
    await page.locator('mat-radio-button', { hasText: 'Album' }).click();
    // Should show artist column instead of tracks
    await expect(page.locator('th').filter({ hasText: 'Artist' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Tracks' })).not.toBeVisible();
  });

  test('can switch to track grouping', async ({ page }) => {
    await page.locator('mat-radio-button', { hasText: 'Track' }).click();
    await expect(page.locator('th').filter({ hasText: 'Artist' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Tracks' })).not.toBeVisible();
  });

  test('search filters the table', async ({ page }) => {
    const rowsBefore = await page.locator('tr.mat-mdc-row').count();
    const searchInput = page.getByPlaceholder('Search artist...');
    await searchInput.fill('Clannad');
    // Wait for filter to apply
    await page.waitForTimeout(500);
    const rowsAfter = await page.locator('tr.mat-mdc-row').count();
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
    expect(rowsAfter).toBeGreaterThan(0);
  });
});
