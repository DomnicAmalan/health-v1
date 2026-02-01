/**
 * Cube.js API Client Configuration
 */

import cubejs from '@cubejs-client/core';

const CUBE_API_URL = import.meta.env.VITE_CUBE_API_URL || 'http://localhost:4000/cubejs-api/v1';
const CUBE_API_TOKEN = import.meta.env.VITE_CUBE_API_TOKEN || 'dev-token';

export const cubejsApi = cubejs(CUBE_API_TOKEN, {
  apiUrl: CUBE_API_URL,
});

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
