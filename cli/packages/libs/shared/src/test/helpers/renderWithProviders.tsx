/**
 * React Testing Utilities
 *
 * Provides helpers for rendering React components with required providers.
 * Eliminates boilerplate in component tests.
 *
 * Usage:
 *   const { getByText } = renderWithProviders(<MyComponent />);
 */

import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';

/**
 * Options for renderWithProviders
 */
export interface TestProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Custom QueryClient instance (defaults to test-optimized client)
   */
  queryClient?: QueryClient;

  /**
   * Initial route for router (if router provider added)
   */
  initialRoute?: string;

  /**
   * Mock auth state
   */
  authState?: {
    isAuthenticated?: boolean;
    user?: unknown;
    token?: string;
  };

  /**
   * Additional wrapper components
   */
  additionalWrappers?: Array<(children: ReactNode) => ReactElement>;
}

/**
 * Create a test-optimized QueryClient
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests for faster failures
        retry: false,
        // Disable cache time to avoid test interference
        gcTime: 0,
        // Disable automatic refetching
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        // Disable retries in tests
        retry: false,
      },
    },
    logger: {
      // Suppress console logs in tests
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * Render component with all required providers
 *
 * @param ui - React component to render
 * @param options - Rendering options and provider configs
 * @returns Render result from @testing-library/react
 *
 * @example
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />);
 * expect(getByText('Hello')).toBeInTheDocument();
 * ```
 *
 * @example With custom query client
 * ```tsx
 * const queryClient = createTestQueryClient();
 * const { getByRole } = renderWithProviders(<MyComponent />, { queryClient });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: TestProviderOptions = {}
) {
  const {
    queryClient = createTestQueryClient(),
    additionalWrappers = [],
    ...renderOptions
  } = options;

  /**
   * Wrapper component with all providers
   */
  function AllProviders({ children }: { children: ReactNode }) {
    let wrappedChildren = children;

    // Wrap with QueryClientProvider
    wrappedChildren = (
      <QueryClientProvider client={queryClient}>
        {wrappedChildren}
      </QueryClientProvider>
    );

    // Apply additional wrappers
    for (const wrapper of additionalWrappers) {
      wrappedChildren = wrapper(wrappedChildren);
    }

    return <>{wrappedChildren}</>;
  }

  return {
    ...render(ui, { wrapper: AllProviders, ...renderOptions }),
    queryClient,
  };
}

/**
 * Cleanup helper - resets query client cache
 */
export function cleanupTestQueries(queryClient: QueryClient) {
  queryClient.clear();
}

/**
 * Re-export for convenience
 */
export { render } from '@testing-library/react';
export * from '@testing-library/react';
