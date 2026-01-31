import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../client";
import { secretsApi } from "../secrets";

// Mock the apiClient
vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("secretsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("read", () => {
    it("should read a secret successfully", async () => {
      const mockData = { username: "testuser", password: "testpass" };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const result = await secretsApi.read("test/secret");

      expect(result.data).toEqual(mockData);
      expect(result.metadata).toBeDefined();
      expect(apiClient.get).toHaveBeenCalledWith("/secret/test/secret");
    });
  });

  describe("write", () => {
    it("should write a secret successfully", async () => {
      const secretData = { key: "value" };
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await secretsApi.write("test/secret", secretData);

      expect(apiClient.post).toHaveBeenCalledWith("/secret/test/secret", secretData);
    });
  });

  describe("list", () => {
    it("should list secrets successfully", async () => {
      const mockResponse = { keys: ["secret1", "secret2"] };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await secretsApi.list("test");

      expect(result).toEqual(["secret1", "secret2"]);
      expect(apiClient.get).toHaveBeenCalledWith("/secret/test/");
    });

    it("should return empty array on error", async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error("Not found"));

      const result = await secretsApi.list("test");

      expect(result).toEqual([]);
    });
  });

  describe("delete", () => {
    it("should delete a secret successfully", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined);

      await secretsApi.delete("test/secret");

      expect(apiClient.delete).toHaveBeenCalledWith("/secret/test/secret");
    });
  });

  describe("realm-scoped operations", () => {
    const realmId = "test-realm-id";

    it("should read realm secret", async () => {
      const mockData = { api_key: "secret-key" };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

      const result = await secretsApi.readForRealm(realmId, "app/config");

      expect(result.data).toEqual(mockData);
      expect(apiClient.get).toHaveBeenCalledWith(`/realm/${realmId}/secret/data/app/config`);
    });

    it("should write realm secret", async () => {
      const secretData = { key: "value" };
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await secretsApi.writeForRealm(realmId, "app/config", secretData);

      expect(apiClient.post).toHaveBeenCalledWith(`/realm/${realmId}/secret/data/app/config`, {
        data: secretData,
      });
    });

    it("should list realm secrets", async () => {
      const mockResponse = { keys: ["secret1"] };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await secretsApi.listForRealm(realmId, "app");

      expect(result).toEqual(["secret1"]);
    });

    it("should delete realm secret", async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined);

      await secretsApi.deleteForRealm(realmId, "app/config");

      expect(apiClient.delete).toHaveBeenCalledWith(`/realm/${realmId}/secret/data/app/config`);
    });
  });
});
