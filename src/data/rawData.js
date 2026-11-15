// rawData.js — BEYOND MED Astronaut Health Monitoring System
// Exact 16 Health Parameters across 60 Continuous One-Minute Telemetry Steps (08:00:00 to 08:59:00 UTC)
//
// SPECIFICATION COMPLIANCE:
// - SpO₂: checked per minute
// - Vestibular Function (EOG): checked per minute with custom ONNX model
// - Stress: checked per minute (score /100)

// Generate 60 one-minute timestamps starting at 2026-11-15T08:00:00Z
const generateMinuteTimestamps = () => {
  const base = new Date("2026-11-15T08:00:00Z");
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(base.getTime() + i * 60 * 1000);
    return d.toISOString();
  });
};

const timestamps = generateMinuteTimestamps();

// 1. Resting Heart Rate (bpm) — CUSUM
const restingHeartRate = Array.from({ length: 60 }, (_, i) => {
  // Acute tachycardia spike at Minute 15 (corresponds with acute EVA / hypoxia event)
  if (i === 14) return 108;
  if (i === 15) return 102;
  return 70 + (i % 4);
});

// 2. Blood Pressure (mmHg) — Heuristics
const bloodPressure = Array.from({ length: 60 }, (_, i) => {
  if (i === 14) return { systolic: 154, diastolic: 98 };
  if (i === 42) return { systolic: 142, diastolic: 92 }; // Stress-coupled elevation
  return { systolic: 118 + (i % 5), diastolic: 78 + (i % 3) };
});

// 3. SpO₂ (%) — Heuristics [CHECKED PER MINUTE: 60 continuous 1-min readings]
const spo2 = Array.from({ length: 60 }, (_, i) => {
  // Acute arterial hypoxemia dip at Minute 15 (Step 15, checked per minute)
  if (i === 14) return 88;
  if (i === 15) return 91;
  return 97 + (i % 3);
});

// 4. Respiratory Rate (breaths/min) — Heuristics
const respiratoryRate = Array.from({ length: 60 }, (_, i) => {
  if (i === 14) return 27;
  if (i === 42) return 22;
  return 14 + (i % 3);
});

// 5. VO₂ Max (ml/kg/min) — CUSUM
const vo2Max = Array.from({ length: 60 }, (_, i) => {
  if (i === 14) return 33.4;
  return 45.8 + ((i % 4) * 0.1);
});

// 6. Muscle Mass (kg) [via Bioelectrical Impedance Analysis] — CUSUM
const muscleMass = Array.from({ length: 60 }, (_, i) => {
  if (i === 52) return 62.3; // Muscle mass shift
  return 74.8 + ((i % 5) * 0.1);
});

// 7. Spinal Deformity (degrees: °) — CUSUM
const spinalDeformity = Array.from({ length: 60 }, (_, i) => {
  if (i === 52) return 8.4;
  return 0.2 + ((i % 3) * 0.05);
});

// 8. Sleep Duration (hours) — Heuristics
const sleepDuration = Array.from({ length: 60 }, () => 7.5);

// 9. Sleep Quality (score out of 100) — Heuristics
const sleepQuality = Array.from({ length: 60 }, () => 84);

// 10. Stress (score out of 100) — Heuristics [CHECKED PER MINUTE: 60 continuous 1-min readings]
const stress = Array.from({ length: 60 }, (_, i) => {
  // Acute autonomic stress surge at Minute 43 (Step 43, checked per minute)
  if (i === 42) return 89;
  if (i === 43) return 84;
  if (i === 14) return 74; // Concurrent stress during hypoxia
  return 25 + (i % 6);
});

// 11. Radiation Dosimeter (mSv/day) — Heuristics
const radiationDosimeter = Array.from({ length: 60 }, (_, i) => {
  if (i === 35) return 4.35; // Solar particle / orbital radiation surge
  return 0.46 + ((i % 5) * 0.01);
});

// 12. Vestibular Function (EOG index) — EOG + custom ONNX model [CHECKED PER MINUTE: 60 continuous 1-min readings]
const vestibular = Array.from({ length: 60 }, (_, i) => {
  // Acute neurovestibular SMS / nystagmus spike at Minute 28 (Step 28, checked per minute by ONNX)
  if (i === 27) return 385.0;
  return 1.8 + ((i % 7) * 0.2);
});

// 13. Range of Motion (degrees: °) — CUSUM
const rangeOfMotion = Array.from({ length: 60 }, (_, i) => {
  if (i === 52) return 52.1;
  return 88.2 + ((i % 4) * 0.2);
});

// 14. Gut Microbes (diversity index & pathogen) — Heuristics [WEEKLY ONCE TEST ONLY]
// Evaluated once per week via on-board metagenomic assay (not daily).
const gutMicrobes = Array.from({ length: 60 }, (_, i) => {
  const isWeek4Assay = i >= 56;
  return {
    week: isWeek4Assay ? 4 : 3,
    assayDate: isWeek4Assay ? "Week 4 Assay (Sol 28)" : "Week 3 Assay (Sol 21)",
    diversity: isWeek4Assay ? 0.38 : 0.87,
    pathogenPresence: isWeek4Assay ? true : false,
    isTestStep: i === 56 || i === 0,
    testFrequency: "Weekly once test only"
  };
});

// 15. Nutrition (calories, carbohydrates, protein, fat) — CUSUM for each component
const nutrition = {
  calories: Array.from({ length: 60 }, (_, i) => (i === 48 ? 1450 : 2650)),
  carbohydrates: Array.from({ length: 60 }, (_, i) => (i === 48 ? 175 : 330)),
  protein: Array.from({ length: 60 }, (_, i) => (i === 48 ? 64 : 128)),
  fat: Array.from({ length: 60 }, (_, i) => (i === 48 ? 48 : 88))
};

// 16. Calories Burned (kcal) — CUSUM
const caloriesBurned = Array.from({ length: 60 }, (_, i) => {
  if (i === 14) return 3850;
  return 2350;
});

export const rawData = {
  timestamps,
  samplingIntervals: {
    spo2: "1 minute (continuous check)",
    vestibular: "1 minute (continuous EOG + ONNX check)",
    stress: "1 minute (continuous check)",
    gutMicrobes: "Weekly once test only (7-day metagenomic assay)",
    restingHeartRate: "continuous stream",
    bloodPressure: "continuous stream",
    respiratoryRate: "continuous stream"
  },
  restingHeartRate,
  get heartRate() {
    return this.restingHeartRate;
  },
  bloodPressure,
  spo2,
  respiratoryRate,
  vo2Max,
  muscleMass,
  spinalDeformity,
  sleepDuration,
  sleepQuality,
  stress,
  radiationDosimeter,
  vestibular,
  rangeOfMotion,
  gutMicrobes,
  nutrition,
  caloriesBurned
};

export default rawData;
