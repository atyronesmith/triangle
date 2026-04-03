export const PRESETS = {
  'baseline':       { ai: 0,  scope: 0,   review: 10, time: 0,   paradigm: 15,  tip: 'No AI. The traditional iron triangle at equilibrium.' },
  'realistic':      { ai: 35, scope: 25,  review: 25, time: 0,   paradigm: 35,  tip: 'Moderate AI adoption with proportional review. Pragmatic — gains are real but bounded.' },
  'mgmt-fantasy':   { ai: 40, scope: 100, review: 5,  time: -15, paradigm: 15,  tip: 'Management doubles scope, cuts timelines, and skimps on review. Watch quality and debt.' },
  'death-march':    { ai: 60, scope: 120, review: 5,  time: -25, paradigm: 15,  tip: 'Maximum scope, minimum time, no review. The spiral that burns out teams and ships bugs.' },
  'sweet-spot':     { ai: 45, scope: 30,  review: 35, time: 10,  paradigm: 35,  tip: 'AI with adequate review and modest scope increase. Sustainable — the "act like the skeptic" approach.' },
  'bull-case':      { ai: 60, scope: 70,  review: 15, time: 0,   paradigm: 75,  tip: 'High AI with optimistic paradigm belief. The frontier genuinely expands — if you believe the models.' },
  'paradigm-shift': { ai: 70, scope: 90,  review: 10, time: -10, paradigm: 95,  tip: 'True believer: AI changes the production function itself. Near-zero iteration cost. Triangle becomes irrelevant.' },
}

export const PARADIGM_DESCRIPTIONS = [
  'High overhead, steep diminishing returns, persistent review burden. AI is a better wrench.',
  'Real but bounded gains. Hidden costs significant. "Act like the skeptic, hope for the optimist."',
  'AI does cognitive work. Overhead shrinks as teams learn. Frontier genuinely expands. Debt accumulates slower.',
  'Near-zero marginal iteration cost. Review burden declining. Triangle may survive in theory but becomes practically irrelevant.',
]

export const TICK_INTERVAL_MS = 800
export const RISK_COOLDOWN_MS = 3000
export const DIALOG_MAX_ENTRIES = 100
