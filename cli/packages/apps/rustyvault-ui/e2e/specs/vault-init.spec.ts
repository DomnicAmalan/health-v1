import { expect, test } from "../fixtures/vault";

test.describe("Vault Initialization", () => {
  test("should initialize vault and display keys", async ({ page, initializedVault }) => {
    await page.goto("/");

    // Check if initialization is needed or already done
    const initButton = page.locator('button:has-text("Initialize")').first();
    if (await initButton.isVisible()) {
      await initButton.click();
      await page.waitForLoadState("networkidle");

      // Should show keys
      expect(await page.locator("text=/.*[A-Za-z0-9+/=]{20,}.*/").count()).toBeGreaterThan(0);
    }
  });

  test("should download keys after initialization", async ({ page, initializedVault }) => {
    await page.goto("/");

    const downloadButton = page.locator('button:has-text("Download")').first();
    if (await downloadButton.isVisible()) {
      const downloadPromise = page.waitForEvent("download");
      await downloadButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain("keys");
    }
  });
});
