import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runScenario, detectMajorEvent, resetEventTracker } from '../src/scenario.js'

// ---------------------------------------------------------------------------
// runScenario — pacing/sequencer tests
// ---------------------------------------------------------------------------

describe('runScenario — tick count', () => {
  it('calls onWeekTick exactly `weeks` times before onComplete', async () => {
    const weeks = 5
    let tickCount = 0
    let completed = false

    await new Promise(resolve => {
      runScenario({
        weeks,
        weekIntervalMs: 0, // immediate
        onWeekTick: (week) => {
          tickCount++
          expect(week).toBe(tickCount)
        },
        onMajorEvent: () => {},
        onComplete: () => {
          completed = true
          resolve()
        },
      })
    })

    expect(tickCount).toBe(weeks)
    expect(completed).toBe(true)
  })
})

describe('runScenario — cancel stops ticks', () => {
  it('cancel() stops further ticks', async () => {
    const weeks = 20
    let tickCount = 0

    const ctrl = runScenario({
      weeks,
      weekIntervalMs: 0,
      onWeekTick: () => { tickCount++ },
      onMajorEvent: () => {},
      onComplete: () => {},
    })

    // Cancel immediately — before any async tick fires
    ctrl.cancel()

    // Wait a few ms to confirm no ticks fired after cancel
    await new Promise(r => setTimeout(r, 30))
    expect(tickCount).toBe(0)
  })
})

describe('runScenario — onMajorEvent called when event returned', () => {
  it('calls onMajorEvent once when onWeekTick returns a major event', async () => {
    const weeks = 3
    let eventsFired = 0

    await new Promise(resolve => {
      runScenario({
        weeks,
        weekIntervalMs: 0,
        onWeekTick: (week) => {
          if (week === 2) {
            return { majorEvent: { kind: 'test', headline: 'Test event', sub: '', week: 2 } }
          }
        },
        onMajorEvent: () => { eventsFired++ },
        onComplete: resolve,
      })
    })

    expect(eventsFired).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// detectMajorEvent — at most one event per tick, correct priority
// ---------------------------------------------------------------------------

describe('detectMajorEvent — priority', () => {
  beforeEach(() => {
    resetEventTracker()
  })

  it('returns null when no conditions met', () => {
    const result = detectMajorEvent(1, {
      techDebt: 10,
      teamMorale: 80,
      jevonsScope: 10,
      seniorityDrift: 0,
      sliderSeniority: 60,
      teamEvents: [],
      riskSeverity: 0,
      personaNameById: {},
    })
    expect(result).toBeNull()
  })

  it('quit takes priority over all other conditions firing simultaneously', () => {
    const result = detectMajorEvent(5, {
      techDebt: 75,        // would fire debt-70
      teamMorale: 35,      // would fire morale-crisis
      jevonsScope: 65,     // would fire jevons-60
      seniorityDrift: -40,
      sliderSeniority: 60, // effective = 20, would fire seniority-crisis
      teamEvents: [{ type: 'quit', personaId: 'sarah' }],
      riskSeverity: 0.8,   // would fire incident
      personaNameById: { sarah: 'Sarah Chen' },
    })
    expect(result.kind).toMatch(/^quit:/)
    expect(result.headline).toContain('Sarah Chen')
  })

  it('does not re-fire same threshold event on subsequent ticks', () => {
    const baseArgs = {
      techDebt: 75,
      teamMorale: 80,
      jevonsScope: 10,
      seniorityDrift: 0,
      sliderSeniority: 60,
      teamEvents: [],
      riskSeverity: 0,
      personaNameById: {},
    }
    const first = detectMajorEvent(1, baseArgs)
    expect(first?.kind).toBe('debt-70')

    const second = detectMajorEvent(2, baseArgs)
    // debt-70 already fired; should not fire again
    expect(second?.kind).not.toBe('debt-70')
  })

  it('only one event fires per tick even when multiple thresholds cross', () => {
    // All conditions true simultaneously
    const result = detectMajorEvent(10, {
      techDebt: 75,
      teamMorale: 35,
      jevonsScope: 65,
      seniorityDrift: -40,
      sliderSeniority: 60,
      teamEvents: [],
      riskSeverity: 0,
      personaNameById: {},
    })
    // Should get exactly one event back
    expect(result).not.toBeNull()
    expect(typeof result.kind).toBe('string')
    expect(typeof result.headline).toBe('string')
  })
})
