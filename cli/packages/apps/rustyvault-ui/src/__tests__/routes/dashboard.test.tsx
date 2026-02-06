import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/routes/index";

// Mock the API with default resolved values
vi.mock("@/lib/api", () => ({
  systemApi: {
    getSealStatus: vi.fn().mockResolvedValue({ sealed: false, progress: 0, n: 0 }),
    listMounts: vi.fn().mockResolvedValue({}),
  },
  realmsApi: {
    list: vi.fn().mockResolvedValue({ realms: [] }),
  },
  secretsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle2: () => <span data-testid="check-icon" />,
  XCircle: () => <span data-testid="x-icon" />,
  Globe: () => <span data-testid="globe-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render dashboard title", () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("should render system status card", () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Seal Status")).toBeInTheDocument();
    expect(screen.getByText("System Status")).toBeInTheDocument();
  });

  it("should render quick actions card", () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });
});
