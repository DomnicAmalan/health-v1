import { QueryClient } from '@tanstack/react-query';

export interface QueryClientConfig {
  defaultOptions?: {
    queries?: {
      refetchOnWindowFocus?: boolean;
      retry?: number;
      staleTime?: number;
      gcTime?: number;
    };
    mutations?: {
      retry?: number;
    };
  };
}

/**
 * Create a QueryClient with security-conscious defaults
 */
export function createQueryClient(config?: QueryClientConfig): QueryClient {
  const defaultOptions = config?.defaultOptions || {};

  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        ...defaultOptions.queries,
      },
      mutations: {
        retry: 1,
        ...defaultOptions.mutations,
      },
    },
  });
}
