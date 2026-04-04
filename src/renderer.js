/**
 * Canvas triangle drawing and DOM stats updates.
 */

import { getParadigmLabel, getQualityColor, getDebtColor } from './model.js'

let canvas, ctx, dims
let isDark = false

function detectDark() {
  isDark = matchMedia('(prefers-color-scheme:dark)').matches
}

export function initCanvas() {
  canvas = document.getElementById('tri')
  ctx = canvas.getContext('2d')
  detectDark()
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => {
    detectDark()
    // render will be called by the main loop
  })
  dims = resizeCanvas()
  window.addEventListener('resize', () => { dims = resizeCanvas() })
  return { canvas, ctx }
}

function resizeCanvas() {
  const r = canvas.parentElement.getBoundingClientRect()
  const w = r.width
  const h = Math.max(300, Math.min(w * 0.85, 420))
  const d = devicePixelRatio || 1
  canvas.width = w * d
  canvas.height = h * d
  canvas.style.height = h + 'px'
  ctx.setTransform(d, 0, 0, d, 0, 0)
  return { w, h }
}

export function getDims() { return dims }

const textP = () => isDark ? '#d4d2c8' : '#2C2C2A'
const textS = () => isDark ? '#9c9a92' : '#73726c'

function drawTri(cx, cy, r, color, alpha, dashed, lw) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lw || 1.5
  if (dashed) ctx.setLineDash([8, 5])
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
    i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
            : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

