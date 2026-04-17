/**
 * Entry point — init, event wiring, presets, snapshot, risk events.
 */

import { PRESETS, PARADIGM_DESCRIPTIONS, ELASTICITY_DESCRIPTIONS, AMDAHL_DESCRIPTIONS, RISK_COOLDOWN_MS } from './constants.js'
import { computeState, getParadigmLabel, getElasticityLabel, getAmdahlLabel } from './model.js'
import { tickDebt, tickMorale, tickJevons, tickSeniority } from './engine.js'
import { initCanvas, render, setRenderMode } from './renderer.js'
import { addEntry, clearDialog, analyzeChanges } from './dialog.js'
import { initTooltips } from './tooltip.js'
import { initFactory, updateFactory, setFactoryPaused } from './factory.js'
import { initAmdahlChart, updateAmdahlChart } from './amdahl-chart.js'
import { initQuotes, updateQuoteSentiment, startQuoteTimer } from './quotes.js'
import { initSparklines, pushSparkline, clearSparklines } from './sparkline.js'
import { initHistoryChart, pushHistory, clearHistory, setMonteCarloOverlay, clearMonteCarloOverlay } from './history-chart.js'
import { runMonteCarlo } from './monte-carlo.js'
import { encodeToHash, decodeFromHash, initCopyLink } from './url-state.js'
import { initGoodhart, updateGoodhart, resetGoodhart } from './goodhart.js'
import { tickLearning, resetLearning } from './learning.js'
import { initTeamState, resetTeamState, updateTeamState, getRoster } from './team.js'
import { runScenario, detectMajorEvent, resetEventTracker } from './scenario.js'
import { computeRoi } from './simulate.js'

// --- State ---
let techDebt = 0
let teamMorale = 100
let lastMoraleAlert = 100
let jevonsScope = 0
let lastJevonsAlert = 0
let seniorityDrift = 0
let lastSeniorityAlert = 100
let teamExperience = 0
let lastExpAlert = 0
let teamState = initTeamState()
let simWeek = 0
let simRunning = true
let prevState = null
let snapshotR = null
let riskCooldown = false

// --- Scenario state ---
let scenarioRunning = false
let scenarioCtrl = null
let scenarioSummary = null
let bannerQueue = []
let bannerVisible = false
let bannerTimer = null

// --- DOM refs ---
const sl = {
  aiGen:      document.getElementById('ai-gen'),
  aiReview:   document.getElementById('ai-review'),
  aiMgmt:     document.getElementById('ai-mgmt'),
  scope:      document.getElementById('scope-push'),
  review:     document.getElementById('review'),
  time:       document.getElementById('time-adj'),
  paradigm:   document.getElementById('paradigm'),
  elasticity: document.getElementById('elasticity'),
  amdahl:     document.getElementById('amdahl'),
  seniority:  document.getElementById('seniority'),
}

function readSliders() {
  return {
    aiGen:      +sl.aiGen.value,
    aiReview:   +sl.aiReview.value,
    aiMgmt:     +sl.aiMgmt.value,
    scope:      +sl.scope.value,
    review:     +sl.review.value,
    time:       +sl.time.value,
    paradigm:   +sl.paradigm.value,
    elasticity: +sl.elasticity.value,
    amdahl:     +sl.amdahl.value,
    seniority:  +sl.seniority.value,
  }
}

function getState() {
  const sv = readSliders()
  // Apply seniority drift from attrition before computing state
  sv.effectiveSeniority = Math.max(0, Math.min(100, sv.seniority + seniorityDrift))
  return computeState(sv, techDebt, teamMorale, jevonsScope, teamExperience)
}

function doSync() {
  if (window.innerWidth < 900) {
    const dialogCard = document.querySelector('.dialog-card')
    const dialogScroll = document.querySelector('.dialog-scroll')
    if (dialogCard) dialogCard.style.height = ''
    if (dialogScroll) dialogScroll.style.height = '300px'
    return
  }
  const triCard = document.querySelector('.top-grid section > .card')
  if (!triCard) return
  const h = triCard.offsetHeight
  if (h < 100) return

  const dialogCard = document.querySelector('.dialog-card')
  const dialogScroll = document.querySelector('.dialog-scroll')
  if (dialogCard && dialogScroll) {
    dialogCard.style.height = h + 'px'
    const headerH = dialogCard.querySelector('.card-header')?.offsetHeight || 0
    const btnH = dialogCard.querySelector('.clear-btn')?.offsetHeight || 0
    dialogScroll.style.height = (h - headerH - btnH) + 'px'
  }
}

function syncColumnHeights() {
  // Double rAF to ensure layout is fully settled after canvas resize
  requestAnimationFrame(() => requestAnimationFrame(doSync))
}

// ResizeObserver on triangle card — catches canvas resize, window resize, etc.
const triCardObs = new ResizeObserver(doSync)
const triCardEl = document.querySelector('.top-grid section > .card')
if (triCardEl) triCardObs.observe(triCardEl)

function updateClock() {
  const months = Math.floor(simWeek / 4.33)
  const sprints = Math.floor(simWeek / 2)
  document.getElementById('sim-clock').textContent = `Week ${simWeek}`
  const parts = []
  if (months > 0) parts.push(`${months} mo`)
  if (sprints > 0) parts.push(`sprint ${sprints}`)
  document.getElementById('sim-clock-detail').textContent = parts.join(' · ')
}

