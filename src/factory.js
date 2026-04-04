/**
 * Factory floor — conveyor belt metaphor.
 *
 * A conveyor belt carries work items from left to right.
 * Workers and robots stand at pickup stations and grab items.
 * Items they grab get carried to reviewers, who ship them right.
 * Items nobody grabs fall off the belt and pile up as tech debt.
 * Manager paces and yells based on scope pressure.
 */

let canvas, ctx, w, h
let beltItems = []       // items on the conveyor
let carriedItems = []    // items being carried to review
let reviewItems = []     // items being reviewed/shipped
let debtPile = []        // fallen items (tech debt)
let workers = []
let reviewers = []
let mgmtRobotCount = 0
let manager = { x: 0, dir: 1 }
let simState = { ai: 0, totalScope: 0, review: 10, teamMorale: 100, techDebt: 0 }
let frameCount = 0
let cachedStyles = null

const BELT_Y = 0.38       // conveyor belt vertical position (upper portion)
const ITEM_W = 12
const ITEM_H = 10
const PICKUP_START = 0.18 // where first worker stands (room for furnace on left)
const PICKUP_END = 0.48   // end of pickup zone — items that pass here fall
const REVIEW_X = 0.65     // where reviewers stand
const SHIP_X = 0.88       // items ship off here
const FURNACE_Y = 0.72    // furnace at bottom-left
const DEBT_PIT_X = 0.48   // debt pit under end of belt

function initFactory() {
  canvas = document.getElementById('factory')
  if (!canvas) return
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  spawnAgents()
  requestAnimationFrame(tick)
}

function resize() {
  const r = canvas.parentElement.getBoundingClientRect()
  w = r.width; h = 260
  const d = devicePixelRatio || 1
  canvas.width = w * d; canvas.height = h * d
  canvas.style.height = h + 'px'
  ctx.setTransform(d, 0, 0, d, 0, 0)
}

function spawnAgents() {
  workers = []
  reviewers = []
  // Human workers at pickup stations
  for (let i = 0; i < 4; i++) {
    workers.push({
      type: 'worker',
      homeX: w * (PICKUP_START + i * 0.08),
      x: w * (PICKUP_START + i * 0.08),
      y: h * BELT_Y - 20,
      state: 'waiting', // waiting, carrying, returning
      targetX: 0,
      item: null,
      speed: 1.2,
    })
  }
  // Reviewers
  for (let i = 0; i < 3; i++) {
    reviewers.push({
      type: 'reviewer',
      homeX: w * (REVIEW_X + i * 0.06),
      x: w * (REVIEW_X + i * 0.06),
      y: h * BELT_Y - 20,
      state: 'waiting',
      targetX: 0,
      item: null,
      speed: 0.9,
    })
  }
  manager.x = w * 0.35
}

function adjustRobots(list, targetCount, zoneStart, zoneEnd, speed) {
  const current = list.filter(a => a.type === 'robot').length
  if (targetCount > current) {
    for (let i = 0; i < targetCount - current; i++) {
      // Space robots evenly within the zone
      const t = (current + i + 1) / (targetCount + 1)
      const homeX = w * (zoneStart + t * (zoneEnd - zoneStart))
      list.push({
        type: 'robot',
        homeX,
        x: homeX,
        y: h * BELT_Y - 20,
        state: 'waiting',
        targetX: 0,
        item: null,
        speed,
      })
    }
  } else if (targetCount < current) {
    let drop = current - targetCount
    const filtered = list.filter(a => {
      if (a.type === 'robot' && drop > 0) {
        // Drop any item they're carrying
        if (a.item) { a.item = null }
        drop--
        return false
      }
      return true
    })
    list.length = 0
    list.push(...filtered)
  }
}

function updateFactory(state) {
  simState = state
  const aiGen = state.aiGen || 0
  const aiReview = state.aiReview || 0
  const aiMgmt = state.aiMgmt || 0

  // Production robots — driven by AI generation
  const targetProdRobots = Math.floor(aiGen / 15)
  adjustRobots(workers, targetProdRobots, PICKUP_START, PICKUP_END - 0.02, 3.0)

  // Review robots — driven by AI review investment
  const targetReviewRobots = Math.floor(aiReview / 15)
  adjustRobots(reviewers, targetReviewRobots, REVIEW_X - 0.03, SHIP_X - 0.05, 2.0)

  // Management robots — follow the manager, calm him down
  // Management robots appear earlier — first one at aiMgmt >= 10
  mgmtRobotCount = Math.floor(aiMgmt / 10)
}

