import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { computeState, getParadigmParams, getParadigmLabel, getElasticityLabel, getAmdahlLabel } from '../src/model.js'

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

const accArb = fc.record({
  techDebt:      fc.float({ min: 0, max: 100, noNaN: true }),
  teamMorale:    fc.float({ min: 5, max: 100, noNaN: true }),
  jevonsScope:   fc.float({ min: 0, max: 150, noNaN: true }),
  teamExperience: fc.float({ min: 0, max: 100, noNaN: true }),
})

describe('computeState — properties', () => {
  it('quality is always finite and in [0, 100]', () => {
    fc.assert(fc.property(sliderArb, accArb, (s, a) => {
      const state = computeState(s, a.techDebt, a.teamMorale, a.jevonsScope, a.teamExperience)
      return Number.isFinite(state.quality) && state.quality >= 0 && state.quality <= 100
    }), { numRuns: 200 })
  })

  it('actualR is always finite and positive', () => {
    fc.assert(fc.property(sliderArb, accArb, (s, a) => {
      const state = computeState(s, a.techDebt, a.teamMorale, a.jevonsScope, a.teamExperience)
      return Number.isFinite(state.actualR) && state.actualR > 0
    }), { numRuns: 200 })
  })

  it('no NaN or Infinity in any returned numeric field', () => {
    fc.assert(fc.property(sliderArb, accArb, (s, a) => {
      const state = computeState(s, a.techDebt, a.teamMorale, a.jevonsScope, a.teamExperience)
      const nums = [state.aiR, state.amdahlR, state.effectiveR,
                    state.quality, state.scopePct, state.costPct, state.timePct,
                    state.actualBoostPct, state.perceivedBoostPct, state.taskBoostPct]
      return nums.every(n => Number.isFinite(n))
    }), { numRuns: 200 })
  })

  it('quality floor matches paradigm qualFloor', () => {
    fc.assert(fc.property(sliderArb, accArb, (s, a) => {
      const state = computeState(s, a.techDebt, a.teamMorale, a.jevonsScope, a.teamExperience)
      const pp = getParadigmParams(s.paradigm)
      return state.quality >= Math.floor(pp.qualFloor)
    }), { numRuns: 200 })
  })

  it('effectiveR stays above zero for any time value', () => {
    fc.assert(fc.property(sliderArb, accArb, (s, a) => {
      const state = computeState(s, a.techDebt, a.teamMorale, a.jevonsScope, a.teamExperience)
      return state.effectiveR > 0
    }), { numRuns: 200 })
  })
})

describe('computeState — unit sanity checks', () => {
  const zero = { paradigm: 0, elasticity: 0, amdahl: 0, aiGen: 0, aiReview: 0, aiMgmt: 0, scope: 0, review: 0, time: 0, seniority: 0 }
  const max  = { paradigm: 100, elasticity: 100, amdahl: 100, aiGen: 80, aiReview: 80, aiMgmt: 80, scope: 100, review: 40, time: 30, seniority: 100 }

  it('all-zero sliders produce no NaN', () => {
    const s = computeState(zero, 0, 100, 0, 0)
    expect(Number.isFinite(s.quality)).toBe(true)
    expect(Number.isFinite(s.actualR)).toBe(true)
  })

  it('all-max sliders produce no NaN', () => {
    const s = computeState(max, 100, 5, 150, 100)
    expect(Number.isFinite(s.quality)).toBe(true)
    expect(Number.isFinite(s.actualR)).toBe(true)
  })

  it('"your-boss" preset: paradigm=90, aiGen=70, quality in range', () => {
    const boss = { paradigm: 90, elasticity: 80, amdahl: 70, aiGen: 70, aiReview: 20, aiMgmt: 40, scope: 80, review: 10, time: -20, seniority: 40 }
    const s = computeState(boss, 30, 60, 20, 10)
    expect(s.quality).toBeGreaterThanOrEqual(0)
    expect(s.quality).toBeLessThanOrEqual(100)
    expect(Number.isFinite(s.actualR)).toBe(true)
  })
})
