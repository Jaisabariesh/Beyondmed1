// rawData.js — BEYOND MED Astronaut Health Monitoring System
// Exact 16 Health Parameters across 25 Mission Days (Day 1 to Day 25)
//
// SPECIFICATION & MISSION TIMELINE:
// - Duration: 25 Days (Sol 1 through Sol 25)
// - Per-Minute Telemetry: SpO₂, Vestibular Function (EOG + ONNX), and Stress are checked
//   continuously every minute (1,440 readings/day × 25 days = 36,000 total minute data points)
// - CUSUM Parameters (Personalized Rolling-Median Baseline):
//   Resting Heart Rate, VO₂ Max, Muscle Mass (BIA + CUSUM), Range of Motion (degrees),
//   Nutrition (calories, carbohydrates, protein, fat), Calories Burned
// - Heuristic Parameters:
//   Blood Pressure, SpO₂, Respiratory Rate, Sleep Duration, Sleep Quality (/100),
//   Stress (/100), Radiation Dosimeter, Gut Microbes (Weekly once test only)
// - Vestibular: EOG + custom ONNX model (checked per minute)

// 1. Generate 25 Day timestamps: 2026-11-01 to 2026-11-25
const generateDayTimestamps = () => {
  const base = new Date("2026-11-01T08:00:00Z");
  return Array.from({ length: 25 }, (_, i) => {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    return d.toISOString();
  });
};

export const timestamps = generateDayTimestamps();

// 2. Continuous 1-Minute Telemetry for SpO₂, Vestibular (EOG), and Stress across all 25 Days
// 25 days × 1,440 minutes = 36,000 continuous minute checks
const MINUTES_PER_DAY = 1440;
const TOTAL_MINUTES = 25 * MINUTES_PER_DAY;

const minuteTimestamps = [];
const minuteSpo2 = new Float32Array(TOTAL_MINUTES);
const minuteVestibular = new Float32Array(TOTAL_MINUTES);
const minuteStress = new Float32Array(TOTAL_MINUTES);

const baseMinuteDate = new Date("2026-11-01T00:00:00Z");

// Generate 36,000 minute readings across 25 days
for (let day = 0; day < 25; day++) {
  const dayOffset = day * MINUTES_PER_DAY;

  for (let min = 0; min < MINUTES_PER_DAY; min++) {
    const idx = dayOffset + min;
    const minuteTime = new Date(baseMinuteDate.getTime() + idx * 60 * 1000);
    minuteTimestamps.push(minuteTime.toISOString());

    // Nominal minute variations
    let spo2Val = 97 + ((min % 5) * 0.4) - ((day % 3) * 0.2);
    let vestVal = 1.8 + ((min % 7) * 0.15) + ((day % 4) * 0.05);
    let stressVal = 26 + (min % 12) + ((day % 5) * 1.5);

    // Day 15 Anomaly: Acute Hypoxemia & Autonomic Stress surge during EVA (minutes 840–860 = 14:00–14:20 UTC)
    if (day === 14 && min >= 840 && min <= 860) {
      spo2Val = min === 848 ? 88.0 : 90.5;
      stressVal = min === 848 ? 89.0 : 82.0;
    }

    // Day 11 Anomaly: Acute Neurovestibular SMS / Nystagmus spike (minutes 420–435 = 07:00–07:15 UTC)
    if (day === 10 && min >= 420 && min <= 435) {
      vestVal = min === 425 ? 385.0 : 290.0;
    }

    // Day 19 Anomaly: Autonomic stress elevation during orbital docking emergency (minutes 610–630 = 10:10–10:30 UTC)
    if (day === 18 && min >= 610 && min <= 630) {
      stressVal = min === 618 ? 86.0 : 78.0;
    }

    minuteSpo2[idx] = parseFloat(spo2Val.toFixed(1));
    minuteVestibular[idx] = parseFloat(vestVal.toFixed(2));
    minuteStress[idx] = Math.round(stressVal);
  }
}

