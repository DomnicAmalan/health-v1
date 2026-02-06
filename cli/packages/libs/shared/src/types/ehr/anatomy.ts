/**
 * Anatomy System Types
 * 3D anatomy-based clinical documentation structures
 */

export interface BodySystem {
  id: string;
  systemCode: string;
  systemName: string;
  parentSystemId?: string;

  // Medical coding
  icd10Chapter?: string;
  snomedCode?: string;
  fmaCode?: string; // Foundational Model of Anatomy

  // 3D Model integration
  modelRegionId: string; // Maps to GLTF mesh names
  displayColor: string; // Hex color (#E74C3C)

  // Clinical templates
  commonFindings: string[];

  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnatomyFinding {
  id: string;
  encounterId: string;
  patientId: string;
  bodySystemId: string;

  // Finding details
  findingType: 'inspection' | 'palpation' | 'auscultation' | 'percussion';
  findingCategory: 'normal' | 'abnormal' | 'critical';
  findingText: string; // Max 10,000 chars

  // Clinical attributes
  severity?: 'mild' | 'moderate' | 'severe';
  laterality?: 'left' | 'right' | 'bilateral' | 'midline';

  // 3D annotation placement
  modelCoordinates?: {
    x: number;
    y: number;
    z: number;
  };

  // Audit
  documentedBy: string;
  documentedDatetime: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  // Populated fields (from joins)
  bodySystem?: BodySystem;
}

export interface CreateAnatomyFindingRequest {
  encounterId: string;
  bodySystemId: string;
  findingType: 'inspection' | 'palpation' | 'auscultation' | 'percussion';
  findingCategory: 'normal' | 'abnormal' | 'critical';
  findingText: string;
  severity?: 'mild' | 'moderate' | 'severe';
  laterality?: 'left' | 'right' | 'bilateral' | 'midline';
  modelCoordinates?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface UpdateAnatomyFindingRequest {
  findingType?: 'inspection' | 'palpation' | 'auscultation' | 'percussion';
  findingCategory?: 'normal' | 'abnormal' | 'critical';
  findingText?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  laterality?: 'left' | 'right' | 'bilateral' | 'midline';
  modelCoordinates?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface LabRecommendation {
  id: string;
  testId?: string;
  panelId?: string;
  testCode?: string;
  testName: string;
  panelCode?: string;
  panelName?: string;
  relevanceScore: number; // 0.0-1.0
  recommendationReason: string;
  category?: string;
  specimenType?: string;
}

export interface AnatomyFindingListResponse {
  findings: AnatomyFinding[];
  total: number;
}

export interface BodySystemListResponse {
  systems: BodySystem[];
  total: number;
}

export interface LabRecommendationResponse {
  recommendations: LabRecommendation[];
  bodySystemId: string;
  bodySystemName: string;
}