let lastTick = 0
let paused = false
const FRAME_INTERVAL = 66 // ~15fps — plenty for this animation

function tick(now) {
  requestAnimationFrame(tick)
  if (now - lastTick < FRAME_INTERVAL) return
  lastTick = now
  if (paused) { draw(); return } // still draw current state, just don't advance
  frameCount++
  update()
  draw()
}

function update() {
  const s = simState
  const scope = s.totalScope || 0
  const aiGen = s.aiGen || 0
  const debt = s.techDebt || 0

  // Belt speed — scaled for 15fps
  const beltSpeed = 1.5 + scope * 0.015

  // Spawn rate calibrated to worker capacity:
  // At baseline (ai=0, scope=0), spawn is slow — workers keep up easily
  // Scope increases demand. AI increases both supply and demand.
  // The balance point: ~4 human workers can handle baseline spawn rate.
  // Robots help absorb higher rates.
  const workerCapacity = workers.length * 0.012
  const demandRate = 0.015 + scope * 0.0004 + aiGen * 0.0003
  const spawnRate = Math.min(demandRate, 0.08)

  if (Math.random() < spawnRate) {
    // Defect rate driven by quality — low quality = more red boxes
    // Inverted: quality 100% → ~3% defect, quality 30% → ~60% defect
    const quality = s.quality || 100
    const baseDefectRate = Math.max(0.03, (100 - quality) / 100 * 0.85)
    const defect = Math.random() < baseDefectRate
    beltItems.push({ x: -ITEM_W, y: h * BELT_Y + 4, defect, onBelt: true })
  }

  // Move belt items
  beltItems.forEach(item => {
    if (item.onBelt) item.x += beltSpeed
  })

  // Items that pass the pickup zone without being grabbed → removed
  // (the actual debt tracking is in engine.js — we just show the pile based on techDebt)
  beltItems = beltItems.filter(item => {
    if (item.onBelt && item.x > w * PICKUP_END) return false
    return true
  })

  // Debt pit is drawn directly from techDebt in draw() — no local accumulation needed

  // Workers grab items from belt
  workers.forEach(agent => {
    if (agent.state === 'waiting') {
      // Look for nearest belt item near my position
      // Grab items within reach — wider radius so agents don't miss at 15fps
      const item = beltItems.find(i =>
        i.onBelt && Math.abs(i.x - agent.homeX) < 50 && !i.claimed
      )
      if (item) {
        item.claimed = true
        item.onBelt = false
        agent.item = item
        agent.state = 'carrying'
        agent.targetX = w * (REVIEW_X - 0.05) + Math.random() * 20
      }
    } else if (agent.state === 'carrying') {
      const dx = agent.targetX - agent.x
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 4)
      if (agent.item) {
        agent.item.x = agent.x
        agent.item.y = agent.y - 8
      }
      if (Math.abs(dx) < 5) {
        // Drop at review staging
        if (agent.item) {
          reviewItems.push({
            x: agent.x,
            y: h * BELT_Y + 4,
            defect: agent.item.defect,
            staged: true,
          })
        }
        agent.item = null
        agent.state = 'returning'
        agent.targetX = agent.homeX
      }
    } else if (agent.state === 'returning') {
      const dx = agent.targetX - agent.x
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 5)
      if (Math.abs(dx) < 5) { agent.x = agent.homeX; agent.state = 'waiting' }
    }
  })

  // Reviewers pick up review items — ship good ones right, hurl bad ones back left
  const effectiveRev = s.effectiveReview || s.review || 10
  const catchRate = Math.min(0.95, effectiveRev / 40) // higher review = more defects caught

  reviewers.forEach(agent => {
    if (agent.state === 'waiting') {
      const item = reviewItems.find(i => i.staged && !i.claimed)
      if (item) {
        item.claimed = true
        item.staged = false
        agent.item = item
        agent.state = 'toBox'
        agent.targetX = item.x
      }
    } else if (agent.state === 'toBox') {
      const dx = agent.targetX - agent.x
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 4)
      if (Math.abs(dx) < 5) {
        // Decide: if defective and review catches it, hurl back for rework
        if (agent.item && agent.item.defect && Math.random() < catchRate) {
          agent.state = 'hurling'
          agent.targetX = w * PICKUP_START + Math.random() * (w * 0.15) // back to production
        } else {
          agent.state = 'carrying'
          agent.targetX = w * SHIP_X + Math.random() * 15
        }
      }
    } else if (agent.state === 'hurling') {
      // Hurl the defective item back left — it turns green (fixed via rework)
      const dx = agent.targetX - agent.x
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 6) // fast throw
      if (agent.item) {
        agent.item.x = agent.x
        agent.item.y = agent.y - 12 - Math.sin((agent.x / w) * Math.PI) * 20 // arc trajectory
      }
      if (Math.abs(dx) < 8) {
        // Item lands on belt, now fixed (green)
        if (agent.item) {
          agent.item.defect = false // reworked — it's good now
          beltItems.push({ x: agent.item.x, y: h * BELT_Y + 4, defect: false, onBelt: true })
        }
        agent.item = null
        agent.state = 'returning'
        agent.targetX = agent.homeX
      }
    } else if (agent.state === 'carrying') {
      const dx = agent.targetX - agent.x
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 3)
      if (agent.item) {
        agent.item.x = agent.x
        agent.item.y = agent.y - 8
      }
      if (Math.abs(dx) < 5) {
        agent.item = null
        agent.state = 'returning'
        agent.targetX = agent.homeX
      }
    } else if (agent.state === 'returning') {
      const dx = agent.targetX - agent.x
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 4)
      if (Math.abs(dx) < 5) { agent.x = agent.homeX; agent.state = 'waiting' }
    }
  })

  // Clean up shipped review items
  reviewItems = reviewItems.filter(i => i.staged || i.x < w * SHIP_X + 10)

  // Remove claimed belt items that are gone
  beltItems = beltItems.filter(i => i.onBelt)

  // Manager pacing
  const scopePressure = Math.max(0.3, scope / 25)
  manager.x += manager.dir * scopePressure * 0.5
  if (manager.x > w * 0.55) manager.dir = -1
  if (manager.x < w * 0.2) manager.dir = 1
}

