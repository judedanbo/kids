import { test as base, expect } from '@playwright/test';

/**
 * Shared E2E test fixtures for Kids Games Zone.
 *
 * Provides helpers that understand the real DOM rendered by the app,
 * including profile creation, hub navigation, and Memory Match gameplay.
 */

// ── helper: solve the adult-gate math problem ────────────────────────
export function solveMathProblem(problem: string): number {
  const parts = problem.trim().split(/\s+/);
  const a = parseInt(parts[0], 10);
  const op = parts[1];
  const b = parseInt(parts[2], 10);
  switch (op) {
    case '\u00d7':
      return a * b; // ×
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '\u00f7':
      return Math.floor(a / b); // ÷
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
}

// ── Fixture type extensions ──────────────────────────────────────────
export type GameFixtures = {
  /** Create a child profile and land on the hub. */
  createProfile: (options?: { name?: string; age?: string; avatar?: string }) => Promise<void>;

  /** From the hub, click on a game card by its aria-label (game name). */
  navigateToGame: (gameId: string) => Promise<void>;

  /** Play a full Memory Match game (tiny-tier, 2 pairs) to the result screen. */
  playMemoryMatchToCompletion: () => Promise<void>;
};

export const test = base.extend<GameFixtures>({
  // ── createProfile ──────────────────────────────────────────────────
  createProfile: async ({ page }, use) => {
    const helper = async (options: { name?: string; age?: string; avatar?: string } = {}) => {
      const { name = 'TestKid', age = '7', avatar = '🦊' } = options;

      await page.goto('/profile');
      // Step 1 — name
      await page.locator('[aria-label="Your name"]').fill(name);
      await page.locator('button:has-text("Next")').click();

      // Step 2 — age  (button whose *exact* text is the digit)
      await page.locator(`button:has-text("${age}")`).click();

      // Step 3 — avatar
      await page.locator(`[aria-label="Select ${avatar} avatar"]`).click();

      // Step 4 — PIN  (skip)
      await page.locator('button:has-text("Skip")').click();

      // Step 5 — confirmation
      await page.locator('button:has-text("Let\'s go")').click();

      // Wait until we reach the hub (URL === '/')
      await page.waitForURL('/', { timeout: 10_000 });
      // Hub is ready once the welcome heading appears
      await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible({ timeout: 5_000 });
    };
    await use(helper);
  },

  // ── navigateToGame ─────────────────────────────────────────────────
  navigateToGame: async ({ page }, use) => {
    const helper = async (gameName: string) => {
      // Game cards are <button> elements with aria-label matching the game name
      await page.locator(`button[aria-label="${gameName}"]`).click();
      // Wait for the game wrapper page to load (URL like /game/<id>)
      await page.waitForURL(/\/game\//, { timeout: 10_000 });
    };
    await use(helper);
  },

  // ── playMemoryMatchToCompletion ────────────────────────────────────
  playMemoryMatchToCompletion: async ({ page }, use) => {
    const helper = async () => {
      // We should be on the Memory Match splash screen; click "Let's Go!"
      await page.locator('button:has-text("Let\'s Go")').click();

      // Wait for the card grid to appear
      const grid = page.locator('[aria-label="Memory card grid"]');
      await expect(grid).toBeVisible({ timeout: 5_000 });

      // Read every card's aria-label (e.g. "cat, face up")
      const cards = grid.locator('button');
      const count = await cards.count();
      const labels: string[] = [];
      for (let i = 0; i < count; i++) {
        labels.push((await cards.nth(i).getAttribute('aria-label')) || '');
      }

      // Group card indices by their base name (part before the comma)
      const pairs = new Map<string, number[]>();
      for (let i = 0; i < labels.length; i++) {
        const baseName = labels[i].split(',')[0].trim();
        const group = pairs.get(baseName) ?? [];
        group.push(i);
        pairs.set(baseName, group);
      }

      // Click each pair to match them
      for (const [_name, indices] of pairs) {
        await cards.nth(indices[0]).click();
        await page.waitForTimeout(300);
        await cards.nth(indices[1]).click();
        // Wait for the match animation / state update
        await page.waitForTimeout(1000);
      }

      // A reward overlay may appear and auto-dismiss after ~5s.
      // Wait for the result screen which has "Play Again" and "Go Home" buttons.
      await expect(page.locator('button:has-text("Play Again")')).toBeVisible({ timeout: 15_000 });
    };
    await use(helper);
  },
});

export { expect };
