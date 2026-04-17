import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getRoster, initTeamState, resetTeamState, updateTeamState } from '../src/team.js'

const neutralSliders = {
  paradigm: 50, elasticity: 50, amdahl: 50,
  aiGen: 20, aiReview: 20, aiMgmt: 20,
  scope: 30, review: 20, time: 0, seniority: 60,
}

const badSliders = {
  ...neutralSliders,
  aiGen: 70, review: 5, scope: 90, time: -25, aiMgmt: 80,
}

describe('initTeamState', () => {
  it('returns all 6 personas active with morale 100', () => {
    const state = initTeamState()
    const ids = getRoster().map(p => p.id)
    expect(Object.keys(state)).toHaveLength(6)
    for (const id of ids) {
      expect(state[id].morale).toBe(100)
      expect(state[id].status).toBe('active')
    }
  })
})

describe('resetTeamState', () => {
  it('returns clean state identical to initTeamState', () => {
    expect(resetTeamState()).toEqual(initTeamState())
  })
})

describe('updateTeamState — no negative events when everything is healthy', () => {
  it('produces no burnout or quit events and keeps all active with high aggregate morale', () => {
    const state = initTeamState()
    const { newTeamState, events } = updateTeamState(state, {
      aggregateMorale: 100,
      sliders: neutralSliders,
      techDebt: 0,
      effectiveSeniority: 60,
      seniorityDrift: 0,
    })
    // Praise events are allowed (1/40 random chance when healthy); burnout/quit are not
    const negativeEvents = events.filter(e => e.type === 'burnout' || e.type === 'quit')
    expect(negativeEvents).toHaveLength(0)
    for (const id of Object.keys(newTeamState)) {
      expect(newTeamState[id].status).toBe('active')
    }
  })
})

describe('updateTeamState — hates conditions lower morale relative to baseline', () => {
  it('Alex loses extra morale compared to Jay under high AI + low review conditions', () => {
    const state = initTeamState()
    // Run several ticks to let the morale drift take effect
    let current = state
    for (let i = 0; i < 20; i++) {
      const result = updateTeamState(current, {
        aggregateMorale: 60, // mid morale
        sliders: { ...neutralSliders, aiGen: 70, review: 5 },
        techDebt: 20,
        effectiveSeniority: 50,
        seniorityDrift: 0,
      })
      current = result.newTeamState
    }
    // Alex hates lowReviewHighAi; Jay loves highAiGen — Alex should have lower personal morale
    expect(current.alex.morale).toBeLessThan(current.jay.morale)
  })
})

describe('updateTeamState — burnout fires before quit', () => {
  it('a persona goes burnt-out before they quit', () => {
    let state = initTeamState()
    const allEvents = []
    // Run 300 ticks with bad conditions to force eventual burnout/quit
    for (let i = 0; i < 300; i++) {
      const result = updateTeamState(state, {
        aggregateMorale: 10,
        sliders: badSliders,
        techDebt: 80,
        effectiveSeniority: 10,
        seniorityDrift: -30,
      })
      state = result.newTeamState
      allEvents.push(...result.events)
    }

    const quits = allEvents.filter(e => e.type === 'quit')
    const burnouts = allEvents.filter(e => e.type === 'burnout')

    // If any quits happened, burnouts must have appeared first
    if (quits.length > 0) {
      const firstQuit = allEvents.findIndex(e => e.type === 'quit')
      const firstBurnout = allEvents.findIndex(e => e.type === 'burnout')
      expect(firstBurnout).toBeLessThan(firstQuit)
    } else {
      // No quits yet but burnouts should have fired
      expect(burnouts.length).toBeGreaterThan(0)
    }
  })
})

describe('updateTeamState — only one quit per tick', () => {
  it('never emits more than one quit event in a single tick', () => {
    // Use a state where multiple personas are already burnt-out with very low morale
    // so the quit probability fires — but only one should be allowed per tick
    const burnedState = Object.fromEntries(
      getRoster().map(p => [p.id, { morale: 5, status: 'burnt-out' }])
    )
    // Run 50 ticks with probability seeded to near-certain quit
    for (let i = 0; i < 50; i++) {
      const { events } = updateTeamState(burnedState, {
        aggregateMorale: 5,
        sliders: badSliders,
        techDebt: 90,
        effectiveSeniority: 5,
        seniorityDrift: -50,
      })
      const quits = events.filter(e => e.type === 'quit')
      expect(quits.length).toBeLessThanOrEqual(1)
    }
  })
})

describe('updateTeamState — properties', () => {
  it('persona morale stays in [0, 100] for any aggregate morale', () => {
    fc.assert(fc.property(
      fc.float({ min: 5, max: 100, noNaN: true }),
      fc.integer({ min: 0, max: 100 }),
      (aggregateMorale, techDebt) => {
        const state = initTeamState()
        const { newTeamState } = updateTeamState(state, {
          aggregateMorale,
          sliders: neutralSliders,
          techDebt,
          effectiveSeniority: 50,
          seniorityDrift: 0,
        })
        return Object.values(newTeamState).every(ps => ps.morale >= 0 && ps.morale <= 100)
      }
    ), { numRuns: 200 })
  })

  it('quit personas remain quit across subsequent ticks', () => {
    fc.assert(fc.property(
      fc.float({ min: 5, max: 100, noNaN: true }),
      (aggregateMorale) => {
        // Force one persona into quit status directly
        const state = {
          ...initTeamState(),
          sarah: { morale: 5, status: 'quit' },
        }
        const { newTeamState } = updateTeamState(state, {
          aggregateMorale,
          sliders: neutralSliders,
          techDebt: 0,
          effectiveSeniority: 50,
          seniorityDrift: 0,
        })
        return newTeamState.sarah.status === 'quit'
      }
    ), { numRuns: 100 })
  })
})