function draw() {
  ctx.clearRect(0, 0, w, h)
  const s = simState
  const morale = s.teamMorale || 100
  const scope = s.totalScope || 0
  const beltY = h * BELT_Y
  if (!cachedStyles) {
    const cs = getComputedStyle(document.documentElement)
    cachedStyles = {
      hint: cs.getPropertyValue('--text-hint'),
      border: cs.getPropertyValue('--border'),
      cardBg: cs.getPropertyValue('--bg-card'),
    }
    // Refresh on color scheme change
    matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { cachedStyles = null })
  }
  const { hint, border, cardBg } = cachedStyles

  // Zone labels
  ctx.font = '9px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = hint
  ctx.textAlign = 'center'
  ctx.fillText('PRODUCTION', w * 0.3, 14)
  ctx.fillText('REVIEW', w * REVIEW_X, 14)
  ctx.fillText('SHIPPED →', w * 0.92, 14)

  // Furnace + generator + wires (bottom-left)
  drawFurnace(s, beltY)

  // Debt pit (below belt end)
  drawDebtPit(s.techDebt || 0, beltY)

  // Conveyor belt — full width from left edge
  ctx.strokeStyle = '#9c9a92'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, beltY + 12); ctx.lineTo(w * PICKUP_END + 10, beltY + 12); ctx.stroke()
  // Belt rollers
  for (let x = 10; x < w * PICKUP_END; x += 18) {
    ctx.fillStyle = '#73726c'
    ctx.beginPath(); ctx.arc(x, beltY + 12, 3, 0, Math.PI * 2); ctx.fill()
  }

  // Belt items
  beltItems.forEach(item => {
    ctx.fillStyle = item.defect ? '#E24B4A' : '#5DCAA5'
    ctx.fillRect(item.x, item.y, ITEM_W, ITEM_H)
    ctx.strokeStyle = item.defect ? '#A32D2D' : '#0F6E56'
    ctx.lineWidth = 0.5
    ctx.strokeRect(item.x, item.y, ITEM_W, ITEM_H)
  })

  // Review staging items
  reviewItems.filter(i => i.staged).forEach(item => {
    ctx.fillStyle = item.defect ? '#E24B4A' : '#5DCAA5'
    ctx.fillRect(item.x, item.y, ITEM_W, ITEM_H)
  })

  // Workers
  workers.forEach(a => {
    if (a.type === 'robot') drawRobot(a.x, a.y)
    else drawPerson(a.x, a.y, '#378ADD', morale, a.state !== 'waiting', a.item)
  })

  // Reviewers
  reviewers.forEach(a => {
    if (a.type === 'robot') {
      drawRobot(a.x, a.y)
      // Robot reviewer gets a magnifying glass too
      ctx.strokeStyle = '#534AB7'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.arc(a.x + 10, a.y - 4, 3.5, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(a.x + 12.5, a.y - 1.5); ctx.lineTo(a.x + 15, a.y + 1); ctx.stroke()
    } else {
      drawPerson(a.x, a.y, '#7F77DD', morale, a.state !== 'waiting', a.item)
      // Magnifying glass
      ctx.strokeStyle = '#534AB7'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.arc(a.x + 9, a.y - 2, 3.5, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(a.x + 11.5, a.y + 0.5); ctx.lineTo(a.x + 14, a.y + 3); ctx.stroke()
    }
  })

  // Carried items (drawn on top)
  workers.concat(reviewers).forEach(a => {
    if (a.item) {
      ctx.fillStyle = a.item.defect ? '#E24B4A' : '#5DCAA5'
      ctx.fillRect(a.item.x - ITEM_W / 2, a.item.y, ITEM_W, ITEM_H)
    }
  })

  // Manager
  drawManager(scope)

  // Ship zone indicator
  ctx.strokeStyle = border
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.moveTo(w * SHIP_X, 20); ctx.lineTo(w * SHIP_X, beltY + 15); ctx.stroke()
  ctx.setLineDash([])
}

function drawPerson(x, y, color, morale, moving, carrying) {
  // Body
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill()
  // Head
  ctx.fillStyle = '#FAC775'
  ctx.beginPath(); ctx.arc(x, y - 10, 5, 0, Math.PI * 2); ctx.fill()
  // Eyes
  ctx.fillStyle = '#2C2C2A'
  ctx.beginPath(); ctx.arc(x - 2, y - 10.5, 0.8, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 2, y - 10.5, 0.8, 0, Math.PI * 2); ctx.fill()
  // Mouth
  ctx.strokeStyle = '#2C2C2A'; ctx.lineWidth = 0.8
  ctx.beginPath()
  if (morale > 70) ctx.arc(x, y - 7.5, 2.5, 0.1, Math.PI - 0.1)      // smile
  else if (morale > 45) { ctx.moveTo(x - 2, y - 7); ctx.lineTo(x + 2, y - 7) } // flat
  else ctx.arc(x, y - 5.5, 2.5, Math.PI + 0.2, -0.2)                  // frown
  ctx.stroke()
  // Sweat
  if (morale < 55) {
    ctx.fillStyle = '#378ADD'
    const bob = Math.sin(Date.now() / 200 + x) * 1.5
    ctx.beginPath(); ctx.arc(x + 5, y - 13 + bob, 1.2, 0, Math.PI * 2); ctx.fill()
  }
  // Legs
  ctx.strokeStyle = color; ctx.lineWidth = 1.5
  const step = moving ? Math.sin(Date.now() / 150 + x * 0.1) * 3 : 0
  ctx.beginPath(); ctx.moveTo(x - 2, y + 6); ctx.lineTo(x - 3 - step, y + 14); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 2, y + 6); ctx.lineTo(x + 3 + step, y + 14); ctx.stroke()
}