function fillTri(cx, cy, r, color, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// Vertex angles: Scope (top), Cost (bottom-right), Time (bottom-left)
const ANGLES = [-Math.PI / 2, -Math.PI / 2 + (2 * Math.PI) / 3, -Math.PI / 2 + (4 * Math.PI) / 3]

function drawIrregularTri(cx, cy, radii, color, alpha, dashed, lw) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lw || 1.5
  if (dashed) ctx.setLineDash([8, 5])
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const x = cx + radii[i] * Math.cos(ANGLES[i])
    const y = cy + radii[i] * Math.sin(ANGLES[i])
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

function fillIrregularTri(cx, cy, radii, color, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    ctx.lineTo(cx + radii[i] * Math.cos(ANGLES[i]), cy + radii[i] * Math.sin(ANGLES[i]))
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function lbl(text, x, y, sz, col, align, wt) {
  ctx.save()
  ctx.font = (wt || '400') + ' ' + (sz || 13) + 'px "DM Sans",system-ui,sans-serif'
  ctx.fillStyle = col || textP()
  ctx.textAlign = align || 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.restore()
}

let renderMode = 'equilateral' // 'equilateral' or 'distorted'

export function setRenderMode(mode) { renderMode = mode }

/**
 * Main render pass — draws canvas and updates all stat DOM elements.
 */
export function render(state, techDebt, teamMorale, snapshotR) {
  if (!dims) dims = resizeCanvas()
  const s = state
  const { w, h } = dims

  ctx.clearRect(0, 0, w, h)
  const cx = w / 2, cy = h * 0.55

  if (renderMode === 'distorted') {
    renderDistorted(s, techDebt, teamMorale, snapshotR, cx, cy, w, h)
  } else {
    renderEquilateral(s, techDebt, teamMorale, snapshotR, cx, cy, w, h)
  }

  // Common elements
  const qc = getQualityColor(s.quality)
  lbl('Quality', cx, cy - 12, 11, textS())
  lbl(s.quality + '%', cx, cy + 9, 20, qc, 'center', '700')

  if (techDebt > 10) lbl('Debt drag: -' + Math.round(techDebt * 0.3) + '%', cx - 70, h - 14, 10, '#D85A30', 'center')
  if (teamMorale < 70) lbl('Morale: ' + Math.round(teamMorale) + '%', cx + 70, h - 14, 10, teamMorale < 40 ? '#E24B4A' : '#EF9F27', 'center')
  lbl(getParadigmLabel(s.paradigm), cx, 14, 10, textS())

  updateStats(s, techDebt, teamMorale)
}

function renderEquilateral(s, techDebt, teamMorale, snapshotR, cx, cy, w, h) {
  const maxR = Math.max(1, s.aiR, s.actualR, s.mgmtR, snapshotR || 0)
  const padTop = 50, padSide = 45, padBot = 35
  const maxPixelR = Math.min(w / 2 - padSide, cy - padTop, (h - cy) - padBot)
  const unit = maxPixelR / maxR

  const bR = unit, aR = unit * s.aiR, rR = unit * s.actualR, mR = unit * s.mgmtR
  const hasDemand = s.totalScope > 0
  const hasAI = s.ai > 0

  if (snapshotR !== null) {
    fillTri(cx, cy, unit * snapshotR, '#7F77DD', 0.04)
    drawTri(cx, cy, unit * snapshotR, '#7F77DD', 0.3, true, 1.5)
  }

  if (hasDemand) { fillTri(cx, cy, mR, '#F5A623', 0.12); drawTri(cx, cy, mR, '#F5A623', 0.85, false, 3) }
  if (hasAI) { fillTri(cx, cy, aR, '#2B7DE9', 0.10); drawTri(cx, cy, aR, '#2B7DE9', 0.8, false, 2.5) }
  if (hasAI && Math.abs(rR - aR) > 2) { fillTri(cx, cy, rR, '#E24B4A', 0.08); drawTri(cx, cy, rR, '#E24B4A', 0.8, false, 2) }
  fillTri(cx, cy, bR, '#5DCAA5', 0.10)
  drawTri(cx, cy, bR, '#5DCAA5', 0.9, false, 2.5)

  const outerR = Math.max(mR, aR, bR, (snapshotR ? unit * snapshotR : 0)) + 26
  ;['Scope', 'Cost', 'Time'].forEach((l, i) => {
    lbl(l, cx + outerR * Math.cos(ANGLES[i]), cy + outerR * Math.sin(ANGLES[i]), 13, textP(), 'center', '500')
  })

  if (mR > rR + 6) {
    const y1 = cy - rR, y2 = cy - mR
    ctx.save()
    ctx.strokeStyle = '#E24B4A'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(cx + 8, y1); ctx.lineTo(cx + 8, y2); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#E24B4A'
    ctx.beginPath(); ctx.moveTo(cx + 4, y1); ctx.lineTo(cx + 12, y1); ctx.lineTo(cx + 8, y1 + 4); ctx.fill()
    ctx.beginPath(); ctx.moveTo(cx + 4, y2); ctx.lineTo(cx + 12, y2); ctx.lineTo(cx + 8, y2 - 4); ctx.fill()
    lbl('gap', cx + 20, (y1 + y2) / 2, 10, '#E24B4A', 'left')
    ctx.restore()
  }
}

function renderDistorted(s, techDebt, teamMorale, snapshotR, cx, cy, w, h) {
  // Each vertex has an independent radius based on its constraint value
  // Scope = top, Cost = bottom-right, Time = bottom-left
  const padTop = 50, padSide = 45, padBot = 35
  const maxPixelR = Math.min(w / 2 - padSide, cy - padTop, (h - cy) - padBot)

  // Normalize: baseline is 1.0, values scale from there
  // Scope: driven by scopePct (100 = baseline, higher = more demand)
  // Cost: driven by costPct (100 = baseline, higher = more spend)
  // Time: driven by timePct (100 = baseline, lower = compressed)
  const scopeN = (s.scopePct || 100) / 100
  const costN = (s.costPct || 100) / 100
  const timeN = (s.timePct || 100) / 100

  // Find the max to auto-scale
  const maxN = Math.max(scopeN, costN, timeN, 1)
  const unit = maxPixelR / maxN

  // Baseline triangle — equilateral at unit radius
  const baseRadii = [unit, unit, unit]
  fillIrregularTri(cx, cy, baseRadii, '#5DCAA5', 0.08)
  drawIrregularTri(cx, cy, baseRadii, '#5DCAA5', 0.6, false, 2)

  // Demanded triangle — distorted by scope/cost/time demands
  const demandRadii = [scopeN * unit, costN * unit, timeN * unit]
  fillIrregularTri(cx, cy, demandRadii, '#F5A623', 0.10)
  drawIrregularTri(cx, cy, demandRadii, '#F5A623', 0.85, false, 3)

  // Actual capacity triangle — what the team can actually deliver
  // Scope vertex: how much of demanded scope is achievable
  const coverageR = s.mgmtR > 0 ? Math.min(s.effectiveR / s.mgmtR, 1) : 1
  const actualScope = scopeN * coverageR
  // Cost vertex: actual cost (same as demanded — cost is what you spend)
  const actualCost = costN
  // Time vertex: effective time (compressed by debt drag and morale)
  const debtTimeDrag = 1 + techDebt * 0.002
  const moraleTimeDrag = 1 + (100 - teamMorale) * 0.001
  const actualTime = timeN * debtTimeDrag * moraleTimeDrag

  const actualRadii = [actualScope * unit, actualCost * unit, actualTime * unit]
  fillIrregularTri(cx, cy, actualRadii, '#E24B4A', 0.08)
  drawIrregularTri(cx, cy, actualRadii, '#E24B4A', 0.8, false, 2)

  // AI frontier triangle (if AI active) — theoretical capacity
  if (s.ai > 0) {
    const aiScope = scopeN * Math.min(s.aiR / s.mgmtR, 1.5)
    const aiCost = costN * 0.95 // AI slightly cheaper per unit (theoretical)
    const aiTime = timeN * 0.9  // AI compresses time (theoretical)
    const aiRadii = [aiScope * unit, aiCost * unit, aiTime * unit]
    fillIrregularTri(cx, cy, aiRadii, '#2B7DE9', 0.06)
    drawIrregularTri(cx, cy, aiRadii, '#2B7DE9', 0.5, false, 2)
  }

  // Labels at the outermost vertex positions
  const labelR = Math.max(...demandRadii, ...actualRadii, unit) + 26
  const labelRadii = [
    Math.max(demandRadii[0], actualRadii[0], unit) + 26,
    Math.max(demandRadii[1], actualRadii[1], unit) + 26,
    Math.max(demandRadii[2], actualRadii[2], unit) + 26,
  ]
  const labels = [
    `Scope ${s.scopePct}%`,
    `Cost ${s.costPct}%`,
    `Time ${s.timePct}%`,
  ]
  labels.forEach((l, i) => {
    lbl(l, cx + labelRadii[i] * Math.cos(ANGLES[i]), cy + labelRadii[i] * Math.sin(ANGLES[i]), 12, textP(), 'center', '500')
  })

  // Show which vertex is most stressed
  const stressors = [
    { name: 'Scope', value: scopeN, color: '#F5A623' },
    { name: 'Cost', value: costN, color: '#2B7DE9' },
    { name: 'Time', value: Math.abs(1 - timeN), color: '#1D9E75' },
  ].sort((a, b) => b.value - a.value)
  if (stressors[0].value > 1.1) {
    lbl('Binding: ' + stressors[0].name, cx, h - 14, 10, stressors[0].color, 'center', '500')
  }
}

function updateStats(s, techDebt, teamMorale) {
  const qc = getQualityColor(s.quality)
  const dc = getDebtColor(techDebt)
  const debtPct = Math.min(100, Math.round(techDebt))
  const mr = Math.round(teamMorale)
  const mc = mr >= 70 ? '#1D9E75' : mr >= 45 ? '#EF9F27' : mr >= 25 ? '#D85A30' : '#E24B4A'

  document.getElementById('stat-scope').textContent = s.scopePct + '%'
  const jv = Math.round(s.jevonsScope || 0)
  document.getElementById('stat-scope-desc').textContent =
    jv > 0 ? `mgmt +${s.scope}% / jevons +${jv}%`
    : s.scope > 0 ? '+' + s.scope + '% demanded'
    : 'baseline'
  document.getElementById('stat-cost').textContent = s.costPct + '%'
  document.getElementById('stat-cost-desc').textContent = s.costPct > 105 ? 'overhead rising' : 'baseline'
  document.getElementById('stat-time').textContent = s.timePct + '%'
  document.getElementById('stat-time-desc').textContent = s.time < 0 ? 'compressed' : s.time > 0 ? 'extended' : 'baseline'

  document.getElementById('stat-debt').textContent = debtPct + '%'
  document.getElementById('stat-debt-desc').textContent = debtPct < 10 ? 'clean' : debtPct < 30 ? 'accumulating' : debtPct < 60 ? 'drag increasing' : 'critical'

  const qFill = document.getElementById('q-fill')
  qFill.style.width = s.quality + '%'
  qFill.style.background = qc
  document.getElementById('q-pct').textContent = s.quality + '%'
  document.getElementById('q-pct').style.color = qc

  document.getElementById('d-fill').style.width = Math.min(100, techDebt) + '%'
  document.getElementById('d-fill').style.background = dc
  document.getElementById('d-pct').textContent = debtPct + '%'
  document.getElementById('d-pct').style.color = dc

  // Jevons bar — scale to 150 (max auto-expansion)
  const jev = Math.round(s.jevonsScope || 0)
  const jPct = Math.min(100, jev / 1.5) // 150% max → 100% bar
  const jc = jev < 20 ? '#9c9a92' : jev < 50 ? '#EF9F27' : '#E24B4A'
  document.getElementById('j-fill').style.width = jPct + '%'
  document.getElementById('j-fill').style.background = jc
  document.getElementById('j-pct').textContent = '+' + jev + '%'
  document.getElementById('j-pct').style.color = jc

  document.getElementById('stat-morale').textContent = mr + '%'
  document.getElementById('stat-morale-desc').textContent = mr >= 80 ? 'strong' : mr >= 60 ? 'strained' : mr >= 40 ? 'burning out' : mr >= 20 ? 'attrition risk' : 'collapse'
  document.getElementById('m-fill').style.width = mr + '%'
  document.getElementById('m-fill').style.background = mc
  document.getElementById('m-pct').textContent = mr + '%'
  document.getElementById('m-pct').style.color = mc

  // Experience bar
  const exp = Math.round(s.teamExperience || 0)
  const ec = exp >= 50 ? '#7F77DD' : exp >= 20 ? '#9c9a92' : '#73726c'
  document.getElementById('e-fill').style.width = exp + '%'
  document.getElementById('e-fill').style.background = ec
  document.getElementById('e-pct').textContent = exp + '%'
  document.getElementById('e-pct').style.color = ec

  // Perception gap display
  const taskB = s.taskBoostPct || 0
  const percB = s.perceivedBoostPct || 0
  const actB = s.actualBoostPct || 0
  document.getElementById('perc-task').textContent = (taskB >= 0 ? '+' : '') + taskB + '%'
  document.getElementById('perc-perceived').textContent = (percB >= 0 ? '+' : '') + percB + '%'
  const actEl = document.getElementById('perc-actual')
  actEl.textContent = (actB >= 0 ? '+' : '') + actB + '%'
  actEl.style.color = actB >= 10 ? '#1D9E75' : actB >= 0 ? '#EF9F27' : '#E24B4A'
}
