/**
 * Amdahl's Law chart — shows the speedup curve with the current operating point.
 *
 * X-axis: AI speedup of the accelerable fraction (1x → 10x)
 * Y-axis: Total system speedup (1x → max)
 * Draws curves for multiple p values, highlights current p,
 * and plots theoretical, actual, and perceived operating points.
 */

let canvas, ctx, w, h
let cachedStyles = null
let currentState = null

function amdahl(p, s) {
  if (s <= 1) return 1
  return 1 / ((1 - p) + p / s)
}

export function initAmdahlChart() {
  canvas = document.getElementById('amdahl-chart')
  if (!canvas) return
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
}

function resize() {
  const r = canvas.parentElement.getBoundingClientRect()
  w = r.width
  h = 220
  const d = devicePixelRatio || 1
  canvas.width = w * d
  canvas.height = h * d
  canvas.style.height = h + 'px'
  ctx.setTransform(d, 0, 0, d, 0, 0)
  if (currentState) draw()
}

export function updateAmdahlChart(state) {
  currentState = state
  draw()
}

function getStyles() {
  if (!cachedStyles) {
    const cs = getComputedStyle(document.documentElement)
    cachedStyles = {
      text: cs.getPropertyValue('--text'),
      hint: cs.getPropertyValue('--text-hint'),
      muted: cs.getPropertyValue('--text-muted'),
      border: cs.getPropertyValue('--border'),
      bg: cs.getPropertyValue('--bg-card'),
    }
    matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { cachedStyles = null })
  }
  return cachedStyles
}

