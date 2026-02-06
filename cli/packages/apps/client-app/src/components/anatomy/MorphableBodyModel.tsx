/**
 * MorphableBodyModel Component
 * Dynamic 3D human anatomy that morphs based on patient biometrics (BMI, height, weight)
 * Implements real-time body composition visualization with blend shapes
 */

import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface PatientBiometrics {
  heightCm: number;
  weightKg: number;
  bmi: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  bodyFatPercentage?: number;
  waistCircumferenceCm?: number;
  hipCircumferenceCm?: number;
}

interface MorphableBodyModelProps {
  patientData: PatientBiometrics;
  showAdiposeLayer?: boolean;
  showMuscles?: boolean;
  showOrgans?: boolean;
  highlightedOrgan?: string | null;
  onOrganClick?: (organName: string, position: THREE.Vector3) => void;
}

interface BMIPreset {
  name: string;
  bmi: number;
}

const BMI_PRESETS: BMIPreset[] = [
  { name: 'Underweight', bmi: 17.0 },
  { name: 'Normal', bmi: 22.0 },
  { name: 'Overweight', bmi: 27.5 },
  { name: 'Obese1', bmi: 32.5 },
  { name: 'Obese2', bmi: 37.5 },
  { name: 'Obese3', bmi: 45.0 },
];

export function MorphableBodyModel({
  patientData,
  showAdiposeLayer = true,
  showMuscles = false,
  showOrgans = true,
  highlightedOrgan = null,
  onOrganClick,
}: MorphableBodyModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const adiposeLayerRef = useRef<THREE.Mesh>(null);

  // Load 3D model with morph targets (blend shapes)
  // NOTE: This will fail until the actual .glb model is created with Blender
  // For now, this demonstrates the implementation approach
  const { scene } = useGLTF('/models/anatomy/human_body_morphable.glb');

  // Apply morphing when patient data changes
  useEffect(() => {
    if (!groupRef.current) return;

    applyPatientMorphology(groupRef.current, patientData);
  }, [patientData]);

  // Update adipose layer visibility and thickness
  useEffect(() => {
    if (!adiposeLayerRef.current) return;

    if (showAdiposeLayer) {
      const fatThickness = calculateFatThickness(patientData.bmi);
      const scale = 1 + fatThickness / 100;
      adiposeLayerRef.current.scale.set(scale, scale, scale);
      adiposeLayerRef.current.visible = true;
    } else {
      adiposeLayerRef.current.visible = false;
    }
  }, [showAdiposeLayer, patientData.bmi]);

  // Handle organ highlighting
  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.isOrgan) {
        const organName = child.userData.organName;

        if (highlightedOrgan === organName) {
          // Apply highlight material
          const highlightMaterial = new THREE.MeshPhysicalMaterial({
            color: child.userData.displayColor || 0x3498db,
            emissive: 0x3498db,
            emissiveIntensity: 0.5,
            roughness: 0.4,
            metalness: 0.1,
          });
          child.material = highlightMaterial;
        } else {
          // Reset to normal material
          const normalMaterial = new THREE.MeshPhysicalMaterial({
            color: child.userData.displayColor || 0xe74c3c,
            roughness: 0.6,
            metalness: 0.0,
          });
          child.material = normalMaterial;
        }
      }
    });
  }, [highlightedOrgan]);

  // Handle organ clicks
  const handleClick = (event: THREE.Event) => {
    if (!onOrganClick) return;

    const mesh = event.object as THREE.Mesh;
    if (mesh.userData.isOrgan) {
      const organName = mesh.userData.organName;
      const position = new THREE.Vector3();
      mesh.getWorldPosition(position);
      onOrganClick(organName, position);
    }
  };

  return (
    <group ref={groupRef}>
      {/* Main body model with morph targets */}
      <primitive object={scene} onClick={handleClick} />

      {/* Adipose (fat) tissue layer visualization */}
      {showAdiposeLayer && (
        <mesh ref={adiposeLayerRef}>
          {/* This is a placeholder - should use actual body mesh */}
          <sphereGeometry args={[0.5, 64, 64]} />
          <meshPhysicalMaterial
            color="#FFE5B4"
            transparent
            opacity={0.35}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Morphology Calculation Functions
// ============================================================================

/**
 * Apply patient-specific morphology to 3D model
 * Uses blend shapes (morph targets) to transform body based on BMI
 */
function applyPatientMorphology(
  model: THREE.Group,
  patient: PatientBiometrics
): void {
  // 1. Find body mesh with morph targets
  let bodyMesh: THREE.Mesh | null = null;

  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
      bodyMesh = child;
    }
  });

  if (!bodyMesh || !bodyMesh.morphTargetInfluences) {
    console.warn('Body mesh with morph targets not found');
    return;
  }

  // 2. Calculate height scaling (linear)
  const referenceHeight = 170; // cm (5'7" reference)
  const heightScale = patient.heightCm / referenceHeight;
  model.scale.set(heightScale, heightScale, heightScale);

  // 3. Determine BMI category and blend factor
  const { lowerPreset, upperPreset, blendFactor } = calculateBMIBlend(
    patient.bmi
  );

  // 4. Reset all morph targets to 0
  bodyMesh.morphTargetInfluences.fill(0);

  // 5. Apply blended morph targets
  const morphTargetDict = bodyMesh.morphTargetDictionary;

  if (morphTargetDict) {
    if (lowerPreset && morphTargetDict[lowerPreset] !== undefined) {
      bodyMesh.morphTargetInfluences[morphTargetDict[lowerPreset]] =
        1 - blendFactor;
    }
    if (upperPreset && morphTargetDict[upperPreset] !== undefined) {
      bodyMesh.morphTargetInfluences[morphTargetDict[upperPreset]] =
        blendFactor;
    }
  }

  // 6. Gender-specific adjustments
  applyGenderMorphology(model, patient.gender);

  // 7. Adjust organs for obesity if BMI >= 30
  if (patient.bmi >= 30) {
    adjustOrgansForObesity(model, patient.bmi);
  }

  // 8. Age-related adjustments if age > 50
  if (patient.age > 50) {
    applyAgingMorphology(model, patient.age);
  }
}

