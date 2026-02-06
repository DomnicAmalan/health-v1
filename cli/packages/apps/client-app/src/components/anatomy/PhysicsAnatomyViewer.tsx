/**
 * PhysicsAnatomyViewer Component
 * Full 3D anatomy viewer with REAL-TIME PHYSICS
 *
 * Features:
 * - Soft body organ deformation
 * - Breathing animation
 * - Heartbeat simulation
 * - Patient position control (standing/sitting/supine/prone)
 * - Interactive palpation (click to compress organs)
 * - Gravity simulation
 * - Physics debug mode
 */

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { PhysicsAnatomyModel } from './PhysicsAnatomyModel';
import type { PatientBiometrics } from './MorphableBodyModel';
import { Loader2, Heart, Wind, User, Eye, Activity } from 'lucide-react';

interface PhysicsAnatomyViewerProps {
  patientData: PatientBiometrics;
  onOrganClick?: (organName: string, bodySystemId: string, force: number) => void;
  className?: string;
}

export function PhysicsAnatomyViewer({
  patientData,
  onOrganClick,
  className = '',
}: PhysicsAnatomyViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isBreathing, setIsBreathing] = useState(true);
  const [heartRate, setHeartRate] = useState(70); // BPM
  const [patientPosition, setPatientPosition] = useState<'standing' | 'sitting' | 'supine' | 'prone'>('standing');
  const [showPhysicsDebug, setShowPhysicsDebug] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleOrganInteraction = (organName: string, force: number) => {
    console.log(`Organ interaction: ${organName}, force: ${force}N`);
    // TODO: Map organ to body_system_id
    onOrganClick?.(organName, 'temp-id', force);
  };

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-lg ${className}`}>
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-300 text-sm">Initializing physics simulation...</p>
            <p className="text-gray-400 text-xs mt-2">
              Real-time soft body dynamics • Breathing • Heartbeat
            </p>
          </div>
        </div>
      )}

      {/* Physics Controls Panel */}
      <PhysicsControlsPanel
        isBreathing={isBreathing}
        setIsBreathing={setIsBreathing}
        heartRate={heartRate}
        setHeartRate={setHeartRate}
        patientPosition={patientPosition}
        setPatientPosition={setPatientPosition}
        showPhysicsDebug={showPhysicsDebug}
        setShowPhysicsDebug={setShowPhysicsDebug}
        showStats={showStats}
        setShowStats={setShowStats}
      />

      {/* Patient Biometrics Badge */}
      <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
        <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Patient Model (Physics Enabled)
        </h3>
        <div className="space-y-1 text-xs text-gray-300">
          <p>Height: <span className="text-white font-medium">{patientData.heightCm} cm</span></p>
          <p>Weight: <span className="text-white font-medium">{patientData.weightKg} kg</span></p>
          <p>BMI: <span className={`font-medium ${getBMIColorClass(patientData.bmi)}`}>
            {patientData.bmi.toFixed(1)}
          </span></p>
          <p className="pt-2 border-t border-gray-600">
            <Heart className="h-3 w-3 inline mr-1" />
            Heart Rate: <span className="text-red-400 font-medium">{heartRate} BPM</span>
          </p>
          <p>
            <Wind className="h-3 w-3 inline mr-1" />
            Breathing: <span className={isBreathing ? 'text-green-400' : 'text-gray-400'}>
              {isBreathing ? 'Active' : 'Paused'}
            </span>
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white text-xs max-w-xs">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Physics Interaction
        </h3>
        <ul className="space-y-1 text-gray-300">
          <li>• <span className="text-white">Click organs</span> to palpate (compress)</li>
          <li>• <span className="text-white">Watch heart</span> contract with each beat</li>
          <li>• <span className="text-white">See lungs</span> expand during breathing</li>
          <li>• <span className="text-white">Change position</span> to see gravity effects</li>
          <li>• Organs have realistic <span className="text-white">soft-body physics</span></li>
        </ul>
      </div>

      {/* 3D Canvas with Physics */}
      <Canvas
        shadows
        onCreated={() => setIsLoading(false)}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} fov={50} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 3, -5]} intensity={0.5} />

        <Environment preset="apartment" />

        {/* Physics Simulation */}
        <Suspense fallback={<LoadingMesh />}>
          <PhysicsAnatomyModel
            patientData={patientData}
            isBreathing={isBreathing}
            heartRate={heartRate}
            patientPosition={patientPosition}
            onOrganClick={handleOrganInteraction}
          />
        </Suspense>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1.0}
          maxDistance={5.0}
          target={[0, 0.5, 0]}
        />

        {/* Performance Stats */}
        {showStats && <Stats />}
      </Canvas>
    </div>
  );
}

// ============================================================================
// Physics Controls Panel
// ============================================================================

interface PhysicsControlsPanelProps {
  isBreathing: boolean;
  setIsBreathing: (val: boolean) => void;
  heartRate: number;
  setHeartRate: (val: number) => void;
  patientPosition: 'standing' | 'sitting' | 'supine' | 'prone';
  setPatientPosition: (val: 'standing' | 'sitting' | 'supine' | 'prone') => void;
  showPhysicsDebug: boolean;
  setShowPhysicsDebug: (val: boolean) => void;
  showStats: boolean;
  setShowStats: (val: boolean) => void;
}

function PhysicsControlsPanel({
  isBreathing,
  setIsBreathing,
  heartRate,
  setHeartRate,
  patientPosition,
  setPatientPosition,
  showPhysicsDebug,
  setShowPhysicsDebug,
  showStats,
  setShowStats,
}: PhysicsControlsPanelProps) {
  return (
    <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white max-w-sm">
      <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Physics Controls
      </h3>

      <div className="space-y-3 text-xs">
        {/* Breathing Toggle */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <Wind className="h-3 w-3" />
            Breathing
          </label>
          <button
            onClick={() => setIsBreathing(!isBreathing)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isBreathing
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {isBreathing ? 'Active' : 'Paused'}
          </button>
        </div>

        {/* Heart Rate Slider */}
        <div>
          <label className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-2">
              <Heart className="h-3 w-3" />
              Heart Rate
            </span>
            <span className="text-red-400 font-medium">{heartRate} BPM</span>
          </label>
          <input
            type="range"
            min="40"
            max="180"
            value={heartRate}
            onChange={(e) => setHeartRate(Number(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>Bradycardia</span>
            <span>Normal</span>
            <span>Tachycardia</span>
          </div>
        </div>

        {/* Patient Position */}
        <div>
          <label className="block mb-2 flex items-center gap-2">
            <User className="h-3 w-3" />
            Patient Position (Gravity)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['standing', 'sitting', 'supine', 'prone'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setPatientPosition(pos)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  patientPosition === pos
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Debug Options */}
        <div className="pt-3 border-t border-gray-600 space-y-2">
          <label className="flex items-center justify-between">
            <span>Performance Stats</span>
            <input
              type="checkbox"
              checked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
              className="rounded"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function LoadingMesh() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 1.5, 0.3]} />
      <meshStandardMaterial color="#3498db" wireframe />
    </mesh>
  );
}

function getBMIColorClass(bmi: number): string {
  if (bmi < 18.5) return 'text-yellow-300';
  if (bmi < 25) return 'text-green-400';
  if (bmi < 30) return 'text-yellow-400';
  if (bmi < 35) return 'text-orange-400';
  if (bmi < 40) return 'text-orange-500';
  return 'text-red-500';
}
