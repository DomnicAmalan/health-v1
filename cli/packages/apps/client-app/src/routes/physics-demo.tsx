/**
 * Physics Anatomy Demo Route
 * Unprotected route for testing the 3D physics anatomy viewer
 */

import { createFileRoute } from '@tanstack/react-router';
import { PhysicsAnatomyViewer } from '@/components/anatomy/PhysicsAnatomyViewer';
import type { PatientBiometrics } from '@/components/anatomy/MorphableBodyModel';

export const Route = createFileRoute('/physics-demo')({
  component: PhysicsDemoPage,
});

function PhysicsDemoPage() {
  // Sample patient data for testing
  const samplePatients: Record<string, PatientBiometrics> = {
    normal: {
      heightCm: 170,
      weightKg: 70,
      bmi: 24.2,
      age: 35,
      sex: 'M',
    },
    underweight: {
      heightCm: 175,
      weightKg: 55,
      bmi: 18.0,
      age: 28,
      sex: 'F',
    },
    overweight: {
      heightCm: 165,
      weightKg: 80,
      bmi: 29.4,
      age: 45,
      sex: 'M',
    },
    obese: {
      heightCm: 160,
      weightKg: 95,
      bmi: 37.1,
      age: 52,
      sex: 'F',
    },
  };

  const [selectedPreset, setSelectedPreset] = useState<keyof typeof samplePatients>('normal');
  const [customPatient, setCustomPatient] = useState<PatientBiometrics>(samplePatients.normal);

  const calculateBMI = (height: number, weight: number) => {
    const heightM = height / 100;
    return weight / (heightM * heightM);
  };

  const handleCustomChange = (field: keyof PatientBiometrics, value: number | string) => {
    const updated = { ...customPatient, [field]: value };
    if (field === 'heightCm' || field === 'weightKg') {
      updated.bmi = calculateBMI(
        field === 'heightCm' ? value as number : customPatient.heightCm,
        field === 'weightKg' ? value as number : customPatient.weightKg
      );
    }
    setCustomPatient(updated);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h1 className="text-3xl font-bold text-white mb-2">
            3D Anatomy Physics Viewer - Demo
          </h1>
          <p className="text-gray-400">
            Real-time soft-body physics simulation with patient-specific morphing
          </p>
        </div>

        {/* Patient Presets */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">Patient Presets</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {(Object.keys(samplePatients) as Array<keyof typeof samplePatients>).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setSelectedPreset(preset);
                  setCustomPatient(samplePatients[preset]);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPreset === preset
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="font-semibold capitalize mb-2">{preset}</div>
                <div className="text-sm space-y-1">
                  <div>BMI: {samplePatients[preset].bmi.toFixed(1)}</div>
                  <div>{samplePatients[preset].heightCm}cm / {samplePatients[preset].weightKg}kg</div>
                </div>
              </button>
            ))}
          </div>

          {/* Custom Controls */}
          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Custom Patient Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={customPatient.heightCm}
                  onChange={(e) => handleCustomChange('heightCm', Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min="30"
                  max="200"
                  value={customPatient.weightKg}
                  onChange={(e) => handleCustomChange('weightKg', Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customPatient.age}
                  onChange={(e) => handleCustomChange('age', Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <span className="text-gray-300">Calculated BMI: </span>
              <span className="text-xl font-bold text-white">{customPatient.bmi.toFixed(1)}</span>
              <span className="ml-4 text-sm text-gray-400">
                {customPatient.bmi < 18.5 && '(Underweight)'}
                {customPatient.bmi >= 18.5 && customPatient.bmi < 25 && '(Normal)'}
                {customPatient.bmi >= 25 && customPatient.bmi < 30 && '(Overweight)'}
                {customPatient.bmi >= 30 && '(Obese)'}
              </span>
            </div>
          </div>
        </div>

        {/* 3D Viewer */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div style={{ height: '800px' }}>
            <PhysicsAnatomyViewer
              patientData={customPatient}
              onOrganClick={(organName, bodySystemId, force) => {
                console.log('Organ clicked:', { organName, bodySystemId, force });
              }}
            />
          </div>
        </div>

        {/* Features Info */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">Physics Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-semibold text-white">Soft-Body Physics</div>
                <div>Organs deform realistically when compressed</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-semibold text-white">Breathing Simulation</div>
                <div>Lungs expand/contract at 16 breaths/min</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-semibold text-white">Heartbeat Animation</div>
                <div>Cardiac contraction adjustable 40-180 BPM</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-semibold text-white">BMI Morphing</div>
                <div>Body shape adapts to patient metrics</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-semibold text-white">Gravity Simulation</div>
                <div>4 positions: standing/sitting/supine/prone</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <div className="font-semibold text-white">Interactive Palpation</div>
                <div>Click organs to compress with force feedback</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import useState
import { useState } from 'react';