// --- Init canvas ---
initCanvas()
syncColumnHeights()
window.addEventListener('resize', syncColumnHeights)

// --- Preset buttons ---
const presetsContainer = document.getElementById('presets')
Object.entries(PRESETS).forEach(([name, preset]) => {
  const btn = document.createElement('button')
  btn.className = name === 'your-boss' ? 'preset-btn preset-boss'
    : name === 'agent-swarm' ? 'preset-btn preset-swarm'
    : 'preset-btn'
  btn.setAttribute('aria-pressed', 'false')
  btn.textContent = name.replace(/-/g, ' ')
  btn.dataset.tip = preset.tip
  btn.addEventListener('click', () => applyPreset(name))
  presetsContainer.appendChild(btn)
})

// --- Core update loop ---
let debounceTimer = null

function update() {
  document.getElementById('v-ai-gen').textContent = sl.aiGen.value + '%'
  document.getElementById('v-ai-review').textContent = sl.aiReview.value + '%'
  document.getElementById('v-ai-mgmt').textContent = sl.aiMgmt.value + '%'
  document.getElementById('v-scope').textContent = sl.scope.value + '%'
  document.getElementById('v-review').textContent = sl.review.value + '%'
  const tv = +sl.time.value
  document.getElementById('v-time').textContent = (tv >= 0 ? '+' : '') + tv + '%'
  document.getElementById('v-paradigm').textContent = getParadigmLabel(+sl.paradigm.value)
  document.getElementById('v-elasticity').textContent = getElasticityLabel(+sl.elasticity.value)

  const pv = +sl.paradigm.value
  document.getElementById('paradigm-desc').textContent = PARADIGM_DESCRIPTIONS[pv <= 20 ? 0 : pv <= 50 ? 1 : pv <= 80 ? 2 : 3]

  const ev = +sl.elasticity.value
  document.getElementById('elasticity-desc').textContent = ELASTICITY_DESCRIPTIONS[ev <= 15 ? 0 : ev <= 40 ? 1 : ev <= 65 ? 2 : 3]

  document.getElementById('v-seniority').textContent = sl.seniority.value + '%'
  const effSen = Math.max(0, Math.min(100, +sl.seniority.value + seniorityDrift))
  const driftDesc = document.getElementById('seniority-drift-desc')
  if (Math.round(seniorityDrift) < -2) {
    driftDesc.textContent = `Effective: ${Math.round(effSen)}% (attrition: ${Math.round(seniorityDrift)}%)`
    driftDesc.style.color = effSen < 30 ? '#E24B4A' : '#EF9F27'
  } else {
    driftDesc.textContent = ''
  }

  document.getElementById('v-amdahl').textContent = getAmdahlLabel(+sl.amdahl.value)
  const av = +sl.amdahl.value
  document.getElementById('amdahl-desc').textContent = AMDAHL_DESCRIPTIONS[av <= 25 ? 0 : av <= 50 ? 1 : av <= 75 ? 2 : 3]

  sl.aiGen.setAttribute('aria-valuetext', sl.aiGen.value + '%')
  sl.aiReview.setAttribute('aria-valuetext', sl.aiReview.value + '%')
  sl.aiMgmt.setAttribute('aria-valuetext', sl.aiMgmt.value + '%')
  sl.scope.setAttribute('aria-valuetext', sl.scope.value + '%')
  sl.review.setAttribute('aria-valuetext', sl.review.value + '%')
  sl.time.setAttribute('aria-valuetext', (tv >= 0 ? '+' : '') + tv + '%')
  sl.paradigm.setAttribute('aria-valuetext', getParadigmLabel(pv))
  sl.elasticity.setAttribute('aria-valuetext', getElasticityLabel(ev))
  sl.amdahl.setAttribute('aria-valuetext', getAmdahlLabel(av))
  sl.seniority.setAttribute('aria-valuetext', sl.seniority.value + '%')

  const s = getState()
  render(s, techDebt, teamMorale, snapshotR)
  updateFactory({ ...s, techDebt, teamMorale, teamState })
  updateAmdahlChart({ ...s, techDebt, teamMorale })
  updateQuoteSentiment({ ...s, techDebt, teamMorale })
  updateGoodhart({ ...s, techDebt, teamMorale })
  encodeToHash(readSliders())

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    prevState = analyzeChanges(getState(), prevState, techDebt, teamMorale, jevonsScope)
  }, 200)
}

// --- Presets ---
function resetAccumulatedState() {
  techDebt = 0
  teamMorale = 100
  lastMoraleAlert = 100
  jevonsScope = 0
  lastJevonsAlert = 0
  seniorityDrift = 0
  lastSeniorityAlert = 100
  teamExperience = 0
  lastExpAlert = 0
  resetLearning()
  teamState = resetTeamState()
  simWeek = 0
  prevState = null
  clearSparklines()
  clearHistory()
  resetGoodhart()
}

