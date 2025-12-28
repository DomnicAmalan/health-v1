/**
 * Compliance Types
 * Types and type guards for compliance-related entities
 */

import {
  assertObject,
  assertOneOf,
  assertOptional,
  assertString,
  isArrayOf,
  isObject,
  isOneOf,
  isOptional,
  isRecord,
  isString,
} from "./assert";

// =============================================================================
// Geographic Level
// =============================================================================

export const GEOGRAPHIC_LEVELS = [
  "continent",
  "country",
  "state",
  "province",
  "city",
  "district",
  "town",
  "village",
  "street",
] as const;

export type GeographicLevel = (typeof GEOGRAPHIC_LEVELS)[number];

export function isGeographicLevel(value: unknown): value is GeographicLevel {
  return isOneOf(value, GEOGRAPHIC_LEVELS);
}

// =============================================================================
// Geographic Region
// =============================================================================

export interface GeographicRegion {
  id: string;
  parent_id?: string;
  name: string;
  code?: string;
  level: GeographicLevel;
  metadata: Record<string, unknown>;
  effective_from: string;
  effective_to?: string;
}

export function isGeographicRegion(value: unknown): value is GeographicRegion {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    (isOptional(value.parent_id) || isString(value.parent_id)) &&
    isString(value.name) &&
    (isOptional(value.code) || isString(value.code)) &&
    isGeographicLevel(value.level) &&
    isRecord(value.metadata) &&
    isString(value.effective_from) &&
    (isOptional(value.effective_to) || isString(value.effective_to))
  );
}

export function assertGeographicRegion(
  value: unknown,
  path = "GeographicRegion"
): GeographicRegion {
  const obj = assertObject(value, path);

  return {
    id: assertString(obj.id, `${path}.id`),
    parent_id: assertOptional(obj.parent_id, assertString, `${path}.parent_id`),
    name: assertString(obj.name, `${path}.name`),
    code: assertOptional(obj.code, assertString, `${path}.code`),
    level: assertOneOf(obj.level, GEOGRAPHIC_LEVELS, `${path}.level`),
    metadata: assertObject(obj.metadata, `${path}.metadata`),
    effective_from: assertString(obj.effective_from, `${path}.effective_from`),
    effective_to: assertOptional(obj.effective_to, assertString, `${path}.effective_to`),
  };
}

// =============================================================================
// Regulation Category
// =============================================================================

export const REGULATION_CATEGORIES = [
  "privacy",
  "security",
  "clinical",
  "billing",
  "quality",
  "safety",
  "data_protection",
  "accessibility",
  "other",
] as const;

export type RegulationCategory = (typeof REGULATION_CATEGORIES)[number];

export function isRegulationCategory(value: unknown): value is RegulationCategory {
  return isOneOf(value, REGULATION_CATEGORIES);
}

// =============================================================================
// Regulation Status
// =============================================================================

export const REGULATION_STATUSES = ["draft", "active", "superseded", "archived"] as const;

export type RegulationStatus = (typeof REGULATION_STATUSES)[number];

export function isRegulationStatus(value: unknown): value is RegulationStatus {
  return isOneOf(value, REGULATION_STATUSES);
}

// =============================================================================
// Regulation
// =============================================================================

export interface Regulation {
  id: string;
  code: string;
  name: string;
  category: RegulationCategory;
  issuing_body: string;
  jurisdiction_id?: string;
  jurisdiction_level?: GeographicLevel;
  effective_from: string;
  effective_to?: string;
  status: RegulationStatus;
  metadata: Record<string, unknown>;
}

export function isRegulation(value: unknown): value is Regulation {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.code) &&
    isString(value.name) &&
    isRegulationCategory(value.category) &&
    isString(value.issuing_body) &&
    (isOptional(value.jurisdiction_id) || isString(value.jurisdiction_id)) &&
    (isOptional(value.jurisdiction_level) || isGeographicLevel(value.jurisdiction_level)) &&
    isString(value.effective_from) &&
    (isOptional(value.effective_to) || isString(value.effective_to)) &&
    isRegulationStatus(value.status) &&
    isRecord(value.metadata)
  );
}

export function assertRegulation(value: unknown, path = "Regulation"): Regulation {
  const obj = assertObject(value, path);

  return {
    id: assertString(obj.id, `${path}.id`),
    code: assertString(obj.code, `${path}.code`),
    name: assertString(obj.name, `${path}.name`),
    category: assertOneOf(obj.category, REGULATION_CATEGORIES, `${path}.category`),
    issuing_body: assertString(obj.issuing_body, `${path}.issuing_body`),
    jurisdiction_id: assertOptional(obj.jurisdiction_id, assertString, `${path}.jurisdiction_id`),
    jurisdiction_level: assertOptional(
      obj.jurisdiction_level,
      (v, p) => assertOneOf(v, GEOGRAPHIC_LEVELS, p),
      `${path}.jurisdiction_level`
    ),
    effective_from: assertString(obj.effective_from, `${path}.effective_from`),
    effective_to: assertOptional(obj.effective_to, assertString, `${path}.effective_to`),
    status: assertOneOf(obj.status, REGULATION_STATUSES, `${path}.status`),
    metadata: assertObject(obj.metadata, `${path}.metadata`),
  };
}

