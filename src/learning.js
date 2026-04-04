/**
 * Org Learning Curve — teams get better at using AI over time.
 *
 * teamExperience (0-100) builds slowly when:
 *   - AI is actively in use (aiGen > 10)
 *   - Morale is okay (people are engaged, not just surviving)
 *   - Seniors are present (they learn faster and teach juniors)
 *
 * teamExperience decays when:
 *   - Seniors leave (attrition destroys institutional knowledge)
 *   - High debt means learning bad patterns
 *
 * Asymmetric: gain is slow (months), loss is fast (weeks).
 * Matches reality — building AI proficiency takes time,
 * losing it when seniors walk out the door is instant.
 */

let prevSeniority = null

/**
 * @param {object} sliderValues - current slider state
 * @param {number} teamExperience - current experience (0-100)
 * @param {number} teamMorale - current morale (0-100)
 * @param {number} effectiveSeniority - seniority after attrition drift
 * @param {number} techDebt - current debt (0-100)
 * @param {number} lastExpAlert - last threshold that triggered an alert
 * @returns {{ experience: number, entries: Array, lastExpAlert: number }}
 */
export function tickLearning(sliderValues, teamExperience, teamMorale, effectiveSeniority, techDebt, lastExpAlert) {
  const { aiGen = 0, aiReview = 0, aiMgmt = 0 } = sliderValues
  const ai = aiGen + aiReview + aiMgmt
  const entries = []
  let newAlert = lastExpAlert

  // Initialize prev seniority tracking
  if (prevSeniority === null) prevSeniority = effectiveSeniority

  let gain = 0
  let loss = 0

  // === LEARNING (slow) ===
  if (ai > 10) {
    // Base learning rate when AI is in use
    gain += 0.15

    // Morale bonus: engaged teams learn faster
    if (teamMorale > 70) gain += 0.08
    if (teamMorale > 85) gain += 0.05

    // Seniority bonus: seniors learn faster and teach juniors
    gain += effectiveSeniority * 0.002

    // AI review investment accelerates learning (teams learn what to look for)
    gain += aiReview * 0.002

    // High debt penalty: learning bad patterns is negative learning
    if (techDebt > 40) gain *= Math.max(0.2, 1 - (techDebt - 40) * 0.01)
  } else {
    // No AI in use — experience slowly decays (skills atrophy)
    loss += 0.05
  }

  // === ATTRITION KNOWLEDGE LOSS (fast) ===
  // When seniority drops, experience drops proportionally
  // Each senior who leaves takes institutional AI knowledge with them
  const seniorityDrop = prevSeniority - effectiveSeniority
  if (seniorityDrop > 0) {
    loss += seniorityDrop * 0.5 // each point of seniority lost = 0.5 experience lost
  }
  prevSeniority = effectiveSeniority

  // Low morale suppresses learning (people go through the motions)
  if (teamMorale < 40) {
    gain *= 0.3
    loss += 0.03
  }

  const newExp = Math.max(0, Math.min(100, teamExperience + gain - loss))

  // === THRESHOLD ALERTS ===
  if (newExp >= 20 && (lastExpAlert || 0) < 20) {
    entries.push({ vertex: 'system', msg: `Team AI experience reaching ${Math.round(newExp)}%. The team is developing intuition — recognizing when AI output needs closer review, learning which prompts produce better results, building shared patterns for AI-assisted workflows.` })
    newAlert = newExp
  }
  if (newExp >= 50 && (lastExpAlert || 0) < 50) {
    entries.push({ vertex: 'system', msg: `<strong>Team AI experience at ${Math.round(newExp)}%.</strong> Institutional expertise is solid. Overhead costs are noticeably lower — the team knows how to use AI efficiently and what to watch for. Review quality improves because experienced teams know where AI makes mistakes.` })
    newAlert = newExp
  }
  if (newExp >= 80 && (lastExpAlert || 0) < 80) {
    entries.push({ vertex: 'system', msg: `<strong>Expert-level AI proficiency: ${Math.round(newExp)}%.</strong> The team has deep understanding of AI capabilities and limitations. They know what AI is good at, what it isn't, and how to structure work to maximize the benefit. Overhead is minimal. This took months to build — protect it.` })
    newAlert = newExp
  }

  // Decay alerts
  if (newExp < 30 && (lastExpAlert || 100) >= 30 && teamExperience >= 30) {
    entries.push({ vertex: 'morale', msg: `<strong>AI experience eroding: ${Math.round(newExp)}%.</strong> Attrition has destroyed institutional AI knowledge. New team members are making mistakes the previous team had learned to avoid. The learning curve is resetting — months of accumulated proficiency lost in weeks.` })
    newAlert = newExp
  }
  if (newExp < 10 && (lastExpAlert || 100) >= 10 && teamExperience >= 10) {
    entries.push({ vertex: 'morale', msg: `AI experience collapsed to ${Math.round(newExp)}%. The team is essentially starting over with AI adoption. Nobody remaining remembers what worked and what didn't. Previous patterns, prompts, and review heuristics are gone with the people who developed them.` })
    newAlert = newExp
  }

  return { experience: newExp, entries, lastExpAlert: newAlert }
}

export function resetLearning() {
  prevSeniority = null
}
