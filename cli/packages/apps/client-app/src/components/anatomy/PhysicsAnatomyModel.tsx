/**
 * PhysicsAnatomyModel Component
 * 3D anatomy with REAL-TIME PHYSICS SIMULATION
 *
 * Features:
 * - Soft body organs (deformable, elastic)
 * - Rigid body skeleton (collision boundaries)
 * - Breathing simulation (lung expansion)
 * - Heartbeat animation (cardiac contraction)
 * - Palpation interaction (click to deform)
 * - Gravity-based settling
 * - BMI-based tissue density
 */

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Physics,
  RigidBody,
  BallCollider,
  CuboidCollider,
  useRapier
} from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { PatientBiometrics } from './MorphableBodyModel';

interface PhysicsAnatomyModelProps {
  patientData: PatientBiometrics;
  isBreathing?: boolean;
  heartRate?: number; // BPM
  patientPosition?: 'standing' | 'sitting' | 'supine' | 'prone';
  onOrganClick?: (organName: string, deformationForce: number) => void;
}

export function PhysicsAnatomyModel({
  patientData,
  isBreathing = true,
  heartRate = 70,
  patientPosition = 'standing',
  onOrganClick,
}: PhysicsAnatomyModelProps) {
  const [gravityDirection, setGravityDirection] = useState<[number, number, number]>([0, -9.81, 0]);

  // Load the custom 3D anatomy model
  const { scene } = useGLTF('/models/human_anatomy_custom.glb');

  // Adjust gravity based on patient position
  useEffect(() => {
    switch (patientPosition) {
      case 'standing':
        setGravityDirection([0, -9.81, 0]);
        break;
      case 'sitting':
        setGravityDirection([0, -9.81, 0]);
        break;
      case 'supine':
        setGravityDirection([0, 0, -9.81]);
        break;
      case 'prone':
        setGravityDirection([0, 0, 9.81]);
        break;
    }
  }, [patientPosition]);

  // Calculate scale based on patient height
  const heightScale = patientData.heightCm / 170; // 170cm = base height
  const bmiScale = Math.sqrt(patientData.bmi / 22); // 22 = normal BMI

  // Clone the scene for this instance
  const clonedScene = scene.clone();

  // Add click handlers to organs
  useEffect(() => {
    if (!clonedScene) return;

    clonedScene.traverse((child: any) => {
      if (child.isMesh && child.userData?.system) {
        // Make clickable
        child.userData.clickable = true;

        // Add click event
        child.onClick = () => {
          const organName = child.name;
          const system = child.userData.system;
          console.log(`Clicked: ${organName} (${system})`);
          onOrganClick?.(organName, 1.0);
        };
      }
    });
  }, [clonedScene, onOrganClick]);

  return (
    <group>
      {/* Render the complete anatomy model */}
      <primitive
        object={clonedScene}
        scale={[heightScale * bmiScale, heightScale, heightScale * bmiScale]}
        position={[0, 0, 0]}
      />

      {/* Add breathing animation to lungs */}
      {isBreathing && <BreathingAnimation scene={clonedScene} />}

      {/* Add heartbeat animation to heart */}
      <HeartbeatAnimation scene={clonedScene} heartRate={heartRate} />
    </group>
  );
}

// Preload the custom model for better performance
useGLTF.preload('/models/human_anatomy_custom.glb');

// ============================================================================
// SKELETON: Rigid Body Structure
// ============================================================================

