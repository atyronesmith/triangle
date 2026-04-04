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
 *
 * AI is split into three domains:
 *   aiGen   — code drafting, boilerplate, docs, tests (drives throughput + debt)
 *   aiReview — automated review, vulnerability scanning (augments human review)
 *   aiMgmt  — requirements, estimation, coordination (shrinks Amdahl serial fraction)
 *
 * Composite `ai` is derived for backward compatibility.
 */
export function computeState(sliderValues, techDebt, teamMorale, jevonsScope = 0, teamExperience = 0) {
  const { aiGen = 0, aiReview = 0, aiMgmt = 0, scope, review, time, paradigm, amdahl = 50, seniority = 50, effectiveSeniority = seniority } = sliderValues
  // Composite AI — weighted average for backward-compatible references
  const ai = Math.round(aiGen * 0.5 + aiReview * 0.3 + aiMgmt * 0.2)
  const pp = getParadigmParams(paradigm)
  const baseR = 1

  // Generation AI drives the theoretical throughput frontier
  const rawB = aiGen / 200
  const aiR = baseR * Math.min(1 + rawB * pp.boostCeil, 1 + rawB * 2.5)

  // Management AI expands the Amdahl-accelerable fraction
  // AI coordination tools make some serial work (estimation, planning, alignment) accelerable
  const amdahlEffective = Math.min(95, amdahl + aiMgmt * 0.3)

  // Amdahl's Law with management-AI-adjusted fraction
  const p = amdahlEffective / 100
  const rawSpeedup = aiR / baseR
  const amdahlR = baseR * amdahlSpeedup(p, rawSpeedup)

  // Review AI augments human review — catches vulnerabilities, pattern-based defects,
  // style issues that humans miss. Bonus scales with paradigm (better models = better review).
  // AI review can push effective review beyond what humans achieve alone.
  // Seniority affects review quality: seniors catch more (up to 1.3x), juniors miss more (0.7x)
  const seniorityReviewMult = 0.7 + effectiveSeniority * 0.006
  const aiReviewBonus = aiReview * (0.6 + pp.iterBonus * 2) * (1 - techDebt * 0.004)
  // Experience boosts review quality — experienced teams know what AI gets wrong
  const expReviewBonus = teamExperience * 0.08
  const effectiveReview = (review * seniorityReviewMult) + aiReviewBonus + expReviewBonus

  // Experience reduces AI overhead (teams learn to use AI efficiently)
  // Up to 40% overhead reduction at max experience
  const expOverheadMult = 1 - teamExperience * 0.004
  const hidden = Math.max(pp.hiddenFloor * rawB * expOverheadMult, aiGen * pp.overheadMult * 0.01 * (1 - effectiveReview / 80) * expOverheadMult)
  const debtDrag = techDebt * 0.003
  const moraleDrag = (100 - teamMorale) * 0.002
  const actualR = Math.max(baseR * 0.85, amdahlR - hidden + pp.iterBonus * rawB - debtDrag - moraleDrag)

  // Total demanded scope = management push + Jevons auto-expansion
  const totalScope = scope + jevonsScope
  const mgmtR = baseR * (1 + totalScope / 100)
  const timeMult = 1 + time / 100
  const effectiveR = actualR * Math.sqrt(Math.max(0.5, timeMult))
  const coverageR = mgmtR > 0 ? Math.min(effectiveR / mgmtR, 1) : 1
  // Review has two effects:
  // 1. Catches AI-generated defects (reviewNeed — scales with AI output volume)
  // 2. Improves baseline quality regardless of AI (reviewBoost — human review always helps)
  const reviewNeed = aiGen > 0 ? Math.min(effectiveReview / (aiGen * pp.reviewDecay + 5), 1) : 1
  const timeP = time < 0 ? (1 + time / 60) : 1
  // Baseline review quality boost — even without AI, more review = better quality
  // Ranges from -10% (review=0) to +10% (review=60)
  const reviewBoost = (effectiveReview - 15) * 0.4
  // AI review provides an additional bonus for catching defect classes humans miss
  const aiReviewQualBonus = aiReview > 0 ? Math.min(aiReview * 0.15, 15) : 0
  const rawQuality = coverageR * reviewNeed * timeP * 100 + reviewBoost + aiReviewQualBonus
  const quality = Math.round(Math.max(pp.qualFloor, Math.min(100, rawQuality)))

  const scopePct = Math.round(mgmtR * 100)
  // Seniority cost: seniors cost up to 40% more
  const seniorityCost = effectiveSeniority * 0.4
  const costPct = Math.round(100 + aiGen * 0.5 + aiReview * 0.4 + aiMgmt * 0.3 + review * 0.8 + seniorityCost)
  const timePct = Math.round(100 + time)

  const amdahlLoss = Math.round((1 - amdahlR / aiR) * 100)
  const actualBoostPct = Math.round((actualR / baseR - 1) * 100)
  const perceivedBoostPct = ai > 5 ? Math.round(Math.max(ai * 0.4, actualBoostPct * 2.5 + 8)) : 0
  const taskBoostPct = Math.round((aiR / baseR - 1) * 100)

  return {
    ai, aiGen, aiReview, aiMgmt, scope, review, time, paradigm, amdahl, seniority, effectiveSeniority, teamExperience, pp,
    baseR, aiR, amdahlR, actualR, mgmtR, effectiveR,
    effectiveReview, amdahlEffective,
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
