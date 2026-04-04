/**
 * Debt and morale tick engines.
 *
 * These mutate the shared simulation state each tick (800ms).
 * They return dialog entries to emit (if any) rather than touching the DOM directly.
 */

import { computeState } from './model.js'

/**
 * Advance tech debt by one tick. Returns new techDebt value.
 */
export function tickDebt(sliderValues, techDebt, teamMorale) {
  const s = computeState(sliderValues, techDebt, teamMorale)

  if (s.aiGen < 5) {
    return Math.max(0, techDebt - 0.3)
  }

  // Debt driven by generation AI volume vs effective review (human + AI review)
  const reviewRatio = (s.effectiveReview || s.review) / (s.aiGen * 0.5 + 5)
  const debtAccum = (1 - Math.min(reviewRatio, 1)) * s.aiGen * 0.02 * s.pp.debtRate
  const debtPaydown = Math.max(0, (reviewRatio - 1) * 0.5)
  return Math.max(0, Math.min(100, techDebt + debtAccum - debtPaydown))
}

/**
 * Advance team morale by one tick. Returns { morale, entries }.
 * `entries` is an array of { vertex, msg } objects for the dialog.
 */
export function tickMorale(sliderValues, techDebt, teamMorale, lastMoraleAlert) {
  const s = computeState(sliderValues, techDebt, teamMorale)
  const entries = []

  let pressure = 0
  if (s.quality < 50) pressure += (50 - s.quality) * 0.03
  if (s.quality < 30) pressure += (30 - s.quality) * 0.02
  if (s.scope > 50)   pressure += (s.scope - 50) * 0.008
  if (s.time < -5)    pressure += Math.abs(s.time + 5) * 0.015
  if (techDebt > 30)  pressure += (techDebt - 30) * 0.01
  if (s.ai > 30 && s.review < 15) pressure += 0.15

  let recovery = 0
  if (s.quality > 70) recovery += (s.quality - 70) * 0.008
  if (s.scope < 40)   recovery += 0.1
  if (s.time > 5)     recovery += (s.time - 5) * 0.005
  if (techDebt < 15)  recovery += 0.08
  recovery += 0.04 // baseline resilience

  const newMorale = Math.max(5, Math.min(100, teamMorale - pressure + recovery))
  let newAlert = lastMoraleAlert

  if (newMorale < 70 && lastMoraleAlert >= 70) {
    entries.push({ vertex: 'morale', msg: `Team health dropping to ${Math.round(newMorale)}. Overtime is becoming the norm. Conversations in the hallway are shifting from "this is exciting" to "this is exhausting." Your senior people — the ones who understand the system — are quietly updating their resumes.` })
    newAlert = newMorale
  }
  if (newMorale < 50 && lastMoraleAlert >= 50) {
    entries.push({ vertex: 'morale', msg: `<strong>Burnout is setting in.</strong> Morale at ${Math.round(newMorale)}. Your best people — the ones with options — are interviewing. They're not going to tell you first. You'll find out when the resignation letter lands. Every departure takes institutional knowledge with it and leaves AI-generated code that nobody remaining fully understands.` })
    entries.push({ vertex: 'system', msg: `<em>Attrition is not a staffing problem. It's a knowledge problem. The people who leave take context that no onboarding doc captures. New hires inherit a codebase that was generated fast and reviewed thin. Ramp time increases. Velocity drops further. Morale drops further. This is the spiral.</em>` })
    newAlert = newMorale
  }
  if (newMorale < 30 && lastMoraleAlert >= 30) {
    entries.push({ vertex: 'morale', msg: `<strong>Team health critical: ${Math.round(newMorale)}.</strong> Active attrition. You're losing people faster than you can backfill. New hires take 3-6 months to ramp, and they're inheriting AI-generated code they don't understand from people who already left. Remaining team members are carrying unsustainable load. Sick days spike. Mistakes multiply. The people still here are here because they can't leave yet — not because they want to stay.` })
    entries.push({ vertex: 'cost', msg: `Real cost is now rising sharply: recruiting fees, contractor premiums, ramp time, knowledge loss, rework. The "savings" from AI-accelerated output are being consumed by human capital costs that don't show up in the tool budget.` })
    newAlert = newMorale
  }
  if (newMorale > 75 && lastMoraleAlert < 70) {
    entries.push({ vertex: 'morale', msg: `Team health recovering — now at ${Math.round(newMorale)}. Sustainable pace restored. People are re-engaging. Note: the team remembers what happened. Trust in leadership's judgment around AI mandates takes longer to rebuild than morale numbers suggest.` })
    newAlert = newMorale
  }

  return { morale: newMorale, entries, lastMoraleAlert: newAlert }
}