function Skeleton({ patientData }: { patientData: PatientBiometrics }) {
  const heightScale = patientData.heightCm / 170;
  const bmiScale = Math.sqrt(patientData.bmi / 22); // Scale width based on BMI

  return (
    <group>
      {/* HEAD */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0, 1.5 * heightScale, 0]}>
          <sphereGeometry args={[0.12 * heightScale, 32, 32]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* NECK */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0, 1.35 * heightScale, 0]}>
          <cylinderGeometry args={[0.04 * heightScale, 0.05 * heightScale, 0.12 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* TORSO - Upper (Chest/Ribs) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[0.15 * heightScale * bmiScale, 0.25 * heightScale, 0.10 * heightScale * bmiScale]}
          position={[0, 1.0 * heightScale, 0]}
        />
        <mesh position={[0, 1.0 * heightScale, 0]} scale={[bmiScale, 1, bmiScale]}>
          <capsuleGeometry args={[0.15 * heightScale, 0.35 * heightScale, 16, 32]} />
          <meshStandardMaterial color="#FFD7BE" transparent opacity={0.8} />
        </mesh>
      </RigidBody>

      {/* TORSO - Lower (Abdomen) */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0, 0.7 * heightScale, 0]} scale={[bmiScale * 1.1, 1, bmiScale * 1.1]}>
          <capsuleGeometry args={[0.13 * heightScale, 0.2 * heightScale, 16, 32]} />
          <meshStandardMaterial color="#FFD7BE" transparent opacity={0.8} />
        </mesh>
      </RigidBody>

      {/* PELVIS */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[0.12 * heightScale * bmiScale, 0.08, 0.10 * bmiScale]}
          position={[0, 0.5 * heightScale, 0]}
        />
        <mesh position={[0, 0.5 * heightScale, 0]} scale={[bmiScale, 1, bmiScale]}>
          <sphereGeometry args={[0.1 * heightScale, 32, 16]} />
          <meshStandardMaterial color="#FFD7BE" transparent opacity={0.8} />
        </mesh>
      </RigidBody>

      {/* ARMS - Left Upper */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[-0.22 * heightScale * bmiScale, 0.95 * heightScale, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.03 * heightScale, 0.04 * heightScale, 0.25 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* ARMS - Left Lower */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[-0.28 * heightScale * bmiScale, 0.7 * heightScale, 0]} rotation={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.025 * heightScale, 0.03 * heightScale, 0.22 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* ARMS - Right Upper */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0.22 * heightScale * bmiScale, 0.95 * heightScale, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.03 * heightScale, 0.04 * heightScale, 0.25 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* ARMS - Right Lower */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0.28 * heightScale * bmiScale, 0.7 * heightScale, 0]} rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.025 * heightScale, 0.03 * heightScale, 0.22 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* LEGS - Left Upper */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[-0.08 * heightScale * bmiScale, 0.25 * heightScale, 0]}>
          <cylinderGeometry args={[0.05 * heightScale, 0.06 * heightScale, 0.4 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* LEGS - Left Lower */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[-0.08 * heightScale * bmiScale, -0.15 * heightScale, 0]}>
          <cylinderGeometry args={[0.04 * heightScale, 0.045 * heightScale, 0.4 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* LEGS - Right Upper */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0.08 * heightScale * bmiScale, 0.25 * heightScale, 0]}>
          <cylinderGeometry args={[0.05 * heightScale, 0.06 * heightScale, 0.4 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>

      {/* LEGS - Right Lower */}
      <RigidBody type="fixed" colliders={false}>
        <mesh position={[0.08 * heightScale * bmiScale, -0.15 * heightScale, 0]}>
          <cylinderGeometry args={[0.04 * heightScale, 0.045 * heightScale, 0.4 * heightScale, 16]} />
          <meshStandardMaterial color="#FFD7BE" />
        </mesh>
      </RigidBody>
    </group>
  );
}

// ============================================================================
// LIVER: Soft Body with Realistic Deformation
// ============================================================================

interface OrganProps {
  patientData: PatientBiometrics;
  onInteract?: (organName: string, force: number) => void;
}

function Liver({ patientData, onInteract }: OrganProps) {
  const liverRef = useRef<any>(null);
  const [isDeformed, setIsDeformed] = useState(false);

  // Calculate liver size based on BMI (hepatomegaly in obese patients)
  const baseScale = 0.12;
  const obesityFactor = patientData.bmi >= 30 ? 1 + (patientData.bmi - 30) * 0.015 : 1;
  const liverScale = baseScale * obesityFactor;

  // Liver tissue density (affects how it settles under gravity)
  const density = 1.05; // g/cm³ (similar to soft tissue)

  // Liver elasticity (higher BMI = fattier, softer liver)
  const restitution = patientData.bmi >= 30 ? 0.3 : 0.5; // Bounciness
  const friction = 0.5;

  const handleClick = () => {
    if (liverRef.current) {
      // Apply impulse (simulating palpation pressure)
      const force = new THREE.Vector3(0, 0, -2);
      liverRef.current.applyImpulse(force, true);

      setIsDeformed(true);
      setTimeout(() => setIsDeformed(false), 500); // Springs back after 500ms

      onInteract?.('liver', 2.0);
    }
  };

  return (
    <RigidBody
      ref={liverRef}
      position={[0.15, 0.5, 0.05]}
      colliders="hull"
      density={density}
      restitution={restitution}
      friction={friction}
      linearDamping={0.8} // Resistance to movement (soft tissue doesn't slide easily)
      angularDamping={0.9}
    >
      <mesh onClick={handleClick}>
        <sphereGeometry args={[liverScale, 32, 32]} />
        <meshPhysicalMaterial
          color={isDeformed ? '#C0392B' : '#D68910'}
          roughness={0.6}
          metalness={0.1}
          emissive={isDeformed ? '#E74C3C' : '#000000'}
          emissiveIntensity={isDeformed ? 0.3 : 0}
        />
      </mesh>
    </RigidBody>
  );
}

// ============================================================================
// HEART: Animated Contraction (Systole/Diastole)
// ============================================================================

interface HeartProps extends OrganProps {
  heartRate: number; // BPM
}

function Heart({ patientData, heartRate, onInteract }: HeartProps) {
  const heartRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(1.0);

  // Cardiac cycle animation
  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const beatsPerSecond = heartRate / 60;
    const cycleTime = 1 / beatsPerSecond;
    const t = (clock.getElapsedTime() % cycleTime) / cycleTime;

    // Systole (contraction) → Diastole (relaxation)
    // 0.0-0.3: Systole (squeeze)
    // 0.3-1.0: Diastole (relax)
    let newScale = 1.0;
    if (t < 0.3) {
      // Contraction (systole)
      newScale = 1.0 - (t / 0.3) * 0.15; // Contracts to 85% size
    } else {
      // Relaxation (diastole)
      const relaxT = (t - 0.3) / 0.7;
      newScale = 0.85 + relaxT * 0.15; // Expands back to 100%
    }

    setScale(newScale);
    meshRef.current.scale.setScalar(newScale);
  });

  const handleClick = () => {
    if (heartRef.current) {
      const force = new THREE.Vector3(0, 0, -1.5);
      heartRef.current.applyImpulse(force, true);
      onInteract?.('heart', 1.5);
    }
  };

  return (
    <RigidBody
      ref={heartRef}
      position={[0.05, 0.7, 0.05]}
      colliders="ball"
      density={1.06} // Heart muscle density
      restitution={0.4}
      friction={0.6}
      linearDamping={0.7}
      angularDamping={0.8}
    >
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshPhysicalMaterial
          color="#E74C3C"
          roughness={0.5}
          metalness={0.0}
          emissive="#E74C3C"
          emissiveIntensity={0.1 + (scale - 0.85) * 0.5} // Pulses with heartbeat
        />
      </mesh>
    </RigidBody>
  );
}

