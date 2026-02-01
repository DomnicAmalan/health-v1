/**
 * Patient Color Generation
 * Generates consistent, visually distinct colors for patient grouping
 */

// Predefined set of accessible, visually distinct colors
const PATIENT_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#A855F7", // Violet
  "#84CC16", // Lime
];

/**
 * Generate a consistent color for a patient ID
 * Uses hash function to ensure same patient always gets same color
 */
export function getPatientColor(patientId: string): string {
  if (!patientId) {
    return PATIENT_COLORS[0] ?? "#3B82F6";
  }

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < patientId.length; i++) {
    hash = (hash << 5) - hash + patientId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value and modulo to get color index
  const index = Math.abs(hash) % PATIENT_COLORS.length;
  return PATIENT_COLORS[index] ?? PATIENT_COLORS[0] ?? "#3B82F6";
}

/**
 * Get patient initials from name
 */
export function getPatientInitials(name: string): string {
  if (!name) {
    return "??";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return (parts[0]?.substring(0, 2) ?? "??").toUpperCase();
  }

  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}
