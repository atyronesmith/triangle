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

  // Task-level point sits on the y=x line (no bottleneck = total equals task speedup)
  const taskLevelTotal = aiGenSpeedup

  // Auto-scale: include all four points
  const allY = [theoreticalTotal, actualTotal, perceivedTotal, taskLevelTotal]
  const centroidX = aiGenSpeedup
  const centroidY = allY.reduce((a, b) => a + b, 0) / allY.length
  const spread = Math.max(
    ...allY.map(y => Math.abs(y - centroidY)),
    aiGenSpeedup - 1,
    0.5
  )

  const xPad = Math.max(spread * 1.2, 0.8)
  const minX = 1
  const maxSpeedup = Math.max(centroidX + xPad, 2.5)

  const yPad = Math.max(spread * 1.2, 0.5)
  const minY = 1
  const maxTotal = Math.max(Math.max(...allY) + yPad * 0.5, centroidY + yPad, 2)

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

  // y=x line — "no bottleneck" (if entire workflow sped up equally)
  ctx.strokeStyle = st.hint
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  ctx.moveTo(toX(1), toY(1))
  ctx.lineTo(toX(Math.min(maxSpeedup, maxTotal)), toY(Math.min(maxSpeedup, maxTotal)))
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  ctx.font = '8px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = st.hint
  ctx.textAlign = 'left'
  const lblPos = Math.min(maxSpeedup, maxTotal) * 0.85
  ctx.fillText('no bottleneck', toX(lblPos) + 4, toY(lblPos) - 4)

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

  // Plot operating points — four dots, two gaps
  const ptX = toX(Math.min(aiGenSpeedup, maxSpeedup))

  // Task-level: on the y=x line — what vendor dashboards show
  const taskY = toY(Math.min(Math.max(taskLevelTotal, minY), maxTotal))
  // Theoretical: on the Amdahl curve — after serial bottleneck
  const theoY2 = toY(Math.min(theoreticalTotal, maxTotal))
  // Actual: below the curve — after debt, morale, hidden costs
  const actY = toY(Math.min(Math.max(actualTotal, minY), maxTotal))

  // Gap 1: Task-level → Theoretical = Amdahl's serial bottleneck
  if (aiGenSpeedup > 1.05 && Math.abs(taskLevelTotal - theoreticalTotal) > 0.02) {
    ctx.strokeStyle = '#1D9E75'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(ptX - 4, taskY); ctx.lineTo(ptX - 4, theoY2); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    ctx.font = '8px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = '#1D9E75'
    ctx.textAlign = 'right'
    ctx.fillText('Amdahl', ptX - 8, (taskY + theoY2) / 2 + 3)
  }

  // Gap 2: Theoretical → Actual = debt, morale, hidden costs
  if (aiGenSpeedup > 1.05 && Math.abs(theoreticalTotal - actualTotal) > 0.02) {
    ctx.strokeStyle = '#E24B4A'
    ctx.lineWidth = 1.5
    ctx.setLineDash([2, 2])
    ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(ptX + 4, theoY2); ctx.lineTo(ptX + 4, actY); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    const dragPct = Math.round((theoreticalTotal - actualTotal) / Math.max(theoreticalTotal - 1, 0.01) * 100)
    if (dragPct > 0 && isFinite(dragPct)) {
      ctx.font = '8px "DM Sans", system-ui, sans-serif'
      ctx.fillStyle = '#E24B4A'
      ctx.textAlign = 'left'
      ctx.fillText(`-${dragPct}% drag`, ptX + 8, (theoY2 + actY) / 2 + 3)
    }
  }

  // Points (drawn on top of gap lines)
  if (aiGenSpeedup > 1.02) {
    plotPoint(ptX, taskY, '#5DCAA5', 'Task-level', -8, -14)     // green — vendor promise
  }
  plotPoint(ptX, theoY2, '#378ADD', 'Amdahl-limited', -8, 6)    // blue — after serial bottleneck
  plotPoint(ptX, actY, '#E24B4A', 'Actual', -8, 16)             // red — after all drag

  if (s.ai > 5) {
    const percY = toY(Math.min(Math.max(perceivedTotal, minY), maxTotal))
    plotPoint(ptX + 14, percY, '#7F77DD', 'Perceived', 14, -4)  // purple — what team believes
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
