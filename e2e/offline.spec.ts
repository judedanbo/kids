import { test, expect } from './fixtures';

test.describe('Offline Support', () => {
  // These tests use the production build which registers a service worker.
  // The SW needs a page load to activate, then we can go offline.

  test('app loads content initially', async ({ page, createProfile }) => {
    await createProfile({ name: 'OnlineKid', age: '7' });

    // Hub content should be visible when online
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).toBeVisible();
  });

  test('app works after going offline via service worker cache', async ({
    page,
    context,
    createProfile,
  }) => {
    await createProfile({ name: 'OfflineKid', age: '4' });
    await expect(page.locator('h1')).toContainText('Welcome');

    // Wait for the SW to install and activate
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload the page — the SW should serve from cache
    await page.reload({ waitUntil: 'domcontentloaded' });

    // The hub content should still be visible from the SW cache
    await expect(page.locator('h1')).toContainText('Welcome', {
      timeout: 10_000,
    });
  });

  test('offline banner may appear when offline', async ({
    page,
    context,
    createProfile,
  }) => {
    await createProfile({ name: 'BannerKid', age: '7' });

    // Wait for SW
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload
    await page.reload({ waitUntil: 'domcontentloaded' });

    // The page should still work (loaded from SW cache)
    await expect(page.locator('h1')).toContainText('Welcome', {
      timeout: 10_000,
    });

    // Come back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Page should still work after coming back online
    await expect(page.locator('h1')).toContainText('Welcome');
  });
});
