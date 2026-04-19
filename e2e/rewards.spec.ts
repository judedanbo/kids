import { test, expect } from './fixtures';

test.describe('Rewards Gallery', () => {
  test('shows locked rewards initially', async ({ page, createProfile }) => {
    await createProfile({ name: 'NewKid', age: '7' });

    // Navigate to Rewards page
    await page.locator('a:has-text("Rewards")').click();
    await page.waitForURL('/rewards');

    // Heading should be visible
    await expect(page.locator('text=My Rewards')).toBeVisible();

    // Should show "0 / 7 unlocked"
    await expect(page.locator('text=0 / 7 unlocked')).toBeVisible();

    // "First Star" reward card should exist in a locked state. Check the
    // card's aria-label rather than the 🔒 emoji — the emoji only renders
    // when the lock image fails to load.
    await expect(page.getByLabel(/First Star — Locked/)).toBeVisible();
  });

  test('earns "First Star" reward after completing a game', async ({
    page,
    createProfile,
    navigateToGame,
    playMemoryMatchToCompletion,
  }) => {
    await createProfile({ name: 'Winner', age: '4' });
    await navigateToGame('Memory Match');
    await playMemoryMatchToCompletion();

    // Go home from result screen
    await page.locator('button:has-text("Go Home")').click();
    await page.waitForURL('/');

    // Navigate to Rewards page
    await page.locator('a:has-text("Rewards")').click();
    await page.waitForURL('/rewards');

    // Should show at least 1 reward unlocked (may also earn "Speed Demon")
    await expect(page.locator('text=/[1-7] \\/ 7 unlocked/')).toBeVisible();

    // "First Star" should show "Earned" date instead of locked indicator
    await expect(page.locator('text=First Star')).toBeVisible();
    await expect(page.locator('text=Earned').first()).toBeVisible();
  });

  test('rewards page renders on mobile viewport', async ({ page, createProfile }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await createProfile({ name: 'MobileKid', age: '5' });

    await page.locator('a:has-text("Rewards")').click();
    await page.waitForURL('/rewards');

    await expect(page.locator('text=My Rewards')).toBeVisible();
    await expect(page.locator('text=First Star')).toBeVisible();
  });
});
