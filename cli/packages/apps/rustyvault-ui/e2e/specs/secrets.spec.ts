import { test, expect } from "../fixtures/vault";

test.describe("Secrets Management", () => {
  test("should create a secret", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/secrets");

    // Click create secret button
    const createButton = authenticatedPage.locator('button:has-text("Create")').first();
    await createButton.click();

    // Fill in secret path
    const pathInput = authenticatedPage.locator('input[placeholder*="path" i], input[name*="path" i]').first();
    await pathInput.fill("test/my-secret");

    // Add key-value pair
    const keyInput = authenticatedPage.locator('input[placeholder*="Key" i]').first();
    const valueInput = authenticatedPage.locator('input[placeholder*="Value" i]').first();
    await keyInput.fill("username");
    await valueInput.fill("testuser");

    // Submit
    const addButton = authenticatedPage.locator('button:has-text("Add"), button:has-text("+")').first();
    await addButton.click();

    const saveButton = authenticatedPage.locator('button:has-text("Save"), button:has-text("Create")').first();
    await saveButton.click();

    await authenticatedPage.waitForLoadState("networkidle");

    // Verify secret appears in list
    await expect(authenticatedPage.locator('text=my-secret')).toBeVisible();
  });

  test("should read a secret", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/secrets");

    // Click on a secret in the list
    const secretItem = authenticatedPage.locator('text=/.*secret.*/').first();
    if (await secretItem.isVisible()) {
      await secretItem.click();
      await authenticatedPage.waitForLoadState("networkidle");

      // Should show secret data
      await expect(authenticatedPage.locator('input[value]')).toBeVisible();
    }
  });

  test("should update a secret", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/secrets");

    // Select a secret
    const secretItem = authenticatedPage.locator('text=/.*secret.*/').first();
    if (await secretItem.isVisible()) {
      await secretItem.click();
      await authenticatedPage.waitForLoadState("networkidle");

      // Update a value
      const valueInput = authenticatedPage.locator('input[type="password"], input[value]').first();
      if (await valueInput.isVisible()) {
        await valueInput.fill("updated-value");

        // Save
        const saveButton = authenticatedPage.locator('button:has-text("Save")').first();
        await saveButton.click();
        await authenticatedPage.waitForLoadState("networkidle");

        // Verify update
        await expect(authenticatedPage.locator('text=updated-value')).toBeVisible();
      }
    }
  });

  test("should delete a secret", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/secrets");

    // Select a secret
    const secretItem = authenticatedPage.locator('text=/.*secret.*/').first();
    if (await secretItem.isVisible()) {
      await secretItem.click();
      await authenticatedPage.waitForLoadState("networkidle");

      // Click delete
      const deleteButton = authenticatedPage.locator('button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion if dialog appears
        const confirmButton = authenticatedPage.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await authenticatedPage.waitForLoadState("networkidle");

        // Secret should be removed from list
        await expect(secretItem).not.toBeVisible();
      }
    }
  });

  test("should navigate secret paths", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/secrets");

    // Create nested secret
    const createButton = authenticatedPage.locator('button:has-text("Create")').first();
    await createButton.click();

    const pathInput = authenticatedPage.locator('input[placeholder*="path" i]').first();
    await pathInput.fill("app/database/config");

    // Add data and save
    const keyInput = authenticatedPage.locator('input[placeholder*="Key" i]').first();
    await keyInput.fill("url");
    const valueInput = authenticatedPage.locator('input[placeholder*="Value" i]').first();
    await valueInput.fill("postgres://localhost/db");

    const addButton = authenticatedPage.locator('button:has-text("Add"), button:has-text("+")').first();
    await addButton.click();

    const saveButton = authenticatedPage.locator('button:has-text("Save"), button:has-text("Create")').first();
    await saveButton.click();

    await authenticatedPage.waitForLoadState("networkidle");

    // Should show breadcrumb navigation
    await expect(authenticatedPage.locator('text=app')).toBeVisible();
  });
});
