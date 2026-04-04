export const PRESETS = {
  'baseline':       { aiGen: 0,  aiReview: 0,  aiMgmt: 0,  scope: 0,   review: 10, time: 0,   paradigm: 15, elasticity: 30, amdahl: 50, seniority: 50, tip: 'No AI. The traditional iron triangle at equilibrium.' },
  'realistic':      { aiGen: 35, aiReview: 15, aiMgmt: 10, scope: 25,  review: 25, time: 0,   paradigm: 35, elasticity: 50, amdahl: 45, seniority: 55, tip: 'Moderate AI across all three domains. Balanced adoption.' },
  'gen-only':       { aiGen: 60, aiReview: 0,  aiMgmt: 0,  scope: 30,  review: 10, time: 0,   paradigm: 35, elasticity: 40, amdahl: 45, seniority: 50, tip: 'All AI in generation, none in review. Watch debt and seniority erode.' },
  'mgmt-fantasy':   { aiGen: 40, aiReview: 5,  aiMgmt: 5,  scope: 100, review: 5,  time: -15, paradigm: 15, elasticity: 40, amdahl: 40, seniority: 60, tip: 'Management doubles scope. Seniors start leaving. Watch the spiral.' },
  'death-march':    { aiGen: 60, aiReview: 5,  aiMgmt: 10, scope: 120, review: 5,  time: -25, paradigm: 15, elasticity: 80, amdahl: 40, seniority: 65, tip: 'High seniority team pushed to breaking. Watch seniors flee.' },
  'sweet-spot':     { aiGen: 40, aiReview: 25, aiMgmt: 15, scope: 30,  review: 30, time: 10,  paradigm: 35, elasticity: 25, amdahl: 50, seniority: 55, tip: 'Balanced AI with strong review. Seniority holds. Sustainable.' },
  'review-heavy':   { aiGen: 30, aiReview: 50, aiMgmt: 10, scope: 20,  review: 40, time: 5,   paradigm: 50, elasticity: 20, amdahl: 55, seniority: 60, tip: 'Quality-first. Senior-heavy team. Debt stays near zero.' },
  'bull-case':      { aiGen: 55, aiReview: 30, aiMgmt: 30, scope: 70,  review: 15, time: 0,   paradigm: 75, elasticity: 60, amdahl: 70, seniority: 50, tip: 'Optimist: AI across all domains. Management AI shrinks serial fraction.' },
  'paradigm-shift': { aiGen: 70, aiReview: 40, aiMgmt: 40, scope: 90,  review: 10, time: -10, paradigm: 95, elasticity: 70, amdahl: 85, seniority: 45, tip: 'True believer: AI handles nearly everything. Seniority matters less.' },
  'jevons-demo':    { aiGen: 50, aiReview: 10, aiMgmt: 15, scope: 0,   review: 20, time: 0,   paradigm: 35, elasticity: 80, amdahl: 50, seniority: 50, tip: 'Zero management push, high elasticity. Watch Jevons auto-expand scope.' },
  'amdahl-demo':    { aiGen: 70, aiReview: 10, aiMgmt: 5,  scope: 0,   review: 20, time: 0,   paradigm: 50, elasticity: 15, amdahl: 35, seniority: 50, tip: 'High generation AI but only 35% accelerable.' },
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
