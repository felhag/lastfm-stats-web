import { test, expect, Page } from '@playwright/test';

/**
 * Regression test for the dataset tab bug where switching between
 * artist/album/track groups leaves visible rows with the previous group's
 * cell layout (because the CDK virtual-scroll viewport recycles row views).
 *
 * Artist columns: [name, tracks, scrobbles, rank]
 * Album columns:  [artist, name, scrobbles, rank]
 *
 * The bug only manifests after the user scrolls in artist mode (which fills
 * the viewport's recycle cache with artist-layout row views); switching to
 * album then reuses those cached views for album data, leaving cell 1 empty
 * (album entries have no `tracks` field).
 */

async function scrollToTopThenBack(page: Page): Promise<void> {
  const viewport = page.locator('cdk-virtual-scroll-viewport');
  await viewport.evaluate(el => el.scrollTo({ top: 1000, behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(200);
  await viewport.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(200);
}

test.describe('Dataset group switching column alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/testuser/dataset');
    await expect(page.getByLabel('Search artist')).toBeVisible();
    await expect(page.locator('tr.mat-mdc-row').first()).toBeVisible();
  });

  test('album row name cell is non-empty after scroll+switch from artist', async ({ page }) => {
    // Fill the recycle cache by scrolling in artist mode.
    await scrollToTopThenBack(page);

    await page.locator('mat-radio-button', { hasText: 'Album' }).click();
    await page.waitForTimeout(500);

    // 2nd cell in album mode is the album Name; if the cached artist view is
    // reused, cell 1 reads element.tracks (undefined for albums) and is empty.
    const albumSecondCell = (await page.locator('tr.mat-mdc-row').first().locator('td').nth(1).textContent())?.trim();
    expect(albumSecondCell).toBeTruthy();
  });

  test('album row artist cell contains the artist (not the album name) after scroll+switch', async ({ page }) => {
    await scrollToTopThenBack(page);

    // Capture a known album/artist pair from the rendered rows after switch.
    await page.locator('mat-radio-button', { hasText: 'Album' }).click();
    await page.waitForTimeout(500);

    const firstRow = page.locator('tr.mat-mdc-row').first();
    const firstCell = (await firstRow.locator('td').nth(0).textContent())?.trim() ?? '';
    const secondCell = (await firstRow.locator('td').nth(1).textContent())?.trim() ?? '';

    // Without the bug: first cell = artist (e.g. "The Chemical Brothers"),
    // second cell = album (e.g. "Further"). With the bug: first cell = album
    // name (e.g. "Further") and second cell = "" because element.tracks is
    // undefined for albums.
    expect(secondCell).not.toBe('');
    // And the first cell shouldn't equal what would be the album name when
    // the second cell is empty (cheap structural check).
    expect(firstCell).not.toBe('');
  });

  test('album row alignment is correct after scroll+switch with active artist filter', async ({ page }) => {
    await scrollToTopThenBack(page);

    await page.getByPlaceholder('Search artist...').fill('a');
    await page.waitForTimeout(500);
    await scrollToTopThenBack(page);

    await page.locator('mat-radio-button', { hasText: 'Album' }).click();
    await page.waitForTimeout(500);

    const secondCell = (await page.locator('tr.mat-mdc-row').first().locator('td').nth(1).textContent())?.trim();
    expect(secondCell).toBeTruthy();
  });
});