function applyPreset(name) {
  const pr = PRESETS[name]
  if (!pr) return
  resetAccumulatedState()
  presetsContainer.querySelectorAll('.preset-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false') })
  const clicked = [...presetsContainer.querySelectorAll('.preset-btn')].find(b => b.textContent.trim() === name.replace(/-/g, ' '))
  if (clicked) { clicked.classList.add('active'); clicked.setAttribute('aria-pressed', 'true') }
  addEntry('system', `Preset: <strong>${name.replace(/-/g, ' ')}</strong>. All accumulated state reset.`)
  if (name === 'your-boss') {
    addEntry('scope', `<strong>"We have AI now — double the scope and cut the timeline."</strong> This is the most common AI adoption failure pattern. Management sees AI efficiency, demands 2x output, cuts review, compresses deadlines. Three economic laws explain why this backfires:`)
    addEntry('system', `<strong>Jevons Paradox:</strong> efficiency doesn't reduce demand — it increases it. Scope will auto-expand on top of the management push. Watch the red Jevons bar.`)
    addEntry('system', `<strong>Amdahl's Law:</strong> only ${pr.amdahl}% of work is AI-accelerable. The rest — judgment, architecture, integration — runs at human speed. The serial fraction is the ceiling.`)
    addEntry('system', `<strong>Goodhart's Law:</strong> the dashboard will show "productivity up 65%." Reality will show debt spiraling, seniors leaving, and quality in freefall. Watch both panels below.`)
    addEntry('morale', `<em>This preset is dedicated to every engineer who's been told "but the AI should make this easy" by someone who's never shipped code.</em>`)
  }
  if (name === 'agent-swarm') {
    addEntry('scope', `<strong>Agent Swarm deployed.</strong> Five AI agents running in parallel with orchestration — a Director plans, Workers execute, Stewards maintain. Merge automation handles conflicts. This is the frontier.`)
    addEntry('counter', `<strong>The bull case is real here.</strong> Multi-agent orchestration eliminates the coordination tax that killed earlier AI efforts. Agents don't context-switch, don't get tired, and don't need standups. If the orchestration layer is good, throughput scales nearly linearly with agent count.`)
    addEntry('rebuttal', `<em>But who reviews the swarm's output?</em> Agents reviewing agents is a closed epistemic loop — confident, fast, and potentially wrong in ways nobody catches until production. When five agents each generate code that "passes tests," you have five agents' worth of assumptions baked into a codebase no human fully understands.`)
    addEntry('system', `<strong>Jevons at scale:</strong> with elasticity at ${pr.elasticity}%, a swarm this productive will generate demand faster than any team can absorb. The org won't bank the gains — it'll discover ten new projects that "only take a day with the swarm."`)
    addEntry('debt', `<strong>Seniority at ${pr.seniority}%.</strong> Swarm-heavy orgs tend to flatten seniority — why pay seniors when agents do the work? But seniors were the ones who knew <em>what not to build</em>. Watch the seniority drift as the simulation runs.`)
    addEntry('morale', `<em>The remaining humans become prompt shepherds and merge-conflict therapists. Is that a job anyone wants to do for long?</em>`)
  }
  Object.keys(pr).forEach(k => { if (sl[k]) sl[k].value = pr[k] })
  updateClock()
  update()
}

// --- Snapshot / Comparison ---
function snapshotBaseline() {
  const s = getState()
  snapshotR = s.actualR
  document.getElementById('clear-snap-btn').style.display = ''
  document.getElementById('snap-legend').style.display = ''
  document.getElementById('snap-label').textContent =
    'Snapshot: actual=' + Math.round(s.actualR * 100) + '%, quality=' + s.quality + '%, morale=' + Math.round(teamMorale) + ', debt=' + Math.round(techDebt) + ', jevons=+' + Math.round(jevonsScope) + '%'
  addEntry('system', 'Baseline snapshot saved. The purple ghost triangle shows where you were. Move sliders to compare.')
  render(s, techDebt, teamMorale, snapshotR)
}

function clearSnapshot() {
  snapshotR = null
  document.getElementById('clear-snap-btn').style.display = 'none'
  document.getElementById('snap-legend').style.display = 'none'
  document.getElementById('snap-label').textContent = ''
  render(getState(), techDebt, teamMorale, snapshotR)
}

