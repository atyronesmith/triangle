/**
 * Entry point — init, event wiring, presets, snapshot, risk events.
 */

import { PRESETS, PARADIGM_DESCRIPTIONS, TICK_INTERVAL_MS, RISK_COOLDOWN_MS } from './constants.js'
import { computeState, getParadigmLabel } from './model.js'
import { tickDebt, tickMorale } from './engine.js'
import { initCanvas, render } from './renderer.js'
import { addEntry, clearDialog, analyzeChanges } from './dialog.js'

// --- State ---
let techDebt = 0
let teamMorale = 100
let lastMoraleAlert = 100
let prevState = null
let snapshotR = null
let riskCooldown = false

// --- DOM refs ---
const sl = {
  ai:       document.getElementById('ai-boost'),
  scope:    document.getElementById('scope-push'),
  review:   document.getElementById('review'),
  time:     document.getElementById('time-adj'),
  paradigm: document.getElementById('paradigm'),
}

function readSliders() {
  return {
    ai:       +sl.ai.value,
    scope:    +sl.scope.value,
    review:   +sl.review.value,
    time:     +sl.time.value,
    paradigm: +sl.paradigm.value,
  }
}

function getState() {
  return computeState(readSliders(), techDebt, teamMorale)
}

// --- Init canvas ---
initCanvas()

// --- Preset buttons ---
const presetsContainer = document.getElementById('presets')
Object.keys(PRESETS).forEach(name => {
  const btn = document.createElement('button')
  btn.className = 'preset-btn'
  btn.textContent = name.replace(/-/g, ' ').replace(/\b\w/g, c => c === c.toLowerCase() ? c : c) // keep original casing
  btn.textContent = name.replace(/-/g, ' ')
  btn.addEventListener('click', () => applyPreset(name))
  presetsContainer.appendChild(btn)
})

// --- Core update loop ---
let debounceTimer = null

function update() {
  document.getElementById('v-ai').textContent = sl.ai.value + '%'
  document.getElementById('v-scope').textContent = sl.scope.value + '%'
  document.getElementById('v-review').textContent = sl.review.value + '%'
  const tv = +sl.time.value
  document.getElementById('v-time').textContent = (tv >= 0 ? '+' : '') + tv + '%'
  document.getElementById('v-paradigm').textContent = getParadigmLabel(+sl.paradigm.value)

  const pv = +sl.paradigm.value
  document.getElementById('paradigm-desc').textContent = PARADIGM_DESCRIPTIONS[pv <= 20 ? 0 : pv <= 50 ? 1 : pv <= 80 ? 2 : 3]

  const s = getState()
  render(s, techDebt, teamMorale, snapshotR)

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    prevState = analyzeChanges(getState(), prevState, techDebt, teamMorale)
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
  addEntry('system', `Preset: <strong>${name.replace(/-/g, ' ')}</strong>. Debt and morale reset.`)
  Object.keys(pr).forEach(k => { sl[k].value = pr[k] })
  update()
}

// --- Snapshot / Comparison ---
function snapshotBaseline() {
  const s = getState()
  snapshotR = s.actualR
  document.getElementById('clear-snap-btn').style.display = ''
  document.getElementById('snap-legend').style.display = ''
  document.getElementById('snap-label').textContent =
    'Snapshot: actual=' + Math.round(s.actualR * 100) + '%, quality=' + s.quality + '%, morale=' + Math.round(teamMorale) + ', debt=' + Math.round(techDebt)
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
  const reviewRatio = s.ai > 0 ? s.review / (s.ai * 0.4 + 5) : 1
  const failChance = Math.max(0.05, 1 - reviewRatio) * (s.ai / 80)
  const roll = Math.random()

  if (roll < failChance) {
    techDebt = Math.min(100, techDebt + 15 + Math.random() * 15)
    teamMorale = Math.max(5, teamMorale - 8 - Math.random() * 12)
    addEntry('risk', `<strong>Incident triggered.</strong> A hallucination reached production. Roll: ${(roll * 100).toFixed(0)} vs threshold: ${(failChance * 100).toFixed(0)}. Tech debt surged to ${Math.round(techDebt)}. Teams now firefighting instead of building.`)
    addEntry('morale', `Morale hit — down to ${Math.round(teamMorale)}. Nothing erodes trust faster than an incident caused by output nobody reviewed. The team is angry, leadership is scrambling, and the people who warned about review gaps are feeling vindicated and resentful in equal measure.`)
    addEntry('time', 'Emergency remediation extends effective timeline. Work in progress stalls while the team triages.')
    if (s.paradigm > 60) {
      addEntry('counter', `<em>Fair, but: one incident doesn't invalidate the model. Cars crash too. The question is whether the aggregate output justifies the tail risk. Mature AI adoption includes incident response plans, just like mature ops includes runbooks.</em>`)
    }
  } else {
    addEntry('risk', `Incident roll: ${(roll * 100).toFixed(0)} vs threshold: ${(failChance * 100).toFixed(0)}. <strong>No incident this time.</strong> ${reviewRatio > 0.8 ? 'Review effort is providing meaningful risk mitigation.' : 'You got lucky. Low review means the next roll might not go your way.'}`)
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

// --- Tick loop ---
setInterval(() => {
  const sliderValues = readSliders()
  techDebt = tickDebt(sliderValues, techDebt, teamMorale)
  const moraleResult = tickMorale(sliderValues, techDebt, teamMorale, lastMoraleAlert)
  teamMorale = moraleResult.morale
  lastMoraleAlert = moraleResult.lastMoraleAlert
  moraleResult.entries.forEach(e => addEntry(e.vertex, e.msg))
  render(getState(), techDebt, teamMorale, snapshotR)
}, TICK_INTERVAL_MS)

// --- Init ---
addEntry('system', 'Initialized. <span class="dialog-vertex counter" style="margin:0 2px">counter</span> = bull-case. <span class="dialog-vertex rebuttal" style="margin:0 2px">rebuttal</span> = skeptic. <span class="dialog-vertex debt" style="margin:0 2px">debt</span> = tech debt. <span class="dialog-vertex morale" style="margin:0 2px">morale</span> = team health &amp; burnout. Debt and morale accumulate over time — let presets run and watch.')
update()
