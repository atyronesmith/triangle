import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { tickLearning, resetLearning } from '../src/learning.js'

const sliderArb = fc.record({
  aiGen:    fc.integer({ min: 0, max: 80 }),
  aiReview: fc.integer({ min: 0, max: 80 }),
  aiMgmt:   fc.integer({ min: 0, max: 80 }),
})

beforeEach(() => {
  resetLearning()
})

describe('tickLearning — properties', () => {
  it('teamExperience stays in [0, 100] after 1000 ticks', () => {
    fc.assert(fc.property(
      sliderArb,
      fc.float({ min: 0, max: 100, noNaN: true }),
      fc.float({ min: 5, max: 100, noNaN: true }),
      fc.float({ min: 0, max: 100, noNaN: true }),
      fc.float({ min: 0, max: 100, noNaN: true }),
      (s, exp0, morale, seniority, debt) => {
        resetLearning()
        let exp = exp0
        let alert = 0
        for (let i = 0; i < 1000; i++) {
          const r = tickLearning(s, exp, morale, seniority, debt, alert)
          exp = r.experience
          alert = r.lastExpAlert
        }
        return exp >= 0 && exp <= 100 && Number.isFinite(exp)
      }
    ), { numRuns: 200 })
  })

  it('experience is always finite after one tick', () => {
    fc.assert(fc.property(
      sliderArb,
      fc.float({ min: 0, max: 100, noNaN: true }),
      fc.float({ min: 5, max: 100, noNaN: true }),
      fc.float({ min: 0, max: 100, noNaN: true }),
      fc.float({ min: 0, max: 100, noNaN: true }),
      (s, exp, morale, seniority, debt) => {
        resetLearning()
        const r = tickLearning(s, exp, morale, seniority, debt, 0)
        return Number.isFinite(r.experience) && Array.isArray(r.entries)
      }
    ), { numRuns: 200 })
  })

  it('experience does not grow without AI usage', () => {
    fc.assert(fc.property(
      fc.float({ min: 10, max: 90, noNaN: true }),
      fc.float({ min: 60, max: 100, noNaN: true }),
      fc.float({ min: 40, max: 100, noNaN: true }),
      (exp, morale, seniority) => {
        resetLearning()
        const noAI = { aiGen: 0, aiReview: 0, aiMgmt: 0 }
        const r = tickLearning(noAI, exp, morale, seniority, 0, 0)
        return r.experience <= exp
      }
    ), { numRuns: 200 })
  })
})

describe('tickLearning — unit sanity checks', () => {
  it('resetLearning zeroes module state so repeated calls work cleanly', () => {
    resetLearning()
    const s = { aiGen: 50, aiReview: 20, aiMgmt: 10 }
    const r1 = tickLearning(s, 10, 80, 70, 10, 0)
    resetLearning()
    const r2 = tickLearning(s, 10, 80, 70, 10, 0)
    expect(r1.experience).toBe(r2.experience)
  })

  it('high AI + high morale + high seniority causes experience to grow', () => {
    resetLearning()
    const s = { aiGen: 80, aiReview: 80, aiMgmt: 80 }
    const r = tickLearning(s, 10, 95, 90, 5, 0)
    expect(r.experience).toBeGreaterThan(10)
  })

  it('seniority drop causes knowledge loss', () => {
    resetLearning()
    const s = { aiGen: 50, aiReview: 20, aiMgmt: 10 }
    tickLearning(s, 50, 80, 80, 10, 0)
    const r = tickLearning(s, 50, 80, 20, 10, 0)
    expect(r.experience).toBeLessThan(50)
  })
})
