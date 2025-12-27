/**
 * Vault Test Fixtures
 * Helpers for vault operations in E2E tests
 */

import type { Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

type VaultFixtures = {
  initializedVault: {
    rootToken: string;
    keys: string[];
  };
  unsealVault: (keys: string[]) => Promise<void>;
  authenticatedPage: Page;
  apiURL: string;
};

export const test = base.extend<VaultFixtures>({
  apiURL: async (_fixtures, use) => {
    const apiURL = process.env.PLAYWRIGHT_API_URL || "http://localhost:8217";
    await use(apiURL);
  },

  initializedVault: async ({ page, apiURL }, use) => {
    // Initialize vault
    const initResponse = await page.request.post(`${apiURL}/v1/sys/init`, {
      data: {
        secret_shares: 5,
        secret_threshold: 3,
      },
    });

    expect(initResponse.ok()).toBeTruthy();
    const initData = await initResponse.json();

    const rootToken = initData.root_token;
    const keys = initData.keys_base64 || [];

    await use({ rootToken, keys });
  },

  unsealVault: async ({ page, apiURL }, use) => {
    const unsealVault = async (keys: string[]) => {
      for (const key of keys) {
        const response = await page.request.post(`${apiURL}/v1/sys/unseal`, {
          data: { key },
        });

        expect(response.ok()).toBeTruthy();
        const result = await response.json();

        if (result.sealed === false) {
          break;
        }
      }
    };

    await use(unsealVault);
  },

  authenticatedPage: async ({ page, initializedVault, unsealVault, apiURL }, use) => {
    // Unseal vault first
    const keysToUse = initializedVault.keys.slice(0, 3);
    await unsealVault(keysToUse);

    // Set token in localStorage
    await page.goto("/");
    await page.evaluate(
      (token) => {
        localStorage.setItem("vault_token", token);
        window.dispatchEvent(new Event("storage"));
      },
      initializedVault.rootToken
    );

    await page.reload();
    await page.waitForLoadState("networkidle");

    await use(page);
  },
});

export { expect };
