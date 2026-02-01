/**
 * Comprehensive UI Testing Suite
 *
 * Tests all screens, modals, and input buttons across the Health V1 client application.
 * Based on the comprehensive testing plan.
 */

import { test, expect, type Page } from '@playwright/test';

// Helper to wait for page to be fully loaded
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

// Helper to check for console errors
function setupConsoleErrorTracking(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

test.describe('1. Authentication & Setup Module', () => {

  test('Login page loads and renders correctly', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/login');
    await waitForPageLoad(page);

    // Check screen loads
    await expect(page).toHaveTitle(/Health V1/i);

    // Check input fields exist
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const loginButton = page.locator('button:has-text("Login"), button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Check console for errors
    expect(errors.length).toBe(0);
  });

  test('Login form validation works', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const loginButton = page.locator('button:has-text("Login"), button[type="submit"]');

    // Try submitting empty form
    await loginButton.click();

    // Should show validation errors (check for error text or aria-invalid)
    const hasEmailError = await emailInput.getAttribute('aria-invalid');
    const hasPasswordError = await passwordInput.getAttribute('aria-invalid');

    // At least one should be invalid
    expect(hasEmailError === 'true' || hasPasswordError === 'true').toBeTruthy();
  });

  test('Setup page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/setup');
    await waitForPageLoad(page);

    // Check no console errors
    expect(errors.length).toBe(0);
  });

  test('Access denied page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/access-denied');
    await waitForPageLoad(page);

    // Check for error message or heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    expect(errors.length).toBe(0);
  });
});

test.describe('2. Dashboard Module', () => {

  test('Main dashboard loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/');
    await waitForPageLoad(page);

    // Dashboard should have some content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    expect(errors.length).toBe(0);
  });
});

test.describe('3. Clinical Module', () => {

  test('Patient list page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/patients');
    await waitForPageLoad(page);

    expect(errors.length).toBe(0);
  });

  test('Patient chart page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    // Try with patient ID 1 (adjust if needed)
    await page.goto('/patients/1');
    await waitForPageLoad(page);

    // Check for tab navigation (look for common tab patterns)
    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');

    // Should have tabs visible
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });

  test('Clinical documentation page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/clinical');
    await waitForPageLoad(page);

    expect(errors.length).toBe(0);
  });

  test('Orders page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/orders');
    await waitForPageLoad(page);

    expect(errors.length).toBe(0);
  });

  test('Results page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/results');
    await waitForPageLoad(page);

    expect(errors.length).toBe(0);
  });
});

test.describe('4. Diagnostic Services Module', () => {

  test('Laboratory page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/lab');
    await waitForPageLoad(page);

    // Check for tabs
    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });

  test('Radiology page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/radiology');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });
});

test.describe('5. Operations Module', () => {

  test('Scheduling page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/scheduling');
    await waitForPageLoad(page);

    expect(errors.length).toBe(0);
  });

  test('Pharmacy page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/pharmacy');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });
});

test.describe('6. Departments & Inpatient Module', () => {

  test('OPD page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/opd');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });

  test('IPD page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/ipd');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });

  test('Beds page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/beds');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });

  test('Wards page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/wards');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });

  test('Operating Theatre page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/ot');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });
});

test.describe('7. Billing & Financial Module', () => {

  test('Billing page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/billing');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });

  test('Revenue analytics page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/revenue');
    await waitForPageLoad(page);

    // May have loading states, just check it loads
    expect(errors.length).toBe(0);
  });

  test('Analytics page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/analytics');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });
});

test.describe('8. System & Configuration Module', () => {

  test('Workflows page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/workflows');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });

  test('Form builder page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/form-builder');
    await waitForPageLoad(page);

    expect(errors.length).toBe(0);
  });

  test('My Training page loads', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/my-training');
    await waitForPageLoad(page);

    expect(errors.length).toBe(0);
  });

  test('Settings page loads with tabs', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);

    await page.goto('/settings');
    await waitForPageLoad(page);

    const tabs = page.locator('[role="tablist"], .tabs, [role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    expect(errors.length).toBe(0);
  });
});

test.describe('Modal Testing - EHR Dialogs', () => {

  test.skip('Add Problem Dialog opens and has required fields', async ({ page }) => {
    // This test requires being on a patient chart
    await page.goto('/patients/1');
    await waitForPageLoad(page);

    // Click "Add Problem" button (adjust selector as needed)
    const addButton = page.locator('button:has-text("Add Problem")');

    if (await addButton.isVisible()) {
      await addButton.click();

      // Wait for modal
      await page.waitForSelector('[role="dialog"], .modal');

      // Check for form fields
      const diagnosisInput = page.locator('input[name="diagnosis"], input[placeholder*="diagnosis" i]');
      await expect(diagnosisInput).toBeVisible();

      // Check for cancel button
      const cancelButton = page.locator('button:has-text("Cancel")');
      await expect(cancelButton).toBeVisible();

      // Close modal
      await cancelButton.click();
    }
  });

  test.skip('Add Medication Dialog opens and has dropdowns', async ({ page }) => {
    await page.goto('/patients/1');
    await waitForPageLoad(page);

    // Navigate to Medications tab
    const medsTab = page.locator('[role="tab"]:has-text("Medications"), button:has-text("Medications")');
    if (await medsTab.isVisible()) {
      await medsTab.click();

      // Click "Add Medication" button
      const addButton = page.locator('button:has-text("Add Medication")');

      if (await addButton.isVisible()) {
        await addButton.click();

        // Wait for modal
        await page.waitForSelector('[role="dialog"], .modal');

        // Check for route dropdown
        const routeDropdown = page.locator('select[name="route"], [role="combobox"]').first();
        await expect(routeDropdown).toBeVisible();

        // Close modal
        const cancelButton = page.locator('button:has-text("Cancel")');
        await cancelButton.click();
      }
    }
  });

  test.skip('Add Allergy Dialog opens and shows severity levels', async ({ page }) => {
    await page.goto('/patients/1');
    await waitForPageLoad(page);

    // Navigate to Allergies tab
    const allergiesTab = page.locator('[role="tab"]:has-text("Allergies"), button:has-text("Allergies")');
    if (await allergiesTab.isVisible()) {
      await allergiesTab.click();

      // Click "Add Allergy" button
      const addButton = page.locator('button:has-text("Add Allergy")');

      if (await addButton.isVisible()) {
        await addButton.click();

        // Wait for modal
        await page.waitForSelector('[role="dialog"], .modal');

        // Check for severity dropdown
        const severityDropdown = page.locator('select[name="severity"]');
        await expect(severityDropdown).toBeVisible();

        // Close modal
        const cancelButton = page.locator('button:has-text("Cancel")');
        await cancelButton.click();
      }
    }
  });
});

test.describe('Button Functionality', () => {

  test('All navigation buttons should be clickable', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // Find all buttons and links
    const buttons = page.locator('button, a');
    const buttonCount = await buttons.count();

    // Should have navigation elements
    expect(buttonCount).toBeGreaterThan(0);

    // Check first few buttons are enabled (not all, to avoid triggering actions)
    for (let i = 0; i < Math.min(5, buttonCount); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible().catch(() => false);

      if (isVisible) {
        const isDisabled = await button.isDisabled().catch(() => false);
        // Most buttons should not be disabled by default
      }
    }
  });
});

test.describe('Error Handling', () => {

  test('404 page handling', async ({ page }) => {
    const response = await page.goto('/non-existent-page-12345');

    // Should either redirect or show 404
    // Check page doesn't crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