// --- Risk Event ---
function triggerRiskEvent() {
  if (riskCooldown) return
  const s = getState()
  // Incident always fires — the question is severity, not whether it happens.
  // Real incidents happen regardless of process. The question is: can the team absorb it?
  // Severity scales with AI adoption and inversely with review depth.
  // Calibrated with CodeRabbit: AI code has 2.74x more vulnerabilities
  // Incident severity driven by generation AI volume vs effective review (human + AI review)
  const reviewRatio = s.aiGen > 0 ? (s.effectiveReview || s.review) / (s.aiGen * 0.4 + 5) : 1
  const aiExposure = Math.max(0.2, s.aiGen / 80)
  const reviewMitigation = Math.min(reviewRatio, 1) // review caps at full coverage
  const severity = aiExposure * (1.2 - reviewMitigation * 0.8) // 0.2..1.2 range

  const debtHit = Math.round(8 + severity * 20 + Math.random() * 10)
  const moraleHit = Math.round(5 + severity * 15 + Math.random() * 8)
  techDebt = Math.min(100, techDebt + debtHit)
  teamMorale = Math.max(5, teamMorale - moraleHit)

  if (severity > 0.7) {
    addEntry('risk', `<strong>Major incident.</strong> ${s.ai > 20 ? 'AI-generated code with 2.74x the vulnerability rate of human code (CodeRabbit 2025) reached production.' : 'A production failure exposed gaps in the review process.'} Severity: ${(severity * 100).toFixed(0)}%. Tech debt +${debtHit}% → ${Math.round(techDebt)}%. Review mitigation: ${(reviewMitigation * 100).toFixed(0)}%.`)
    addEntry('morale', `Morale hit: -${moraleHit}% → ${Math.round(teamMorale)}%. Nothing erodes trust faster than an incident the team warned about. The people who flagged review gaps are vindicated and resentful in equal measure.`)
    addEntry('time', 'Emergency remediation. Work in progress stalls. The timeline just extended whether leadership acknowledges it or not.')
  } else if (severity > 0.4) {
    addEntry('risk', `<strong>Moderate incident.</strong> A defect reached production. Severity: ${(severity * 100).toFixed(0)}%. ${reviewMitigation > 0.7 ? 'Review process caught the worst of it — damage contained.' : 'Thin review meant the defect propagated before detection.'} Debt +${debtHit}% → ${Math.round(techDebt)}%.`)
    addEntry('morale', `Team absorbs the hit: morale -${moraleHit}% → ${Math.round(teamMorale)}%. Manageable if it doesn't happen again soon.`)
  } else {
    addEntry('risk', `<strong>Minor incident.</strong> A defect was caught quickly. Severity: ${(severity * 100).toFixed(0)}%. ${reviewMitigation > 0.7 ? 'Review processes worked — limited blast radius.' : 'Got lucky — thin review, but the defect was in a non-critical path.'} Debt +${debtHit}% → ${Math.round(techDebt)}%.`)
  }
  if (s.paradigm > 60 && severity > 0.5) {
    addEntry('counter', `<em>One incident doesn't invalidate the model. Cars crash too. The question is whether the aggregate output justifies the tail risk. Mature AI adoption includes incident response plans.</em>`)
  }

  riskCooldown = true
  document.getElementById('risk-btn').disabled = true
  setTimeout(() => {
    riskCooldown = false
    document.getElementById('risk-btn').disabled = false
  }, RISK_COOLDOWN_MS)

  render(getState(), techDebt, teamMorale, snapshotR)
}

// --- Event wiring ---
Object.values(sl).forEach(s => s.addEventListener('input', update))
document.getElementById('snap-btn').addEventListener('click', snapshotBaseline)
document.getElementById('clear-snap-btn').addEventListener('click', clearSnapshot)
document.getElementById('risk-btn').addEventListener('click', triggerRiskEvent)
document.getElementById('clear-dialog-btn').addEventListener('click', clearDialog)

// --- Monte Carlo ---
document.getElementById('mc-btn').addEventListener('click', (e) => {
  e.stopPropagation()
  const sliders = readSliders()
  const mcResult = runMonteCarlo({ sliders, runs: 200, weeks: 52 })
  setMonteCarloOverlay(mcResult)
  document.getElementById('mc-clear-btn').style.display = ''
  const p10roi = Math.round(mcResult.metrics.roi.p10[51])
  const p50roi = Math.round(mcResult.metrics.roi.p50[51])
  const p90roi = Math.round(mcResult.metrics.roi.p90[51])
  addEntry('system', `<strong>Monte Carlo complete — 200 alternate timelines simulated.</strong> Each run uses current slider settings plus stochastic weekly noise and random incidents (4% probability per week). The shaded bands on the history charts show the p10–p90 risk envelope; the dashed line is the median (p50). At week 52: ROI p10=${p10roi}, p50=${p50roi}, p90=${p90roi}. Wide bands mean high outcome variance — the current configuration is sensitive to luck. Narrow bands mean the trajectory is robust regardless of incident timing.`)
})
document.getElementById('mc-clear-btn').addEventListener('click', (e) => {
  e.stopPropagation()
  clearMonteCarloOverlay()
  document.getElementById('mc-clear-btn').style.display = 'none'
})

// --- Simulation controls ---
function toggleSim() {
  simRunning = !simRunning
  setFactoryPaused(!simRunning)
  const btn = document.getElementById('sim-toggle')
  btn.textContent = simRunning ? 'Pause' : 'Resume'
  btn.setAttribute('aria-label', btn.textContent.trim() === 'Pause' ? 'Pause simulation' : 'Resume simulation')
  btn.classList.toggle('active', !simRunning)
  addEntry('system', simRunning ? 'Simulation resumed.' : 'Simulation paused. Sliders still update the triangle — debt, morale, and Jevons are frozen.')
}

function resetSim() {
  resetAccumulatedState()
  updateClock()
  addEntry('system', 'Simulation reset. Clock, debt, morale, and Jevons scope zeroed. Slider positions unchanged.')
  render(getState(), techDebt, teamMorale, snapshotR)
}

document.getElementById('sim-toggle').addEventListener('click', toggleSim)
document.getElementById('sim-reset').addEventListener('click', resetSim)
document.getElementById('scenario-btn').addEventListener('click', () => {
  if (scenarioRunning) cancelScenario()
  else startScenario()
})
document.getElementById('sm-run-again-btn').addEventListener('click', () => {
  closeSummaryModal()
  startScenario()
})
document.getElementById('sm-close-btn').addEventListener('click', closeSummaryModal)
document.querySelectorAll('input[name="tri-mode"]').forEach(r => {
  r.addEventListener('change', (e) => { setRenderMode(e.target.value); update() })
})

