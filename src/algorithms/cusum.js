/**
 * cusum.js — BEYOND MED
 *
 * SPECIFICATION COMPLIANCE:
 * "CUSUM anomaly detection must compare incoming measurements against this
 *  personalized rolling-median baseline.
 *  CUSUM parameters are:
 *  - Resting Heart Rate
 *  - VO₂ Max
 *  - Muscle Mass (Bioelectrical Impedance Analysis + CUSUM)
 *  - Spinal Deformity
 *  - Range of Motion (measured in degrees)
 *  - Nutrition: calories, carbohydrates, protein and fat
 *  - Calories Burned"
 */

import { computeRollingMedian } from "./rollingMedian.js";

/**
 * Executes tabular two-sided CUSUM against a personalized rolling-median baseline.
 *
 * @param {number[]} values - Raw measurement series
 * @param {string[]} timestamps - Corresponding telemetry timestamps
 * @param {object} options - Configuration options
 * @param {string} options.label - Parameter name
 * @param {string} options.unit - Parameter measurement unit
 * @param {number} [options.windowSize=7] - Window for personalized rolling median
 * @param {number} [options.thresholdMultiplier=4.5] - Decision threshold h in units of sigma
 * @param {number} [options.allowanceMultiplier=0.5] - Allowance k in units of sigma
 * @returns {{
 *   alerts: Array<{
 *     parameter: string,
 *     detectionMethod: string,
 *     index: number,
 *     timestamp: string,
 *     value: number,
 *     baseline: number,
 *     unit: string,
 *     deviation: number,
 *     cusumHigh: number,
 *     cusumLow: number,
 *     severity: string,
 *     message: string
 *   }>,
 *   baseline: number[],
 *   cusumHigh: number[],
 *   cusumLow: number[]
 * }}
 */
export function runCUSUM(values, timestamps, options = {}) {
  const {
    label = "Parameter",
    unit = "",
    windowSize = 7,
    thresholdMultiplier = 4.5,
    allowanceMultiplier = 0.5
  } = options;

  if (!Array.isArray(values) || values.length === 0) {
    return { alerts: [], baseline: [], cusumHigh: [], cusumLow: [] };
  }

  // 1. Establish personalized baseline using Rolling Median
  const baseline = computeRollingMedian(values, windowSize);

  // 2. Estimate variability (sigma) from baseline residuals
  const residuals = values.map((val, idx) => val - baseline[idx]);
  const absDeviations = residuals.map(r => Math.abs(r)).sort((a, b) => a - b);
  // Median Absolute Deviation (MAD) provides a robust estimator of sigma
  const mad = absDeviations[Math.floor(absDeviations.length / 2)] || 1;
  const sigma = Math.max(1.4826 * mad, 0.05);

  const k = allowanceMultiplier * sigma;
  const h = thresholdMultiplier * sigma;

  const cusumHigh = new Array(values.length).fill(0);
  const cusumLow = new Array(values.length).fill(0);
  const alerts = [];

  for (let i = 1; i < values.length; i++) {
    const deviation = values[i] - baseline[i];

    cusumHigh[i] = Math.max(0, cusumHigh[i - 1] + deviation - k);
    cusumLow[i] = Math.max(0, cusumLow[i - 1] - deviation - k);

    if (cusumHigh[i] > h || cusumLow[i] > h) {
      const isHigh = cusumHigh[i] > h;
      const direction = isHigh ? "upward shift" : "downward shift";
      const cusumScore = isHigh ? cusumHigh[i] : cusumLow[i];

      alerts.push({
        parameter: label,
        detectionMethod: "CUSUM (Personalized Rolling-Median Baseline)",
        index: i,
        timestamp: timestamps[i],
        value: values[i],
        baseline: parseFloat(baseline[i].toFixed(2)),
        unit,
        deviation: parseFloat(deviation.toFixed(2)),
        cusumHigh: parseFloat(cusumHigh[i].toFixed(2)),
        cusumLow: parseFloat(cusumLow[i].toFixed(2)),
        severity: cusumScore > h * 1.5 ? "critical" : "warning",
        message: `${label} CUSUM anomaly detected: current reading ${values[i]} ${unit} exhibits significant ${direction} from personalized rolling median baseline (${baseline[i].toFixed(2)} ${unit}).`
      });

      // Reset accumulator after alert
      cusumHigh[i] = 0;
      cusumLow[i] = 0;
    }
  }

  return { alerts, baseline, cusumHigh, cusumLow };
}

/**
 * Runs CUSUM across all required CUSUM parameters specified in BEYOND MED:
 * 1. Resting Heart Rate
 * 2. VO₂ Max
 * 3. Muscle Mass (Bioelectrical Impedance Analysis + CUSUM)
 * 4. Spinal Deformity
 * 5. Range of Motion (degrees)
 * 6. Nutrition (calories, carbohydrates, protein, fat)
 * 7. Calories Burned
 *
 * @param {object} rawData
 * @returns {object[]} Combined sorted array of alerts
 */
export function runAllCUSUM(rawData) {
  const ts = rawData.timestamps;
  const allAlerts = [];

  // 1. Resting Heart Rate
  allAlerts.push(
    ...runCUSUM(rawData.restingHeartRate || rawData.heartRate, ts, {
      label: "Resting Heart Rate",
      unit: "bpm"
    }).alerts
  );

  // 2. VO₂ Max
  allAlerts.push(
    ...runCUSUM(rawData.vo2Max, ts, {
      label: "VO₂ Max",
      unit: "ml/kg/min"
    }).alerts
  );

  // 3. Muscle Mass (Bioelectrical Impedance Analysis + CUSUM)
  allAlerts.push(
    ...runCUSUM(rawData.muscleMass, ts, {
      label: "Muscle Mass",
      unit: "kg"
    }).alerts
  );

  // 4. Spinal Deformity
  allAlerts.push(
    ...runCUSUM(rawData.spinalDeformity, ts, {
      label: "Spinal Deformity",
      unit: "°"
    }).alerts
  );

  // 5. Range of Motion (degrees: °)
  allAlerts.push(
    ...runCUSUM(rawData.rangeOfMotion, ts, {
      label: "Range of Motion",
      unit: "°"
    }).alerts
  );

  // 6. Nutrition — Calories, Carbohydrates, Protein, Fat
  allAlerts.push(
    ...runCUSUM(rawData.nutrition.calories, ts, {
      label: "Nutrition: Calories",
      unit: "kcal"
    }).alerts
  );
  allAlerts.push(
    ...runCUSUM(rawData.nutrition.carbohydrates, ts, {
      label: "Nutrition: Carbohydrates",
      unit: "g"
    }).alerts
  );
  allAlerts.push(
    ...runCUSUM(rawData.nutrition.protein, ts, {
      label: "Nutrition: Protein",
      unit: "g"
    }).alerts
  );
  allAlerts.push(
    ...runCUSUM(rawData.nutrition.fat, ts, {
      label: "Nutrition: Fat",
      unit: "g"
    }).alerts
  );

  // 7. Calories Burned
  allAlerts.push(
    ...runCUSUM(rawData.caloriesBurned, ts, {
      label: "Calories Burned",
      unit: "kcal"
    }).alerts
  );

  return allAlerts.sort((a, b) => a.index - b.index);
}