// 3. Daily Telemetry Datasets (25 Days)
// 1. Resting Heart Rate (bpm) — CUSUM
const restingHeartRate = Array.from({ length: 25 }, (_, i) => {
  // Acute tachycardia spike on Day 15 during EVA
  if (i === 14) return 106;
  if (i === 15) return 94; // Residual post-EVA elevation
  return 68 + (i % 4);
});

// 2. Blood Pressure (mmHg) — Heuristics
const bloodPressure = Array.from({ length: 25 }, (_, i) => {
  if (i === 14) return { systolic: 154, diastolic: 96 }; // Day 15 EVA hypertensive response
  if (i === 18) return { systolic: 142, diastolic: 92 }; // Day 19 Docking stress elevation
  return { systolic: 118 + (i % 5), diastolic: 78 + (i % 3) };
});

// 3. SpO₂ (%) — Heuristics [CHECKED PER MINUTE: Daily representative shows worst 1-min check of the day]
const spo2 = Array.from({ length: 25 }, (_, i) => {
  // Day 15 had acute hypoxemic dip to 88% at Minute 848
  if (i === 14) return 88;
  return 97 + (i % 3);
});

// 4. Respiratory Rate (breaths/min) — Heuristics
const respiratoryRate = Array.from({ length: 25 }, (_, i) => {
  if (i === 14) return 26; // Day 15 EVA tachypnea
  if (i === 18) return 22; // Day 19 stress tachypnea
  return 14 + (i % 3);
});

// 5. VO₂ Max (ml/kg/min) — CUSUM
const vo2Max = Array.from({ length: 25 }, (_, i) => {
  if (i === 14) return 33.2; // Day 15 acute aerobic drop
  return 46.2 + ((i % 4) * 0.15);
});

// 6. Muscle Mass (kg) [via Bioelectrical Impedance Analysis] — CUSUM
const muscleMass = Array.from({ length: 25 }, (_, i) => {
  if (i >= 21) return 62.4; // Day 22–25 microgravity muscle atrophy shift
  return 75.2 - (i * 0.12);
});

// 7. Spinal Deformity (degrees: °) — CUSUM (Kept in data per spec, hidden in UI)
const spinalDeformity = Array.from({ length: 25 }, (_, i) => {
  if (i >= 21) return 7.8;
  return 0.3 + ((i % 4) * 0.08);
});

// 8. Sleep Duration (hours) — Heuristics
const sleepDuration = Array.from({ length: 25 }, (_, i) => {
  if (i === 8) return 4.5; // Day 9 critical sleep restriction
  return 7.5 + ((i % 3) * 0.2);
});

// 9. Sleep Quality (score out of 100) — Heuristics
const sleepQuality = Array.from({ length: 25 }, (_, i) => {
  if (i === 8) return 46; // Day 9 sleep disruption
  return 84 + (i % 4);
});

// 10. Stress (score out of 100) — Heuristics [CHECKED PER MINUTE: Daily representative shows peak 1-min surge]
const stress = Array.from({ length: 25 }, (_, i) => {
  if (i === 14) return 89; // Day 15 EVA stress peak at Minute 848
  if (i === 18) return 86; // Day 19 emergency docking peak at Minute 618
  return 28 + (i % 8);
});

// 11. Radiation Dosimeter (mSv/day) — Heuristics
const radiationDosimeter = Array.from({ length: 25 }, (_, i) => {
  if (i === 17) return 4.35; // Day 18 Solar particle event / radiation surge
  return 0.48 + ((i % 4) * 0.02);
});

// 12. Vestibular Function (EOG index) — EOG + custom ONNX model [CHECKED PER MINUTE: Daily peak]
const vestibular = Array.from({ length: 25 }, (_, i) => {
  // Day 11 acute neurovestibular SMS outlier at Minute 425
  if (i === 10) return 385.0;
  return 1.85 + ((i % 5) * 0.15);
});

// 13. Range of Motion (degrees: °) — CUSUM
const rangeOfMotion = Array.from({ length: 25 }, (_, i) => {
  if (i >= 21) return 51.5; // Day 22–25 microgravity joint stiffness
  return 88.5 - ((i % 3) * 0.4);
});

