export const PRESETS = {
  'baseline':       { ai: 0,  scope: 0,   review: 10, time: 0,   paradigm: 15, elasticity: 30, amdahl: 50,  tip: 'No AI. The traditional iron triangle at equilibrium.' },
  'realistic':      { ai: 35, scope: 25,  review: 25, time: 0,   paradigm: 35, elasticity: 50, amdahl: 45,  tip: 'Moderate AI with proportional review. Amdahl limits actual gains to ~60% of theoretical.' },
  'mgmt-fantasy':   { ai: 40, scope: 100, review: 5,  time: -15, paradigm: 15, elasticity: 40, amdahl: 40,  tip: 'Management assumes AI speeds up everything. Amdahl says only 40% of work is accelerable.' },
  'death-march':    { ai: 60, scope: 120, review: 5,  time: -25, paradigm: 15, elasticity: 80, amdahl: 40,  tip: 'Maximum everything. Serial bottlenecks + Jevons + thin review = the spiral.' },
  'sweet-spot':     { ai: 45, scope: 30,  review: 35, time: 10,  paradigm: 35, elasticity: 25, amdahl: 50,  tip: 'AI with adequate review, modest scope, realistic Amdahl fraction. Sustainable.' },
  'bull-case':      { ai: 60, scope: 70,  review: 15, time: 0,   paradigm: 75, elasticity: 60, amdahl: 70,  tip: 'Optimist: more work is AI-accelerable than skeptics think. Higher Amdahl fraction.' },
  'paradigm-shift': { ai: 70, scope: 90,  review: 10, time: -10, paradigm: 95, elasticity: 70, amdahl: 85,  tip: 'True believer: AI handles nearly all work types. Amdahl ceiling is very high.' },
  'jevons-demo':    { ai: 50, scope: 0,   review: 20, time: 0,   paradigm: 35, elasticity: 80, amdahl: 50,  tip: 'Zero management push, high elasticity. Watch Jevons auto-expand scope.' },
  'amdahl-demo':    { ai: 70, scope: 0,   review: 20, time: 0,   paradigm: 50, elasticity: 15, amdahl: 35,  tip: 'High AI boost but only 35% of work is accelerable. Watch the gap between blue (theoretical) and red (actual).' },
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

export const AMDAHL_DESCRIPTIONS = [
  'Mostly serial: judgment, integration, and architecture dominate. AI accelerates a small fraction — gains are real but modest.',
  'Mixed workflow: significant serial bottlenecks in review, decisions, and stakeholder alignment. AI helps but doesn\'t transform.',
  'Mostly accelerable: AI handles the majority of production work. Serial bottlenecks exist but don\'t dominate.',
  'Nearly all accelerable: AI can meaningfully speed up almost every task type. Serial human work is minimal.',
]

export const TICK_INTERVAL_MS = 800
export const RISK_COOLDOWN_MS = 3000
export const DIALOG_MAX_ENTRIES = 100
