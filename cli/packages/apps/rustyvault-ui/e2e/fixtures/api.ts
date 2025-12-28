/**
 * API Test Fixtures
 * Helpers for API operations in E2E tests
 */

import type { APIRequestContext } from "@playwright/test";

export class VaultAPIClient {
  constructor(
    private request: APIRequestContext,
    private baseURL: string,
    private token?: string,
  ) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["X-Vault-Token"] = this.token;
    }
    return headers;
  }

  async init(secretShares: number = 5, secretThreshold: number = 3) {
    const response = await this.request.post(`${this.baseURL}/v1/sys/init`, {
      data: {
        secret_shares: secretShares,
        secret_threshold: secretThreshold,
      },
    });

    if (!response.ok()) {
      throw new Error(`Vault initialization failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async unseal(key: string) {
    const response = await this.request.post(`${this.baseURL}/v1/sys/unseal`, {
      data: { key },
    });

    if (!response.ok()) {
      throw new Error(`Unseal failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async seal(token: string) {
    const response = await this.request.post(`${this.baseURL}/v1/sys/seal`, {
      headers: { "X-Vault-Token": token },
    });

    if (!response.ok()) {
      throw new Error(`Seal failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async getHealth() {
    const response = await this.request.get(`${this.baseURL}/v1/sys/health`);
    return await response.json();
  }

  async createSecret(path: string, data: Record<string, unknown>, _token: string) {
    const response = await this.request.post(`${this.baseURL}/v1/secret/${path}`, {
      headers: this.headers(),
      data,
    });

    if (!response.ok()) {
      throw new Error(`Create secret failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async readSecret(path: string, _token: string) {
    const response = await this.request.get(`${this.baseURL}/v1/secret/${path}`, {
      headers: this.headers(),
    });

    if (!response.ok()) {
      throw new Error(`Read secret failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async deleteSecret(path: string, _token: string) {
    const response = await this.request.delete(`${this.baseURL}/v1/secret/${path}`, {
      headers: this.headers(),
    });

    if (!response.ok()) {
      throw new Error(`Delete secret failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async createRealm(name: string, organizationId: string, _token: string) {
    const response = await this.request.post(`${this.baseURL}/v1/sys/realm`, {
      headers: this.headers(),
      data: {
        name,
        organization_id: organizationId,
      },
    });

    if (!response.ok()) {
      throw new Error(`Create realm failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async listRealms(_token: string) {
    const response = await this.request.get(`${this.baseURL}/v1/sys/realm`, {
      headers: this.headers(),
    });

    if (!response.ok()) {
      throw new Error(`List realms failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async createUser(
    username: string,
    password: string,
    policies: string[],
    _token: string,
    realmId?: string,
  ) {
    const path = realmId
      ? `/v1/realm/${realmId}/auth/userpass/users/${username}`
      : `/v1/auth/userpass/users/${username}`;

    const response = await this.request.post(`${this.baseURL}${path}`, {
      headers: this.headers(),
      data: {
        password,
        policies,
      },
    });

    if (!response.ok()) {
      throw new Error(`Create user failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async loginUser(username: string, password: string, realmId?: string) {
    const path = realmId
      ? `/v1/realm/${realmId}/auth/userpass/login/${username}`
      : `/v1/auth/userpass/login/${username}`;

    const response = await this.request.post(`${this.baseURL}${path}`, {
      data: {
        password,
      },
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.statusText()}`);
    }

    return await response.json();
  }

  async createPolicy(name: string, policy: string, _token: string) {
    const response = await this.request.post(`${this.baseURL}/v1/sys/policies/acl/${name}`, {
      headers: this.headers(),
      data: {
        policy,
      },
    });

    if (!response.ok()) {
      throw new Error(`Create policy failed: ${response.statusText()}`);
    }

    return await response.json();
  }
}

export function createVaultClient(
  request: APIRequestContext,
  baseURL: string,
  token?: string,
): VaultAPIClient {
  return new VaultAPIClient(request, baseURL, token);
}