// --- Periodic commentary ---
function periodicCommentary(s) {
  if (simWeek < 4 || simWeek % 8 !== 0) return
  const mo = Math.round(simWeek / 4.33)
  const debt = Math.round(techDebt)
  const morale = Math.round(teamMorale)
  const jev = Math.round(jevonsScope)
  const gap = Math.round(s.mgmtR * 100) - Math.round(s.actualR * 100)

  // Debt trending
  if (debt > 60) {
    addEntry('debt', `<strong>Month ${mo} status:</strong> Tech debt at ${debt}%. The codebase is fighting back — every new feature takes longer because it has to navigate AI-generated code nobody fully reviewed. <em>Recommendation: raise review to ${Math.min(60, s.review + 15)}%+ and reduce scope until debt drops below 30%.</em>`)
  } else if (debt > 30 && s.review < 20) {
    addEntry('debt', `Month ${mo}: Debt climbing (${debt}%) with thin review (${s.review}%). This is the silent accumulation phase — dashboards still look OK but the team is losing understanding of the codebase. <em>Consider raising review to at least ${Math.round(s.ai * 0.4)}% to stabilize.</em>`)
  } else if (debt > 15 && debt <= 30) {
    addEntry('debt', `Month ${mo}: Debt at ${debt}% — noticeable drag. AI boost is ~${Math.round(debt * 0.3)}% less effective than the slider suggests. Manageable if review holds, but watch the trend.`)
  } else if (debt < 5 && s.ai > 20 && s.review > 20) {
    addEntry('system', `Month ${mo}: Debt under control (${debt}%) with active AI adoption. Review investment is paying off — the team maintains code understanding despite AI-generated output.`)
  }

  // Quality commentary
  if (s.quality < 30) {
    addEntry('quality', `<strong>Month ${mo}:</strong> Quality at ${s.quality}%. Users are experiencing failures. Team credibility is eroding. <em>Immediate options: cut scope to ${Math.max(0, s.scope - 30)}%, extend timeline to +${Math.max(s.time + 15, 10)}%, or raise review to ${Math.min(60, s.review + 20)}%. Any one of these helps. All three together is the fastest recovery.</em>`)
  } else if (s.quality < 50) {
    addEntry('quality', `Month ${mo}: Quality at ${s.quality}%. Bug reports are rising, rework is consuming throughput gains. <em>The cheapest fix is usually reducing scope — even 15% gives the team room to review properly.</em>`)
  } else if (s.quality >= 50 && s.quality < 70 && gap > 10) {
    addEntry('quality', `Month ${mo}: Quality at ${s.quality}% with a ${gap}% scope-capacity gap. Quality is absorbing the gap. It will continue to degrade unless scope or capacity changes.`)
  }

  // Morale trending
  if (morale < 40 && s.ai > 30) {
    addEntry('morale', `<strong>Month ${mo}:</strong> Team health at ${morale}%. At this level you're losing institutional knowledge faster than you can document it. The AI-generated code that shipped during the high-output phase is becoming unmaintainable. <em>Scope reduction is the fastest morale intervention. Extend timelines if possible.</em>`)
  } else if (morale < 60 && morale >= 40) {
    addEntry('morale', `Month ${mo}: Morale at ${morale}%. The team is strained but holding. Senior engineers are questioning whether the pace is sustainable. ${s.scope > 50 ? 'Scope pressure (' + s.scope + '%) is the primary driver — easing it even slightly would help.' : s.time < -10 ? 'Timeline compression is the primary stressor.' : 'Accumulated debt (' + debt + '%) is demoralizing.'}`)
  } else if (morale > 85 && s.ai > 25 && debt < 15) {
    addEntry('system', `Month ${mo}: Team health strong (${morale}%). Sustainable pace with AI adoption. This is the configuration worth protecting.`)
  }

  // Jevons commentary
  if (jev > 30 && gap > 0) {
    addEntry('scope', `Month ${mo}: Jevons auto-expansion at +${jev}% on top of ${s.scope}% management push. Total demand exceeds capacity by ${gap}%. The efficiency gains have been fully consumed by new work. <em>Lower demand elasticity or explicitly bound scope to bank some of the AI benefit as slack.</em>`)
  } else if (jev > 50) {
    addEntry('scope', `Month ${mo}: Jevons scope at +${jev}%. The organization has expanded work to consume all AI efficiency and then some. Nobody mandated this — it emerged. Each new task was individually reasonable. The aggregate isn't.`)
  }

  // Amdahl commentary
  if (s.ai > 30 && (s.amdahl || 50) < 45 && (s.amdahlLoss || 0) > 10) {
    addEntry('system', `Month ${mo}: Amdahl bottleneck — AI is at ${s.ai}% but only ${s.amdahl}% of work is accelerable. Serial human tasks (${100 - s.amdahl}%) are the binding constraint. Theoretical vs. actual gap: ${s.amdahlLoss}%. <em>Increasing AI further won't help much — the serial fraction needs to shrink, which means process change, not tool change.</em>`)
  }

  // Overall health check at quarter boundaries
  if (simWeek % 13 === 0) {
    const quarter = Math.round(simWeek / 13)
    if (s.quality >= 80 && debt < 15 && morale > 70) {
      addEntry('system', `<strong>Q${quarter} review:</strong> Quality ${s.quality}%, debt ${debt}%, morale ${morale}%. Sustainable. The current configuration is working — protect these parameters.`)
    } else if (s.quality < 50 || debt > 50 || morale < 40) {
      addEntry('system', `<strong>Q${quarter} review:</strong> Quality ${s.quality}%, debt ${debt}%, morale ${morale}%. ${s.quality < 50 ? 'Quality is the urgent problem. ' : ''}${debt > 50 ? 'Debt is the structural problem. ' : ''}${morale < 40 ? 'Morale is the human problem. ' : ''}This combination doesn't self-correct — it requires deliberate intervention.`)
    } else {
      addEntry('system', `<strong>Q${quarter} review:</strong> Quality ${s.quality}%, debt ${debt}%, morale ${morale}%. Mixed. ${gap > 0 ? 'Scope exceeds capacity by ' + gap + '%. ' : ''}${debt > 20 ? 'Debt is accumulating. ' : ''}Watch the trends over the next quarter.`)
    }
  }
}

