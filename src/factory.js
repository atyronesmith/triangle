/**
 * Factory floor animation — visual metaphor for the iron triangle.
 *
 * Workers (people) and robots (AI) carry work boxes from left to middle.
 * Reviewers carry boxes from middle to right. Boxes slide off-screen = shipped.
 * Manager walks around yelling. Worker mood reflects morale.
 */

let canvas, ctx, w, h
let entities = []
let boxes = []
let shippedBoxes = []
let spawnTimer = 0
let managerX = 0
let managerDir = 1
let simState = null

const FLOOR_Y_RATIO = 0.75
const BOX_SIZE = 14
const WORKER_SIZE = 18
const ROBOT_SIZE = 20

function initFactory() {
  canvas = document.getElementById('factory')
  if (!canvas) return
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  managerX = w * 0.5
  spawnWorkers()
  requestAnimationFrame(tick)
}

function resize() {
  const r = canvas.parentElement.getBoundingClientRect()
  w = r.width
  h = 160
  const d = devicePixelRatio || 1
  canvas.width = w * d
  canvas.height = h * d
  canvas.style.height = h + 'px'
  ctx.setTransform(d, 0, 0, d, 0, 0)
}

function spawnWorkers() {
  entities = []
  // Workers (human) — positioned in the production zone (left side)
  for (let i = 0; i < 5; i++) {
    entities.push({
      type: 'worker',
      x: 60 + Math.random() * (w * 0.3),
      y: h * FLOOR_Y_RATIO - 10 + (Math.random() - 0.5) * 30,
      targetX: null,
      speed: 0.8 + Math.random() * 0.4,
      carrying: null,
      state: 'idle', // idle, toBox, toMiddle, returning
      mood: 'smile',
      sweat: false,
    })
  }
  // Reviewers — positioned in the review zone (middle-right)
  for (let i = 0; i < 3; i++) {
    entities.push({
      type: 'reviewer',
      x: w * 0.55 + Math.random() * (w * 0.15),
      y: h * FLOOR_Y_RATIO - 10 + (Math.random() - 0.5) * 30,
      targetX: null,
      speed: 0.6 + Math.random() * 0.3,
      carrying: null,
      state: 'idle',
      mood: 'smile',
      sweat: false,
    })
  }
}

function updateFactory(state) {
  simState = state
  // Adjust entity counts based on AI level
  const targetRobots = Math.floor(state.ai / 15)
  const currentRobots = entities.filter(e => e.type === 'robot').length
  if (targetRobots > currentRobots) {
    for (let i = 0; i < targetRobots - currentRobots; i++) {
      entities.push({
        type: 'robot',
        x: 40 + Math.random() * (w * 0.25),
        y: h * FLOOR_Y_RATIO - 10 + (Math.random() - 0.5) * 24,
        targetX: null,
        speed: 1.5 + Math.random() * 0.5,
        carrying: null,
        state: 'idle',
        mood: 'neutral',
        sweat: false,
      })
    }
  } else if (targetRobots < currentRobots) {
    let toRemove = currentRobots - targetRobots
    entities = entities.filter(e => {
      if (e.type === 'robot' && toRemove > 0 && e.state === 'idle') { toRemove--; return false }
      return true
    })
  }

  // Update moods based on morale and debt
  const morale = state.teamMorale || 100
  const debt = state.techDebt || 0
  entities.forEach(e => {
    if (e.type === 'robot') return
    if (morale > 70) { e.mood = 'smile'; e.sweat = false }
    else if (morale > 45) { e.mood = 'neutral'; e.sweat = morale < 55 }
    else if (morale > 25) { e.mood = 'frown'; e.sweat = true }
    else { e.mood = 'frown'; e.sweat = true }
  })
}

function tick() {
  if (!simState) { requestAnimationFrame(tick); return }
  update()
  draw()
  requestAnimationFrame(tick)
}

