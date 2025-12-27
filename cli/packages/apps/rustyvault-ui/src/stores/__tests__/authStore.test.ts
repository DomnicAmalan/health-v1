import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "../authStore";
import { authApi } from "@/lib/api/auth";

// Mock the API
vi.mock("@/lib/api/auth", () => ({
  authApi: {
    lookupToken: vi.fn(),
    loginUserpass: vi.fn(),
    loginAppRole: vi.fn(),
  },
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

describe("useAuthStore", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    useAuthStore.getState().logout();
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("should login successfully with valid token", async () => {
      const mockToken = "test-token";
      const mockPolicies = ["default", "admin"];

      vi.mocked(authApi.lookupToken).mockResolvedValue({
        data: {
          id: mockToken,
          policies: mockPolicies,
          path: "auth/token/login",
        },
      });

      await useAuthStore.getState().login(mockToken);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(mockToken);
      expect(state.policies).toEqual(mockPolicies);
      expect(state.isAuthenticated).toBe(true);
      expect(sessionStorageMock.getItem("rustyvault_token")).toBe(mockToken);
    });

    it("should handle login failure", async () => {
      vi.mocked(authApi.lookupToken).mockRejectedValue(new Error("Invalid token"));

      await expect(useAuthStore.getState().login("invalid-token")).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
    });
  });

  describe("loginWithUserpass", () => {
    it("should login with username and password", async () => {
      const mockResponse = {
        auth: {
          client_token: "user-token",
          policies: ["default"],
        },
      };

      vi.mocked(authApi.loginUserpass).mockResolvedValue(mockResponse);

      await useAuthStore.getState().loginWithUserpass("testuser", "password");

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe("user-token");
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe("logout", () => {
    it("should clear authentication state", () => {
      // Set initial state
      useAuthStore.setState({
        accessToken: "test-token",
        policies: ["default"],
        isAuthenticated: true,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.policies).toEqual([]);
      expect(state.isAuthenticated).toBe(false);
      expect(sessionStorageMock.getItem("rustyvault_token")).toBeNull();
    });
  });

  describe("hasPolicy", () => {
    it("should return true if user has policy", () => {
      useAuthStore.setState({ policies: ["default", "admin"] });

      expect(useAuthStore.getState().hasPolicy("admin")).toBe(true);
      expect(useAuthStore.getState().hasPolicy("default")).toBe(true);
      expect(useAuthStore.getState().hasPolicy("nonexistent")).toBe(false);
    });

    it("should return true for root policy", () => {
      useAuthStore.setState({ policies: ["root"] });

      expect(useAuthStore.getState().hasPolicy("any-policy")).toBe(true);
    });
  });

  describe("isRoot", () => {
    it("should return true if user has root policy", () => {
      useAuthStore.setState({ policies: ["root"] });
      expect(useAuthStore.getState().isRoot()).toBe(true);
    });

    it("should return false if user does not have root policy", () => {
      useAuthStore.setState({ policies: ["default"] });
      expect(useAuthStore.getState().isRoot()).toBe(false);
    });
  });
});