// --- Shared per-tick work — used by tickLoop AND scenario runner ---
// Returns { teamEvents, riskSeverity } for event detection.
function advanceOneTick() {
  simWeek++
  const sliderValues = readSliders()
  techDebt = tickDebt(sliderValues, techDebt, teamMorale)
  const moraleResult = tickMorale(sliderValues, techDebt, teamMorale, lastMoraleAlert)
  teamMorale = moraleResult.morale
  lastMoraleAlert = moraleResult.lastMoraleAlert
  moraleResult.entries.forEach(e => addEntry(e.vertex, e.msg))
  const jevonsResult = tickJevons(sliderValues, jevonsScope, techDebt, teamMorale, lastJevonsAlert)
  jevonsScope = jevonsResult.jevonsScope
  lastJevonsAlert = jevonsResult.lastJevonsAlert
  jevonsResult.entries.forEach(e => addEntry(e.vertex, e.msg))
  const senResult = tickSeniority(sliderValues.seniority || 50, seniorityDrift, teamMorale, lastSeniorityAlert)
  seniorityDrift = senResult.seniorityDrift
  lastSeniorityAlert = senResult.lastSeniorityAlert
  senResult.entries.forEach(e => addEntry(e.vertex, e.msg))
  const effSen = Math.max(0, Math.min(100, (sliderValues.seniority || 50) + seniorityDrift))
  const learnResult = tickLearning(sliderValues, teamExperience, teamMorale, effSen, techDebt, lastExpAlert)
  teamExperience = learnResult.experience
  lastExpAlert = learnResult.lastExpAlert
  learnResult.entries.forEach(e => addEntry(e.vertex, e.msg))

  // Persona events are narrative-only; aggregate morale already captures their effect on the sim.
  const teamResult = updateTeamState(teamState, {
    aggregateMorale: teamMorale,
    sliders: sliderValues,
    techDebt,
    effectiveSeniority: effSen,
    seniorityDrift,
  })
  teamState = teamResult.newTeamState
  teamResult.events.forEach(ev => {
    const vertex = ev.type === 'praise' ? 'system' : 'morale'
    addEntry(vertex, ev.msg)
    if (ev.type === 'quit') {
      const persona = getRoster().find(p => p.id === ev.personaId)
      if (persona?.seniorityLevel === 'senior') seniorityDrift -= 5
      else if (persona?.seniorityLevel === 'mid') seniorityDrift -= 2
    }
  })

  // Scenario-mode stochastic incident (~5% per week)
  let riskSeverity = 0
  if (scenarioRunning && Math.random() < 0.05) {
    const sv = computeState({ ...sliderValues, effectiveSeniority: effSen }, techDebt, teamMorale, jevonsScope, teamExperience)
    const reviewRatio = sv.aiGen > 0 ? (sv.effectiveReview || sv.review) / (sv.aiGen * 0.4 + 5) : 1
    const aiExposure = Math.max(0.2, sv.aiGen / 80)
    const reviewMitigation = Math.min(reviewRatio, 1)
    riskSeverity = aiExposure * (1.2 - reviewMitigation * 0.8)
    const debtHit = Math.round(8 + riskSeverity * 20 + Math.random() * 10)
    const moraleHit = Math.round(5 + riskSeverity * 15 + Math.random() * 8)
    techDebt = Math.min(100, techDebt + debtHit)
    teamMorale = Math.max(5, teamMorale - moraleHit)
  }

  periodicCommentary(getState())
  updateClock()
  const tickState = getState()
  render(tickState, techDebt, teamMorale, snapshotR)
  updateFactory({ ...tickState, techDebt, teamMorale, teamState })
  updateAmdahlChart({ ...tickState, techDebt, teamMorale })
  updateQuoteSentiment({ ...tickState, techDebt, teamMorale })
  updateGoodhart({ ...tickState, techDebt, teamMorale })
  pushSparkline({ quality: tickState.quality, debt: techDebt, jevons: jevonsScope, morale: teamMorale, experience: teamExperience })
  pushHistory({ quality: tickState.quality, debt: techDebt, jevons: jevonsScope, morale: teamMorale, experience: teamExperience, cost: tickState.costPct, baseCost: tickState.baseCostPct, scope: tickState.scopePct, actualR: tickState.actualR, baseR: tickState.baseR, effectiveR: tickState.effectiveR })

  return { teamEvents: teamResult.events, riskSeverity, sliderValues, effSen }
}

