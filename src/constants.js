export const PRESETS = {
  'baseline':       { ai: 0,  scope: 0,   review: 10, time: 0,   paradigm: 15, elasticity: 30,  tip: 'No AI. The traditional iron triangle at equilibrium.' },
  'realistic':      { ai: 35, scope: 25,  review: 25, time: 0,   paradigm: 35, elasticity: 50,  tip: 'Moderate AI adoption with proportional review. Pragmatic — gains are real but bounded. Jevons creates organic scope creep.' },
  'mgmt-fantasy':   { ai: 40, scope: 100, review: 5,  time: -15, paradigm: 15, elasticity: 40,  tip: 'Management doubles scope, cuts timelines, and skimps on review. Jevons adds even more on top.' },
  'death-march':    { ai: 60, scope: 120, review: 5,  time: -25, paradigm: 15, elasticity: 80,  tip: 'Maximum scope, minimum time, no review, high elasticity. Jevons + management pressure = the spiral.' },
  'sweet-spot':     { ai: 45, scope: 30,  review: 35, time: 10,  paradigm: 35, elasticity: 25,  tip: 'AI with adequate review, modest scope, bounded elasticity. Sustainable — the "act like the skeptic" approach.' },
  'bull-case':      { ai: 60, scope: 70,  review: 15, time: 0,   paradigm: 75, elasticity: 60,  tip: 'High AI with optimistic paradigm. Jevons fires but the frontier genuinely expands — if you believe the models.' },
  'paradigm-shift': { ai: 70, scope: 90,  review: 10, time: -10, paradigm: 95, elasticity: 70,  tip: 'True believer: AI changes the production function. High elasticity — scope expands because everything becomes possible.' },
  'jevons-demo':    { ai: 50, scope: 0,   review: 20, time: 0,   paradigm: 35, elasticity: 80,  tip: 'Zero management scope push, high elasticity. Watch Jevons Paradox auto-expand scope purely from efficiency gains.' },
}

export const PARADIGM_DESCRIPTIONS = [
  'High overhead, steep diminishing returns, persistent review burden. AI is a better wrench.',
  'Real but bounded gains. Hidden costs significant. "Act like the skeptic, hope for the optimist."',
  'AI does cognitive work. Overhead shrinks as teams learn. Frontier genuinely expands. Debt accumulates slower.',
  'Near-zero marginal iteration cost. Review burden declining. Triangle may survive in theory but becomes practically irrelevant.',
]

export const ELASTICITY_DESCRIPTIONS = [
  'Inelastic: bounded tasks (weekly reports, fixed deliverables). Efficiency gains bank as slack.',
  'Low elasticity: some organic expansion (more thorough testing, better docs). Most gains retained.',
  'Elastic: significant auto-expansion. AI makes new work possible, so the org discovers it needs to be done.',
  'Super-elastic: unbounded demand. Every efficiency gain creates new demand. Jevons Paradox in full effect — the triangle doesn\'t shrink, scope consumes the efficiency.',
]

export const TICK_INTERVAL_MS = 800
export const RISK_COOLDOWN_MS = 3000
export const DIALOG_MAX_ENTRIES = 100