// 14. Gut Microbes (diversity index & pathogen) — Heuristics [WEEKLY ONCE TEST ONLY]
// In a 25-day mission, evaluated once per week (Sol 7, Sol 14, Sol 21, Sol 24)
const gutMicrobes = Array.from({ length: 25 }, (_, i) => {
  const weekNumber = i < 7 ? 1 : i < 14 ? 2 : i < 21 ? 3 : 4;
  const isWeek4Assay = weekNumber === 4;
  const isAssayDay = i === 6 || i === 13 || i === 20 || i === 23;

  return {
    day: i + 1,
    week: weekNumber,
    assayDate: `Week ${weekNumber} Lab Assay (Sol ${weekNumber * 7 > 25 ? 24 : weekNumber * 7})`,
    diversity: isWeek4Assay ? 0.38 : 0.86,
    pathogenPresence: isWeek4Assay ? true : false,
    isTestStep: isAssayDay,
    testFrequency: "Weekly once test only (evaluated Sol 7, 14, 21, 24)"
  };
});

// 15. Nutrition (calories, carbohydrates, protein, fat) — CUSUM for each component
const nutrition = {
  calories: Array.from({ length: 25 }, (_, i) => (i === 11 ? 1420 : 2650)), // Day 12 calorie deficit
  carbohydrates: Array.from({ length: 25 }, (_, i) => (i === 11 ? 168 : 330)),
  protein: Array.from({ length: 25 }, (_, i) => (i === 11 ? 62 : 128)),
  fat: Array.from({ length: 25 }, (_, i) => (i === 11 ? 44 : 88))
};

// 16. Calories Burned (kcal) — CUSUM
const caloriesBurned = Array.from({ length: 25 }, (_, i) => {
  if (i === 14) return 3850; // Day 15 high EVA energy expenditure
  return 2350 + ((i % 4) * 20);
});

// Helper: retrieve the 1,440 minute data points for any specific mission day
export function getMinuteTelemetryForDay(dayIndex) {
  const safeDay = Math.max(0, Math.min(24, dayIndex));
  const start = safeDay * MINUTES_PER_DAY;
  const end = start + MINUTES_PER_DAY;

  return {
    day: safeDay + 1,
    date: timestamps[safeDay],
    totalMinutes: MINUTES_PER_DAY,
    spo2: minuteSpo2.slice(start, end),
    vestibular: minuteVestibular.slice(start, end),
    stress: minuteStress.slice(start, end),
    timestamps: minuteTimestamps.slice(start, end)
  };
}

export const rawData = {
  durationDays: 25,
  timestamps,
  samplingIntervals: {
    missionSpan: "25 Days (Sol 1 to Sol 25)",
    spo2: "1 minute continuous check (1,440 checks/day × 25 days = 36,000 readings)",
    vestibular: "1 minute continuous EOG + ONNX check (1,440 checks/day × 25 days)",
    stress: "1 minute continuous check (1,440 checks/day × 25 days)",
    gutMicrobes: "Weekly once test only (not daily, evaluated Sol 7, 14, 21, 24)",
    restingHeartRate: "Daily resting average (25-day CUSUM)",
    bloodPressure: "Daily resting evaluation",
    respiratoryRate: "Daily resting evaluation",
    vo2Max: "Daily aerobic assessment",
    muscleMass: "Daily BIA bioelectrical impedance",
    sleepDuration: "Daily sleep monitoring",
    sleepQuality: "Daily sleep score (/100)",
    radiationDosimeter: "Daily cumulative dosimeter",
    rangeOfMotion: "Daily goniometry (degrees)",
    nutrition: "Daily dietary logging",
    caloriesBurned: "Daily metabolic expenditure"
  },
  minuteTelemetry: {
    totalMinutes: TOTAL_MINUTES,
    timestamps: minuteTimestamps,
    spo2: minuteSpo2,
    vestibular: minuteVestibular,
    stress: minuteStress,
    getForDay: getMinuteTelemetryForDay
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
