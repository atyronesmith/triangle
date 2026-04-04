/**
 * Constraint math and paradigm parameters.
 *
 * Pure functions — no DOM access, no side effects.
 */

export function getParadigmLabel(v) {
  if (v <= 20) return 'Skeptic'
  if (v <= 50) return 'Pragmatist'
  if (v <= 80) return 'Optimist'
  return 'True believer'
}

export function getParadigmParams(v) {
  const t = v / 100
  return {
    overheadMult: 0.30 - t * 0.25,
    reviewDecay:  0.45 - t * 0.30,
    boostCeil:    1 + t * 0.6,
    hiddenFloor:  0.15 * (1 - t),
    qualFloor:    5 + t * 15,
    iterBonus:    t * 0.15,
    debtRate:     1 - t * 0.7,
  }
}

export function getElasticityLabel(v) {
  if (v <= 15) return 'Inelastic'
  if (v <= 40) return 'Low'
  if (v <= 65) return 'Elastic'
  return 'Super-elastic'
}

export function getAmdahlLabel(v) {
  if (v <= 25) return 'Mostly serial'
  if (v <= 50) return 'Mixed'
  if (v <= 75) return 'Mostly accelerable'
  return 'Nearly all accelerable'
}

/**
 * Amdahl's Law: speedup = 1 / ((1-p) + p/s)
 * p = fraction of work AI can accelerate (0..1)
 * s = speedup factor for that fraction (> 1)
 * Returns the overall speedup multiplier (>= 1)
 */
function amdahlSpeedup(p, s) {
  if (s <= 1) return 1
  return 1 / ((1 - p) + p / s)
}

/**
 * Compute the full derived state from slider values + accumulated state.
 * jevonsScope is the auto-expanded scope from the Jevons tick engine.
 */
export function computeState(sliderValues, techDebt, teamMorale, jevonsScope = 0) {
  const { ai, scope, review, time, paradigm, amdahl = 50 } = sliderValues
  const pp = getParadigmParams(paradigm)
  const baseR = 1

  const rawB = ai / 200
  // aiR = theoretical frontier (blue triangle) — what AI vendors promise, ignoring serial bottlenecks
  const aiR = baseR * Math.min(1 + rawB * pp.boostCeil, 1 + rawB * 2.5)

  // Amdahl's Law: only fraction p of the workflow is AI-acceleratable
  // The rest is serial human work (judgment, integration, architecture, stakeholder alignment)
  const p = amdahl / 100 // fraction of work AI can speed up
  const rawSpeedup = aiR / baseR // how much faster the AI-able part gets
  const amdahlR = baseR * amdahlSpeedup(p, rawSpeedup) // actual throughput after serial bottleneck

  const hidden = Math.max(pp.hiddenFloor * rawB, ai * pp.overheadMult * 0.01 * (1 - review / 80))
  const debtDrag = techDebt * 0.003
  const moraleDrag = (100 - teamMorale) * 0.002
  const actualR = Math.max(baseR * 0.85, amdahlR - hidden + pp.iterBonus * rawB - debtDrag - moraleDrag)
  // Total demanded scope = management push + Jevons auto-expansion
  const totalScope = scope + jevonsScope
  const mgmtR = baseR * (1 + totalScope / 100)
  const timeMult = 1 + time / 100
  const effectiveR = actualR * Math.sqrt(Math.max(0.5, timeMult))
  const coverageR = mgmtR > 0 ? Math.min(effectiveR / mgmtR, 1) : 1
  const reviewNeed = ai > 0 ? Math.min(review / (ai * pp.reviewDecay + 5), 1) : 1
  const timeP = time < 0 ? (1 + time / 60) : 1
  const quality = Math.round(Math.max(pp.qualFloor, Math.min(100, coverageR * reviewNeed * timeP * 100)))

  const scopePct = Math.round(mgmtR * 100)
  const costPct = Math.round(100 + ai * 0.6 * (1 - paradigm / 200) + review * 0.8)
  const timePct = Math.round(100 + time)

  // How much throughput Amdahl's Law costs vs the theoretical frontier
  const amdahlLoss = Math.round((1 - amdahlR / aiR) * 100)

  // Actual project-level boost (what teams actually get — Dubach's ~10% org-level)
  const actualBoostPct = Math.round((actualR / baseR - 1) * 100)
  // Perceived boost (METR: teams perceive ~3x actual, with a positive floor bias)
  // People think AI helps even when it doesn't (perception lag, effort attribution bias)
  const perceivedBoostPct = ai > 5 ? Math.round(Math.max(ai * 0.4, actualBoostPct * 2.5 + 8)) : 0
  // Task-level boost (what vendor dashboards show — the non-Amdahl number)
  const taskBoostPct = Math.round((aiR / baseR - 1) * 100)

  return {
    ai, scope, review, time, paradigm, amdahl, pp,
    baseR, aiR, amdahlR, actualR, mgmtR, effectiveR,
    quality, scopePct, costPct, timePct,
    jevonsScope, totalScope, amdahlLoss,
    actualBoostPct, perceivedBoostPct, taskBoostPct,
  }
}

export function getQualityColor(q) {
  if (q >= 80) return '#1D9E75'
  if (q >= 60) return '#639922'
  if (q >= 40) return '#EF9F27'
  if (q >= 20) return '#D85A30'
  return '#E24B4A'
}

export function getDebtColor(d) {
  if (d < 20) return '#EF9F27'
  if (d < 50) return '#D85A30'
  return '#E24B4A'
}
