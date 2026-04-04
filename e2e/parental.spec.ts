import { test, expect, solveMathProblem } from './fixtures';

test.describe('Parental Controls', () => {
  test('parental dashboard requires adult gate verification', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'TestKid', age: '7' });

    // Navigate to Settings
    await page.locator('a:has-text("Settings")').click();

    // Click "Open Parental Dashboard"
    await page.locator('button:has-text("Open Parental Dashboard")').click();

    // Should show the adult verification gate
    await expect(page.locator('text=Adult Verification')).toBeVisible();
    await expect(
      page.locator('text=Please solve this problem to continue'),
    ).toBeVisible();
    await expect(page.locator('[aria-label="Your answer"]')).toBeVisible();
    await expect(page.locator('button:has-text("Verify")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('adult gate grants access with correct answer', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'TestKid', age: '7' });

    await page.locator('a:has-text("Settings")').click();
    await page.locator('button:has-text("Open Parental Dashboard")').click();

    // Get the math problem text ("What is X × Y?")
    const problemText = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/What is (.+)\?/);
      return match ? match[1] : '';
    });
    expect(problemText).toBeTruthy();

    const answer = solveMathProblem(problemText);

    await page.locator('[aria-label="Your answer"]').fill(String(answer));
    await page.locator('button:has-text("Verify")').click();

    // Should show the Parental Dashboard
    await expect(page.locator('text=Parental Dashboard')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator('text=Activity Summary')).toBeVisible();
    await expect(page.locator('text=Back to Settings')).toBeVisible();
  });

  test('settings page has parental controls section', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'TestKid', age: '7' });

    await page.locator('a:has-text("Settings")').click();

    // Should show the parental controls section
    await expect(page.locator('text=Parental Controls')).toBeVisible();
    await expect(
      page.locator('button:has-text("Open Parental Dashboard")'),
    ).toBeVisible();
  });

  test('adult gate blocks with wrong answer', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'TestKid', age: '7' });

    await page.locator('a:has-text("Settings")').click();
    await page.locator('button:has-text("Open Parental Dashboard")').click();

    // Enter a wrong answer
    await page.locator('[aria-label="Your answer"]').fill('99999');
    await page.locator('button:has-text("Verify")').click();

    // Should still show the verification gate (not the dashboard)
    // The gate should remain visible — dashboard text should NOT appear
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Adult Verification')).toBeVisible();
    await expect(page.locator('text=Activity Summary')).not.toBeVisible();
  });

  test('cancel button returns to settings', async ({
    page,
    createProfile,
  }) => {
    await createProfile({ name: 'TestKid', age: '7' });

    await page.locator('a:has-text("Settings")').click();
    await page.locator('button:has-text("Open Parental Dashboard")').click();

    // Click Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Should return to settings page
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
    await expect(
      page.locator('button:has-text("Open Parental Dashboard")'),
    ).toBeVisible();
  });
});
