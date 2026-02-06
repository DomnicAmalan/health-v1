/**
 * AnatomyViewer3D Component
 * Interactive 3D anatomy viewer with patient-specific morphing and clinical documentation
 */

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MorphableBodyModel, type PatientBiometrics } from './MorphableBodyModel';
import { Loader2 } from 'lucide-react';

interface AnatomyViewer3DProps {
  patientData: PatientBiometrics;
  onOrganClick?: (organName: string, bodySystemId: string, position: THREE.Vector3) => void;
  highlightedOrgan?: string | null;
  findingsCount?: Record<string, number>; // organ -> count of findings
  showAdiposeLayer?: boolean;
  showMuscles?: boolean;
  className?: string;
}

export function AnatomyViewer3D({
  patientData,
  onOrganClick,
  highlightedOrgan,
  findingsCount = {},
  showAdiposeLayer = true,
  showMuscles = false,
  className = '',
}: AnatomyViewer3DProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleOrganClick = (organName: string, position: THREE.Vector3) => {
    // TODO: Map organ name to body_system_id from body_systems table
    const bodySystemId = 'temp-id'; // Placeholder
    onOrganClick?.(organName, bodySystemId, position);
  };

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-lg ${className}`}>
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-300 text-sm">Loading patient anatomy...</p>
            <p className="text-gray-400 text-xs mt-2">
              Height: {patientData.heightCm}cm | Weight: {patientData.weightKg}kg | BMI: {patientData.bmi.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Controls Guide */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white text-sm max-w-xs">
        <h3 className="font-semibold mb-2">3D Controls</h3>
        <ul className="space-y-1 text-xs text-gray-300">
          <li><span className="font-medium">Left Click + Drag:</span> Rotate view</li>
          <li><span className="font-medium">Right Click + Drag:</span> Pan view</li>
          <li><span className="font-medium">Scroll:</span> Zoom in/out</li>
          <li><span className="font-medium">Click Organ:</span> Document findings</li>
        </ul>
      </div>

      {/* Patient Info Badge */}
      <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white">
        <h3 className="font-semibold mb-2 text-sm">Patient Model</h3>
        <div className="space-y-1 text-xs text-gray-300">
          <p>Height: <span className="text-white font-medium">{patientData.heightCm} cm</span></p>
          <p>Weight: <span className="text-white font-medium">{patientData.weightKg} kg</span></p>
          <p>BMI: <span className={`font-medium ${getBMIColorClass(patientData.bmi)}`}>
            {patientData.bmi.toFixed(1)} ({getBMICategory(patientData.bmi)})
          </span></p>
          <p>Age: <span className="text-white font-medium">{patientData.age} years</span></p>
          <p>Gender: <span className="text-white font-medium capitalize">{patientData.gender}</span></p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg p-3 text-white text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Selected Region</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Has Findings (Abnormal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Critical Finding</span>
          </div>
          {showAdiposeLayer && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-200 opacity-40"></div>
              <span>Adipose Tissue Layer</span>
            </div>
          )}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        onCreated={() => setIsLoading(false)}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} fov={50} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 3, -5]} intensity={0.5} />

        {/* Environment (HDRI lighting) */}
        <Environment preset="apartment" />

        {/* Suspense for model loading */}
        <Suspense fallback={<LoadingMesh />}>
          <MorphableBodyModel
            patientData={patientData}
            showAdiposeLayer={showAdiposeLayer}
            showMuscles={showMuscles}
            showOrgans={true}
            highlightedOrgan={highlightedOrgan}
            onOrganClick={handleOrganClick}
          />

          {/* Annotation Badges (finding counts on organs) */}
          {Object.entries(findingsCount).map(([organName, count]) => (
            <AnnotationBadge
              key={organName}
              organName={organName}
              count={count}
            />
          ))}
        </Suspense>

        {/* Orbit Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1.0}
          maxDistance={5.0}
          target={[0, 0.5, 0]} // Focus on torso
        />

        {/* Grid Helper (optional) */}
        {/* <gridHelper args={[10, 10]} /> */}
      </Canvas>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Loading placeholder mesh while model loads
 */
function LoadingMesh() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1.5, 0.3]} />
      <meshStandardMaterial color="#3498db" wireframe />
    </mesh>
  );
}

/**
 * Annotation badge showing finding count on organs
 */
interface AnnotationBadgeProps {
  organName: string;
  count: number;
}

function AnnotationBadge({ organName, count }: AnnotationBadgeProps) {
  // TODO: Get organ position from 3D model
  const position: [number, number, number] = [0, 0.5, 0]; // Placeholder

  return (
    <Html position={position}>
      <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
        {count}
      </div>
    </Html>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obese Class I';
  if (bmi < 40) return 'Obese Class II';
  return 'Obese Class III';
}

function getBMIColorClass(bmi: number): string {
  if (bmi < 18.5) return 'text-yellow-300';
  if (bmi < 25) return 'text-green-400';
  if (bmi < 30) return 'text-yellow-400';
  if (bmi < 35) return 'text-orange-400';
  if (bmi < 40) return 'text-orange-500';
  return 'text-red-500';
}