function drawRobot(x, y) {
  // Body
  ctx.fillStyle = '#9c9a92'
  ctx.fillRect(x - 6, y - 4, 12, 10)
  // Head
  ctx.fillStyle = '#73726c'
  ctx.fillRect(x - 5, y - 13, 10, 9)
  // Antenna
  ctx.strokeStyle = '#73726c'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x, y - 18); ctx.stroke()
  ctx.fillStyle = Math.sin(Date.now() / 300) > 0 ? '#E24B4A' : '#5DCAA5'
  ctx.beginPath(); ctx.arc(x, y - 18, 1.5, 0, Math.PI * 2); ctx.fill()
  // Eyes
  ctx.fillStyle = '#5DCAA5'
  ctx.fillRect(x - 3, y - 10, 2.5, 2.5)
  ctx.fillRect(x + 1, y - 10, 2.5, 2.5)
  // Treads
  ctx.fillStyle = '#73726c'
  ctx.fillRect(x - 7, y + 6, 5, 3)
  ctx.fillRect(x + 2, y + 6, 5, 3)
}

function drawFurnace(s, beltY) {
  const costPct = s.costPct || 100
  const burnRate = Math.max(0, (costPct - 100) / 100)
  const fy = h * FURNACE_Y
  const fx = 10

  // === FURNACE (bottom-left) ===
  // Body
  ctx.fillStyle = '#5a5a58'
  ctx.fillRect(fx, fy - 10, 40, 35)
  ctx.strokeStyle = '#3a3a38'
  ctx.lineWidth = 1.5
  ctx.strokeRect(fx, fy - 10, 40, 35)

  // Door opening
  ctx.fillStyle = burnRate > 0.3 ? '#E24B4A' : burnRate > 0.05 ? '#EF9F27' : '#3a3a38'
  ctx.fillRect(fx + 3, fy + 2, 14, 18)

  // Glow from door
  if (burnRate > 0.05) {
    ctx.globalAlpha = burnRate * 0.4
    ctx.fillStyle = '#EF9F27'
    ctx.beginPath(); ctx.arc(fx + 10, fy + 11, 12, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  }

  // Flames inside door
  if (burnRate > 0) {
    for (let i = 0; i < 4; i++) {
      const flx = fx + 5 + i * 3.5
      const flameH = 6 + burnRate * 12
      const wobble = Math.sin(Date.now() / 80 + i * 1.7) * 2
      ctx.fillStyle = i % 2 === 0 ? '#EF9F27' : '#E24B4A'
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 120 + i) * 0.3
      ctx.beginPath()
      ctx.moveTo(flx, fy + 18)
      ctx.quadraticCurveTo(flx + wobble, fy + 18 - flameH, flx + 2, fy + 18)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // Chimney
  ctx.fillStyle = '#5a5a58'
  ctx.fillRect(fx + 28, fy - 30, 8, 22)
  ctx.strokeStyle = '#3a3a38'
  ctx.strokeRect(fx + 28, fy - 30, 8, 22)

  // Smoke puffs from chimney
  const smokeCount = burnRate > 0.05 ? Math.min(5, Math.ceil(burnRate * 5)) : 0
  for (let i = 0; i < smokeCount; i++) {
    const age = ((frameCount * 2 + i * 17) % 60) / 60 // 0→1 lifecycle
    const sx = fx + 32 + Math.sin(Date.now() / 400 + i * 1.3) * (4 + age * 6)
    const sy = fy - 32 - age * 25
    const sr = 3 + age * 5
    ctx.fillStyle = '#9c9a92'
    ctx.globalAlpha = Math.max(0, 0.35 - age * 0.35)
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1

  // Dollar signs flying in from the left
  if (burnRate > 0) {
    ctx.font = 'bold 12px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = '#1D9E75'
    const speed = 0.3 + burnRate * 0.7 // faster money burn at higher cost
    const dollarCount = Math.min(5, Math.ceil(burnRate * 5))
    for (let i = 0; i < dollarCount; i++) {
      const phase = ((Date.now() * speed / 500) + i * 0.6) % 1
      const dx = -10 + phase * (fx + 12) // fly from off-screen left into furnace door
      const dy = fy + 8 + Math.sin(phase * Math.PI * 2) * 5
      ctx.globalAlpha = 0.3 + (1 - phase) * 0.7
      ctx.textAlign = 'center'
      ctx.fillText('$', dx, dy)
    }
    ctx.globalAlpha = 1
  }

  // Cost label
  ctx.font = 'bold 9px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = burnRate > 0.3 ? '#E24B4A' : burnRate > 0.05 ? '#EF9F27' : (cachedStyles || {}).hint || '#9c9a92'
  ctx.textAlign = 'center'
  ctx.fillText(`Cost: ${costPct}%`, fx + 20, fy + 35)

  // === DRIVE SHAFT connecting furnace to generator ===
  const gx = fx + 52
  const gy = fy + 2

  // Shaft (pipe from furnace to generator)
  ctx.fillStyle = '#5a5a58'
  ctx.fillRect(fx + 40, fy + 4, gx - fx - 40, 6)
  // Spinning cog on shaft
  const rot = Date.now() / (burnRate > 0 ? 150 : 3000)
  ctx.strokeStyle = '#9c9a92'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 4; i++) {
    const a = rot + i * Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(fx + 45 + Math.cos(a) * 2, fy + 7 + Math.sin(a) * 2)
    ctx.lineTo(fx + 45 + Math.cos(a) * 5, fy + 7 + Math.sin(a) * 5)
    ctx.stroke()
  }

  // === GENERATOR ===
  // Body
  ctx.fillStyle = '#73726c'
  ctx.fillRect(gx, gy - 8, 24, 26)
  ctx.strokeStyle = '#4a4a48'
  ctx.lineWidth = 1
  ctx.strokeRect(gx, gy - 8, 24, 26)

  // Spinning rotor
  ctx.strokeStyle = burnRate > 0 ? '#EF9F27' : '#9c9a92'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(gx + 12, gy + 5, 8, rot, rot + Math.PI * 1.4)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(gx + 12, gy + 5, 8, rot + Math.PI, rot + Math.PI + Math.PI * 1.4)
  ctx.stroke()
  ctx.fillStyle = burnRate > 0 ? '#EF9F27' : '#9c9a92'
  ctx.beginPath(); ctx.arc(gx + 12, gy + 5, 2.5, 0, Math.PI * 2); ctx.fill()

  // ⚡ label
  ctx.font = 'bold 9px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = burnRate > 0 ? '#EF9F27' : '#9c9a92'
  ctx.textAlign = 'center'
  ctx.fillText('⚡', gx + 12, gy + 22)

  // === ANIMATED LIGHTNING BOLT from generator up to belt ===
  if (burnRate > 0) {
    const boltX = gx + 12
    const boltTop = beltY + 14
    const boltBot = gy - 8
    const boltH = boltBot - boltTop
    // Animated position — bolt travels upward
    const boltPhase = ((Date.now() / (300 - burnRate * 150)) % 1)
    const boltY = boltBot - boltPhase * boltH

    ctx.strokeStyle = '#EF9F27'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.8
    // Zigzag bolt shape
    ctx.beginPath()
    ctx.moveTo(boltX, boltY)
    ctx.lineTo(boltX - 4, boltY - 6)
    ctx.lineTo(boltX + 4, boltY - 10)
    ctx.lineTo(boltX - 2, boltY - 16)
    ctx.lineTo(boltX + 3, boltY - 20)
    ctx.stroke()
    // Glow
    ctx.globalAlpha = 0.3
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.lineWidth = 1

    // Static wire from generator to belt
    ctx.strokeStyle = '#9c9a92'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.moveTo(boltX, boltBot)
    ctx.lineTo(boltX, boltTop)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  } else {
    // Disconnected wire when no power
    const boltX = gx + 12
    ctx.strokeStyle = '#9c9a92'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.globalAlpha = 0.15
    ctx.beginPath()
    ctx.moveTo(boltX, gy - 8)
    ctx.lineTo(boltX, beltY + 14)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }
}

function drawDebtPit(debt, beltY) {
  const pitX = w * DEBT_PIT_X - 15
  const pitW = 50
  const belowBelt = h - beltY - 14
  const pitTop = beltY + 14 + belowBelt * 0.25 // 1/4 down from belt
  const pitH = h - pitTop - 8

  // Pit outline
  ctx.strokeStyle = '#D85A30'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.globalAlpha = 0.4
  ctx.strokeRect(pitX, pitTop, pitW, pitH)
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  // Fill level proportional to debt
  const fillH = pitH * (debt / 100)
  if (fillH > 0) {
    // Gradient from amber to red
    const fillColor = debt > 60 ? '#E24B4A' : debt > 30 ? '#D85A30' : '#EF9F27'
    ctx.fillStyle = fillColor
    ctx.globalAlpha = 0.5
    ctx.fillRect(pitX + 1, pitTop + pitH - fillH, pitW - 2, fillH)
    ctx.globalAlpha = 1

    // Individual boxes in the pile
    const boxCount = Math.min(20, Math.round(debt * 0.2))
    for (let i = 0; i < boxCount; i++) {
      const bx = pitX + 4 + (i % 4) * 11
      const by = pitTop + pitH - 5 - Math.floor(i / 4) * 7
      if (by < pitTop) continue
      ctx.fillStyle = i % 3 === 0 ? '#E24B4A' : '#D85A30'
      ctx.globalAlpha = 0.8
      ctx.fillRect(bx, by, 8, 5)
      ctx.globalAlpha = 1
    }
  }

  // Label
  ctx.font = 'bold 9px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = debt > 50 ? '#E24B4A' : debt > 20 ? '#D85A30' : ((cachedStyles || {}).hint || '#9c9a92')
  ctx.textAlign = 'center'
  ctx.fillText(debt > 0 ? `Debt: ${Math.round(debt)}%` : 'Debt pit', pitX + pitW / 2, pitTop - 4)

  // Arrow from belt end down to pit
  if (debt > 5) {
    ctx.strokeStyle = '#D85A30'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.4
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(w * DEBT_PIT_X, beltY + 14)
    ctx.lineTo(w * DEBT_PIT_X, pitTop)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }
}

function drawMgmtRobot(x, y) {
  // Body — teal tinted
  ctx.fillStyle = '#1D9E75'
  ctx.fillRect(x - 5, y - 3, 10, 10)
  // Head
  ctx.fillStyle = '#0F6E56'
  ctx.fillRect(x - 4, y - 11, 8, 8)
  // Antenna
  ctx.strokeStyle = '#0F6E56'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y - 16); ctx.stroke()
  ctx.fillStyle = '#5DCAA5'
  ctx.beginPath(); ctx.arc(x, y - 16, 1.5, 0, Math.PI * 2); ctx.fill()
  // Eyes
  ctx.fillStyle = '#5DCAA5'
  ctx.fillRect(x - 3, y - 8, 2, 2)
  ctx.fillRect(x + 1, y - 8, 2, 2)
  // Clipboard
  ctx.fillStyle = '#FAC775'
  ctx.fillRect(x + 6, y - 6, 5, 7)
  ctx.strokeStyle = '#BA7517'; ctx.lineWidth = 0.5
  ctx.strokeRect(x + 6, y - 6, 5, 7)
  // Lines on clipboard
  ctx.strokeStyle = '#BA7517'; ctx.lineWidth = 0.5
  ctx.beginPath(); ctx.moveTo(x + 7, y - 3); ctx.lineTo(x + 10, y - 3); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 7, y - 1); ctx.lineTo(x + 10, y - 1); ctx.stroke()
  // Treads
  ctx.fillStyle = '#0F6E56'
  ctx.fillRect(x - 6, y + 7, 4, 3)
  ctx.fillRect(x + 2, y + 7, 4, 3)
}

