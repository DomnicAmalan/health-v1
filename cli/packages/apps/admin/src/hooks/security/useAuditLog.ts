/**
 * useAuditLog Hook - Admin App Wrapper
 * Wraps shared useAuditLog with app-specific stores
 * Tracks sensitive operations like user provisioning, DEK rotation, permission changes
 */

import { useAuditLog as useAuditLogShared } from "@lazarus-life/shared";
import { useAuditStore } from "@/stores/auditStore";
import { useAuthStore } from "@/stores/authStore";

/**
 * Admin app-specific useAuditLog hook
 * Injects admin stores into shared implementation
 */
export function useAuditLog() {
  const user = useAuthStore((state) => state.user);
  const auditStore = useAuditStore();

  return useAuditLogShared({ user, auditStore });
}