// =============================================================================
// Regulation Version
// =============================================================================

export interface RegulationVersion {
  id: string;
  regulation_id: string;
  version_number: string;
  content_hash: string;
  effective_from: string;
  effective_to?: string;
  change_summary?: string;
}

export function isRegulationVersion(value: unknown): value is RegulationVersion {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.regulation_id) &&
    isString(value.version_number) &&
    isString(value.content_hash) &&
    isString(value.effective_from) &&
    (isOptional(value.effective_to) || isString(value.effective_to)) &&
    (isOptional(value.change_summary) || isString(value.change_summary))
  );
}

export function assertRegulationVersion(
  value: unknown,
  path = "RegulationVersion"
): RegulationVersion {
  const obj = assertObject(value, path);

  return {
    id: assertString(obj.id, `${path}.id`),
    regulation_id: assertString(obj.regulation_id, `${path}.regulation_id`),
    version_number: assertString(obj.version_number, `${path}.version_number`),
    content_hash: assertString(obj.content_hash, `${path}.content_hash`),
    effective_from: assertString(obj.effective_from, `${path}.effective_from`),
    effective_to: assertOptional(obj.effective_to, assertString, `${path}.effective_to`),
    change_summary: assertOptional(obj.change_summary, assertString, `${path}.change_summary`),
  };
}

// =============================================================================
// Regulation Section
// =============================================================================

export interface RegulationSection {
  id: string;
  version_id: string;
  parent_section_id?: string;
  section_number: string;
  title?: string;
  content: string;
  order_index: number;
}

export function isRegulationSection(value: unknown): value is RegulationSection {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.version_id) &&
    (isOptional(value.parent_section_id) || isString(value.parent_section_id)) &&
    isString(value.section_number) &&
    (isOptional(value.title) || isString(value.title)) &&
    isString(value.content) &&
    typeof value.order_index === "number"
  );
}

export function assertRegulationSection(
  value: unknown,
  path = "RegulationSection"
): RegulationSection {
  const obj = assertObject(value, path);

  return {
    id: assertString(obj.id, `${path}.id`),
    version_id: assertString(obj.version_id, `${path}.version_id`),
    parent_section_id: assertOptional(
      obj.parent_section_id,
      assertString,
      `${path}.parent_section_id`
    ),
    section_number: assertString(obj.section_number, `${path}.section_number`),
    title: assertOptional(obj.title, assertString, `${path}.title`),
    content: assertString(obj.content, `${path}.content`),
    order_index: typeof obj.order_index === "number" ? obj.order_index : 0,
  };
}

// =============================================================================
// Applicable Regulation
// =============================================================================

export interface ApplicableRegulation {
  regulation_id: string;
  regulation_code: string;
  regulation_name: string;
  priority: number;
  source_region_id: string;
  source_region_name: string;
  effective_from: string;
  effective_to?: string;
}

export function isApplicableRegulation(value: unknown): value is ApplicableRegulation {
  if (!isObject(value)) {
    return false;
  }

  return (
    isString(value.regulation_id) &&
    isString(value.regulation_code) &&
    isString(value.regulation_name) &&
    typeof value.priority === "number" &&
    isString(value.source_region_id) &&
    isString(value.source_region_name) &&
    isString(value.effective_from) &&
    (isOptional(value.effective_to) || isString(value.effective_to))
  );
}

export function assertApplicableRegulation(
  value: unknown,
  path = "ApplicableRegulation"
): ApplicableRegulation {
  const obj = assertObject(value, path);

  return {
    regulation_id: assertString(obj.regulation_id, `${path}.regulation_id`),
    regulation_code: assertString(obj.regulation_code, `${path}.regulation_code`),
    regulation_name: assertString(obj.regulation_name, `${path}.regulation_name`),
    priority: typeof obj.priority === "number" ? obj.priority : 0,
    source_region_id: assertString(obj.source_region_id, `${path}.source_region_id`),
    source_region_name: assertString(obj.source_region_name, `${path}.source_region_name`),
    effective_from: assertString(obj.effective_from, `${path}.effective_from`),
    effective_to: assertOptional(obj.effective_to, assertString, `${path}.effective_to`),
  };
}

// =============================================================================
// Array Type Guards
// =============================================================================

export function isGeographicRegionArray(value: unknown): value is GeographicRegion[] {
  return isArrayOf(value, isGeographicRegion);
}

export function isRegulationArray(value: unknown): value is Regulation[] {
  return isArrayOf(value, isRegulation);
}

export function isRegulationVersionArray(value: unknown): value is RegulationVersion[] {
  return isArrayOf(value, isRegulationVersion);
}

export function isRegulationSectionArray(value: unknown): value is RegulationSection[] {
  return isArrayOf(value, isRegulationSection);
}

export function isApplicableRegulationArray(value: unknown): value is ApplicableRegulation[] {
  return isArrayOf(value, isApplicableRegulation);
}
