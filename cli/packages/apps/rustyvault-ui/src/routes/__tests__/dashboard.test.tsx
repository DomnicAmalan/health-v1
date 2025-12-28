import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../index";

// Mock the API
vi.mock("@/lib/api", () => ({
  systemApi: {
    getSealStatus: vi.fn(),
    listMounts: vi.fn(),
  },
  realmsApi: {
    list: vi.fn(),
  },
  secretsApi: {
    list: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe("DashboardPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it("should render dashboard title", () => {
    const { systemApi, realmsApi, secretsApi } = require("@/lib/api");

    systemApi.getSealStatus.mockResolvedValue({ sealed: false, progress: 0, n: 0 });
    realmsApi.list.mockResolvedValue([]);
    systemApi.listMounts.mockResolvedValue({});
    secretsApi.list.mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("should display seal status when unsealed", async () => {
    const { systemApi, realmsApi, secretsApi } = require("@/lib/api");

    systemApi.getSealStatus.mockResolvedValue({ sealed: false, progress: 0, n: 0 });
    realmsApi.list.mockResolvedValue([]);
    systemApi.listMounts.mockResolvedValue({});
    secretsApi.list.mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Unsealed/i)).toBeInTheDocument();
    });
  });

  it("should display seal status when sealed", async () => {
    const { systemApi, realmsApi, secretsApi } = require("@/lib/api");

    systemApi.getSealStatus.mockResolvedValue({ sealed: true, progress: 2, n: 3 });
    realmsApi.list.mockResolvedValue([]);
    systemApi.listMounts.mockResolvedValue({});
    secretsApi.list.mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Sealed/i)).toBeInTheDocument();
    });
  });
});
