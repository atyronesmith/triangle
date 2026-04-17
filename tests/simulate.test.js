import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { simulate } from '../src/simulate.js'
import { resetLearning } from '../src/learning.js'

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

beforeEach(() => {
  resetLearning()
})

describe('simulate — reproducibility', () => {
  it('same seed produces identical output', () => {
    fc.assert(fc.property(sliderArb, (sliders) => {
      resetLearning()
      const a = simulate({ sliders, weeks: 10, seed: 42 })
      resetLearning()
      const b = simulate({ sliders, weeks: 10, seed: 42 })
      return JSON.stringify(a) === JSON.stringify(b)
    }), { numRuns: 50 })
  })

  it('different seeds produce different outputs', () => {
    fc.assert(fc.property(sliderArb, (sliders) => {
      resetLearning()
      const a = simulate({ sliders, weeks: 10, seed: 1 })
      resetLearning()
      const b = simulate({ sliders, weeks: 10, seed: 2 })
      // At least one week should differ (noise ensures this for any non-trivial run)
      return JSON.stringify(a) !== JSON.stringify(b)
    }), { numRuns: 50 })
  })
})

describe('simulate — bounded outputs', () => {
  it('all metrics stay within valid ranges and are finite', () => {
    fc.assert(fc.property(sliderArb, (sliders) => {
      resetLearning()
      const snaps = simulate({ sliders, weeks: 52, seed: 7 })
      return snaps.every(s =>
        s.debt       >= 0 && s.debt       <= 100 && Number.isFinite(s.debt)       &&
        s.morale     >= 5 && s.morale     <= 100 && Number.isFinite(s.morale)     &&
        s.jevons     >= 0 && s.jevons     <= 150 && Number.isFinite(s.jevons)     &&
        s.experience >= 0 && s.experience <= 100 && Number.isFinite(s.experience) &&
        Number.isFinite(s.roi)
      )
    }), { numRuns: 50 })
  })
})

describe('simulate — edge cases', () => {
  it('returns empty array when weeks = 0', () => {
    resetLearning()
    const result = simulate({ sliders: { paradigm: 50, elasticity: 50, amdahl: 50, aiGen: 40, aiReview: 20, aiMgmt: 20, scope: 50, review: 20, time: 0, seniority: 50 }, weeks: 0, seed: 1 })
    expect(result).toEqual([])
  })

  it('snapshot week numbers are sequential 1..weeks', () => {
    resetLearning()
    const weeks = 20
    const snaps = simulate({ sliders: { paradigm: 50, elasticity: 50, amdahl: 50, aiGen: 40, aiReview: 20, aiMgmt: 20, scope: 50, review: 20, time: 0, seniority: 50 }, weeks, seed: 1 })
    expect(snaps.length).toBe(weeks)
    expect(snaps[0].week).toBe(1)
    expect(snaps[weeks - 1].week).toBe(weeks)
  })
})
