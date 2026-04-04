/**
 * Inline sparkline charts for quality, debt, morale, and Jevons.
 * Ring buffer stores last N ticks, rendered as polylines on small canvases.
 */

const CAPACITY = 50
const METRICS = ['quality', 'debt', 'jevons', 'morale']
const COLORS = {
  quality: '#1D9E75',
  debt:    '#EF9F27',
  jevons:  '#E24B4A',
  morale:  '#1D9E75',
}
// Color shifts when metric is in bad territory
const BAD_COLORS = {
  quality: '#E24B4A',   // red when quality is low
  debt:    '#E24B4A',   // red when debt is high
  jevons:  '#E24B4A',   // always red-ish
  morale:  '#E24B4A',   // red when morale is low
}

const buffers = {}
const canvases = {}
const contexts = {}

METRICS.forEach(m => {
  buffers[m] = { data: new Float32Array(CAPACITY), head: 0, count: 0 }
})

function push(buf, value) {
  buf.data[buf.head] = value
  buf.head = (buf.head + 1) % CAPACITY
  if (buf.count < CAPACITY) buf.count++
}

function toArray(buf) {
  const arr = []
  const start = (buf.head - buf.count + CAPACITY) % CAPACITY
  for (let i = 0; i < buf.count; i++) {
    arr.push(buf.data[(start + i) % CAPACITY])
  }
  return arr
}

export function initSparklines() {
  METRICS.forEach(m => {
    const el = document.getElementById('spark-' + m)
    if (!el) return
    canvases[m] = el
    contexts[m] = el.getContext('2d')
    resizeCanvas(m)
  })
  window.addEventListener('resize', () => METRICS.forEach(m => { if (canvases[m]) resizeCanvas(m) }))
}

function resizeCanvas(m) {
  const el = canvases[m]
  if (!el) return
  const r = el.getBoundingClientRect()
  const d = devicePixelRatio || 1
  el.width = r.width * d
  el.height = r.height * d
  contexts[m].setTransform(d, 0, 0, d, 0, 0)
  drawSparkline(m)
}

export function pushSparkline(values) {
  METRICS.forEach(m => {
    if (values[m] !== undefined) {
      push(buffers[m], values[m])
      drawSparkline(m)
    }
  })
}

export function clearSparklines() {
  METRICS.forEach(m => {
    buffers[m].head = 0
    buffers[m].count = 0
    buffers[m].data.fill(0)
    drawSparkline(m)
  })
}

function drawSparkline(m) {
  const ctx = contexts[m]
  const el = canvases[m]
  if (!ctx || !el) return

  const r = el.getBoundingClientRect()
  const w = r.width
  const h = r.height
  ctx.clearRect(0, 0, w, h)

  const arr = toArray(buffers[m])
  if (arr.length < 2) return

  // Fixed range 0-100 for all metrics (debt and jevons can exceed but we clamp display)
  const minV = 0
  const maxV = m === 'jevons' ? 150 : 100

  const stepX = w / (CAPACITY - 1)

  // Determine color based on current value
  const current = arr[arr.length - 1]
  let color = COLORS[m]
  if (m === 'quality' && current < 50) color = BAD_COLORS[m]
  if (m === 'debt' && current > 40) color = BAD_COLORS[m]
  if (m === 'morale' && current < 50) color = BAD_COLORS[m]

  // Fill area under the line
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let i = 0; i < arr.length; i++) {
    const x = (CAPACITY - arr.length + i) * stepX
    const y = h - ((arr[i] - minV) / (maxV - minV)) * h
    ctx.lineTo(x, Math.max(0, Math.min(h, y)))
  }
  ctx.lineTo((CAPACITY - 1) * stepX, h)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.globalAlpha = 0.15
  ctx.fill()
  ctx.globalAlpha = 1

  // Draw the line
  ctx.beginPath()
  for (let i = 0; i < arr.length; i++) {
    const x = (CAPACITY - arr.length + i) * stepX
    const y = h - ((arr[i] - minV) / (maxV - minV)) * h
    i === 0 ? ctx.moveTo(x, Math.max(0, Math.min(h, y))) : ctx.lineTo(x, Math.max(0, Math.min(h, y)))
  }
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Current value dot at the end
  const lastX = (CAPACITY - 1) * stepX
  const lastY = h - ((current - minV) / (maxV - minV)) * h
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(lastX, Math.max(2, Math.min(h - 2, lastY)), 2, 0, Math.PI * 2)
  ctx.fill()
}
