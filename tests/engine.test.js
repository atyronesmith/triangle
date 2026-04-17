import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { tickDebt, tickMorale, tickJevons, tickSeniority } from '../src/engine.js'

const sliderArb = fc.record({
  paradigm:    fc.integer({ min: 0, max: 100 }),
  elasticity:  fc.integer({ min: 0, max: 100 }),
  amdahl:      fc.integer({ min: 0, max: 100 }),
  aiGen:       fc.integer({ min: 0, max: 80 }),
  aiReview:    fc.integer({ min: 0, max: 80 }),
  aiMgmt:      fc.integer({ min: 0, max: 80 }),
  scope:       fc.integer({ min: 0, max: 100 }),
  review:      fc.integer({ min: 0, max: 40 }),
  time:        fc.integer({ min: -30, max: 30 }),
  seniority:   fc.integer({ min: 0, max: 100 }),
})

describe('tickDebt — properties', () => {
  it('debt stays in [0, 100] after 1000 ticks', () => {
    fc.assert(fc.property(sliderArb, fc.float({ min: 0, max: 100, noNaN: true }), fc.float({ min: 5, max: 100, noNaN: true }), (s, debt0, morale0) => {
      let debt = debt0
      for (let i = 0; i < 1000; i++) debt = tickDebt(s, debt, morale0)
      return debt >= 0 && debt <= 100 && Number.isFinite(debt)
    }), { numRuns: 200 })
  })
})

describe('tickMorale — properties', () => {
  it('morale stays in [5, 100] after 1000 ticks', () => {
    fc.assert(fc.property(sliderArb, fc.float({ min: 0, max: 100, noNaN: true }), fc.float({ min: 5, max: 100, noNaN: true }), (s, debt, morale0) => {
      let morale = morale0
      for (let i = 0; i < 1000; i++) {
        const result = tickMorale(s, debt, morale, morale)
        morale = result.morale
      }
      return morale >= 5 && morale <= 100 && Number.isFinite(morale)
    }), { numRuns: 200 })
  })

  it('returns an entries array and morale on every call', () => {
    fc.assert(fc.property(sliderArb, fc.float({ min: 0, max: 100, noNaN: true }), fc.float({ min: 5, max: 100, noNaN: true }), (s, debt, morale) => {
      const result = tickMorale(s, debt, morale, morale)
      return Array.isArray(result.entries) && Number.isFinite(result.morale)
    }), { numRuns: 200 })
  })
})

describe('tickJevons — properties', () => {
  it('jevonsScope stays in [0, 150] after 1000 ticks', () => {
    fc.assert(fc.property(sliderArb, fc.float({ min: 0, max: 150, noNaN: true }), fc.float({ min: 0, max: 100, noNaN: true }), fc.float({ min: 5, max: 100, noNaN: true }), (s, scope0, debt, morale) => {
      let scope = scope0
      let alert = 0
      for (let i = 0; i < 1000; i++) {
        const r = tickJevons(s, scope, debt, morale, alert)
        scope = r.jevonsScope
        alert = r.lastJevonsAlert
      }
      return scope >= 0 && scope <= 150 && Number.isFinite(scope)
    }), { numRuns: 200 })
  })
})

describe('tickSeniority — properties', () => {
  it('seniorityDrift stays in [-seniority, 0] after 1000 ticks', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 100 }),
      fc.float({ min: -100, max: 0, noNaN: true }),
      fc.float({ min: 5, max: 100, noNaN: true }),
      (seniority, drift0, morale) => {
        const clampedDrift = Math.max(-seniority, Math.min(0, drift0))
        let drift = clampedDrift
        let alert = seniority
        for (let i = 0; i < 1000; i++) {
          const r = tickSeniority(seniority, drift, morale, alert)
          drift = r.seniorityDrift
          alert = r.lastSeniorityAlert
        }
        return drift >= -seniority && drift <= 0 && Number.isFinite(drift)
      }
    ), { numRuns: 200 })
  })

  it('effectiveSeniority never goes below 0 or above 100', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 100 }),
      fc.float({ min: -100, max: 0, noNaN: true }),
      fc.float({ min: 5, max: 100, noNaN: true }),
      (seniority, drift0, morale) => {
        const clampedDrift = Math.max(-seniority, Math.min(0, drift0))
        const r = tickSeniority(seniority, clampedDrift, morale, seniority)
        const effective = seniority + r.seniorityDrift
        return effective >= 0 && effective <= 100
      }
    ), { numRuns: 200 })
  })
})

describe('engine — unit sanity checks', () => {
  const neutral = { paradigm: 50, elasticity: 50, amdahl: 50, aiGen: 40, aiReview: 20, aiMgmt: 20, scope: 50, review: 20, time: 0, seniority: 50 }

  it('tickDebt with no AI slowly reduces debt', () => {
    const noAI = { ...neutral, aiGen: 0 }
    const result = tickDebt(noAI, 50, 80)
    expect(result).toBeLessThan(50)
  })

  it('tickMorale recovers when quality is high and conditions are good', () => {
    const goodSliders = { ...neutral, scope: 20, review: 30, time: 10 }
    const result = tickMorale(goodSliders, 5, 60, 60)
    expect(result.morale).toBeGreaterThan(60)
  })

  it('tickJevons does not expand scope when AI is below threshold', () => {
    const noAI = { ...neutral, aiGen: 0, aiReview: 0, aiMgmt: 0 }
    const result = tickJevons(noAI, 0, 0, 100, 0)
    expect(result.jevonsScope).toBe(0)
  })
})