// --- Tick loop (dynamic speed via setTimeout) ---
function getTickInterval() {
  return parseInt(document.getElementById('sim-speed').value) || 800
}

function tickLoop() {
  setTimeout(tickLoop, getTickInterval())
  if (!simRunning || scenarioRunning) return
  advanceOneTick()
}
tickLoop()

// ---------------------------------------------------------------------------
// Scenario mode
// ---------------------------------------------------------------------------

function setControlsDisabled(disabled) {
  document.getElementById('sim-toggle').disabled = disabled
  document.getElementById('sim-reset').disabled = disabled
  document.getElementById('mc-btn').disabled = disabled
  document.getElementById('risk-btn').disabled = disabled
  Object.values(sl).forEach(el => { el.disabled = disabled })
}

// Banner state machine
function flushBannerQueue() {
  if (bannerVisible || bannerQueue.length === 0) return
  const ev = bannerQueue.shift()
  const banner = document.getElementById('scenario-banner')
  banner.querySelector('.scenario-banner-headline').textContent = ev.headline
  banner.querySelector('.scenario-banner-sub').textContent = ev.sub || ''
  banner.removeAttribute('hidden')
  bannerVisible = true
  bannerTimer = setTimeout(() => {
    banner.setAttribute('hidden', '')
    bannerVisible = false
    bannerTimer = null
    flushBannerQueue()
  }, 2200)
}

function showBanner(ev) {
  bannerQueue.push(ev)
  flushBannerQueue()
}

function hideBannerNow() {
  const banner = document.getElementById('scenario-banner')
  banner.setAttribute('hidden', '')
  bannerVisible = false
  if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null }
  bannerQueue = []
}

function showSummaryModal(summary) {
  const modal = document.getElementById('scenario-modal')
  const roster = getRoster()
  const nameById = Object.fromEntries(roster.map(p => [p.id, p]))

  // Final numbers
  modal.querySelector('#sm-roi').textContent = summary.finalState.roi
  modal.querySelector('#sm-quality').textContent = summary.finalState.quality + '%'
  modal.querySelector('#sm-debt').textContent = Math.round(summary.finalState.debt) + '%'
  modal.querySelector('#sm-morale').textContent = Math.round(summary.finalState.morale)

  // Color-code final values
  const roiEl = modal.querySelector('#sm-roi')
  roiEl.style.color = summary.finalState.roi >= 120 ? 'var(--accent-teal)' : summary.finalState.roi >= 90 ? 'var(--accent-amber)' : 'var(--accent-red)'
  const qualEl = modal.querySelector('#sm-quality')
  qualEl.style.color = summary.finalState.quality >= 70 ? 'var(--accent-teal)' : summary.finalState.quality >= 45 ? 'var(--accent-amber)' : 'var(--accent-red)'
  const debtEl = modal.querySelector('#sm-debt')
  debtEl.style.color = summary.finalState.debt < 30 ? 'var(--accent-teal)' : summary.finalState.debt < 60 ? 'var(--accent-amber)' : 'var(--accent-red)'
  const morEl = modal.querySelector('#sm-morale')
  morEl.style.color = summary.finalState.morale > 70 ? 'var(--accent-teal)' : summary.finalState.morale > 45 ? 'var(--accent-amber)' : 'var(--accent-red)'

  // Who left
  const quitList = modal.querySelector('#sm-quit-list')
  if (summary.personasQuit.length === 0) {
    quitList.innerHTML = '<li>Nobody quit. The team held together.</li>'
  } else {
    quitList.innerHTML = summary.personasQuit.map(id => {
      const p = nameById[id]
      return `<li>${p ? p.name + ' (' + p.role + ')' : id}</li>`
    }).join('')
  }

  // Key moments
  const momentsList = modal.querySelector('#sm-moments-list')
  const moments = summary.keyEvents.slice(0, 8)
  if (moments.length === 0) {
    momentsList.innerHTML = '<li>No major events fired.</li>'
  } else {
    momentsList.innerHTML = moments.map(ev => `<li>${ev.headline}</li>`).join('')
  }

  modal.removeAttribute('hidden')
}

function closeSummaryModal() {
  document.getElementById('scenario-modal').setAttribute('hidden', '')
}