/**
 * Jevons Paradox tick — auto-expand scope based on AI efficiency gains.
 *
 * The idea: when AI makes output cheaper, the organization discovers new
 * uses for the cheaper resource. Scope doesn't shrink — it grows.
 *
 * Returns { jevonsScope, entries }.
 */
export function tickJevons(sliderValues, jevonsScope, techDebt, teamMorale, lastJevonsAlert) {
  const { aiGen = 0, aiReview = 0, aiMgmt = 0, elasticity } = sliderValues
  const ai = Math.round(aiGen * 0.5 + aiReview * 0.3 + aiMgmt * 0.2) // composite
  const entries = []
  let newAlert = lastJevonsAlert

  // No Jevons effect without meaningful AI adoption
  if (ai < 10 || elasticity < 5) {
    // Slow decay — when AI is removed, the expanded scope gradually contracts
    // (org realizes it can't sustain without the efficiency)
    const decay = Math.min(jevonsScope, 0.3)
    return { jevonsScope: Math.max(0, jevonsScope - decay), entries, lastJevonsAlert: newAlert }
  }

  // Efficiency signal: how much "free capacity" AI appears to create
  const efficiencyGain = ai / 100 // 0..0.8
  // Elasticity factor: how aggressively the org absorbs that capacity
  const elasticityFactor = elasticity / 100 // 0..1
  // Debt drag slows Jevons — if the team is drowning in debt, they can't
  // absorb new work regardless of what leadership discovers
  const debtBrake = Math.max(0, 1 - techDebt * 0.008)
  // Morale brake — burned-out teams can't take on organic expansion
  const moraleBrake = Math.max(0.2, teamMorale / 100)

  const expansion = efficiencyGain * elasticityFactor * debtBrake * moraleBrake * 0.4
  // Cap at 150% auto-expansion (on top of management scope push)
  const newScope = Math.min(150, jevonsScope + expansion)

  // Threshold alerts
  if (newScope > 15 && (lastJevonsAlert || 0) < 15) {
    entries.push({ vertex: 'scope', msg: `<strong>Jevons Paradox in action.</strong> AI efficiency is creating organic demand. The team is discovering new work that wasn't worth doing before — more thorough testing, deeper analysis, broader coverage. Nobody mandated this scope increase. It emerged from the efficiency itself. Auto-expansion: +${Math.round(newScope)}%.` })
    newAlert = newScope
  }
  if (newScope > 40 && (lastJevonsAlert || 0) < 40) {
    entries.push({ vertex: 'scope', msg: `Jevons scope creep at +${Math.round(newScope)}%. The organization has absorbed the efficiency gains and then some. AI made cognitive output cheaper, so the org is consuming dramatically more of it. This isn't a management failure — it's an economic inevitability. Coal-efficient engines didn't reduce coal consumption.` })
    entries.push({ vertex: 'system', msg: `<em>The management scope push (${sliderValues.scope}%) is now additive on top of Jevons auto-expansion (+${Math.round(newScope)}%). Total demanded scope: ${sliderValues.scope + Math.round(newScope)}%. The triangle didn't shrink — it grew.</em>` })
    newAlert = newScope
  }
  if (newScope > 80 && (lastJevonsAlert || 0) < 80) {
    entries.push({ vertex: 'scope', msg: `<strong>Jevons auto-expansion at +${Math.round(newScope)}%.</strong> The efficiency gain has been entirely consumed by new demand — and then exceeded. The team is now doing more total work than before AI adoption, often without recognizing the creep. Each individual new task seemed reasonable: "AI can handle this." The aggregate is unsustainable.` })
    entries.push({ vertex: 'morale', msg: `The team may not even know why they feel busier. They have better tools. Individual tasks are faster. But there are so many more tasks. The cognitive load hasn't decreased — it's shifted from execution to coordination, review, and context-switching across a broader surface area.` })
    newAlert = newScope
  }

  return { jevonsScope: newScope, entries, lastJevonsAlert: newAlert }
}
