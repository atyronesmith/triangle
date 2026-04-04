/**
 * Entry point — init, event wiring, presets, snapshot, risk events.
 */

import { PRESETS, PARADIGM_DESCRIPTIONS, ELASTICITY_DESCRIPTIONS, AMDAHL_DESCRIPTIONS, RISK_COOLDOWN_MS } from './constants.js'
import { computeState, getParadigmLabel, getElasticityLabel, getAmdahlLabel } from './model.js'
import { tickDebt, tickMorale, tickJevons, tickSeniority } from './engine.js'
import { initCanvas, render } from './renderer.js'
import { addEntry, clearDialog, analyzeChanges } from './dialog.js'
import { initTooltips } from './tooltip.js'
import { initFactory, updateFactory, setFactoryPaused } from './factory.js'
import { initAmdahlChart, updateAmdahlChart } from './amdahl-chart.js'
import { initQuotes, updateQuoteSentiment, startQuoteTimer } from './quotes.js'
import { initSparklines, pushSparkline, clearSparklines } from './sparkline.js'
import { encodeToHash, decodeFromHash, initCopyLink } from './url-state.js'
import { initGoodhart, updateGoodhart, resetGoodhart } from './goodhart.js'

// --- State ---
let techDebt = 0
let teamMorale = 100
let lastMoraleAlert = 100
let jevonsScope = 0
let lastJevonsAlert = 0
let seniorityDrift = 0
let lastSeniorityAlert = 100
let simWeek = 0
let simRunning = true
let prevState = null
let snapshotR = null
let riskCooldown = false

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
  return computeState(sv, techDebt, teamMorale, jevonsScope)
}

function doSync() {
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
  btn.className = 'preset-btn'
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

  const s = getState()
  render(s, techDebt, teamMorale, snapshotR)
  updateFactory({ ...s, techDebt, teamMorale })
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
function applyPreset(name) {
  const pr = PRESETS[name]
  if (!pr) return
  prevState = null
  techDebt = 0
  teamMorale = 100
  lastMoraleAlert = 100
  jevonsScope = 0
  lastJevonsAlert = 0
  seniorityDrift = 0
  lastSeniorityAlert = 100
  simWeek = 0
  clearSparklines()
  resetGoodhart()
  addEntry('system', `Preset: <strong>${name.replace(/-/g, ' ')}</strong>. All accumulated state reset.`)
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

// --- Simulation controls ---
function toggleSim() {
  simRunning = !simRunning
  setFactoryPaused(!simRunning)
  const btn = document.getElementById('sim-toggle')
  btn.textContent = simRunning ? 'Pause' : 'Resume'
  btn.classList.toggle('active', !simRunning)
  addEntry('system', simRunning ? 'Simulation resumed.' : 'Simulation paused. Sliders still update the triangle — debt, morale, and Jevons are frozen.')
}

function resetSim() {
  simWeek = 0
  techDebt = 0
  teamMorale = 100
  lastMoraleAlert = 100
  jevonsScope = 0
  lastJevonsAlert = 0
  seniorityDrift = 0
  lastSeniorityAlert = 100
  prevState = null
  clearSparklines()
  resetGoodhart()
  updateClock()
  addEntry('system', 'Simulation reset. Clock, debt, morale, and Jevons scope zeroed. Slider positions unchanged.')
  render(getState(), techDebt, teamMorale, snapshotR)
}

document.getElementById('sim-toggle').addEventListener('click', toggleSim)
document.getElementById('sim-reset').addEventListener('click', resetSim)

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

// --- Tick loop (dynamic speed via setTimeout) ---
function getTickInterval() {
  return parseInt(document.getElementById('sim-speed').value) || 800
}

function tickLoop() {
  setTimeout(tickLoop, getTickInterval())
  if (!simRunning) return
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
  periodicCommentary(getState())
  updateClock()
  const tickState = getState()
  render(tickState, techDebt, teamMorale, snapshotR)
  updateFactory({ ...tickState, techDebt, teamMorale })
  updateAmdahlChart({ ...tickState, techDebt, teamMorale })
  updateQuoteSentiment({ ...tickState, techDebt, teamMorale })
  updateGoodhart({ ...tickState, techDebt, teamMorale })
  pushSparkline({ quality: tickState.quality, debt: techDebt, jevons: jevonsScope, morale: teamMorale })
}
tickLoop()

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

// --- Init ---
// Restore slider state from URL hash if present
const hashState = decodeFromHash()
if (hashState) {
  Object.entries(hashState).forEach(([k, v]) => { if (sl[k]) sl[k].value = v })
}
initTooltips()
initFactory()
initAmdahlChart()
initQuotes()
initSparklines()
initGoodhart()
initCopyLink(document.getElementById('copy-link-btn'))
startQuoteTimer()
updateClock()
addEntry('system', 'Initialized. <span class="dialog-vertex counter" style="margin:0 2px">counter</span> = bull-case. <span class="dialog-vertex rebuttal" style="margin:0 2px">rebuttal</span> = skeptic. <span class="dialog-vertex debt" style="margin:0 2px">debt</span> = tech debt. <span class="dialog-vertex morale" style="margin:0 2px">morale</span> = team health. Jevons Paradox auto-expands scope based on AI efficiency and demand elasticity. Try the "jevons demo" preset.')
update()
