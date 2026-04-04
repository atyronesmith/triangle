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
let manager = { x: 0, dir: 1 }
let simState = { ai: 0, totalScope: 0, review: 10, teamMorale: 100, techDebt: 0 }
let frameCount = 0

const BELT_Y = 0.62      // conveyor belt vertical position
const ITEM_W = 12
const ITEM_H = 10
const PICKUP_START = 0.15 // where first worker stands
const PICKUP_END = 0.48   // end of pickup zone — items that pass here fall
const REVIEW_X = 0.65     // where reviewers stand
const SHIP_X = 0.88       // items ship off here

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
  w = r.width; h = 150
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

function updateFactory(state) {
  simState = state
  // Adjust robot count
  const targetRobots = Math.floor((state.ai || 0) / 12)
  const currentRobots = workers.filter(a => a.type === 'robot').length
  if (targetRobots > currentRobots) {
    for (let i = 0; i < targetRobots - currentRobots; i++) {
      const slot = workers.length
      workers.push({
        type: 'robot',
        homeX: w * (PICKUP_START + slot * 0.08),
        x: w * (PICKUP_START + slot * 0.08),
        y: h * BELT_Y - 20,
        state: 'waiting',
        targetX: 0,
        item: null,
        speed: 2.0,
      })
    }
  } else if (targetRobots < currentRobots) {
    let drop = currentRobots - targetRobots
    workers = workers.filter(a => {
      if (a.type === 'robot' && a.state === 'waiting' && drop > 0) { drop--; return false }
      return true
    })
  }
}

function tick() {
  frameCount++
  update()
  draw()
  requestAnimationFrame(tick)
}