function drawManager(scope) {
  const x = manager.x
  const y = h * BELT_Y - 22
  // Management robots calm the manager — effective scope pressure is reduced
  const calmFactor = Math.max(0, 1 - mgmtRobotCount * 0.25) // each robot reduces anger 25%
  const effectiveScope = scope * calmFactor
  const angry = effectiveScope > 60

  // Draw management robots trailing the manager
  for (let i = 0; i < mgmtRobotCount; i++) {
    const rx = x - 20 - i * 22 // trail behind
    const ry = y + 2
    drawMgmtRobot(rx, ry)
  }

  // Body
  ctx.fillStyle = angry ? '#C0392B' : '#2C2C2A'
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill()
  // Head
  ctx.fillStyle = angry ? '#E8A0A0' : '#FAC775'
  ctx.beginPath(); ctx.arc(x, y - 12, 6, 0, Math.PI * 2); ctx.fill()
  // Eyes
  ctx.fillStyle = '#2C2C2A'
  ctx.beginPath(); ctx.arc(x - 2.5, y - 12.5, 1, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 2.5, y - 12.5, 1, 0, Math.PI * 2); ctx.fill()
  // Mouth — calmer with management robots
  if (effectiveScope > 50) {
    ctx.fillStyle = '#2C2C2A'
    ctx.beginPath(); ctx.ellipse(x, y - 8.5, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill()
  } else if (mgmtRobotCount > 0 && scope > 30) {
    // Has robots helping — neutral instead of yelling
    ctx.strokeStyle = '#2C2C2A'; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.moveTo(x - 2, y - 9); ctx.lineTo(x + 2, y - 9); ctx.stroke()
  } else {
    ctx.strokeStyle = '#2C2C2A'; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.moveTo(x - 2, y - 9); ctx.lineTo(x + 2, y - 9); ctx.stroke()
  }
  // Legs
  ctx.strokeStyle = angry ? '#C0392B' : '#2C2C2A'; ctx.lineWidth = 2
  const step = Math.sin(Date.now() / 100) * 4
  ctx.beginPath(); ctx.moveTo(x - 3, y + 7); ctx.lineTo(x - 4 - step, y + 17); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y + 7); ctx.lineTo(x + 4 + step, y + 17); ctx.stroke()

  // Speech bubble — uses effectiveScope (calmed by management robots)
  if (effectiveScope > 10) {
    const yellsLow = ['keep going', 'chop chop', 'let\'s go', 'come on', 'hustle']
    const yellsMed = ['FASTER!', 'MOVE IT!', 'SHIP IT!', 'MUSH!', 'GO GO GO!', 'HURRY!']
    const yellsHigh = ['MORE!!', 'NOW!!!', 'SHIP IT!!', 'FASTER!!!', 'DO MORE!!', 'WHY SO SLOW?!']
    const yellsMax = ['🔥🔥🔥', 'EVERYTHING!!', 'YESTERDAY!!!', 'NOT ENOUGH!!', 'AI FASTER!!', 'MUSH MUSH!!']
    const yellsCalm = ['on track', 'looking good', 'nice work', 'carry on', 'steady']
    const cycle = Math.floor(frameCount / 20)
    const pick = (arr) => arr[cycle % arr.length]
    const text = mgmtRobotCount >= 3 && scope < 80 ? pick(yellsCalm)
      : effectiveScope > 90 ? pick(yellsMax)
      : effectiveScope > 60 ? pick(yellsHigh)
      : effectiveScope > 30 ? pick(yellsMed)
      : pick(yellsLow)
    const fontSize = effectiveScope > 60 ? 11 : 9
    ctx.font = `bold ${fontSize}px "DM Sans", system-ui, sans-serif`
    const tw = ctx.measureText(text).width + 8
    const bx = x, by = y - 26

    // Bubble background
    ctx.fillStyle = (cachedStyles || {}).cardBg || '#FFFFFF'
    const bubbleColor = mgmtRobotCount >= 3 && scope < 80 ? '#1D9E75' : angry ? '#E24B4A' : '#EF9F27'
    ctx.strokeStyle = bubbleColor
    ctx.lineWidth = 1
    roundRect(bx - tw / 2, by - 8, tw, 14, 4)
    ctx.fill(); ctx.stroke()

    // Bubble tail
    ctx.fillStyle = (cachedStyles || {}).cardBg || '#FFFFFF'
    ctx.beginPath(); ctx.moveTo(x - 3, by + 6); ctx.lineTo(x, by + 10); ctx.lineTo(x + 3, by + 6); ctx.fill()

    // Text
    ctx.fillStyle = bubbleColor
    ctx.textAlign = 'center'
    ctx.fillText(text, bx, by + 3)
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function setFactoryPaused(p) { paused = p }

export { initFactory, updateFactory, setFactoryPaused }
