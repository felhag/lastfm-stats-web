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
    await expect(page.locator('tr.mat-mdc-row').first()).toBeVisible();
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
    const rows = page.locator('tr.mat-mdc-row');
    await expect(rows.first()).toBeVisible();
    const rowsBefore = await rows.count();
    const searchInput = page.getByPlaceholder('Search artist...');
    await searchInput.fill('Clannad');
    // Wait for filter to apply
    await expect(rows.first()).toContainText('Clannad');
    const rowsAfter = await rows.count();
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
    expect(rowsAfter).toBeGreaterThan(0);
  });

  test('search supports ^ and $ anchors', async ({ page }) => {
    const rows = page.locator('tr.mat-mdc-row');
    const searchInput = page.getByPlaceholder('Search artist...');

    // substring match: "air" matches both "Air" and "Fairweather"
    await searchInput.fill('air');
    await expect(rows).toHaveCount(2);

    // ^ anchors to the start: only "Air"
    await searchInput.fill('^air');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Air');

    // $ anchors to the end: only "Fairweather"
    await searchInput.fill('weather$');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Fairweather');

    // ^...$ is an exact match
    await searchInput.fill('^fairweather$');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Fairweather');
  });

  test('search field shows anchor hint', async ({ page }) => {
    await expect(page.getByText('Use ^ for starts with and $ for ends with').first()).toBeVisible();
  });
});