function update() {
  const s = simState
  const scope = s.totalScope || 0
  const ai = s.ai || 0
  const beltSpeed = 0.6 + scope * 0.008 + ai * 0.005

  // Spawn items on conveyor at rate driven by scope + AI
  const spawnRate = 0.02 + scope * 0.0008 + ai * 0.0006
  if (Math.random() < spawnRate) {
    const defect = Math.random() < (ai > 10 ? 0.1 + ai * 0.003 : 0.03)
    beltItems.push({ x: -ITEM_W, y: h * BELT_Y + 4, defect, onBelt: true })
  }

  // Move belt items
  beltItems.forEach(item => {
    if (item.onBelt) item.x += beltSpeed
  })

  // Items that pass the pickup zone without being grabbed → fall to debt pile
  beltItems = beltItems.filter(item => {
    if (item.onBelt && item.x > w * PICKUP_END) {
      // Fell off — tech debt
      debtPile.push({
        x: w * PICKUP_END + 5 + Math.random() * 30,
        y: h * BELT_Y + 16 + debtPile.length * 0.3,
        defect: item.defect,
        age: 0,
      })
      return false
    }
    return true
  })

  // Cap debt pile visually (old items fade)
  if (debtPile.length > 40) debtPile = debtPile.slice(-40)
  debtPile.forEach(d => d.age++)

  // Workers grab items from belt
  workers.forEach(agent => {
    if (agent.state === 'waiting') {
      // Look for nearest belt item near my position
      const item = beltItems.find(i =>
        i.onBelt && Math.abs(i.x - agent.homeX) < 25 && !i.claimed
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
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 1.5)
      if (agent.item) {
        agent.item.x = agent.x
        agent.item.y = agent.y - 8
      }
      if (Math.abs(dx) < 3) {
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
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 1.8)
      if (Math.abs(dx) < 3) { agent.x = agent.homeX; agent.state = 'waiting' }
    }
  })

  // Reviewers pick up review items and ship
  reviewers.forEach(agent => {
    if (agent.state === 'waiting') {
      const item = reviewItems.find(i => i.staged && !i.claimed)
      if (item) {
        item.claimed = true
        item.staged = false
        agent.item = item
        agent.state = 'carrying'
        agent.targetX = w * SHIP_X + Math.random() * 15
      }
    } else if (agent.state === 'carrying') {
      const dx = agent.targetX - agent.x
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed)
      if (agent.item) {
        agent.item.x = agent.x
        agent.item.y = agent.y - 8
      }
      if (Math.abs(dx) < 3) {
        agent.item = null
        agent.state = 'returning'
        agent.targetX = agent.homeX
      }
    } else if (agent.state === 'returning') {
      const dx = agent.targetX - agent.x
      agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * 1.5)
      if (Math.abs(dx) < 3) { agent.x = agent.homeX; agent.state = 'waiting' }
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
  const cs = getComputedStyle(document.documentElement)
  const hint = cs.getPropertyValue('--text-hint')
  const border = cs.getPropertyValue('--border')
  const cardBg = cs.getPropertyValue('--bg-card')

  // Zone labels
  ctx.font = '9px "DM Sans", system-ui, sans-serif'
  ctx.fillStyle = hint
  ctx.textAlign = 'center'
  ctx.fillText('PRODUCTION', w * 0.3, 14)
  ctx.fillText('REVIEW', w * REVIEW_X, 14)
  ctx.fillText('SHIPPED →', w * 0.92, 14)
  if (debtPile.length > 3) ctx.fillText('DEBT ↓', w * (PICKUP_END + 0.03), 14)

  // Conveyor belt
  ctx.strokeStyle = '#9c9a92'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, beltY + 12); ctx.lineTo(w * PICKUP_END + 10, beltY + 12); ctx.stroke()
  // Belt rollers
  for (let x = 10; x < w * PICKUP_END; x += 18) {
    ctx.fillStyle = '#73726c'
    ctx.beginPath(); ctx.arc(x, beltY + 12, 3, 0, Math.PI * 2); ctx.fill()
  }

  // Debt pile
  debtPile.forEach(d => {
    const alpha = Math.max(0.3, 1 - d.age * 0.005)
    ctx.globalAlpha = alpha
    ctx.fillStyle = d.defect ? '#E24B4A' : '#D85A30'
    ctx.fillRect(d.x, Math.min(d.y, beltY + 35), ITEM_W * 0.8, ITEM_H * 0.8)
    ctx.globalAlpha = 1
  })

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
    drawPerson(a.x, a.y, '#7F77DD', morale, a.state !== 'waiting', a.item)
    // Magnifying glass
    ctx.strokeStyle = '#534AB7'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(a.x + 9, a.y - 2, 3.5, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(a.x + 11.5, a.y + 0.5); ctx.lineTo(a.x + 14, a.y + 3); ctx.stroke()
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

function drawManager(scope) {
  const x = manager.x
  const y = h * BELT_Y - 22
  const angry = scope > 60

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
  // Mouth
  if (scope > 50) {
    // Yelling
    ctx.fillStyle = '#2C2C2A'
    ctx.beginPath(); ctx.ellipse(x, y - 8.5, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.strokeStyle = '#2C2C2A'; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.moveTo(x - 2, y - 9); ctx.lineTo(x + 2, y - 9); ctx.stroke()
  }
  // Legs
  ctx.strokeStyle = angry ? '#C0392B' : '#2C2C2A'; ctx.lineWidth = 2
  const step = Math.sin(Date.now() / 100) * 4
  ctx.beginPath(); ctx.moveTo(x - 3, y + 7); ctx.lineTo(x - 4 - step, y + 17); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 3, y + 7); ctx.lineTo(x + 4 + step, y + 17); ctx.stroke()

  // Speech bubble
  if (scope > 10) {
    const text = scope > 80 ? '!!!' : scope > 50 ? 'MORE!!' : scope > 25 ? 'FASTER!' : '...'
    const fontSize = scope > 60 ? 11 : 9
    ctx.font = `bold ${fontSize}px "DM Sans", system-ui, sans-serif`
    const tw = ctx.measureText(text).width + 8
    const bx = x, by = y - 26

    // Bubble background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card')
    ctx.strokeStyle = angry ? '#E24B4A' : '#EF9F27'
    ctx.lineWidth = 1
    roundRect(bx - tw / 2, by - 8, tw, 14, 4)
    ctx.fill(); ctx.stroke()

    // Bubble tail
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card')
    ctx.beginPath(); ctx.moveTo(x - 3, by + 6); ctx.lineTo(x, by + 10); ctx.lineTo(x + 3, by + 6); ctx.fill()

    // Text
    ctx.fillStyle = angry ? '#E24B4A' : '#EF9F27'
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

export { initFactory, updateFactory }
