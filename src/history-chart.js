/**
 * Simulation history — two time-series charts.
 *
 * Top chart: quality, debt, morale, experience (health metrics, 0-150 scale)
 * Bottom chart: cost %, scope %, ROI index (economics, auto-scaling)
 *
 * ROI Index = (actualR / baseR) * (quality / 100) / (costPct / 100) * 100
 *   100 = break-even, >100 = AI paying for itself, <100 = losing money
 *
 * Both charts share the same x-axis (simulated weeks), crosshair, and
 * collapse toggle. Legend items toggle individual lines.
 */

const PAD = { top: 20, right: 20, bottom: 28, left: 45 }
const CHART_H = 170
const GAP = 30 // space between charts

// --- Chart 1: Health metrics ---
const HEALTH_METRICS = ['quality', 'debt', 'jevons', 'morale', 'experience']
const HEALTH_COLORS = {
  quality:    '#1D9E75',
  debt:       '#EF9F27',
  jevons:     '#E24B4A',
  morale:     '#5DCAA5',
  experience: '#7F77DD',
}
const HEALTH_LABELS = {
  quality:    'Quality',
  debt:       'Tech Debt',
  jevons:     'Jevons',
  morale:     'Morale',
  experience: 'Experience',
}

// --- Chart 2: Economics ---
const ECON_METRICS = ['cost', 'scope', 'roi']
const ECON_COLORS = {
  cost:  '#378ADD',
  scope: '#EF9F27',
  roi:   '#1D9E75',
}
const ECON_LABELS = {
  cost:  'Cost %',
  scope: 'Scope %',
  roi:   'ROI Index',
}

const ALL_METRICS = [...HEALTH_METRICS, ...ECON_METRICS]
const ALL_COLORS = { ...HEALTH_COLORS, ...ECON_COLORS }
const ALL_LABELS = { ...HEALTH_LABELS, ...ECON_LABELS }

const history = {}
const visible = {}
ALL_METRICS.forEach(m => { history[m] = []; visible[m] = true })

let canvas, ctx, w, h
let cachedStyles = null
let crosshairX = null
let activeChartH = CHART_H

export function initHistoryChart() {
  canvas = document.getElementById('history-chart')
  if (!canvas) return
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)

  canvas.addEventListener('mousemove', (e) => {
    crosshairX = e.clientX - canvas.getBoundingClientRect().left
    draw()
  })
  canvas.addEventListener('mouseleave', () => { crosshairX = null; draw() })

  // Build legend
  const legendEl = document.getElementById('history-legend')
  if (legendEl) {
    // Health group
    addLegendGroup(legendEl, 'Health:', HEALTH_METRICS)
    // Econ group
    addLegendGroup(legendEl, 'Economics:', ECON_METRICS)
  }

  // Collapse toggle
  const toggleBtn = document.getElementById('history-toggle')
  const body = document.getElementById('history-body')
  const icon = document.getElementById('history-collapse-icon')
  if (toggleBtn && body && icon) {
    toggleBtn.addEventListener('click', () => {
      const collapsed = body.style.display === 'none'
      body.style.display = collapsed ? '' : 'none'
      icon.innerHTML = collapsed ? '&#9660;' : '&#9650;'
      if (collapsed) resize()
    })
  }
}

function addLegendGroup(parent, label, metrics) {
  const groupLabel = document.createElement('span')
  groupLabel.style.cssText = 'font-size:10px;color:var(--text-hint);font-weight:500;margin-right:-4px'
  groupLabel.textContent = label
  parent.appendChild(groupLabel)

  metrics.forEach(m => {
    const item = document.createElement('div')
    item.className = 'legend-item'
    const pip = document.createElement('div')
    pip.className = 'legend-pip'
    pip.style.background = ALL_COLORS[m]
    const span = document.createElement('span')
    span.textContent = ALL_LABELS[m]
    item.appendChild(pip)
    item.appendChild(span)
    item.setAttribute('tabindex', '0')
    item.setAttribute('role', 'switch')
    item.setAttribute('aria-checked', 'true')
    item.setAttribute('aria-label', 'Toggle ' + ALL_LABELS[m] + ' line')
    parent.appendChild(item)
    item.addEventListener('click', () => {
      visible[m] = !visible[m]
      item.classList.toggle('disabled', !visible[m])
      item.setAttribute('aria-checked', String(visible[m]))
      draw()
    })
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        item.click()
      }
    })
  })
}

function resize() {
  if (!canvas) return
  const r = canvas.parentElement.getBoundingClientRect()
  w = r.width || 800
  const chartH = w < 500 ? 130 : CHART_H
  activeChartH = chartH
  h = chartH * 2 + GAP + 10
  const d = devicePixelRatio || 1
  canvas.width = w * d
  canvas.height = h * d
  canvas.style.height = h + 'px'
  ctx.setTransform(d, 0, 0, d, 0, 0)
  draw()
}

