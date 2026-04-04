import { test, expect } from './fixtures';

test.describe('Hub Browsing and Filtering', () => {
  test('shows age-appropriate games for tiny tier (age 4)', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'TinyKid', age: '4' });

    // Memory Match should be visible (ages 3-5)
    await expect(
      page.locator('button[aria-label="Memory Match"]'),
    ).toBeVisible();

    // Math Adventure and Word Puzzle should NOT be visible (ages 6-8)
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).not.toBeVisible();
    await expect(
      page.locator('button[aria-label="Word Puzzle"]'),
    ).not.toBeVisible();
  });

  test('shows age-appropriate games for junior tier (age 7)', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'JuniorKid', age: '7' });

    // Math Adventure and Word Puzzle should be visible (ages 6-8)
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[aria-label="Word Puzzle"]'),
    ).toBeVisible();

    // Memory Match should NOT be visible (ages 3-5)
    await expect(
      page.locator('button[aria-label="Memory Match"]'),
    ).not.toBeVisible();
  });

  test('search bar filters games', async ({ page, createProfile }) => {
    await createProfile({ name: 'JuniorKid', age: '7' });

    const searchInput = page.locator('[aria-label="Search games..."]');
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill('Math');
    // Math Adventure should still be visible
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).toBeVisible();
    // Word Puzzle should be filtered out
    await expect(
      page.locator('button[aria-label="Word Puzzle"]'),
    ).not.toBeVisible();

    // Clear and search for something else
    await searchInput.fill('Word');
    await expect(
      page.locator('button[aria-label="Word Puzzle"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).not.toBeVisible();
  });

  test('skill category filter works', async ({ page, createProfile }) => {
    await createProfile({ name: 'JuniorKid', age: '7' });

    // Click the "numeracy" filter pill
    await page.locator('button:has-text("numeracy")').click();

    // Only Math Adventure should be visible
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[aria-label="Word Puzzle"]'),
    ).not.toBeVisible();

    // Click the "literacy" filter pill
    await page.locator('button:has-text("literacy")').click();

    // Only Word Puzzle should be visible
    await expect(
      page.locator('button[aria-label="Word Puzzle"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).not.toBeVisible();

    // Click "All" to reset
    await page.locator('button:has-text("All")').click();
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).toBeVisible();
    await expect(
      page.locator('button[aria-label="Word Puzzle"]'),
    ).toBeVisible();
  });

  test('daily challenge section is visible', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'TestKid', age: '7' });

    await expect(
      page.locator('[aria-label="Daily Challenge"]'),
    ).toBeVisible();
    await expect(page.locator('text=Play 3 games today')).toBeVisible();
  });

  test('disabled feature flag game does not appear', async ({
    page,
    createProfile,
  }) => {
    // dummy-game has enabled: false in featureFlags.json
    // It should never appear in the hub regardless of age
    await createProfile({ name: 'TestKid', age: '7' });
    await expect(
      page.locator('button[aria-label="Dummy Game"]'),
    ).not.toBeVisible();

    // Also check with tiny tier
    await page.locator('a:has-text("Settings")').click();
    await page.locator('button:has-text("Switch Profile")').click();
    await page.locator('text=New Player').click();
    await page.locator('[aria-label="Your name"]').fill('Tiny');
    await page.locator('button:has-text("Next")').click();
    await page.locator('button:has-text("4")').click();
    await page.locator('[aria-label="Select 🐶 avatar"]').click();
    await page.locator('button:has-text("Skip")').click();
    await page.locator('button:has-text("Let\'s go")').click();
    await page.waitForURL('/');

    await expect(
      page.locator('button[aria-label="Dummy Game"]'),
    ).not.toBeVisible();
  });

  test('hub renders correctly on mobile viewport', async ({
    page,
    createProfile,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await createProfile({ name: 'MobileKid', age: '7' });
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(
      page.locator('button[aria-label="Math Adventure"]'),
    ).toBeVisible();
  });

  test('hub renders correctly on tablet viewport', async ({
    page,
    createProfile,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await createProfile({ name: 'TabletKid', age: '4' });
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(
      page.locator('button[aria-label="Memory Match"]'),
    ).toBeVisible();
  });
});