function startScenario() {
  if (scenarioRunning) return

  // Reset sim state
  resetAccumulatedState()
  updateClock()
  clearDialog()
  resetEventTracker()
  bannerQueue = []
  bannerVisible = false

  scenarioRunning = true
  simRunning = false
  setFactoryPaused(false) // keep factory running for visual effect
  setControlsDisabled(true)

  const scenarioBtn = document.getElementById('scenario-btn')
  scenarioBtn.textContent = 'Stop'
  scenarioBtn.setAttribute('aria-label', 'Stop scenario playback')

  addEntry('system', '52 weeks ahead. Playing at roughly 1 week per 200ms. Watch the story unfold.')

  const startSliders = readSliders()
  scenarioSummary = {
    startSliders,
    finalState: {},
    keyEvents: [],
    personasQuit: [],
  }

  const rosterMap = Object.fromEntries(getRoster().map(p => [p.id, p.name]))

  scenarioCtrl = runScenario({
    weeks: 52,
    weekIntervalMs: 180,
    onWeekTick: (week) => {
      const { teamEvents, riskSeverity, sliderValues } = advanceOneTick()

      const event = detectMajorEvent(week, {
        techDebt,
        teamMorale,
        jevonsScope,
        seniorityDrift,
        sliderSeniority: sliderValues.seniority || 50,
        teamEvents,
        riskSeverity,
        personaNameById: rosterMap,
      })

      if (event) {
        scenarioSummary.keyEvents.push(event)
        // Track who quit
        teamEvents.filter(e => e.type === 'quit').forEach(e => {
          if (!scenarioSummary.personasQuit.includes(e.personaId)) {
            scenarioSummary.personasQuit.push(e.personaId)
          }
        })
        return { majorEvent: event }
      }

      // Track quits that didn't produce a banner (already had a different event that tick)
      teamEvents.filter(e => e.type === 'quit').forEach(e => {
        if (!scenarioSummary.personasQuit.includes(e.personaId)) {
          scenarioSummary.personasQuit.push(e.personaId)
        }
      })

      return null
    },
    onMajorEvent: (ev) => {
      showBanner(ev)
    },
    onComplete: () => {
      // Capture final state
      const finalTickState = getState()
      scenarioSummary.finalState = {
        quality: finalTickState.quality,
        debt: techDebt,
        morale: teamMorale,
        jevons: jevonsScope,
        experience: teamExperience,
        roi: computeRoi({
          effectiveR: finalTickState.effectiveR,
          actualR: finalTickState.actualR,
          baseR: finalTickState.baseR,
          quality: finalTickState.quality,
          cost: finalTickState.costPct,
          baseCost: finalTickState.baseCostPct,
        }),
      }

      scenarioRunning = false
      scenarioCtrl = null
      setControlsDisabled(false)
      simRunning = false // leave paused after scenario; user can resume manually

      const btn = document.getElementById('scenario-btn')
      btn.textContent = 'Run Scenario'
      btn.setAttribute('aria-label', 'Run current settings as a 52-week scenario')

      // Update pause button to reflect paused state
      const toggleBtn = document.getElementById('sim-toggle')
      toggleBtn.textContent = 'Resume'
      toggleBtn.setAttribute('aria-label', 'Resume simulation')
      toggleBtn.classList.add('active')
      setFactoryPaused(true)

      // Wait for last banner to clear before showing modal (~2.4s buffer)
      setTimeout(() => {
        hideBannerNow()
        showSummaryModal(scenarioSummary)
      }, 2400)
    },
  })
}

function cancelScenario() {
  if (!scenarioRunning) return
  if (scenarioCtrl) { scenarioCtrl.cancel(); scenarioCtrl = null }
  scenarioRunning = false
  setControlsDisabled(false)
  hideBannerNow()

  const btn = document.getElementById('scenario-btn')
  btn.textContent = 'Run Scenario'
  btn.setAttribute('aria-label', 'Run current settings as a 52-week scenario')

  addEntry('system', 'Scenario stopped.')
}

// --- Tabs ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false') })
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    btn.setAttribute('aria-selected', 'true')
    document.getElementById(btn.getAttribute('aria-controls')).classList.add('active')
  })
})

// Tab keyboard navigation (WAI-ARIA pattern)
const tabBtns = [...document.querySelectorAll('.tab-btn')]
document.querySelector('.tab-nav').addEventListener('keydown', (e) => {
  const idx = tabBtns.indexOf(document.activeElement)
  if (idx === -1) return
  let next = -1
  if (e.key === 'ArrowRight') next = (idx + 1) % tabBtns.length
  else if (e.key === 'ArrowLeft') next = (idx - 1 + tabBtns.length) % tabBtns.length
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = tabBtns.length - 1
  if (next !== -1) {
    e.preventDefault()
    tabBtns[next].focus()
    tabBtns[next].click()
  }
})

// --- Init ---
// Restore slider state from URL hash if present
const hashState = decodeFromHash()
if (hashState) {
  Object.entries(hashState).forEach(([k, v]) => { if (sl[k]) sl[k].value = v })
}
initTooltips()
initFactory()
initAmdahlChart()
initHistoryChart()
initQuotes()
initSparklines()
initGoodhart()
initCopyLink(document.getElementById('copy-link-btn'))
startQuoteTimer()
updateClock()
addEntry('system', 'Initialized. <span class="dialog-vertex counter" style="margin:0 2px">counter</span> = bull-case. <span class="dialog-vertex rebuttal" style="margin:0 2px">rebuttal</span> = skeptic. <span class="dialog-vertex debt" style="margin:0 2px">debt</span> = tech debt. <span class="dialog-vertex morale" style="margin:0 2px">morale</span> = team health. Baseline: no AI. Move sliders or pick a preset to begin.')
update()
