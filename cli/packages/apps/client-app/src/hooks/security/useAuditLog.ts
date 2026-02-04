/**
 * useAuditLog Hook - Client App Wrapper
 * Wraps shared useAuditLog with app-specific stores
 */

import { useAuditLog as useAuditLogShared } from "@lazarus-life/shared";
import { useAuditStore } from "@/stores/auditStore";
import { useAuth } from "@/stores/authStore";

/**
 * Client app-specific useAuditLog hook
 * Injects client-app stores into shared implementation
 */
export function useAuditLog() {
  const { user } = useAuth();
  const auditStore = useAuditStore();

  return useAuditLogShared({ user, auditStore });
}
