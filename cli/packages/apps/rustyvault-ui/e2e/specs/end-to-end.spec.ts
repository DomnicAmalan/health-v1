import { createVaultClient } from "../fixtures/api";
import { expect, test } from "../fixtures/vault";

test.describe("End-to-End Vault Workflow", () => {
  test("should complete full vault workflow", async ({
    page,
    initializedVault,
    unsealVault,
    apiURL,
  }) => {
    // 1. Initialize and unseal
    await page.goto("/");
    const keysToUse = initializedVault.keys.slice(0, 3);
    await unsealVault(keysToUse);

    // 2. Authenticate
    await page.evaluate((token) => {
      localStorage.setItem("vault_token", token);
      window.dispatchEvent(new Event("storage"));
    }, initializedVault.rootToken);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // 3. Create a realm
    await page.goto("/realms");
    const createRealmButton = page.locator('button:has-text("Create")').first();
    if (await createRealmButton.isVisible()) {
      await createRealmButton.click();

      const nameInput = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();
      await nameInput.fill("e2e-test-realm");

      const orgInput = page.locator('input[name*="organization" i]').first();
      if (await orgInput.isVisible()) {
        await orgInput.fill("123e4567-e89b-12d3-a456-426614174000");
      }

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Create")').first();
      await saveButton.click();
      await page.waitForLoadState("networkidle");
    }

    // 4. Create a secret
    await page.goto("/secrets");
    const createSecretButton = page.locator('button:has-text("Create")').first();
    if (await createSecretButton.isVisible()) {
      await createSecretButton.click();

      const pathInput = page.locator('input[placeholder*="path" i]').first();
      await pathInput.fill("e2e/test-secret");

      const keyInput = page.locator('input[placeholder*="Key" i]').first();
      const valueInput = page.locator('input[placeholder*="Value" i]').first();
      await keyInput.fill("api_key");
      await valueInput.fill("secret-api-key-123");

      const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
      await addButton.click();

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Create")').first();
      await saveButton.click();
      await page.waitForLoadState("networkidle");

      // Verify secret was created
      await expect(page.locator("text=test-secret")).toBeVisible();
    }

    // 5. Verify via API
    const client = createVaultClient(page.request, apiURL, initializedVault.rootToken);
    const secret = await client.readSecret("e2e/test-secret", initializedVault.rootToken);
    expect(secret.data).toHaveProperty("api_key");
  });
});
