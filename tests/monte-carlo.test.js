import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { runMonteCarlo } from '../src/monte-carlo.js'
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

describe('runMonteCarlo — quantile ordering', () => {
  it('p10 <= p50 <= p90 for all weeks and all metrics', () => {
    fc.assert(fc.property(sliderArb, (sliders) => {
      resetLearning()
      const result = runMonteCarlo({ sliders, runs: 50, weeks: 20 })
      for (const [, band] of Object.entries(result.metrics)) {
        for (let wi = 0; wi < result.weeks; wi++) {
          if (band.p10[wi] > band.p50[wi] + 1e-9) return false
          if (band.p50[wi] > band.p90[wi] + 1e-9) return false
        }
      }
      return true
    }), { numRuns: 50 })
  })
})

describe('runMonteCarlo — robustness', () => {
  it('completes without throwing for extreme slider values (all max)', () => {
    resetLearning()
    expect(() => {
      runMonteCarlo({
        sliders: { paradigm: 100, elasticity: 100, amdahl: 100, aiGen: 80, aiReview: 80, aiMgmt: 80, scope: 100, review: 40, time: 30, seniority: 100 },
        runs: 50,
        weeks: 20,
      })
    }).not.toThrow()
  })

  it('completes without throwing for extreme slider values (all min)', () => {
    resetLearning()
    expect(() => {
      runMonteCarlo({
        sliders: { paradigm: 0, elasticity: 0, amdahl: 0, aiGen: 0, aiReview: 0, aiMgmt: 0, scope: 0, review: 0, time: -30, seniority: 0 },
        runs: 50,
        weeks: 20,
      })
    }).not.toThrow()
  })
})
