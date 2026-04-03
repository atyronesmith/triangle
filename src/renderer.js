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
  const h = Math.min(w * 0.62, 400)
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

function lbl(text, x, y, sz, col, align, wt) {
  ctx.save()
  ctx.font = (wt || '400') + ' ' + (sz || 13) + 'px "DM Sans",system-ui,sans-serif'
  ctx.fillStyle = col || textP()
  ctx.textAlign = align || 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.restore()
}

/**
 * Main render pass — draws canvas and updates all stat DOM elements.
 */
export function render(state, techDebt, teamMorale, snapshotR) {
  if (!dims) dims = resizeCanvas()
  const s = state
  const { w, h } = dims

  ctx.clearRect(0, 0, w, h)
  const cx = w / 2, cy = h * 0.52, unit = Math.min(w, h) * 0.31
  const bR = unit, aR = unit * s.aiR, rR = unit * s.actualR, mR = unit * s.mgmtR

  // Snapshot ghost
  if (snapshotR !== null) {
    fillTri(cx, cy, unit * snapshotR, '#7F77DD', 0.04)
    drawTri(cx, cy, unit * snapshotR, '#7F77DD', 0.3, true, 1.5)
  }

  if (s.scope > 0) fillTri(cx, cy, mR, '#EF9F27', 0.05)
  if (s.ai > 0) fillTri(cx, cy, aR, '#378ADD', 0.04)
  if (s.ai > 0) fillTri(cx, cy, rR, '#E24B4A', 0.04)
  fillTri(cx, cy, bR, '#5DCAA5', 0.06)
  if (s.scope > 0) drawTri(cx, cy, mR, '#EF9F27', 0.4, true, 1.5)
  if (s.ai > 0) drawTri(cx, cy, aR, '#378ADD', 0.3, true, 1)
  if (s.ai > 0 && Math.abs(rR - aR) > 2) drawTri(cx, cy, rR, '#E24B4A', 0.65, false, 1.5)
  drawTri(cx, cy, bR, '#5DCAA5', 0.8, false, 2)

  const outerR = Math.max(mR, aR, bR, (snapshotR ? unit * snapshotR : 0)) + 26
  ;['Scope', 'Cost', 'Time'].forEach((l, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
    lbl(l, cx + outerR * Math.cos(a), cy + outerR * Math.sin(a), 13, textP(), 'center', '500')
  })

  const qc = getQualityColor(s.quality)
  lbl('Quality', cx, cy - 12, 11, textS())
  lbl(s.quality + '%', cx, cy + 9, 20, qc, 'center', '700')

  // Gap indicator
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

  if (techDebt > 10) lbl('Debt drag: -' + Math.round(techDebt * 0.3) + '%', cx - 70, h - 14, 10, '#D85A30', 'center')
  if (teamMorale < 70) lbl('Morale: ' + Math.round(teamMorale) + '%', cx + 70, h - 14, 10, teamMorale < 40 ? '#E24B4A' : '#EF9F27', 'center')
  lbl(getParadigmLabel(s.paradigm), cx, 14, 10, textS())

  // DOM stats
  updateStats(s, techDebt, teamMorale)
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

  document.getElementById('stat-debt').textContent = debtPct
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

  document.getElementById('stat-morale').textContent = mr
  document.getElementById('stat-morale-desc').textContent = mr >= 80 ? 'strong' : mr >= 60 ? 'strained' : mr >= 40 ? 'burning out' : mr >= 20 ? 'attrition risk' : 'collapse'
  document.getElementById('m-fill').style.width = mr + '%'
  document.getElementById('m-fill').style.background = mc
  document.getElementById('m-pct').textContent = mr + '%'
  document.getElementById('m-pct').style.color = mc
}
