/**
 * Goodhart's Law Dashboard
 *
 * "When a measure becomes a target, it ceases to be a good measure."
 *
 * Split display: what leadership sees (cherry-picked, lagging vanity metrics)
 * vs what's actually happening (real metrics). The disconnect IS Goodhart's Law.
 *
 * Vanity metrics intentionally lag 3-4 ticks so death-march looks amazing
 * initially. They also have a flattering floor — they never show decline
 * even when quality craters.
 */

const LAG_SIZE = 4
let lagBuffer = []   // stores last N state snapshots for lagging
let cardEl = null
let prevVanity = null

export function initGoodhart() {
  cardEl = document.getElementById('goodhart-card')
}

export function resetGoodhart() {
  lagBuffer = []
  prevVanity = null
  if (cardEl) renderCard(null, null, 0)
}

export function updateGoodhart(state) {
  if (!cardEl) return

  // Push current state into lag buffer
  lagBuffer.push({
    aiGen: state.aiGen || 0,
    quality: state.quality || 100,
    techDebt: state.techDebt || 0,
    teamMorale: state.teamMorale || 100,
    actualR: state.actualR || 1,
    scopePct: state.scopePct || 100,
    costPct: state.costPct || 100,
    effectiveReview: state.effectiveReview || 10,
    totalScope: state.totalScope || 0,
    perceivedBoostPct: state.perceivedBoostPct || 0,
  })
  if (lagBuffer.length > LAG_SIZE) lagBuffer.shift()

  // Vanity metrics use the LAGGED state (3-4 ticks behind)
  const lagged = lagBuffer[0] // oldest in buffer = most lagged

  // Current reality
  const reality = {
    quality: state.quality || 100,
    debt: Math.round(state.techDebt || 0),
    morale: Math.round(state.teamMorale || 100),
    reworkRate: Math.round(Math.max(0, 100 - (state.quality || 100)) * 0.7),
  }

  // Vanity metrics — cherry-picked to look good, with flattering floors
  const vanity = computeVanity(lagged, state)
  prevVanity = vanity

  // Disconnect score: how far apart are vanity and reality?
  const vanityScore = (vanity.prsPerWeek / 50 + vanity.velocity / 100 + vanity.deploys / 30 + (100 - vanity.costPerFeature) / 100) / 4 * 100
  const realityScore = (reality.quality + (100 - reality.debt) + reality.morale) / 3
  const disconnect = Math.round(Math.abs(vanityScore - realityScore))

  renderCard(vanity, reality, disconnect)
}

function computeVanity(lagged, current) {
  const aiGen = lagged.aiGen
  const scope = lagged.totalScope

  // PRs per week — always looks good. More AI = more PRs. Never drops below 8.
  const prsPerWeek = Math.max(8, Math.round(8 + aiGen * 0.5 + scope * 0.15))

  // Velocity points — uses perceived boost (inflated). Floor of 20.
  const velocity = Math.max(20, Math.round(20 + (lagged.perceivedBoostPct || 0) * 0.8 + scope * 0.3))

  // Deploy frequency — more AI = more deploys. Always trending up.
  const deploys = Math.max(4, Math.round(4 + aiGen * 0.3 + scope * 0.05))

  // Cost per feature — goes DOWN with AI (looks great to leadership).
  // Uses perceived efficiency, ignores hidden costs.
  const costPerFeature = Math.max(20, Math.round(100 - aiGen * 0.6 - (lagged.perceivedBoostPct || 0) * 0.3))

  // Code output (KLOC/week) — raw generation volume.
  const codeOutput = Math.max(2, Math.round(2 + aiGen * 0.15 + scope * 0.05))

  return { prsPerWeek, velocity, deploys, costPerFeature, codeOutput }
}

function trend(current, label) {
  // Simple up/down/flat indicator
  return label === 'costPerFeature'
    ? (current < 80 ? '↓' : '→')  // cost going down looks good
    : (current > 15 ? '↑' : '→')
}

function renderCard(vanity, reality, disconnect) {
  if (!cardEl) return

  if (!vanity || !reality) {
    cardEl.innerHTML = `
      <div class="goodhart-split">
        <div class="goodhart-panel goodhart-vanity">
          <div class="goodhart-panel-title">What Leadership Sees</div>
          <div class="goodhart-empty">Waiting for data...</div>
        </div>
        <div class="goodhart-panel goodhart-reality">
          <div class="goodhart-panel-title">What's Actually Happening</div>
          <div class="goodhart-empty">Waiting for data...</div>
        </div>
      </div>`
    return
  }

  const disconnectColor = disconnect > 40 ? '#E24B4A' : disconnect > 20 ? '#EF9F27' : '#1D9E75'

  cardEl.innerHTML = `
    <div class="goodhart-split">
      <div class="goodhart-panel goodhart-vanity">
        <div class="goodhart-panel-title">What Leadership Sees</div>
        ${vanityRow('PRs / week', vanity.prsPerWeek, '↑', '#1D9E75')}
        ${vanityRow('Velocity pts', vanity.velocity, '↑', '#1D9E75')}
        ${vanityRow('Deploys / wk', vanity.deploys, '↑', '#1D9E75')}
        ${vanityRow('Code output (KLOC)', vanity.codeOutput, '↑', '#1D9E75')}
        ${vanityRow('Cost / feature', vanity.costPerFeature + '%', '↓', '#1D9E75')}
      </div>
      <div class="goodhart-panel goodhart-reality">
        <div class="goodhart-panel-title">What's Actually Happening</div>
        ${realityRow('Quality', reality.quality + '%', reality.quality)}
        ${realityRow('Tech debt', reality.debt + '%', 100 - reality.debt)}
        ${realityRow('Team morale', reality.morale + '%', reality.morale)}
        ${realityRow('Rework rate', reality.reworkRate + '%', 100 - reality.reworkRate)}
      </div>
    </div>
    <div class="goodhart-disconnect" style="color:${disconnectColor}">
      Dashboard–Reality Gap: <strong>${disconnect}%</strong>
      ${disconnect > 40 ? ' — Goodhart\'s Law in full effect' : disconnect > 20 ? ' — metrics diverging from outcomes' : ' — aligned'}
    </div>`
}

function vanityRow(label, value, arrow, color) {
  return `<div class="goodhart-row">
    <span class="goodhart-label">${label}</span>
    <span class="goodhart-value" style="color:${color}">${value} <span class="goodhart-arrow">${arrow}</span></span>
  </div>`
}

function realityRow(label, value, health) {
  const color = health >= 70 ? '#1D9E75' : health >= 40 ? '#EF9F27' : '#E24B4A'
  const arrow = health >= 70 ? '→' : health >= 40 ? '↓' : '↓↓'
  return `<div class="goodhart-row">
    <span class="goodhart-label">${label}</span>
    <span class="goodhart-value" style="color:${color}">${value} <span class="goodhart-arrow">${arrow}</span></span>
  </div>`
}
