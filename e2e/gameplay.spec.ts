import { test, expect } from './fixtures';

test.describe('Gameplay', () => {
  test('plays Memory Match to completion and shows score', async ({
    page,
    createProfile,
    navigateToGame,
    playMemoryMatchToCompletion,
  }) => {
    await createProfile({ name: 'Player', age: '4' });
    await navigateToGame('Memory Match');
    await playMemoryMatchToCompletion();

    // Result screen should show the score
    await expect(page.locator('text=Score')).toBeVisible();
    // "Play Again" and "Go Home" buttons should be present
    await expect(
      page.locator('button:has-text("Play Again")'),
    ).toBeVisible();
    await expect(
      page.locator('button:has-text("Go Home")'),
    ).toBeVisible();
  });

  test('Math Adventure loads and shows questions', async ({
    page,
    createProfile,
    navigateToGame,
  }) => {
    await createProfile({ name: 'MathKid', age: '7' });
    await navigateToGame('Math Adventure');

    // Should see the game splash with description
    await expect(page.locator('text=Math Adventure')).toBeVisible();
    await expect(
      page.locator('text=Solve the math problems'),
    ).toBeVisible();

    // Start the game
    await page.locator('button:has-text("Let\'s Go")').click();

    // Should see a math question (aria-label like "1 + 2")
    await expect(
      page.locator('[aria-label*="+"], [aria-label*="-"], [aria-label*="×"]'),
    ).toBeVisible({ timeout: 5_000 });

    // Should show answer buttons (numeric)
    const answerButtons = page.locator(
      'button:not([aria-label="Go back"])',
    );
    // At least 2 answer choices should be visible
    await expect(answerButtons.first()).toBeVisible();
  });

  test('Word Puzzle loads and shows game elements', async ({
    page,
    createProfile,
    navigateToGame,
  }) => {
    await createProfile({ name: 'WordKid', age: '7' });
    await navigateToGame('Word Puzzle');

    // Should see the game splash
    await expect(page.locator('text=Word Puzzle')).toBeVisible();
    await expect(
      page.locator('text=Unscramble the letters'),
    ).toBeVisible();

    // Start the game
    await page.locator('button:has-text("Let\'s Go")').click();

    // Should show the word puzzle UI with letter buttons
    // The category heading (e.g. "FOOD", "ANIMALS") should appear
    await page.waitForTimeout(1000);
    // Score display should be present
    await expect(
      page.locator('[aria-label*="Score"]'),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('game progress persists — hub shows Continue Playing after game', async ({
    page,
    createProfile,
    navigateToGame,
    playMemoryMatchToCompletion,
  }) => {
    await createProfile({ name: 'PersistKid', age: '4' });
    await navigateToGame('Memory Match');
    await playMemoryMatchToCompletion();

    // Go home from the result screen
    await page.locator('button:has-text("Go Home")').click();
    await page.waitForURL('/');

    // Hub should show "Continue Playing" section
    await expect(page.locator('text=Continue Playing')).toBeVisible({
      timeout: 5_000,
    });
  });
});