export function pushHistory(values) {
  HEALTH_METRICS.forEach(m => { if (values[m] !== undefined) history[m].push(values[m]) })
  if (values.cost !== undefined) history.cost.push(values.cost)
  if (values.scope !== undefined) history.scope.push(values.scope)
  // ROI index: quality-adjusted capacity gain per dollar of AI spend.
  // Compares against what you'd get with NO AI at the same seniority/review cost.
  // baseCost = cost with zero AI (seniority + review costs only).
  // aiCost = additional cost from AI tooling.
  // If aiCost is 0, ROI = 100 (baseline). Otherwise:
  // ROI = 100 + ((capacity gain * quality factor) / aiCost) * 100
  const eR = values.effectiveR || values.actualR || 1
  const bR = values.baseR || 1
  const q = values.quality || 100
  const totalCost = values.cost || 100
  const baseCost = values.baseCost || totalCost
  const aiCost = totalCost - baseCost
  let roi
  if (aiCost <= 0) {
    // No AI spend — ROI is just quality-adjusted capacity relative to baseline
    const qualMult = (50 + q / 2) / 100
    roi = (eR / bR) * qualMult * 100
  } else {
    // Gain from AI: how much more capacity per dollar of AI investment
    const capacityGain = eR / bR - 1 // 0 at baseline, positive with AI
    const qualMult = (50 + q / 2) / 100
    roi = 100 + (capacityGain * qualMult / (aiCost / 100)) * 100
  }
  history.roi.push(Math.round(roi * 10) / 10)
  draw()
}

export function clearHistory() {
  ALL_METRICS.forEach(m => { history[m] = [] })
  draw()
}

function getStyles() {
  if (!cachedStyles) {
    const cs = getComputedStyle(document.documentElement)
    cachedStyles = {
      text:   cs.getPropertyValue('--text').trim(),
      hint:   cs.getPropertyValue('--text-hint').trim(),
      border: cs.getPropertyValue('--border').trim(),
      bg:     cs.getPropertyValue('--bg-card').trim(),
    }
    matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { cachedStyles = null })
  }
  return cachedStyles
}

// ============================================================
// Drawing
// ============================================================

function draw() {
  if (!canvas || canvas.offsetParent === null) return
  const st = getStyles()
  ctx.clearRect(0, 0, w, h)

  const n = history.quality.length

  // Chart 1: Health (top)
  drawChart({
    metrics: HEALTH_METRICS, colors: HEALTH_COLORS, labels: HEALTH_LABELS,
    yMin: 0, yMaxDefault: 150, yStep: 25,
    offsetY: 0, title: 'Health Metrics', st, n,
  })

  // Chart 2: Economics (bottom)
  drawChart({
    metrics: ECON_METRICS, colors: ECON_COLORS, labels: ECON_LABELS,
    yMin: 0, yMaxDefault: 200, yStep: 25,
    offsetY: activeChartH + GAP, title: 'Economics — Cost, Scope & ROI', st, n,
    baselineMark: 100, // draw a reference line at 100
  })
}

