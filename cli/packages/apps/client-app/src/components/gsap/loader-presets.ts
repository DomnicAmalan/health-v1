/**
 * Healthcare Loader Presets
 * Pre-defined animation frames for different healthcare contexts
 */

/** Heartbeat/pulse animation - simulates ECG wave */
export const HEARTBEAT_FRAMES: number[][] = [
  [21, 22, 23],
  [14, 21, 22, 23, 28],
  [7, 14, 22, 28, 35],
  [0, 7, 15, 29, 35, 42],
  [1, 8, 16, 30, 36, 43],
  [2, 9, 17, 23, 31, 37, 44],
  [3, 10, 18, 24, 32, 38, 45],
  [4, 11, 19, 25, 33, 39, 46],
  [5, 12, 20, 26, 34, 40, 47],
  [6, 13, 27, 41, 48],
  [21, 22, 23],
  [21, 22, 23],
];

/** DNA helix spinning animation */
export const DNA_HELIX_FRAMES: number[][] = [
  [0, 6, 8, 12, 16, 20, 22, 26, 30, 34, 36, 40, 42, 48],
  [1, 5, 9, 11, 17, 19, 23, 25, 31, 33, 37, 39, 43, 47],
  [2, 4, 10, 18, 24, 32, 38, 44, 46],
  [3, 17, 25, 31, 45],
  [2, 4, 10, 18, 24, 32, 38, 44, 46],
  [1, 5, 9, 11, 17, 19, 23, 25, 31, 33, 37, 39, 43, 47],
  [0, 6, 8, 12, 16, 20, 22, 26, 30, 34, 36, 40, 42, 48],
];

/** Medical cross pulsing */
export const MEDICAL_CROSS_FRAMES: number[][] = [
  [24],
  [17, 23, 24, 25, 31],
  [10, 16, 17, 18, 22, 23, 24, 25, 26, 30, 31, 32, 38],
  [3, 9, 10, 11, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 37, 38, 39, 45],
  [10, 16, 17, 18, 22, 23, 24, 25, 26, 30, 31, 32, 38],
  [17, 23, 24, 25, 31],
  [24],
];

/** Circular loading - patient processing */
export const CIRCULAR_LOADING_FRAMES: number[][] = [
  [3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 13],
  [13, 20],
  [20, 27],
  [27, 34],
  [34, 41],
  [41, 48],
  [47, 48],
  [46, 47],
  [45, 46],
  [44, 45],
  [42, 44],
  [35, 42],
  [28, 35],
  [21, 28],
  [14, 21],
  [7, 14],
  [0, 7],
  [0, 1],
  [1, 2],
  [2, 3],
];

/** Scanning/diagnostic animation */
export const SCANNING_FRAMES: number[][] = [
  [0, 1, 2, 3, 4, 5, 6],
  [7, 8, 9, 10, 11, 12, 13],
  [14, 15, 16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25, 26, 27],
  [28, 29, 30, 31, 32, 33, 34],
  [35, 36, 37, 38, 39, 40, 41],
  [42, 43, 44, 45, 46, 47, 48],
  [35, 36, 37, 38, 39, 40, 41],
  [28, 29, 30, 31, 32, 33, 34],
  [21, 22, 23, 24, 25, 26, 27],
  [14, 15, 16, 17, 18, 19, 20],
  [7, 8, 9, 10, 11, 12, 13],
];

/** Pill/medication loading */
export const PILL_FRAMES: number[][] = [
  [16, 17, 18, 23, 24, 25, 30, 31, 32],
  [9, 10, 11, 16, 17, 18, 23, 24, 25, 30, 31, 32, 37, 38, 39],
  [2, 3, 4, 9, 10, 11, 16, 17, 18, 23, 24, 25, 30, 31, 32, 37, 38, 39, 44, 45, 46],
  [9, 10, 11, 16, 17, 18, 23, 24, 25, 30, 31, 32, 37, 38, 39],
  [16, 17, 18, 23, 24, 25, 30, 31, 32],
];

/** Blood drop animation */
export const BLOOD_DROP_FRAMES: number[][] = [
  [3],
  [2, 3, 4],
  [1, 2, 3, 4, 5, 10],
  [0, 1, 2, 3, 4, 5, 6, 9, 10, 11],
  [7, 8, 9, 10, 11, 12, 13, 16, 17, 18],
  [14, 15, 16, 17, 18, 19, 20, 23, 24, 25],
  [21, 22, 23, 24, 25, 26, 27, 30, 31, 32],
  [28, 29, 30, 31, 32, 33, 34, 37, 38, 39],
  [36, 37, 38, 39, 40, 44, 45, 46],
  [43, 44, 45, 46, 47],
  [44, 45, 46],
  [45],
];

/** Stethoscope wave */
export const STETHOSCOPE_FRAMES: number[][] = [
  [0, 7, 14, 21],
  [1, 8, 15, 22],
  [2, 9, 16, 23],
  [3, 10, 17, 24],
  [4, 11, 18, 25],
  [5, 12, 19, 26],
  [6, 13, 20, 27],
  [13, 20, 27, 34],
  [20, 27, 34, 41],
  [27, 34, 41, 48],
  [34, 41, 48],
  [41, 48],
  [48],
];

