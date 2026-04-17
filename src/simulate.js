/**
 * Headless single-run simulator — same tick sequence as main.js's tickLoop
 * but pure (no DOM, no alerts, no dialog entries).
 * Persona events are narrative-only; aggregate morale already captures their effect.
 */

import { computeState } from './model.js'
import { tickDebt, tickMorale, tickJevons, tickSeniority } from './engine.js'
import { tickLearning, resetLearning } from './learning.js'

// --- Seeded PRNG (mulberry32) ---
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Box-Muller using seeded rand — returns one Gaussian sample N(0,1).
// Cheaper approximation (sum-of-three) is fine for noise but BM gives better tails.
function gaussian(rand) {
  let u, v
  do { u = rand() } while (u === 0)
  do { v = rand() } while (v === 0)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Compute ROI index from a tick state — same formula as history-chart.js pushHistory.
 * Extracted so simulate.js and pushHistory both call the same logic.
 */
export function computeRoi(values) {
  const eR = values.effectiveR || values.actualR || 1
  const bR = values.baseR || 1
  const q = values.quality || 100
  const totalCost = values.cost || 100
  const baseCost = values.baseCost || totalCost
  const aiCost = totalCost - baseCost
  let roi
  if (aiCost <= 0) {
    const qualMult = (50 + q / 2) / 100
    roi = (eR / bR) * qualMult * 100
  } else {
    const capacityGain = eR / bR - 1
    const qualMult = (50 + q / 2) / 100
    roi = 100 + (capacityGain * qualMult / (aiCost / 100)) * 100
  }
  return Math.round(roi * 10) / 10
}

/**
 * Run one full headless simulation.
 *
 * @param {object} opts
 * @param {object} opts.sliders        - slider values object (same shape as readSliders())
 * @param {number} [opts.weeks=52]     - number of ticks to run
 * @param {number} [opts.seed=1]       - PRNG seed for reproducibility
 * @param {number} [opts.noiseLevel=0.15] - std dev scale for per-tick noise
 * @param {number} [opts.riskProbPerWeek=0.04] - probability of a risk event each week
 * @returns {Array<{week,debt,morale,jevons,experience,quality,roi,costPct,scopePct,actualR}>}
 */
export function simulate({ sliders, weeks = 52, seed = 1, noiseLevel = 0.15, riskProbPerWeek = 0.04 }) {
  const rand = mulberry32(seed)

  // Reset module-level seniority tracking in learning.js
  resetLearning()

  let techDebt = 0
  let teamMorale = 100
  let jevonsScope = 0
  let seniorityDrift = 0
  let teamExperience = 0

  // Alert trackers — needed by tick functions but ignored in headless mode
  let lastMoraleAlert = 100
  let lastJevonsAlert = 0
  let lastSeniorityAlert = 100
  let lastExpAlert = 0

  const snapshots = []

  for (let week = 1; week <= weeks; week++) {
    // Tick engines in same order as main.js tickLoop
    techDebt = tickDebt(sliders, techDebt, teamMorale)

    const moraleResult = tickMorale(sliders, techDebt, teamMorale, lastMoraleAlert)
    teamMorale = moraleResult.morale
    lastMoraleAlert = moraleResult.lastMoraleAlert

    const jevonsResult = tickJevons(sliders, jevonsScope, techDebt, teamMorale, lastJevonsAlert)
    jevonsScope = jevonsResult.jevonsScope
    lastJevonsAlert = jevonsResult.lastJevonsAlert

    const senResult = tickSeniority(sliders.seniority || 50, seniorityDrift, teamMorale, lastSeniorityAlert)
    seniorityDrift = senResult.seniorityDrift
    lastSeniorityAlert = senResult.lastSeniorityAlert

    const effSen = Math.max(0, Math.min(100, (sliders.seniority || 50) + seniorityDrift))
    const learnResult = tickLearning(sliders, teamExperience, teamMorale, effSen, techDebt, lastExpAlert)
    teamExperience = learnResult.experience
    lastExpAlert = learnResult.lastExpAlert

    // Noise: cheap 3-sample approx for normally-distributed perturbation around 0.
    // Keeps individual runs from being deterministically identical at low noise.
    const noiseDebt  = (rand() + rand() + rand() - 1.5) * noiseLevel * 10
    const noiseMorale = (rand() + rand() + rand() - 1.5) * noiseLevel * 8
    const noiseJevons = (rand() + rand() + rand() - 1.5) * noiseLevel * 4

    techDebt    = Math.max(0,   Math.min(100, techDebt    + noiseDebt))
    teamMorale  = Math.max(5,   Math.min(100, teamMorale  + noiseMorale))
    jevonsScope = Math.max(0,   Math.min(150, jevonsScope + noiseJevons))

    // Stochastic risk event — same severity formula as main.js triggerRiskEvent
    if (rand() < riskProbPerWeek) {
      const sv = computeState({ ...sliders, effectiveSeniority: effSen }, techDebt, teamMorale, jevonsScope, teamExperience)
      const reviewRatio = sv.aiGen > 0 ? (sv.effectiveReview || sv.review) / (sv.aiGen * 0.4 + 5) : 1
      const aiExposure = Math.max(0.2, sv.aiGen / 80)
      const reviewMitigation = Math.min(reviewRatio, 1)
      const severity = aiExposure * (1.2 - reviewMitigation * 0.8)
      const debtHit  = Math.round(8 + severity * 20 + rand() * 10)
      const moraleHit = Math.round(5 + severity * 15 + rand() * 8)
      techDebt   = Math.min(100, techDebt   + debtHit)
      teamMorale = Math.max(5,   teamMorale - moraleHit)
    }

    // Compute final state for this tick
    const sv = { ...sliders, effectiveSeniority: effSen }
    const state = computeState(sv, techDebt, teamMorale, jevonsScope, teamExperience)

    const roi = computeRoi({
      effectiveR: state.effectiveR,
      actualR:    state.actualR,
      baseR:      state.baseR,
      quality:    state.quality,
      cost:       state.costPct,
      baseCost:   state.baseCostPct,
    })

    snapshots.push({
      week,
      debt:       techDebt,
      morale:     teamMorale,
      jevons:     jevonsScope,
      experience: teamExperience,
      quality:    state.quality,
      roi,
      costPct:    state.costPct,
      scopePct:   state.scopePct,
      actualR:    state.actualR,
    })
  }

  return snapshots
}
