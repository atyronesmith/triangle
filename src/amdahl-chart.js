/**
 * Amdahl's Law chart — shows the speedup curve with the current operating point.
 *
 * Auto-scales domain/range to center the three operating points.
 * Draws curves for multiple p values, highlights current p,
 * and plots theoretical, actual, and perceived points.
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
  h = 240
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

  const pad = { top: 25, right: 35, bottom: 35, left: 50 }
  const gw = w - pad.left - pad.right
  const gh = h - pad.top - pad.bottom

  // Compute the three operating points first
  const currentP = (s.amdahlEffective || s.amdahl || 50) / 100
  const aiGenSpeedup = s.aiR / s.baseR
  const theoreticalTotal = amdahl(currentP, aiGenSpeedup)
  const actualTotal = Math.max(1, s.actualR / s.baseR)
  const perceivedTotal = Math.max(1, 1 + (s.perceivedBoostPct || 0) / 100)

  // Auto-scale: center the centroid of the three points with padding
  const centroidX = aiGenSpeedup
  const centroidY = (theoreticalTotal + actualTotal + perceivedTotal) / 3
  const spread = Math.max(
    Math.abs(theoreticalTotal - actualTotal),
    Math.abs(perceivedTotal - actualTotal),
    aiGenSpeedup - 1,
    0.5
  )

  // Domain: enough to show the points with context, minimum range of 1
  const xPad = Math.max(spread * 1.5, 0.8)
  const minX = 1
  const maxSpeedup = Math.max(centroidX + xPad, 2.5)

  const yPad = Math.max(spread * 1.2, 0.5)
  const minY = 1
  const maxTotal = Math.max(centroidY + yPad, 2)

  function toX(speedup) { return pad.left + (speedup - minX) / (maxSpeedup - minX) * gw }
  function toY(total) { return pad.top + gh - (total - minY) / (maxTotal - minY) * gh }

  // Grid lines
  ctx.strokeStyle = st.border
  ctx.lineWidth = 0.5
  const yStep = maxTotal <= 3 ? 0.25 : 0.5
  for (let y = 1; y <= maxTotal; y += yStep) {
    ctx.beginPath(); ctx.moveTo(pad.left, toY(y)); ctx.lineTo(pad.left + gw, toY(y)); ctx.stroke()
  }
  const xStep = maxSpeedup <= 3 ? 0.25 : 0.5
  for (let x = 1; x <= maxSpeedup; x += xStep) {
    ctx.beginPath(); ctx.moveTo(toX(x), pad.top); ctx.lineTo(toX(x), pad.top + gh); ctx.stroke()
  }

  // Axis labels
  ctx.font = '10px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = st.hint
  ctx.textAlign = 'center'
  const xLabelStep = maxSpeedup <= 3 ? 0.5 : 1
  for (let x = 1; x <= maxSpeedup; x += xLabelStep) {
    ctx.fillText(x.toFixed(1) + 'x', toX(x), pad.top + gh + 14)
  }
  ctx.fillText('AI speedup of accelerable fraction', pad.left + gw / 2, h - 4)

  ctx.textAlign = 'right'
  const yLabelStep = maxTotal <= 3 ? 0.5 : 1
  for (let y = 1; y <= maxTotal; y += yLabelStep) {
    ctx.fillText(y.toFixed(1) + 'x', pad.left - 6, toY(y) + 3)
  }

  ctx.save()
  ctx.translate(12, pad.top + gh / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText('Total speedup', 0, 0)
  ctx.restore()

  // Reference curves
  const refPs = [0.2, 0.4, 0.6, 0.8]
  refPs.forEach((p) => {
    ctx.strokeStyle = '#9c9a92'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    for (let sx = 1; sx <= maxSpeedup; sx += 0.05) {
      const ty = amdahl(p, sx)
      const px2 = toX(sx), py = toY(Math.min(ty, maxTotal))
      sx === 1 ? ctx.moveTo(px2, py) : ctx.lineTo(px2, py)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.setLineDash([])

    const endY = amdahl(p, maxSpeedup)
    if (endY <= maxTotal) {
      ctx.font = '9px "DM Sans", system-ui, sans-serif'
      ctx.fillStyle = st.hint
      ctx.textAlign = 'left'
      ctx.fillText(`p=${Math.round(p * 100)}%`, toX(maxSpeedup) + 4, toY(endY) + 3)
    }
  })

  // Current p curve — highlighted
  ctx.strokeStyle = '#1D9E75'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let sx = 1; sx <= maxSpeedup; sx += 0.05) {
    const ty = amdahl(currentP, sx)
    const px2 = toX(sx), py = toY(Math.min(ty, maxTotal))
    sx === 1 ? ctx.moveTo(px2, py) : ctx.lineTo(px2, py)
  }
  ctx.stroke()

  // Asymptote
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
    ctx.fillText(`ceiling: ${asymptote.toFixed(2)}x`, pad.left + 4, toY(asymptote) - 5)
  }

  // Plot operating points
  const theoX = toX(Math.min(aiGenSpeedup, maxSpeedup))
  const theoY = toY(Math.min(theoreticalTotal, maxTotal))
  const actX = theoX // same x — same AI speedup, different total
  const actY = toY(Math.min(Math.max(actualTotal, minY), maxTotal))

  plotPoint(theoX, theoY, '#378ADD', 'Theoretical', -8, -14)    // blue — matches task-level
  plotPoint(actX, actY, '#E24B4A', 'Actual', -8, 16)           // red — matches actual triangle

  if (s.ai > 5) {
    const percY = toY(Math.min(Math.max(perceivedTotal, minY), maxTotal))
    plotPoint(theoX + 12, percY, '#7F77DD', 'Perceived', 14, -4) // purple — matches perception bar
  }

  // Drag gap line
  if (aiGenSpeedup > 1.05 && Math.abs(theoreticalTotal - actualTotal) > 0.02) {
    ctx.strokeStyle = '#E24B4A'
    ctx.lineWidth = 1.5
    ctx.setLineDash([2, 2])
    ctx.globalAlpha = 0.6
    ctx.beginPath(); ctx.moveTo(theoX + 3, theoY); ctx.lineTo(actX + 3, actY); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    const dragPct = Math.round((theoreticalTotal - actualTotal) / Math.max(theoreticalTotal - 1, 0.01) * 100)
    if (dragPct > 0 && isFinite(dragPct)) {
      ctx.font = '9px "DM Sans", system-ui, sans-serif'
      ctx.fillStyle = '#E24B4A'
      ctx.textAlign = 'left'
      ctx.fillText(`-${dragPct}% drag`, theoX + 8, (theoY + actY) / 2 + 3)
    }
  }

  // Title
  ctx.font = 'bold 11px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = st.muted
  ctx.textAlign = 'left'
  ctx.fillText(`Amdahl curve — p=${Math.round(currentP * 100)}% accelerable`, pad.left, 14)
  if (s.aiMgmt > 0) {
    ctx.font = '9px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = '#1D9E75'
    const titleW = ctx.measureText(`Amdahl curve — p=${Math.round(currentP * 100)}% accelerable`).width
    ctx.fillText(`(+${Math.round(s.aiMgmt * 0.3)}% from AI mgmt)`, pad.left + titleW + 8, 14)
  }
}

function plotPoint(x, y, color, label, labelDx, labelDy) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill()
  ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = labelDx < 0 ? 'right' : 'left'
  ctx.fillText(label, x + labelDx, y + labelDy)
}