function drawChart({ metrics, colors, labels, yMin, yMaxDefault, yStep, offsetY, title, st, n, baselineMark }) {
  const gw = w - PAD.left - PAD.right
  const gh = activeChartH - PAD.top - PAD.bottom

  // Auto-scale Y
  let yMax = yMaxDefault
  for (const m of metrics) {
    if (!visible[m]) continue
    for (let i = 0; i < history[m].length; i++) {
      if (history[m][i] > yMax) yMax = history[m][i]
    }
  }
  yMax = Math.ceil(yMax / yStep) * yStep

  function toX(i) { return n <= 1 ? PAD.left : PAD.left + (i / (n - 1)) * gw }
  function toY(v) { return offsetY + PAD.top + gh - ((v - yMin) / (yMax - yMin)) * gh }

  // Title
  ctx.font = 'bold 11px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = st.hint
  ctx.textAlign = 'left'
  ctx.fillText(title, PAD.left, offsetY + 13)

  // Grid Y
  ctx.strokeStyle = st.border
  ctx.lineWidth = 0.5
  for (let y = yMin; y <= yMax; y += yStep) {
    const py = toY(y)
    ctx.beginPath(); ctx.moveTo(PAD.left, py); ctx.lineTo(PAD.left + gw, py); ctx.stroke()
  }

  // Y labels
  ctx.font = '10px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = st.hint
  ctx.textAlign = 'right'
  for (let y = yMin; y <= yMax; y += yStep) {
    ctx.fillText(String(y), PAD.left - 6, toY(y) + 3)
  }

  // Baseline reference line (e.g., ROI = 100)
  if (baselineMark !== undefined) {
    const by = toY(baselineMark)
    ctx.strokeStyle = '#1D9E75'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(PAD.left, by); ctx.lineTo(PAD.left + gw, by); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    ctx.font = '9px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = '#1D9E75'
    ctx.textAlign = 'left'
    ctx.fillText('break-even', PAD.left + 4, by - 4)
  }

  // X grid + labels (only on bottom chart)
  if (offsetY > 0) {
    let xStep = 10
    if (n > 500) xStep = 50
    else if (n > 200) xStep = 25

    ctx.strokeStyle = st.border
    ctx.lineWidth = 0.5
    ctx.textAlign = 'center'
    for (let i = 0; i < n; i += xStep) {
      const px = toX(i)
      // Draw grid lines through both charts
      ctx.beginPath(); ctx.moveTo(px, 0 + PAD.top); ctx.lineTo(px, 0 + activeChartH - PAD.bottom); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(px, offsetY + PAD.top); ctx.lineTo(px, offsetY + activeChartH - PAD.bottom); ctx.stroke()
      ctx.fillStyle = st.hint
      ctx.fillText('w' + (i + 1), px, offsetY + activeChartH - PAD.bottom + 14)
    }
    if (n > 0 && (n - 1) % xStep !== 0) {
      ctx.fillStyle = st.hint
      ctx.fillText('w' + n, toX(n - 1), offsetY + activeChartH - PAD.bottom + 14)
    }
    ctx.fillText('weeks', PAD.left + gw / 2, offsetY + activeChartH - 2)
  }

  // Draw lines
  if (n >= 2) {
    metrics.forEach(m => {
      if (!visible[m]) return
      const data = history[m]
      if (data.length < 2) return
      const color = colors[m]

      // Fill
      ctx.beginPath()
      ctx.moveTo(toX(0), toY(data[0]))
      for (let i = 1; i < data.length; i++) ctx.lineTo(toX(i), toY(data[i]))
      ctx.lineTo(toX(data.length - 1), toY(yMin))
      ctx.lineTo(toX(0), toY(yMin))
      ctx.closePath()
      ctx.fillStyle = color
      ctx.globalAlpha = 0.08
      ctx.fill()
      ctx.globalAlpha = 1

      // Line
      ctx.beginPath()
      ctx.moveTo(toX(0), toY(data[0]))
      for (let i = 1; i < data.length; i++) ctx.lineTo(toX(i), toY(data[i]))
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }

  // Axes
  ctx.strokeStyle = st.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD.left, offsetY + PAD.top)
  ctx.lineTo(PAD.left, offsetY + PAD.top + gh)
  ctx.lineTo(PAD.left + gw, offsetY + PAD.top + gh)
  ctx.stroke()

  // Crosshair
  if (crosshairX !== null && n >= 2) {
    const idx = Math.max(0, Math.min(n - 1, Math.round(((crosshairX - PAD.left) / gw) * (n - 1))))
    const lineX = toX(idx)

    // Vertical line
    ctx.strokeStyle = st.hint
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(lineX, offsetY + PAD.top)
    ctx.lineTo(lineX, offsetY + PAD.top + gh)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    // Dots
    metrics.forEach(m => {
      if (!visible[m]) return
      const val = history[m][idx]
      if (val === undefined) return
      ctx.fillStyle = colors[m]
      ctx.beginPath(); ctx.arc(lineX, toY(val), 3, 0, Math.PI * 2); ctx.fill()
    })

    // Tooltip
    const vis = metrics.filter(m => visible[m] && history[m][idx] !== undefined)
    if (vis.length > 0) {
      const lineH = 15
      const tipPad = 6
      const tipW = 130
      const tipH = lineH * (vis.length + 1) + tipPad * 2
      const inRight = lineX > w / 2
      const tipX = inRight ? lineX - tipW - 10 : lineX + 10
      const tipY = Math.max(offsetY + PAD.top, Math.min(offsetY + PAD.top + gh - tipH, offsetY + PAD.top + gh / 2 - tipH / 2))

      ctx.fillStyle = st.bg || '#fff'
      ctx.globalAlpha = 0.92
      ctx.beginPath(); ctx.roundRect(tipX, tipY, tipW, tipH, 4); ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = st.border; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.roundRect(tipX, tipY, tipW, tipH, 4); ctx.stroke()

      ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif'
      ctx.fillStyle = st.text || '#222'
      ctx.textAlign = 'left'
      ctx.fillText('Week ' + (idx + 1), tipX + tipPad, tipY + tipPad + 10)

      vis.forEach((m, i) => {
        const val = history[m][idx]
        const rowY = tipY + tipPad + lineH * (i + 1) + 10
        ctx.fillStyle = colors[m]
        ctx.beginPath(); ctx.arc(tipX + tipPad + 4, rowY - 4, 3.5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = st.text || '#222'
        ctx.font = '10px "DM Sans", system-ui, sans-serif'
        const display = m === 'roi' ? val.toFixed(1) : Math.round(val)
        ctx.fillText(labels[m] + ': ' + display, tipX + tipPad + 14, rowY)
      })
    }
  }

  // Empty state
  if (n === 0) {
    ctx.font = '12px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = st.hint
    ctx.textAlign = 'center'
    ctx.fillText('History will appear as the simulation runs\u2026', w / 2, offsetY + activeChartH / 2)
  }
}