function update() {
  const s = simState
  const totalScope = (s.totalScope || 0)
  const spawnRate = Math.max(0.005, (10 + s.ai * 0.4 + totalScope * 0.3) * 0.008)

  // Spawn work boxes on the left
  spawnTimer += spawnRate
  while (spawnTimer >= 1) {
    spawnTimer -= 1
    const hasDefect = Math.random() < (s.ai > 10 ? 0.15 + s.ai * 0.004 : 0.05)
    boxes.push({
      x: -BOX_SIZE,
      y: h * FLOOR_Y_RATIO - BOX_SIZE / 2 + (Math.random() - 0.5) * 20,
      zone: 'incoming', // incoming, staging, reviewing, shipped
      defect: hasDefect,
      carriedBy: null,
      opacity: 1,
    })
  }

  const middleX = w * 0.45
  const shipX = w * 0.85

  // Move unclaimed incoming boxes rightward slowly
  boxes.forEach(b => {
    if (b.zone === 'incoming' && !b.carriedBy) {
      b.x += 0.3
      if (b.x > middleX - 30) b.x = middleX - 30 // pile up at staging
    }
  })

  // Workers/robots pick up incoming boxes, carry to staging (middle)
  entities.filter(e => e.type === 'worker' || e.type === 'robot').forEach(e => {
    if (e.state === 'idle') {
      const box = boxes.find(b => b.zone === 'incoming' && !b.carriedBy && b.x > 10)
      if (box) {
        e.state = 'toBox'
        e.targetX = box.x
        e.carrying = box
        box.carriedBy = e
      }
    } else if (e.state === 'toBox') {
      const dx = e.targetX - e.x
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 2)
      if (Math.abs(dx) < 3) {
        e.state = 'toMiddle'
        e.targetX = middleX + (Math.random() - 0.5) * 20
      }
    } else if (e.state === 'toMiddle') {
      const dx = e.targetX - e.x
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 1.5)
      if (e.carrying) { e.carrying.x = e.x; e.carrying.y = e.y - WORKER_SIZE / 2 - BOX_SIZE / 2 }
      if (Math.abs(dx) < 3) {
        if (e.carrying) { e.carrying.zone = 'staging'; e.carrying.carriedBy = null }
        e.carrying = null
        e.state = 'returning'
        e.targetX = 40 + Math.random() * (w * 0.25)
      }
    } else if (e.state === 'returning') {
      const dx = e.targetX - e.x
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 1.2)
      if (Math.abs(dx) < 3) e.state = 'idle'
    }
  })

  // Reviewers pick up staging boxes, carry to ship zone
  entities.filter(e => e.type === 'reviewer').forEach(e => {
    if (e.state === 'idle') {
      const box = boxes.find(b => b.zone === 'staging' && !b.carriedBy)
      if (box) {
        e.state = 'toBox'
        e.targetX = box.x
        e.carrying = box
        box.carriedBy = e
      }
    } else if (e.state === 'toBox') {
      const dx = e.targetX - e.x
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 1.5)
      if (Math.abs(dx) < 3) {
        e.state = 'toShip'
        e.targetX = shipX + Math.random() * 20
      }
    } else if (e.state === 'toShip') {
      const dx = e.targetX - e.x
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed)
      if (e.carrying) { e.carrying.x = e.x; e.carrying.y = e.y - WORKER_SIZE / 2 - BOX_SIZE / 2 }
      if (Math.abs(dx) < 3) {
        if (e.carrying) {
          e.carrying.zone = 'shipped'
          e.carrying.carriedBy = null
        }
        e.carrying = null
        e.state = 'returning'
        e.targetX = w * 0.55 + Math.random() * (w * 0.15)
      }
    } else if (e.state === 'returning') {
      const dx = e.targetX - e.x
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed)
      if (Math.abs(dx) < 3) e.state = 'idle'
    }
  })

  // Shipped boxes slide off right
  boxes.forEach(b => {
    if (b.zone === 'shipped' && !b.carriedBy) {
      b.x += 2.5
      if (b.x > w + BOX_SIZE) b.opacity = 0
    }
  })

  // Clean up off-screen boxes
  boxes = boxes.filter(b => b.opacity > 0)

  // Manager pacing
  const scopePressure = Math.max(1, (s.totalScope || 0) / 20)
  managerX += managerDir * (0.3 + scopePressure * 0.15)
  if (managerX > w * 0.65) managerDir = -1
  if (managerX < w * 0.2) managerDir = 1
}