/** Ambulance siren effect */
export const AMBULANCE_FRAMES: number[][] = [
  [0, 1, 2, 7, 8, 9, 14, 15, 16],
  [1, 2, 3, 8, 9, 10, 15, 16, 17],
  [2, 3, 4, 9, 10, 11, 16, 17, 18],
  [3, 4, 5, 10, 11, 12, 17, 18, 19],
  [4, 5, 6, 11, 12, 13, 18, 19, 20],
  [32, 33, 34, 39, 40, 41, 46, 47, 48],
  [31, 32, 33, 38, 39, 40, 45, 46, 47],
  [30, 31, 32, 37, 38, 39, 44, 45, 46],
  [29, 30, 31, 36, 37, 38, 43, 44, 45],
  [28, 29, 30, 35, 36, 37, 42, 43, 44],
];

/** Vital signs monitor */
export const VITALS_MONITOR_FRAMES: number[][] = [
  [21, 22, 23, 24, 25, 26, 27],
  [14, 22, 23, 24, 25, 26, 34],
  [7, 15, 23, 24, 25, 33, 41],
  [0, 8, 16, 24, 32, 40, 48],
  [1, 9, 17, 24, 31, 39, 47],
  [2, 10, 18, 24, 30, 38, 46],
  [3, 11, 19, 24, 29, 37, 45],
  [4, 12, 20, 24, 28, 36, 44],
  [5, 13, 24, 35, 43],
  [6, 24, 42],
  [21, 22, 23, 24, 25, 26, 27],
];

/** Loading prescription */
export const PRESCRIPTION_FRAMES: number[][] = [
  [0, 1, 2, 3, 4, 5, 6],
  [0, 1, 2, 3, 4, 5, 6, 7, 13],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 20],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 19, 20, 21, 27],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 26, 27, 28, 34],
  [0, 1, 2, 3, 4, 5, 6, 7, 13, 14, 20, 21, 27, 28, 34, 35, 41],
  [0, 1, 2, 3, 4, 5, 6, 28, 34, 35, 41, 42, 48],
  [35, 41, 42, 43, 47, 48],
  [42, 43, 44, 46, 47, 48],
  [43, 44, 45, 46, 47, 48],
];

/** Simple dots wave - general purpose */
export const WAVE_FRAMES: number[][] = [
  [14, 7, 0, 8, 6, 13, 20],
  [14, 7, 13, 20, 16, 27, 21],
  [14, 20, 27, 21, 34, 24, 28],
  [27, 21, 34, 28, 41, 32, 35],
  [34, 28, 41, 35, 48, 40, 42],
  [34, 28, 41, 35, 48, 42, 46],
  [34, 28, 41, 35, 48, 42, 38],
  [34, 28, 41, 35, 48, 30, 21],
  [34, 28, 41, 48, 21, 22, 14],
  [34, 28, 41, 21, 14, 16, 27],
  [34, 28, 21, 14, 10, 20, 27],
  [28, 21, 14, 4, 13, 20, 27],
  [28, 21, 14, 12, 6, 13, 20],
  [28, 21, 14, 6, 13, 20, 11],
  [28, 21, 14, 6, 13, 20, 10],
  [14, 6, 13, 20, 9, 7, 21],
];

/** Export all presets with metadata */
export const LOADER_PRESETS = {
  heartbeat: {
    name: "Heartbeat",
    description: "ECG-style pulse animation",
    frames: HEARTBEAT_FRAMES,
    duration: 100,
  },
  dna: {
    name: "DNA Helix",
    description: "Spinning DNA strand",
    frames: DNA_HELIX_FRAMES,
    duration: 150,
  },
  medicalCross: {
    name: "Medical Cross",
    description: "Pulsing medical cross",
    frames: MEDICAL_CROSS_FRAMES,
    duration: 120,
  },
  circular: {
    name: "Circular",
    description: "Circular loading indicator",
    frames: CIRCULAR_LOADING_FRAMES,
    duration: 60,
  },
  scanning: {
    name: "Scanning",
    description: "Diagnostic scanning effect",
    frames: SCANNING_FRAMES,
    duration: 80,
  },
  pill: {
    name: "Pill",
    description: "Medication/pill pulsing",
    frames: PILL_FRAMES,
    duration: 150,
  },
  bloodDrop: {
    name: "Blood Drop",
    description: "Blood drop falling",
    frames: BLOOD_DROP_FRAMES,
    duration: 100,
  },
  stethoscope: {
    name: "Stethoscope",
    description: "Stethoscope wave",
    frames: STETHOSCOPE_FRAMES,
    duration: 100,
  },
  ambulance: {
    name: "Ambulance",
    description: "Emergency siren effect",
    frames: AMBULANCE_FRAMES,
    duration: 80,
  },
  vitals: {
    name: "Vitals Monitor",
    description: "Vital signs display",
    frames: VITALS_MONITOR_FRAMES,
    duration: 100,
  },
  prescription: {
    name: "Prescription",
    description: "Writing prescription",
    frames: PRESCRIPTION_FRAMES,
    duration: 120,
  },
  wave: {
    name: "Wave",
    description: "General purpose wave",
    frames: WAVE_FRAMES,
    duration: 100,
  },
} as const;

export type LoaderPresetKey = keyof typeof LOADER_PRESETS;
