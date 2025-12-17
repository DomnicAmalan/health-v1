/**
 * Service Status API
 */

import { API_ROUTES, apiRequest } from "./client";
import type { ServiceStatusResponse } from "./types";

/**
 * Get service status from backend
 */
export async function getServiceStatus(): Promise<ServiceStatusResponse> {
  return apiRequest<ServiceStatusResponse>(API_ROUTES.SERVICES.STATUS, {
    method: "GET",
  });
}