function draw() {
  ctx.clearRect(0, 0, w, h)
  const floorY = h * FLOOR_Y_RATIO + 15
  const s = simState

  // Floor
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--border')
  ctx.fillRect(0, floorY, w, 1)

  // Zone labels
  ctx.font = '9px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-hint')
  ctx.textAlign = 'center'
  ctx.fillText('PRODUCTION', w * 0.2, h * 0.15)
  ctx.fillText('STAGING', w * 0.45, h * 0.15)
  ctx.fillText('REVIEW', w * 0.65, h * 0.15)
  ctx.fillText('SHIPPED →', w * 0.88, h * 0.15)

  // Draw boxes
  boxes.forEach(b => {
    ctx.globalAlpha = b.opacity
    ctx.fillStyle = b.defect ? '#E24B4A' : '#5DCAA5'
    ctx.fillRect(b.x - BOX_SIZE / 2, b.y - BOX_SIZE / 2, BOX_SIZE, BOX_SIZE)
    ctx.strokeStyle = b.defect ? '#A32D2D' : '#0F6E56'
    ctx.lineWidth = 1
    ctx.strokeRect(b.x - BOX_SIZE / 2, b.y - BOX_SIZE / 2, BOX_SIZE, BOX_SIZE)
    ctx.globalAlpha = 1
  })

  // Draw entities
  entities.forEach(e => {
    if (e.type === 'robot') drawRobot(e)
    else if (e.type === 'reviewer') drawReviewer(e)
    else drawWorker(e)
  })

  // Draw manager
  drawManager()
}

function drawWorker(e) {
  const x = e.x, y = e.y
  // Body
  ctx.fillStyle = '#378ADD'
  ctx.beginPath()
  ctx.arc(x, y - 6, 7, 0, Math.PI * 2)
  ctx.fill()
  // Head
  ctx.fillStyle = '#FAC775'
  ctx.beginPath()
  ctx.arc(x, y - 16, 6, 0, Math.PI * 2)
  ctx.fill()
  // Face
  drawFace(x, y - 16, e.mood, 5)
  // Sweat
  if (e.sweat) {
    ctx.fillStyle = '#378ADD'
    ctx.beginPath()
    ctx.arc(x + 6, y - 20 + Math.sin(Date.now() / 200) * 2, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + 8, y - 17 + Math.cos(Date.now() / 250) * 2, 1, 0, Math.PI * 2)
    ctx.fill()
  }
  // Legs
  ctx.strokeStyle = '#378ADD'
  ctx.lineWidth = 2
  const step = e.state !== 'idle' ? Math.sin(Date.now() / 150 + e.x) * 3 : 0
  ctx.beginPath(); ctx.moveTo(x - 3, y + 1); ctx.lineTo(x - 4 - step, y + 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y + 1); ctx.lineTo(x + 4 + step, y + 10); ctx.stroke()
}

function drawRobot(e) {
  const x = e.x, y = e.y
  // Body — boxy
  ctx.fillStyle = '#9c9a92'
  ctx.fillRect(x - 8, y - 10, 16, 14)
  // Head
  ctx.fillStyle = '#73726c'
  ctx.fillRect(x - 6, y - 20, 12, 10)
  // Antenna
  ctx.strokeStyle = '#73726c'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x, y - 26); ctx.stroke()
  ctx.fillStyle = '#E24B4A'
  ctx.beginPath(); ctx.arc(x, y - 26, 2, 0, Math.PI * 2); ctx.fill()
  // Eyes — LEDs
  ctx.fillStyle = '#5DCAA5'
  ctx.fillRect(x - 4, y - 17, 3, 3)
  ctx.fillRect(x + 1, y - 17, 3, 3)
  // Treads
  ctx.fillStyle = '#73726c'
  ctx.fillRect(x - 9, y + 4, 6, 4)
  ctx.fillRect(x + 3, y + 4, 6, 4)
}

