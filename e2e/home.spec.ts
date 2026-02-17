import { test, expect } from '@playwright/test';

test.describe('Home component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays app title and subtitle', async ({ page }) => {
    await expect(page.getByText('lastfmstats.com')).toBeVisible();
    await expect(page.getByText('Enhanced statistics for last.fm')).toBeVisible();
  });

  test('displays username input with placeholder', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'username');
  });

  test('displays import section', async ({ page }) => {
    await expect(page.getByText('or import from')).toBeVisible();
    await expect(page.getByRole('button', { name: /File/ })).toBeVisible();
  });

  test('shows invalid state when submitting empty username', async ({ page }) => {
    await page.getByRole('button', { name: /Let's go/ }).click();
    const input = page.locator('input[type="text"]');
    await expect(input).toHaveClass(/invalid/);
  });

  test('navigates to user page on enter', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.fill('testuser');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/user\/testuser/);
  });

  test('navigates to user page on button click', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.fill('testuser');
    await page.getByRole('button', { name: /Let's go/ }).click();
    await expect(page).toHaveURL(/\/user\/testuser/);
  });
});

test.describe('Navigation to main application', () => {
  test('navigates from home to stats and loads general tab by default', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('input[type="text"]');
    await input.fill('testuser');
    await input.press('Enter');

    // Should redirect to general tab
    await expect(page).toHaveURL(/\/user\/testuser\/general/);
    // Stats header should show username
    await expect(page.getByText('Statistics for testuser')).toBeVisible();
  });

  test('displays all navigation tabs', async ({ page }) => {
    await page.goto('/user/testuser/general');
    await expect(page.getByText('Statistics for testuser')).toBeVisible();

    const tabs = ['General', 'Artists', 'Albums', 'Tracks', 'Scrobbles', 'Charts', 'Dataset'];
    for (const tab of tabs) {
      await expect(page.locator('a[mat-tab-link]', { hasText: tab })).toBeVisible();
    }
  });

  test('general tab is active by default', async ({ page }) => {
    await page.goto('/user/testuser/general');
    await expect(page.getByText('Statistics for testuser')).toBeVisible();

    const generalTab = page.locator('a[mat-tab-link]', { hasText: 'General' });
    await expect(generalTab).toHaveClass(/mdc-tab--active/);
  });

  test('can switch between tabs', async ({ page }) => {
    await page.goto('/user/testuser/general');
    await expect(page.getByText('Statistics for testuser')).toBeVisible();

    // Click Artists tab
    await page.locator('a[mat-tab-link]', { hasText: 'Artists' }).click();
    await expect(page).toHaveURL(/\/user\/testuser\/artists/);

    // Click Albums tab
    await page.locator('a[mat-tab-link]', { hasText: 'Albums' }).click();
    await expect(page).toHaveURL(/\/user\/testuser\/albums/);

    // Click Tracks tab
    await page.locator('a[mat-tab-link]', { hasText: 'Tracks' }).click();
    await expect(page).toHaveURL(/\/user\/testuser\/tracks/);

    // Click Charts tab
    await page.locator('a[mat-tab-link]', { hasText: 'Charts' }).click();
    await expect(page).toHaveURL(/\/user\/testuser\/charts/);

    // Click Dataset tab
    await page.locator('a[mat-tab-link]', { hasText: 'Dataset' }).click();
    await expect(page).toHaveURL(/\/user\/testuser\/dataset/);
  });

  test('displays progress section', async ({ page }) => {
    await page.goto('/user/testuser/general');
    await expect(page.getByText('Statistics for testuser')).toBeVisible();
    await expect(page.locator('app-progress')).toBeVisible();
  });

  test('displays filter data button', async ({ page }) => {
    await page.goto('/user/testuser/general');
    await expect(page.getByText('Statistics for testuser')).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter data/ })).toBeVisible();
  });

  test('displays auto update toggle', async ({ page }) => {
    await page.goto('/user/testuser/general');
    await expect(page.getByText('Statistics for testuser')).toBeVisible();
    await expect(page.getByText('Auto update:')).toBeVisible();
  });

  test('shows user not found and can return home', async ({ page }) => {
    // Intercept the last.fm API to simulate a 404 for unknown users
    await page.route('**/ws.audioscrobbler.com/**', route => {
      route.fulfill({ status: 404, body: '{"error":6,"message":"User not found"}' });
    });

    await page.goto('/');
    const input = page.locator('input[type="text"]');
    await input.fill('nonexistentuser12345xyz');
    await input.press('Enter');

    // Should show the "not found" message
    await expect(page.getByText(/not found/)).toBeVisible();

    // Should show a "Return to homepage" button
    const returnButton = page.getByRole('button', { name: /Return to homepage/ });
    await expect(returnButton).toBeVisible();

    // Clicking it should go back to the home page
    await returnButton.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('lastfmstats.com')).toBeVisible();
  });

  test('can return to home from stats page', async ({ page }) => {
    await page.goto('/user/testuser/general');
    await expect(page.getByText('Statistics for testuser')).toBeVisible();

    // Home button has matTooltip="Home" and routerLink="/"
    const homeButton = page.locator('button[mattooltip="Home"]');
    await homeButton.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('lastfmstats.com')).toBeVisible();
  });
});
