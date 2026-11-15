/**
 * heuristics.js — BEYOND MED
 *
 * SPECIFICATION COMPLIANCE:
 * "Use heuristic-based anomaly detection for:
 *  - Blood Pressure
 *  - SpO₂
 *  - Respiratory Rate
 *  - Sleep Duration
 *  - Sleep Quality /100
 *  - Stress /100
 *  - Radiation Dosimeter
 *  - Gut Microbes
 *  Do not replace these with CUSUM or another machine-learning algorithm."
 */

/**
 * 1. Blood Pressure Heuristics
 * Standard clinical aerospace boundaries:
 * Systolic > 140 or Diastolic > 90 (Stage 1 Hypertension)
 * Systolic > 160 or Diastolic > 100 (Critical Hypertension)
 * Systolic < 90 or Diastolic < 60 (Hypotension)
 */
export function detectBloodPressureAnomalies(bpArray, timestamps) {
  const alerts = [];
  bpArray.forEach((bp, i) => {
    const { systolic, diastolic } = bp;
    if (systolic >= 140 || diastolic >= 90) {
      const isCritical = systolic >= 160 || diastolic >= 100;
      alerts.push({
        parameter: "Blood Pressure",
        detectionMethod: "Heuristics",
        index: i,
        timestamp: timestamps[i],
        value: `${systolic}/${diastolic}`,
        unit: "mmHg",
        severity: isCritical ? "critical" : "warning",
        message: `Blood Pressure elevation detected: ${systolic}/${diastolic} mmHg exceeds aerospace heuristic threshold (systolic >= 140 or diastolic >= 90 mmHg).`
      });
    } else if (systolic < 90 || diastolic < 60) {
      alerts.push({
        parameter: "Blood Pressure",
        detectionMethod: "Heuristics",
        index: i,
        timestamp: timestamps[i],
        value: `${systolic}/${diastolic}`,
        unit: "mmHg",
        severity: "warning",
        message: `Blood Pressure hypotension detected: ${systolic}/${diastolic} mmHg falls below heuristic floor (systolic < 90 or diastolic < 60 mmHg).`
      });
    }
  });
  return alerts;
}

/**
 * 2. SpO₂ Heuristics [Checked Per Minute]
 * Normal >= 95%
 * Hypoxemia: < 95% (warning), < 90% (critical)
 */
export function detectSpO2Anomalies(spo2Array, timestamps) {
  const alerts = [];
  spo2Array.forEach((val, i) => {
    if (val < 95) {
      alerts.push({
        parameter: "SpO₂",
        detectionMethod: "Heuristics (Per-Minute Check)",
        index: i,
        timestamp: timestamps[i],
        value: val,
        unit: "%",
        severity: val < 90 ? "critical" : "warning",
        message: `SpO₂ hypoxemia detected at 1-minute check (Minute ${i + 1}): ${val}% falls below normal physiological oxygen saturation threshold (< 95%).`
      });
    }
  });
  return alerts;
}

/**
 * 3. Respiratory Rate Heuristics
 * Normal adult range: 10–20 breaths/min
 * Tachypnea: > 20 breaths/min (warning), > 25 (critical)
 * Bradypnea: < 10 breaths/min
 */
export function detectRespiratoryRateAnomalies(rrArray, timestamps) {
  const alerts = [];
  rrArray.forEach((val, i) => {
    if (val > 20) {
      alerts.push({
        parameter: "Respiratory Rate",
        detectionMethod: "Heuristics",
        index: i,
        timestamp: timestamps[i],
        value: val,
        unit: "breaths/min",
        severity: val > 24 ? "critical" : "warning",
        message: `Respiratory Rate tachypnea detected: ${val} breaths/min exceeds resting baseline threshold (> 20 breaths/min).`
      });
    } else if (val < 10) {
      alerts.push({
        parameter: "Respiratory Rate",
        detectionMethod: "Heuristics",
        index: i,
        timestamp: timestamps[i],
        value: val,
        unit: "breaths/min",
        severity: "warning",
        message: `Respiratory Rate bradypnea detected: ${val} breaths/min is below minimum ventilation floor (< 10 breaths/min).`
      });
    }
  });
  return alerts;
}

/**
 * 4. Sleep Duration Heuristics
 * Normal astronaut rest requirement: 6.0–9.0 hours
 * Deprivation: < 6.0 hours (warning), < 4.5 hours (critical)
 * Excess: > 9.5 hours
 */
export function detectSleepDurationAnomalies(sdArray, timestamps) {
  const alerts = [];
  sdArray.forEach((val, i) => {
    if (val < 6.0) {
      alerts.push({
        parameter: "Sleep Duration",
        detectionMethod: "Heuristics",
        index: i,
        timestamp: timestamps[i],
        value: val,
        unit: "hours",
        severity: val < 4.5 ? "critical" : "warning",
        message: `Sleep Duration deficit detected: ${val} hours recorded, failing the minimum flight crew rest criteria (< 6.0 hours).`
      });
    } else if (val > 10.0) {
      alerts.push({
        parameter: "Sleep Duration",
        detectionMethod: "Heuristics",
        index: i,
        timestamp: timestamps[i],
        value: val,
        unit: "hours",
        severity: "warning",
        message: `Sleep Duration hypersomnia detected: ${val} hours exceeds flight schedule boundaries (> 10.0 hours).`
      });
    }
  });
  return alerts;
}

