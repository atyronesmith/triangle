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

/**
 * Compute the full derived state from slider values + accumulated debt/morale.
 */
export function computeState(sliderValues, techDebt, teamMorale) {
  const { ai, scope, review, time, paradigm } = sliderValues
  const pp = getParadigmParams(paradigm)
  const baseR = 1

  const rawB = ai / 200
  const aiR = baseR * Math.min(1 + rawB * pp.boostCeil, 1 + rawB * 2.5)
  const hidden = Math.max(pp.hiddenFloor * rawB, ai * pp.overheadMult * 0.01 * (1 - review / 80))
  const debtDrag = techDebt * 0.003
  const moraleDrag = (100 - teamMorale) * 0.002
  const actualR = Math.max(baseR * 0.85, aiR - hidden + pp.iterBonus * rawB - debtDrag - moraleDrag)
  const mgmtR = baseR * (1 + scope / 100)
  const timeMult = 1 + time / 100
  const effectiveR = actualR * Math.sqrt(Math.max(0.5, timeMult))
  const coverageR = mgmtR > 0 ? Math.min(effectiveR / mgmtR, 1) : 1
  const reviewNeed = ai > 0 ? Math.min(review / (ai * pp.reviewDecay + 5), 1) : 1
  const timeP = time < 0 ? (1 + time / 60) : 1
  const quality = Math.round(Math.max(pp.qualFloor, Math.min(100, coverageR * reviewNeed * timeP * 100)))

  const scopePct = Math.round(mgmtR * 100)
  const costPct = Math.round(100 + ai * 0.6 * (1 - paradigm / 200) + review * 0.8)
  const timePct = Math.round(100 + time)

  return {
    ai, scope, review, time, paradigm, pp,
    baseR, aiR, actualR, mgmtR, effectiveR,
    quality, scopePct, costPct, timePct,
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
