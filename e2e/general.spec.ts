import { test, expect, Page } from '@playwright/test';

test.describe('General component', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('/user/testuser/general');
    // Wait for stats to be computed (the "Artists" label appears once stats are ready)
    await expect(page.getByText('Artists').first()).toBeVisible();
  });

  test('displays username', async () => {
    await expect(page.locator('dd').filter({ hasText: 'testuser' })).toBeVisible();
  });

  test('displays first and last scrobble', async () => {
    // First scrobble should show the date and artist/track info
    const firstDt = page.getByText('First scrobble', {exact: true});
    await expect(firstDt).toBeVisible();
    // The first scrobble is from 2005 by Clannad - Drifting
    await expect(page.locator('dd').filter({ hasText: 'Clannad' }).first()).toBeVisible();

    const lastDt = page.getByText('Last scrobble');
    await expect(lastDt).toBeVisible();
  });

  test('displays days since first scrobble', async () => {
    const daysDt = page.getByText('Days since first scrobble');
    await expect(daysDt).toBeVisible();
    // The value should be a large number (first scrobble was 2005)
    const daysDd = daysDt.locator('~ dd').first();
    const text = await daysDd.textContent();
    const days = parseInt(text!.trim().replace(/,/g, ''));
    expect(days).toBeGreaterThan(5000);
  });

  test('displays days scrobbled with percentage', async () => {
    const daysDt = page.getByText('Days scrobbled');
    await expect(daysDt).toBeVisible();
    const daysDd = daysDt.locator('~ dd').first();
    const text = await daysDd.textContent();
    // Should contain a number and a percentage
    expect(text).toMatch(/\d+.*\d+.*%/);
  });

  test('displays artist count', async () => {
    const artistsDt = page.locator('dt', { hasText: /^Artists$/ });
    await expect(artistsDt).toBeVisible();
    // TestUser has 380 unique artists — the dd immediately follows the dt in the dl
    const artistsDd = artistsDt.locator('+ dd');
    const text = await artistsDd.textContent();
    expect(parseInt(text!.trim())).toBe(380);
  });

  test('displays one hit wonders', async () => {
    const ohwDt = page.getByText('One hit wonders');
    await expect(ohwDt).toBeVisible();
    const ohwDd = ohwDt.locator('~ dd').first();
    const text = await ohwDd.textContent();
    // Should show a count and percentage
    expect(text).toMatch(/\d+.*%/);
  });

  test('displays track count', async () => {
    const tracksDt = page.locator('dt', { hasText: /^Tracks$/ });
    await expect(tracksDt).toBeVisible();
    const tracksDd = tracksDt.locator('+ dd');
    const text = await tracksDd.textContent();
    expect(parseInt(text!.trim().replace(/,/g, ''))).toBe(1411);
  });

  test('displays album count', async () => {
    const albumsDt = page.getByText('Albums').first();
    await expect(albumsDt).toBeVisible();
  });

  test('displays albums per artist', async () => {
    const dt = page.getByText('Albums per artist');
    await expect(dt).toBeVisible();
  });

  test('displays Eddington number', async () => {
    const eddDt = page.getByText('Eddington number');
    await expect(eddDt).toBeVisible();
    const eddDd = eddDt.locator('~ dd').first();
    const text = await eddDd.textContent();
    const eddington = parseInt(text!.trim());
    expect(eddington).toBeGreaterThan(0);
  });

  test('displays days needed for next Eddington', async () => {
    const dt = page.getByText(/Days needed for next Eddington/);
    await expect(dt).toBeVisible();
  });

  test('displays artist cut over point', async () => {
    const dt = page.getByText('Artist cut over point');
    await expect(dt).toBeVisible();
    const dd = dt.locator('~ dd').first();
    const text = await dd.textContent();
    const cutOver = parseInt(text!.trim());
    expect(cutOver).toBeGreaterThan(0);
  });

  test('displays most popular year', async () => {
    const dt = page.getByText('Most popular year');
    await expect(dt).toBeVisible();
    const dd = dt.locator('~ dd').first();
    const text = await dd.textContent();
    // Should contain a year between 2005-2012 and a scrobble count
    expect(text).toMatch(/20\d{2}.*\d+.*scrobbles/);
  });

  test('displays most popular month', async () => {
    const dt = page.getByText('Most popular month');
    await expect(dt).toBeVisible();
    const dd = dt.locator('~ dd').first();
    const text = await dd.textContent();
    // Should contain a month name and scrobble count
    expect(text).toMatch(/\w+\s+20\d{2}.*\d+.*scrobbles/);
  });

  test('displays every year artists with dialog', async () => {
    const dt = page.getByText('Every year artists');
    await expect(dt).toBeVisible();

    // Click the view_list icon to open dialog
    const icon = page.locator('.every-year-artist mat-icon');
    await expect(icon).toBeVisible();
    await icon.click();

    // Dialog should open with title
    await expect(page.getByRole('heading', { name: 'Every year artist' })).toBeVisible();
    await expect(page.getByText('Found')).toBeVisible();

    // Close the dialog
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('mat-dialog-container')).not.toBeVisible();
  });

  test('info buttons open snackbar explanations', async () => {
    // Click the info button next to Eddington number
    const infoButtons = page.locator('button.explain');
    const firstInfo = infoButtons.first();
    await expect(firstInfo).toBeVisible();
    await firstInfo.click();

    // Snackbar should appear with explanation
    await expect(page.locator('mat-snack-bar-container')).toBeVisible();
    await expect(page.getByText('This means you have')).toBeVisible();

    // Dismiss
    await page.getByRole('button', { name: 'Got it!' }).click();
    await expect(page.locator('mat-snack-bar-container')).not.toBeVisible();
  });

  test('three stats cards are visible', async () => {
    const cards = page.locator('app-general mat-card');
    await expect(cards).toHaveCount(3);
  });
});