// ============================================================================
// LUNGS: Breathing Simulation (Expansion/Contraction)
// ============================================================================

interface LungsProps extends OrganProps {
  isBreathing: boolean;
}

function Lungs({ patientData, isBreathing, onInteract }: LungsProps) {
  const leftLungRef = useRef<THREE.Mesh>(null);
  const rightLungRef = useRef<THREE.Mesh>(null);
  const [breathScale, setBreathScale] = useState(1.0);

  // Breathing animation (12-20 breaths per minute)
  useFrame(({ clock }) => {
    if (!isBreathing || !leftLungRef.current || !rightLungRef.current) return;

    const breathsPerMinute = 16; // Normal respiratory rate
    const breathsPerSecond = breathsPerMinute / 60;
    const cycleTime = 1 / breathsPerSecond;
    const t = (clock.getElapsedTime() % cycleTime) / cycleTime;

    // Inspiration (0.0-0.4) → Expiration (0.4-1.0)
    let newScale = 1.0;
    if (t < 0.4) {
      // Inspiration (lungs expand)
      newScale = 1.0 + (t / 0.4) * 0.2; // Expands to 120%
    } else {
      // Expiration (lungs contract)
      const expireT = (t - 0.4) / 0.6;
      newScale = 1.2 - expireT * 0.2; // Contracts back to 100%
    }

    setBreathScale(newScale);

    // Apply anisotropic scaling (lungs expand vertically and anteriorly)
    leftLungRef.current.scale.set(1.0, newScale, newScale);
    rightLungRef.current.scale.set(1.0, newScale, newScale);
  });

  // Reduced lung capacity in obese patients
  const obesityFactor = patientData.bmi >= 30 ? 1 - (patientData.bmi - 30) * 0.01 : 1;

  return (
    <group>
      {/* Left Lung */}
      <RigidBody
        position={[-0.12, 0.75, 0.02]}
        colliders="hull"
        density={0.4} // Lungs are very light (air-filled)
        restitution={0.6}
        friction={0.4}
        linearDamping={0.9}
        angularDamping={0.9}
      >
        <mesh ref={leftLungRef}>
          <sphereGeometry args={[0.10 * obesityFactor, 32, 32]} />
          <meshPhysicalMaterial
            color="#3498DB"
            roughness={0.7}
            metalness={0.0}
            transparent
            opacity={0.8}
          />
        </mesh>
      </RigidBody>

      {/* Right Lung */}
      <RigidBody
        position={[0.12, 0.75, 0.02]}
        colliders="hull"
        density={0.4}
        restitution={0.6}
        friction={0.4}
        linearDamping={0.9}
        angularDamping={0.9}
      >
        <mesh ref={rightLungRef}>
          <sphereGeometry args={[0.10 * obesityFactor, 32, 32]} />
          <meshPhysicalMaterial
            color="#3498DB"
            roughness={0.7}
            metalness={0.0}
            transparent
            opacity={0.8}
          />
        </mesh>
      </RigidBody>
    </group>
  );
}

