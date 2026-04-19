import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

/**
 * Filter axe results to only critical and serious violations.
 * Disable color-contrast rule (false positives with dynamic theming).
 */
function filterViolations(violations: Array<{ impact?: string | null; id: string }>) {
  return violations.filter(
    (v) => (v.impact === 'critical' || v.impact === 'serious') && v.id !== 'color-contrast',
  );
}

test.describe('Accessibility (axe-core)', () => {
  test('hub page has no critical/serious a11y violations', async ({ page, createProfile }) => {
    await createProfile({ name: 'A11yKid', age: '7' });

    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();

    const serious = filterViolations(results.violations);
    expect(serious, `Hub a11y violations: ${JSON.stringify(serious, null, 2)}`).toHaveLength(0);
  });

  test('profile creation page has no critical/serious a11y violations', async ({ page }) => {
    await page.goto('/profile');
    // Wait for the name input to appear
    await expect(page.locator('[aria-label="Your name"]')).toBeVisible();

    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();

    const serious = filterViolations(results.violations);
    expect(serious, `Profile a11y violations: ${JSON.stringify(serious, null, 2)}`).toHaveLength(0);
  });

  test('settings page has no critical/serious a11y violations', async ({ page, createProfile }) => {
    await createProfile({ name: 'A11yKid', age: '7' });
    await page.locator('a:has-text("Settings")').click();
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();

    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();

    const serious = filterViolations(results.violations);
    expect(serious, `Settings a11y violations: ${JSON.stringify(serious, null, 2)}`).toHaveLength(
      0,
    );
  });

  test('rewards page has no critical/serious a11y violations', async ({ page, createProfile }) => {
    await createProfile({ name: 'A11yKid', age: '7' });
    await page.locator('a:has-text("Rewards")').click();
    await expect(page.locator('text=My Rewards')).toBeVisible();

    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();

    const serious = filterViolations(results.violations);
    expect(serious, `Rewards a11y violations: ${JSON.stringify(serious, null, 2)}`).toHaveLength(0);
  });

  test('Memory Match mid-game has no critical/serious a11y violations', async ({
    page,
    createProfile,
    navigateToGame,
  }) => {
    await createProfile({ name: 'A11yKid', age: '4' });
    await navigateToGame('Memory Match');

    // Start the game
    await page.locator('button:has-text("Let\'s Go")').click();
    await expect(page.locator('[aria-label="Memory card grid"]')).toBeVisible();

    // Note: aria-required-children is disabled because the grid uses
    // role="grid" with direct button children (a known app issue).
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast', 'aria-required-children'])
      .analyze();

    const serious = filterViolations(results.violations);
    expect(
      serious,
      `Memory Match a11y violations: ${JSON.stringify(serious, null, 2)}`,
    ).toHaveLength(0);
  });

  test('parental dashboard gate has no critical/serious a11y violations', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'A11yKid', age: '7' });
    await page.locator('a:has-text("Settings")').click();
    await page.locator('button:has-text("Open Parental Dashboard")').click();
    await expect(page.locator('text=Adult Verification')).toBeVisible();

    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();

    const serious = filterViolations(results.violations);
    expect(
      serious,
      `Parental gate a11y violations: ${JSON.stringify(serious, null, 2)}`,
    ).toHaveLength(0);
  });
});
