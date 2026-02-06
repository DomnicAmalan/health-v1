/**
 * Test Utilities Index
 *
 * Central export for all test utilities, factories, and fixtures.
 * Import from this file in all test files.
 *
 * @example
 * ```ts
 * import {
 *   TestDataFactory,
 *   TEST_USERS,
 *   renderWithProviders,
 *   mockApiResponse,
 * } from '@lazarus-life/shared/test';
 * ```
 */

// ============================================================================
// Factories
// ============================================================================

export { TestDataFactory, default as TestData } from './factories';

// ============================================================================
// Fixtures
// ============================================================================

export {
  TEST_USERS,
  TEST_PATIENTS,
  TEST_APPOINTMENTS,
  TEST_ORGANIZATION,
  COMPLETE_PATIENT_RECORDS,
  TEST_DATA,
} from './fixtures/seedData';

// ============================================================================
// React Testing Helpers
// ============================================================================

export {
  renderWithProviders,
  createTestQueryClient,
  cleanupTestQueries,
  type TestProviderOptions,
} from './helpers/renderWithProviders';

// Re-export testing library utilities
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// ============================================================================
// API Mocking Helpers
// ============================================================================

export {
  createMockApiClient,
  mockApiResponse,
  mockApiError,
  mockPaginatedResponse,
  delay,
  mockFetch,
  resetMockApiClient,
  expectApiCall,
  expectApiCallCount,
  mockDelayedResponse,
  type MockApiClient,
  type ApiResponse,
  type PaginatedApiResponse,
} from './helpers/mockApiClient';

// ============================================================================
// Test Setup Utilities
// ============================================================================

export {
  setupTestEnvironment,
  mockMatchMedia,
  mockIntersectionObserver,
  mockResizeObserver,
  mockLocalStorage,
  mockSessionStorage,
  waitForAsync,
  setupBrowserMocks,
} from './helpers/setupTests';

// ============================================================================
// E2E Testing (Page Object Model)
// ============================================================================

export {
  BasePage,
  LoginPage,
  DashboardPage,
  PatientListPage,
  PatientDetailPage,
  UserManagementPage,
  PageObjects,
} from './e2e/PageObjectModel';

// ============================================================================
// Contract Testing
// ============================================================================

export {
  validateApiContract,
  validateApiContractSync,
  isValidApiContract,
  getContractErrors,
  createContractValidator,
  ApiResponseSchema,
  PaginatedApiResponseSchema,
  UserResponseSchema,
  PatientResponseSchema,
  AppointmentResponseSchema,
  MedicationResponseSchema,
  ProblemResponseSchema,
  VitalSignsResponseSchema,
  UserListResponseSchema,
  PatientListResponseSchema,
  AppointmentListResponseSchema,
  LoginResponseSchema,
  RefreshTokenResponseSchema,
  type UserResponse,
  type PatientResponse,
  type AppointmentResponse,
  type MedicationResponse,
  type ProblemResponse,
  type VitalSignsResponse,
  type UserListResponse,
  type PatientListResponse,
  type AppointmentListResponse,
  type LoginResponse,
  type RefreshTokenResponse,
} from './contracts/api-contracts';