/**
 * 5. Sleep Quality Heuristics (score out of 100)
 * Normal: >= 65/100
 * Impaired: < 65/100 (warning), < 45/100 (critical)
 */
export function detectSleepQualityAnomalies(sqArray, timestamps) {
  const alerts = [];
  sqArray.forEach((val, i) => {
    if (val < 65) {
      alerts.push({
        parameter: "Sleep Quality",
        detectionMethod: "Heuristics",
        index: i,
        timestamp: timestamps[i],
        value: val,
        unit: "/100",
        severity: val < 45 ? "critical" : "warning",
        message: `Sleep Quality degradation detected: score ${val}/100 indicates significant sleep fragmentation or disruption (< 65/100).`
      });
    }
  });
  return alerts;
}

/**
 * 6. Stress Heuristics [Checked Per Minute] (score out of 100)
 * Normal nominal: <= 60/100
 * Elevated: > 60/100 (warning), > 80/100 (critical)
 */
export function detectStressAnomalies(stressArray, timestamps) {
  const alerts = [];
  stressArray.forEach((val, i) => {
    if (val > 60) {
      alerts.push({
        parameter: "Stress",
        detectionMethod: "Heuristics (Per-Minute Check)",
        index: i,
        timestamp: timestamps[i],
        value: val,
        unit: "/100",
        severity: val > 80 ? "critical" : "warning",
        message: `Stress index elevation detected at 1-minute check (Minute ${i + 1}): autonomic stress score reached ${val}/100, exceeding mission operational tolerance (> 60/100).`
      });
    }
  });
  return alerts;
}

/**
 * 7. Radiation Dosimeter Heuristics
 * Normal ISS / deep space background: ~0.3–0.8 mSv/day
 * Anomaly threshold: > 1.2 mSv/day (warning), > 3.0 mSv/day (critical solar particle event / EVA exposure)
 */
export function detectRadiationAnomalies(radArray, timestamps) {
  const alerts = [];
  radArray.forEach((val, i) => {
    if (val > 1.2) {
      alerts.push({
        parameter: "Radiation Dosimeter",
        detectionMethod: "Heuristics",
        index: i,
        timestamp: timestamps[i],
        value: val,
        unit: "mSv/day",
        severity: val > 3.0 ? "critical" : "warning",
        message: `Radiation Dosimeter spike detected: cumulative daily rate ${val} mSv/day exceeds safe ambient threshold (> 1.2 mSv/day).`
      });
    }
  });
  return alerts;
}

/**
 * 8. Gut Microbes Heuristics [Weekly Once Test Only]
 * Evaluated strictly on weekly metagenomic lab assays (diversity < 0.60 or pathogen present).
 */
export function detectGutMicrobeAnomalies(gutArray, timestamps) {
  const alerts = [];
  const reportedWeeks = new Set();

  gutArray.forEach((val, i) => {
    const { diversity, pathogenPresence, week } = val;
    const weekKey = week !== undefined ? week : i;

    // Weekly once test: avoid repeating identical daily/minute alerts for the same weekly assay
    if (reportedWeeks.has(weekKey)) return;

    if (pathogenPresence || diversity < 0.6) {
      reportedWeeks.add(weekKey);
      alerts.push({
        parameter: "Gut Microbes",
        detectionMethod: "Heuristics (Weekly Lab Test)",
        index: i,
        timestamp: timestamps[i],
        value: `Diversity: ${diversity.toFixed(2)}, Pathogen: ${pathogenPresence ? "DETECTED" : "None"}`,
        unit: "",
        severity: pathogenPresence ? "critical" : "warning",
        message: `Gut Microbes weekly assay anomaly detected (Week ${weekKey}): ${pathogenPresence ? "Active opportunistic pathogen identified; " : ""}${diversity < 0.6 ? `microbiome alpha diversity severely depleted (${diversity.toFixed(2)} < 0.60).` : ""}`
      });
    }
  });
  return alerts;
}

/**
 * Executes all specified heuristic anomaly detection algorithms.
 *
 * @param {object} rawData
 * @returns {object[]} Combined sorted array of alerts
 */
export function runAllHeuristics(rawData) {
  const ts = rawData.timestamps;
  const allAlerts = [
    ...detectBloodPressureAnomalies(rawData.bloodPressure, ts),
    ...detectSpO2Anomalies(rawData.spo2, ts),
    ...detectRespiratoryRateAnomalies(rawData.respiratoryRate, ts),
    ...detectSleepDurationAnomalies(rawData.sleepDuration, ts),
    ...detectSleepQualityAnomalies(rawData.sleepQuality, ts),
    ...detectStressAnomalies(rawData.stress, ts),
    ...detectRadiationAnomalies(rawData.radiationDosimeter, ts),
    ...detectGutMicrobeAnomalies(rawData.gutMicrobes, ts)
  ];

  return allAlerts.sort((a, b) => a.index - b.index);
}
