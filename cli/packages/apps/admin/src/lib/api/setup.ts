/**
 * Setup API
 */

import { apiRequest, API_ROUTES } from "./client"
import type { SetupRequest, SetupStatusResponse } from "./types"

/**
 * Initialize setup
 */
export async function initializeSetup(request: SetupRequest): Promise<void> {
  await apiRequest(API_ROUTES.SETUP.INITIALIZE, {
    method: "POST",
    body: JSON.stringify(request),
  })
}

/**
 * Get setup status
 */
export async function getSetupStatus(): Promise<SetupStatusResponse> {
  return apiRequest<SetupStatusResponse>(API_ROUTES.SETUP.STATUS, {
    method: "GET",
  })
}

