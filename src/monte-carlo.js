/**
 * Monte Carlo orchestrator — runs many seeded simulations and computes quantile bands.
 */

import { simulate } from './simulate.js'

/**
 * Compute p10/p50/p90 quantiles from a sorted array.
 * Caller is responsible for sorting first.
 */
function quantile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = p * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

const MC_METRICS = ['roi', 'morale', 'debt', 'quality', 'experience']

/**
 * Run Monte Carlo simulation over many seeds and return quantile bands.
 *
 * @param {object} opts
 * @param {object} opts.sliders    - current slider values
 * @param {number} [opts.runs=200] - number of seeded runs
 * @param {number} [opts.weeks=52] - weeks per run
 * @returns {{ metrics: { [m]: { p10: number[], p50: number[], p90: number[] } }, runs, weeks }}
 */
export function runMonteCarlo({ sliders, runs = 200, weeks = 52 }) {
  // Collect all run snapshots: allData[metric][week] = [...runs values]
  const allData = {}
  MC_METRICS.forEach(m => {
    allData[m] = Array.from({ length: weeks }, () => [])
  })

  for (let seed = 1; seed <= runs; seed++) {
    const snapshots = simulate({ sliders, weeks, seed })
    snapshots.forEach((snap, wi) => {
      MC_METRICS.forEach(m => {
        if (snap[m] !== undefined && Number.isFinite(snap[m])) {
          allData[m][wi].push(snap[m])
        }
      })
    })
  }

  // Build quantile arrays
  const metrics = {}
  MC_METRICS.forEach(m => {
    const p10 = [], p50 = [], p90 = []
    for (let wi = 0; wi < weeks; wi++) {
      const sorted = allData[m][wi].slice().sort((a, b) => a - b)
      p10.push(quantile(sorted, 0.1))
      p50.push(quantile(sorted, 0.5))
      p90.push(quantile(sorted, 0.9))
    }
    metrics[m] = { p10, p50, p90 }
  })

  return { metrics, runs, weeks }
}