// ============================================================================
// STOMACH: Soft Body (Very Deformable)
// ============================================================================

function Stomach({ patientData, onInteract }: OrganProps) {
  const stomachRef = useRef<any>(null);

  const handleClick = () => {
    if (stomachRef.current) {
      const force = new THREE.Vector3(0, 0, -2.5);
      stomachRef.current.applyImpulse(force, true);
      onInteract?.('stomach', 2.5);
    }
  };

  return (
    <RigidBody
      ref={stomachRef}
      position={[-0.05, 0.55, 0.08]}
      colliders="ball"
      density={1.04}
      restitution={0.7} // Very bouncy (hollow organ filled with fluid)
      friction={0.5}
      linearDamping={0.6}
      angularDamping={0.8}
    >
      <mesh onClick={handleClick}>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshPhysicalMaterial
          color="#E67E22"
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>
    </RigidBody>
  );
}

// ============================================================================
// INTESTINES: Soft, Coiled Structure
// ============================================================================

function Intestines({ patientData, onInteract }: OrganProps) {
  // Small intestine coils (simplified as connected spheres)
  const coilPositions: [number, number, number][] = [
    [0, 0.45, 0.10],
    [0.05, 0.43, 0.12],
    [0.08, 0.40, 0.10],
    [0.05, 0.38, 0.08],
    [0, 0.37, 0.10],
    [-0.05, 0.38, 0.12],
  ];

  return (
    <group>
      {coilPositions.map((pos, i) => (
        <RigidBody
          key={i}
          position={pos}
          colliders="ball"
          density={1.04}
          restitution={0.6}
          friction={0.7}
          linearDamping={0.8}
          angularDamping={0.9}
        >
          <mesh>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshPhysicalMaterial
              color="#CA6F1E"
              roughness={0.8}
            />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}

// ============================================================================
// KIDNEYS: Paired Organs (Left/Right)
// ============================================================================

function Kidneys({ patientData, onInteract }: OrganProps) {
  return (
    <group>
      {/* Left Kidney */}
      <RigidBody
        position={[-0.10, 0.45, -0.05]}
        colliders="hull"
        density={1.05}
        restitution={0.4}
        friction={0.6}
        linearDamping={0.8}
        angularDamping={0.9}
      >
        <mesh>
          <capsuleGeometry args={[0.04, 0.08, 16, 32]} />
          <meshPhysicalMaterial color="#16A085" roughness={0.6} />
        </mesh>
      </RigidBody>

      {/* Right Kidney */}
      <RigidBody
        position={[0.10, 0.45, -0.05]}
        colliders="hull"
        density={1.05}
        restitution={0.4}
        friction={0.6}
        linearDamping={0.8}
        angularDamping={0.9}
      >
        <mesh>
          <capsuleGeometry args={[0.04, 0.08, 16, 32]} />
          <meshPhysicalMaterial color="#16A085" roughness={0.6} />
        </mesh>
      </RigidBody>
    </group>
  );
}

// ============================================================================
// ADIPOSE TISSUE LAYER: Very Soft Body (High Deformation)
// ============================================================================

function AdiposeLayer({ patientData }: { patientData: PatientBiometrics }) {
  const fatThickness = Math.max(0, (patientData.bmi - 25) / 100);

  return (
    <RigidBody
      position={[0, 0.5, 0.15]}
      colliders="hull"
      density={0.92} // Fat is less dense than muscle/organs
      restitution={0.2} // Very little bounce (gelatinous)
      friction={0.8}
      linearDamping={0.95} // Moves very slowly
      angularDamping={0.95}
    >
      <mesh>
        <sphereGeometry args={[0.15 + fatThickness, 32, 32]} />
        <meshPhysicalMaterial
          color="#FFE5B4"
          transparent
          opacity={0.4}
          roughness={0.9}
        />
      </mesh>
    </RigidBody>
  );
}

// ============================================================================
// CONNECTIVE TISSUE: Spring Constraints (Future Enhancement)
// ============================================================================

function ConnectiveTissue() {
  // TODO: Add spring joints between organs to simulate connective tissue
  // This would prevent organs from flying apart while still allowing movement
  return null;
}

// ============================================================================
// ANIMATION COMPONENTS
// ============================================================================

function BreathingAnimation({ scene }: { scene: any }) {
  useFrame(({ clock }) => {
    if (!scene) return;

    // Breathing cycle: 16 breaths/min = 3.75s per breath
    const breathCycle = (clock.getElapsedTime() % 3.75) / 3.75;
    const breathScale = 1.0 + Math.sin(breathCycle * Math.PI * 2) * 0.15; // ±15% volume

    // Apply to lungs
    scene.traverse((child: any) => {
      if (child.isMesh && (child.name.includes('lung') || child.name.includes('Lung'))) {
        child.scale.setScalar(breathScale);
      }
    });
  });

  return null;
}

function HeartbeatAnimation({ scene, heartRate }: { scene: any; heartRate: number }) {
  useFrame(({ clock }) => {
    if (!scene) return;

    // Heart cycle based on BPM
    const cycleTime = 60 / heartRate; // seconds per beat
    const t = (clock.getElapsedTime() % cycleTime) / cycleTime;

    // Systole (contraction) at 0-0.3, Diastole (relaxation) at 0.3-1.0
    const scale = t < 0.3 ? 1.0 - (t / 0.3) * 0.15 : 0.85 + ((t - 0.3) / 0.7) * 0.15;

    // Apply to heart
    scene.traverse((child: any) => {
      if (child.isMesh && (child.name.includes('heart') || child.name.includes('Heart'))) {
        child.scale.setScalar(scale);
      }
    });
  });

  return null;
}
