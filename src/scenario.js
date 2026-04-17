/**
 * Scenario runner — cinematic playback sequencer.
 *
 * Pure module: no DOM, no imports from the live sim.
 * Owns only pacing/timer logic. All tick work is delegated to callbacks.
 *
 * Usage:
 *   const ctrl = runScenario({ onWeekTick, onMajorEvent, onComplete, weeks, weekIntervalMs })
 *   ctrl.cancel()  // stop early
 *
 * onWeekTick(week) → may return { majorEvent: { kind, headline, sub, week } } or null/undefined
 * onMajorEvent(event)  — called with the event object when a major event fires
 * onComplete(summary)  — called after all weeks complete; summary is whatever onWeekTick accumulated
 */

const PAUSE_ON_EVENT_MS = 2200
const DEFAULT_INTERVAL_MS = 180
const DEFAULT_WEEKS = 52

export function runScenario({
  onWeekTick,
  onMajorEvent,
  onComplete,
  weeks = DEFAULT_WEEKS,
  weekIntervalMs = DEFAULT_INTERVAL_MS,
}) {
  let cancelled = false
  let currentWeek = 0
  let timerId = null

  function tick() {
    if (cancelled) return

    currentWeek++
    const result = onWeekTick(currentWeek)
    const event = result?.majorEvent ?? null

    if (event) {
      onMajorEvent(event)
    }

    if (currentWeek >= weeks) {
      onComplete()
      return
    }

    const delay = event ? PAUSE_ON_EVENT_MS : weekIntervalMs
    timerId = setTimeout(tick, delay)
  }

  // Start on next tick so callers can set up state synchronously first
  timerId = setTimeout(tick, weekIntervalMs)

  return {
    cancel() {
      cancelled = true
      if (timerId !== null) {
        clearTimeout(timerId)
        timerId = null
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Major event detection
//
// Call resetEventTracker() at the start of each scenario run.
// Call detectMajorEvent(week, tickResult) → event object or null.
//
// tickResult shape:
//   { techDebt, teamMorale, jevonsScope, seniorityDrift, sliderSeniority,
//     teamEvents: [{type, personaId, ...}], riskSeverity?: number }
// ---------------------------------------------------------------------------

let firedKinds = new Set()

export function resetEventTracker() {
  firedKinds = new Set()
}

/**
 * Returns at most one major event object, or null.
 * Priority: quit > incident > morale > jevons > debt > seniority
 */
export function detectMajorEvent(week, {
  techDebt,
  teamMorale,
  jevonsScope,
  seniorityDrift,
  sliderSeniority,
  teamEvents = [],
  riskSeverity = 0,
  personaNameById = {},
}) {
  // 1. Persona quit (highest priority)
  const quitEvent = teamEvents.find(e => e.type === 'quit')
  if (quitEvent) {
    const name = personaNameById[quitEvent.personaId] || 'A team member'
    return {
      kind: `quit:${quitEvent.personaId}`,
      headline: `Week ${week}. ${name} just quit.`,
      sub: teamMorale < 40
        ? 'Morale had been falling for weeks. This was coming.'
        : techDebt > 60
        ? 'The codebase had become a grind. They found somewhere cleaner.'
        : 'Another departure in a difficult quarter.',
      week,
    }
  }

  // 2. Production incident
  if (riskSeverity > 0.6 && !firedKinds.has(`incident:${week}`)) {
    // Incidents are unique per-tick (week number), no dedup needed
    return {
      kind: `incident:${week}`,
      headline: `Week ${week}. Production incident. Severity ${Math.round(riskSeverity * 100)}%.`,
      sub: 'Debt rises. Morale takes a hit. The team cleans up.',
      week,
    }
  }

  // 3. Morale crisis — threshold crossed once
  if (teamMorale < 40 && !firedKinds.has('morale-crisis')) {
    firedKinds.add('morale-crisis')
    return {
      kind: 'morale-crisis',
      headline: `Week ${week}. The team is breaking.`,
      sub: `Morale has fallen below 40. Attrition accelerates from here.`,
      week,
    }
  }

  // 4. Jevons threshold — scope expanded significantly
  if (jevonsScope > 60 && !firedKinds.has('jevons-60')) {
    firedKinds.add('jevons-60')
    return {
      kind: 'jevons-60',
      headline: `Week ${week}. Scope has grown ${Math.round(jevonsScope)}% beyond the original.`,
      sub: 'Jevons Paradox: efficiency created demand, not slack.',
      week,
    }
  }

  // 5. Tech debt threshold
  if (techDebt > 70 && !firedKinds.has('debt-70')) {
    firedKinds.add('debt-70')
    return {
      kind: 'debt-70',
      headline: `Week ${week}. The codebase is fighting back.`,
      sub: `Tech debt at ${Math.round(techDebt)}%. Every new feature now costs more.`,
      week,
    }
  }

  // 6. Seniority crisis
  const effSeniority = Math.max(0, Math.min(100, sliderSeniority + (seniorityDrift || 0)))
  if (effSeniority < 30 && !firedKinds.has('seniority-crisis')) {
    firedKinds.add('seniority-crisis')
    return {
      kind: 'seniority-crisis',
      headline: `Week ${week}. Institutional knowledge is draining.`,
      sub: `Effective seniority has dropped below 30%. The decisions nobody documented are leaving with people.`,
      week,
    }
  }

  return null
}
