import { test, expect } from './fixtures';

test.describe('Profile Management', () => {
  test('creates a profile and shows welcome message on hub', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'Rosie', age: '5' });
    await expect(page.locator('h1')).toContainText('Welcome back, Rosie');
  });

  test('profile persists after reload', async ({ page, createProfile }) => {
    await createProfile({ name: 'Kai', age: '8' });
    await expect(page.locator('h1')).toContainText('Welcome back, Kai');

    await page.reload();
    await expect(page.locator('h1')).toContainText('Welcome back, Kai');
  });

  test('can switch profiles via settings', async ({
    page,
    createProfile,
  }) => {
    // Create first profile
    await createProfile({ name: 'Alpha', age: '6' });
    await expect(page.locator('h1')).toContainText('Welcome back, Alpha');

    // Go to Settings and switch profile
    await page.locator('a:has-text("Settings")').click();
    await page.locator('button:has-text("Switch Profile")').click();

    // Should show "Who's playing?" with existing profile and New Player
    await expect(
      page.locator('text=Who\'s playing?'),
    ).toBeVisible({ timeout: 5_000 });

    // Click "New Player" to create a second profile
    await page.locator('text=New Player').click();

    // Complete the new profile creation flow
    await page.locator('[aria-label="Your name"]').fill('Beta');
    await page.locator('button:has-text("Next")').click();
    await page.locator('button:has-text("9")').click();
    await page.locator('[aria-label="Select 🐱 avatar"]').click();
    await page.locator('button:has-text("Skip")').click();
    await page.locator('button:has-text("Let\'s go")').click();

    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText('Welcome back, Beta');
  });

  test('profile creation works on mobile viewport', async ({
    page,
    createProfile,
  }) => {
    // Use mobile-like viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await createProfile({ name: 'MobileKid', age: '4' });
    await expect(page.locator('h1')).toContainText(
      'Welcome back, MobileKid',
    );
  });
});