function drawReviewer(e) {
  const x = e.x, y = e.y
  // Body — different color
  ctx.fillStyle = '#7F77DD'
  ctx.beginPath()
  ctx.arc(x, y - 6, 7, 0, Math.PI * 2)
  ctx.fill()
  // Head
  ctx.fillStyle = '#FAC775'
  ctx.beginPath()
  ctx.arc(x, y - 16, 6, 0, Math.PI * 2)
  ctx.fill()
  // Face
  drawFace(x, y - 16, e.mood, 5)
  // Magnifying glass
  ctx.strokeStyle = '#534AB7'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(x + 10, y - 14, 4, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 13, y - 11); ctx.lineTo(x + 16, y - 8); ctx.stroke()
  // Sweat
  if (e.sweat) {
    ctx.fillStyle = '#7F77DD'
    ctx.beginPath()
    ctx.arc(x + 6, y - 20 + Math.sin(Date.now() / 200) * 2, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Legs
  ctx.strokeStyle = '#7F77DD'
  ctx.lineWidth = 2
  const step = e.state !== 'idle' ? Math.sin(Date.now() / 180 + e.x) * 3 : 0
  ctx.beginPath(); ctx.moveTo(x - 3, y + 1); ctx.lineTo(x - 4 - step, y + 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y + 1); ctx.lineTo(x + 4 + step, y + 10); ctx.stroke()
}

function drawManager() {
  if (!simState) return
  const x = managerX
  const y = h * FLOOR_Y_RATIO - 16
  const scope = simState.totalScope || 0

  // Body — larger, red-tinted with scope pressure
  const bodyColor = scope > 80 ? '#C0392B' : scope > 40 ? '#E67E22' : '#2C2C2A'
  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.arc(x, y - 4, 9, 0, Math.PI * 2)
  ctx.fill()
  // Head
  ctx.fillStyle = scope > 60 ? '#E8A0A0' : '#FAC775'
  ctx.beginPath()
  ctx.arc(x, y - 17, 7, 0, Math.PI * 2)
  ctx.fill()
  // Face — always stressed
  drawFace(x, y - 17, scope > 60 ? 'yell' : scope > 30 ? 'frown' : 'neutral', 6)
  // Legs
  ctx.strokeStyle = bodyColor
  ctx.lineWidth = 2.5
  const step = Math.sin(Date.now() / 120) * 4
  ctx.beginPath(); ctx.moveTo(x - 4, y + 5); ctx.lineTo(x - 5 - step, y + 16); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 4, y + 5); ctx.lineTo(x + 5 + step, y + 16); ctx.stroke()

  // Speech bubble — louder with scope
  if (scope > 10) {
    const bangs = scope > 80 ? '!!!' : scope > 50 ? 'MORE!!' : scope > 20 ? 'FASTER!' : '...'
    ctx.font = 'bold ' + (scope > 60 ? '12' : '10') + 'px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = scope > 60 ? '#E24B4A' : '#EF9F27'
    ctx.textAlign = 'center'
    // Bubble
    const tw = ctx.measureText(bangs).width + 10
    const bx = x, by = y - 32
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card')
    ctx.strokeStyle = scope > 60 ? '#E24B4A' : '#EF9F27'
    ctx.lineWidth = 1
    roundRect(bx - tw / 2, by - 10, tw, 16, 4)
    ctx.fill(); ctx.stroke()
    // Text
    ctx.fillStyle = scope > 60 ? '#E24B4A' : '#EF9F27'
    ctx.fillText(bangs, bx, by + 2)
  }
}

function drawFace(x, y, mood, r) {
  // Eyes
  ctx.fillStyle = '#2C2C2A'
  ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.15, 1.2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + r * 0.4, y - r * 0.15, 1.2, 0, Math.PI * 2); ctx.fill()
  // Mouth
  ctx.strokeStyle = '#2C2C2A'
  ctx.lineWidth = 1
  ctx.beginPath()
  if (mood === 'smile') {
    ctx.arc(x, y + r * 0.1, r * 0.35, 0, Math.PI)
  } else if (mood === 'frown') {
    ctx.arc(x, y + r * 0.5, r * 0.35, Math.PI, 0)
  } else if (mood === 'yell') {
    ctx.arc(x, y + r * 0.2, r * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#2C2C2A'; ctx.fill(); return
  } else {
    ctx.moveTo(x - r * 0.3, y + r * 0.3)
    ctx.lineTo(x + r * 0.3, y + r * 0.3)
  }
  ctx.stroke()
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export { initFactory, updateFactory }
