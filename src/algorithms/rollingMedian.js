/**
 * rollingMedian.js — BEYOND MED
 *
 * SPECIFICATION COMPLIANCE:
 * "For every parameter using CUSUM, establish a personalized baseline.
 *  The baseline must use a: Rolling Median.
 *  The rolling median represents the individual's normal/personal baseline
 *  rather than relying only on a generic population reference.
 *  CUSUM anomaly detection must compare incoming measurements against this
 *  personalized rolling-median baseline.
 *  Do not introduce another baseline method."
 */

/**
 * Computes the rolling median across an array of numeric measurements.
 * For each time step i, uses the window of prior measurements up to windowSize.
 *
 * @param {number[]} values - Array of numerical measurements
 * @param {number} windowSize - Rolling window size (default 7)
 * @returns {number[]} Array of rolling medians corresponding to each index
 */
export function computeRollingMedian(values, windowSize = 7) {
  if (!Array.isArray(values) || values.length === 0) return [];

  return values.map((_, i) => {
    const startIndex = Math.max(0, i - windowSize + 1);
    const windowSlice = values.slice(startIndex, i + 1);

    // Sort to compute median
    const sorted = [...windowSlice].sort((a, b) => a - b);
    const len = sorted.length;
    const mid = Math.floor(len / 2);

    if (len % 2 !== 0) {
      return sorted[mid];
    } else {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
  });
}