function draw() {
  if (!canvas || !currentState) return
  const s = currentState
  const st = getStyles()

  ctx.clearRect(0, 0, w, h)

  const pad = { top: 25, right: 30, bottom: 35, left: 50 }
  const gw = w - pad.left - pad.right
  const gh = h - pad.top - pad.bottom

  // Axis ranges — zoomed to the realistic operating range
  const maxSpeedup = 4   // x-axis: speedup of accelerable fraction
  const maxTotal = 3     // y-axis: total system speedup

  function toX(speedup) { return pad.left + (speedup - 1) / (maxSpeedup - 1) * gw }
  function toY(total) { return pad.top + gh - (total - 1) / (maxTotal - 1) * gh }

  // Grid lines
  ctx.strokeStyle = st.border
  ctx.lineWidth = 0.5
  for (let y = 1; y <= maxTotal; y += 0.5) {
    ctx.beginPath(); ctx.moveTo(pad.left, toY(y)); ctx.lineTo(pad.left + gw, toY(y)); ctx.stroke()
  }
  for (let x = 1; x <= maxSpeedup; x += 0.5) {
    ctx.beginPath(); ctx.moveTo(toX(x), pad.top); ctx.lineTo(toX(x), pad.top + gh); ctx.stroke()
  }

  // Axis labels
  ctx.font = '10px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = st.hint
  ctx.textAlign = 'center'
  for (let x = 1; x <= maxSpeedup; x += 0.5) {
    ctx.fillText(x.toFixed(1) + 'x', toX(x), pad.top + gh + 14)
  }
  ctx.fillText('AI speedup of accelerable fraction', pad.left + gw / 2, h - 4)

  ctx.textAlign = 'right'
  for (let y = 1; y <= maxTotal; y += 0.5) {
    ctx.fillText(y.toFixed(1) + 'x', pad.left - 6, toY(y) + 3)
  }

  ctx.save()
  ctx.translate(12, pad.top + gh / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText('Total speedup', 0, 0)
  ctx.restore()

  // Draw reference curves for fixed p values
  const refPs = [0.2, 0.4, 0.6, 0.8]

  refPs.forEach((p) => {
    ctx.strokeStyle = '#9c9a92'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    for (let sx = 1; sx <= maxSpeedup; sx += 0.1) {
      const ty = amdahl(p, sx)
      const px2 = toX(sx), py = toY(Math.min(ty, maxTotal))
      sx === 1 ? ctx.moveTo(px2, py) : ctx.lineTo(px2, py)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.setLineDash([])

    // Label at end
    const endY = amdahl(p, maxSpeedup)
    ctx.font = '9px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = st.hint
    ctx.textAlign = 'left'
    ctx.fillText(`p=${Math.round(p * 100)}%`, toX(maxSpeedup) + 4, toY(Math.min(endY, maxTotal)) + 3)
  })

  // Current p curve — highlighted
  const currentP = (s.amdahlEffective || s.amdahl || 50) / 100
  ctx.strokeStyle = '#1D9E75'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let sx = 1; sx <= maxSpeedup; sx += 0.1) {
    const ty = amdahl(currentP, sx)
    const px2 = toX(sx), py = toY(Math.min(ty, maxTotal))
    sx === 1 ? ctx.moveTo(px2, py) : ctx.lineTo(px2, py)
  }
  ctx.stroke()

  // Asymptote line for current p
  const asymptote = 1 / (1 - currentP)
  if (asymptote <= maxTotal) {
    ctx.strokeStyle = '#1D9E75'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.globalAlpha = 0.4
    ctx.beginPath(); ctx.moveTo(pad.left, toY(asymptote)); ctx.lineTo(pad.left + gw, toY(asymptote)); ctx.stroke()
    ctx.globalAlpha = 1
    ctx.setLineDash([])

    ctx.font = '9px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = '#1D9E75'
    ctx.textAlign = 'left'
    ctx.fillText(`ceiling: ${asymptote.toFixed(1)}x`, pad.left + 4, toY(asymptote) - 5)
  }

  // Compute operating points
  const aiGenSpeedup = s.aiR / s.baseR // raw AI speedup of accelerable fraction
  const theoreticalTotal = amdahl(currentP, aiGenSpeedup)
  const actualTotal = s.actualR / s.baseR
  const perceivedTotal = 1 + (s.perceivedBoostPct || 0) / 100

  // Theoretical point (on the curve — Amdahl-limited but no drag)
  plotPoint(toX(Math.min(aiGenSpeedup, maxSpeedup)), toY(Math.min(theoreticalTotal, maxTotal)),
    '#2B7DE9', 'Theoretical', -40, -12)

  // Actual point (below the curve — debt, morale, hidden costs drag it down)
  plotPoint(toX(Math.min(aiGenSpeedup, maxSpeedup)), toY(Math.min(Math.max(actualTotal, 1), maxTotal)),
    '#E24B4A', 'Actual', 8, 12)

  // Perceived point (above actual, possibly above theoretical)
  if (s.ai > 5) {
    plotPoint(toX(Math.min(aiGenSpeedup, maxSpeedup)), toY(Math.min(Math.max(perceivedTotal, 1), maxTotal)),
      '#7F77DD', 'Perceived', 8, -12)
  }

  // Gap annotation between theoretical and actual
  if (aiGenSpeedup > 1.1 && Math.abs(theoreticalTotal - actualTotal) > 0.05) {
    const gapX = toX(Math.min(aiGenSpeedup, maxSpeedup))
    const y1 = toY(Math.min(theoreticalTotal, maxTotal))
    const y2 = toY(Math.min(Math.max(actualTotal, 1), maxTotal))
    ctx.strokeStyle = '#E24B4A'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.globalAlpha = 0.6
    ctx.beginPath(); ctx.moveTo(gapX + 3, y1); ctx.lineTo(gapX + 3, y2); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    ctx.font = '9px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = '#E24B4A'
    ctx.textAlign = 'left'
    const dragPct = Math.round((theoreticalTotal - actualTotal) / theoreticalTotal * 100)
    if (dragPct > 0) ctx.fillText(`-${dragPct}% drag`, gapX + 8, (y1 + y2) / 2 + 3)
  }

  // Title
  ctx.font = 'bold 11px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = st.muted
  ctx.textAlign = 'left'
  ctx.fillText(`Amdahl curve — p=${Math.round(currentP * 100)}% accelerable`, pad.left, 14)
  if (s.aiMgmt > 0) {
    ctx.font = '9px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = '#1D9E75'
    ctx.fillText(`(+${Math.round(s.aiMgmt * 0.3)}% from AI management)`, pad.left + ctx.measureText(`Amdahl curve — p=${Math.round(currentP * 100)}% accelerable`).width + 8, 14)
  }
}

function plotPoint(x, y, color, label, labelDx, labelDy) {
  // Outer ring
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke()
  // Inner dot
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
  // Label
  ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = labelDx < 0 ? 'right' : 'left'
  ctx.fillText(label, x + labelDx, y + labelDy)
}