/**
 * Calculate BMI blend between two adjacent presets
 */
function calculateBMIBlend(bmi: number): {
  lowerPreset: string;
  upperPreset: string;
  blendFactor: number;
} {
  // Find adjacent presets for interpolation
  for (let i = 0; i < BMI_PRESETS.length - 1; i++) {
    if (bmi >= BMI_PRESETS[i].bmi && bmi < BMI_PRESETS[i + 1].bmi) {
      const range = BMI_PRESETS[i + 1].bmi - BMI_PRESETS[i].bmi;
      const blendFactor = (bmi - BMI_PRESETS[i].bmi) / range;

      return {
        lowerPreset: BMI_PRESETS[i].name,
        upperPreset: BMI_PRESETS[i + 1].name,
        blendFactor: Math.max(0, Math.min(1, blendFactor)),
      };
    }
  }

  // Edge cases
  if (bmi < BMI_PRESETS[0].bmi) {
    return {
      lowerPreset: 'Underweight',
      upperPreset: 'Underweight',
      blendFactor: 0,
    };
  }

  return {
    lowerPreset: 'Obese3',
    upperPreset: 'Obese3',
    blendFactor: 0,
  };
}

/**
 * Apply gender-specific body morphology
 */
function applyGenderMorphology(model: THREE.Group, gender: string): void {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (gender === 'female') {
      // Wider hips (gynoid fat distribution)
      if (child.name.includes('pelvis') || child.name.includes('hip')) {
        child.scale.x *= 1.15;
      }
      // Breast tissue
      if (child.name.includes('chest') || child.name.includes('breast')) {
        child.scale.z *= 1.1;
      }
    } else if (gender === 'male') {
      // Android fat distribution (abdominal)
      if (child.name.includes('abdomen') || child.name.includes('belly')) {
        child.scale.multiplyScalar(1.1);
      }
      // Broader shoulders
      if (child.name.includes('shoulder') || child.name.includes('clavicle')) {
        child.scale.x *= 1.12;
      }
    }
  });
}

/**
 * Adjust organ positions and sizes for obesity
 * Obese patients have compressed/displaced organs
 */
function adjustOrgansForObesity(model: THREE.Group, bmi: number): void {
  const obesityFactor = Math.min((bmi - 30) / 10, 1.5); // Max 1.5 at BMI 40+

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.userData.isOrgan) return;

    const organName = child.userData.organName || child.name;

    if (organName.includes('liver')) {
      // Liver enlargement (hepatomegaly) and inferior displacement
      child.position.y -= obesityFactor * 0.02;
      child.scale.multiplyScalar(1 + obesityFactor * 0.12);
    } else if (organName.includes('stomach')) {
      // Stomach compression
      child.scale.y *= 1 - obesityFactor * 0.1;
    } else if (organName.includes('heart')) {
      // Cardiomegaly (heart enlargement)
      child.scale.multiplyScalar(1 + obesityFactor * 0.08);
    } else if (organName.includes('lung')) {
      // Reduced lung capacity (compression)
      child.scale.y *= 1 - obesityFactor * 0.05;
    } else if (organName.includes('kidney')) {
      // Posterior displacement
      child.position.z -= obesityFactor * 0.005;
    }
  });
}

/**
 * Apply age-related morphological changes
 */
function applyAgingMorphology(model: THREE.Group, age: number): void {
  const agingFactor = Math.min((age - 50) / 30, 1.0); // Max at age 80

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    // Kyphosis (forward spine curvature)
    if (child.name.includes('spine') || child.name.includes('vertebrae')) {
      child.rotation.x += agingFactor * 0.1;
    }

    // Muscle mass loss (sarcopenia)
    if (child.name.includes('muscle')) {
      child.scale.multiplyScalar(1 - agingFactor * 0.15);
    }

    // Organ size reduction
    if (child.userData.isOrgan && child.name.includes('kidney')) {
      child.scale.multiplyScalar(1 - agingFactor * 0.08);
    }
  });
}

/**
 * Calculate adipose tissue layer thickness based on BMI
 */
function calculateFatThickness(bmi: number): number {
  if (bmi < 18.5) return 0.3; // Minimal fat
  if (bmi < 25) return 1.0; // Normal
  if (bmi < 30) return 2.0; // Overweight
  if (bmi < 35) return 3.5; // Obese Class I
  if (bmi < 40) return 5.0; // Obese Class II
  return 7.0; // Obese Class III+
}

// Preload model (NOTE: will fail until model exists)
// useGLTF.preload('/models/anatomy/human_body_morphable.glb');
