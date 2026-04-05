/**
 * Guided onboarding walkthrough — 7 steps, under 2 minutes.
 *
 * Teaches through doing: applies presets, moves sliders, pauses/resumes
 * the simulation, and narrates via the dialog panel. Spotlight effect
 * highlights relevant UI elements at each step.
 *
 * Interacts with main.js entirely through DOM events — no import coupling.
 */

import { addEntry } from './dialog.js'

// ===== DOM HELPERS =====

function setSlider(id, value) {
  const el = document.getElementById(id)
  if (!el) return
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function clickPreset(name) {
  const label = name.replace(/-/g, ' ')
  const btns = document.querySelectorAll('.preset-btn')
  for (const btn of btns) {
    if (btn.textContent.trim().toLowerCase() === label.toLowerCase()) {
      btn.click()
      return
    }
  }
}

function ensurePaused() {
  const btn = document.getElementById('sim-toggle')
  if (btn && btn.textContent.trim() === 'Pause') btn.click()
}

function ensureRunning() {
  const btn = document.getElementById('sim-toggle')
  if (btn && btn.textContent.trim() === 'Resume') btn.click()
}

function setSimSpeed(value) {
  const el = document.getElementById('sim-speed')
  if (!el) return
  el.value = value
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function getSimWeek() {
  const el = document.getElementById('sim-clock')
  if (!el) return 0
  const m = el.textContent.match(/Week\s+(\d+)/)
  return m ? parseInt(m[1]) : 0
}

function waitForWeek(targetWeek, callback) {
  const interval = setInterval(() => {
    if (getSimWeek() >= targetWeek) {
      clearInterval(interval)
      callback()
    }
  }, 300)
  return () => clearInterval(interval)
}

function listenForPresetClick(name, callback) {
  const label = name.replace(/-/g, ' ')
  const handler = (e) => {
    const btn = e.target.closest('.preset-btn')
    if (btn && btn.textContent.trim().toLowerCase() === label.toLowerCase()) {
      document.removeEventListener('click', handler, true)
      setTimeout(callback, 100)
    }
  }
  document.addEventListener('click', handler, true)
  return () => document.removeEventListener('click', handler, true)
}

function listenForSlider(id, conditionFn, callback) {
  const el = document.getElementById(id)
  if (!el) return () => {}
  const handler = () => {
    if (conditionFn(+el.value)) {
      el.removeEventListener('input', handler)
      setTimeout(callback, 300)
    }
  }
  el.addEventListener('input', handler)
  return () => el.removeEventListener('input', handler)
}

// ===== SPOTLIGHT =====

let spotlitEls = []

function spotlight(selectors) {
  clearSpotlight()
  const sels = Array.isArray(selectors) ? selectors : [selectors]
  sels.forEach((sel, i) => {
    const el = document.querySelector(sel)
    if (!el) return
    el.classList.add('onboard-spotlight')
    if (i === 0) el.classList.add('onboard-spotlight-primary')
    spotlitEls.push(el)
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function clearSpotlight() {
  spotlitEls.forEach(el => {
    el.classList.remove('onboard-spotlight', 'onboard-spotlight-primary')
  })
  spotlitEls = []
}

// ===== NARRATION =====

function narrate(msg) {
  addEntry('onboard', msg)
}

// ===== NAV BAR =====

let navEl = null
let onNextCallback = null

function createNav(totalSteps) {
  if (navEl) navEl.remove()
  navEl = document.createElement('div')
  navEl.className = 'onboard-nav'

  const skip = document.createElement('button')
  skip.className = 'onboard-skip'
  skip.textContent = 'Skip tour'
  skip.addEventListener('click', endOnboarding)

  const dots = document.createElement('div')
  dots.className = 'onboard-dots'
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.createElement('div')
    dot.className = 'onboard-dot'
    dots.appendChild(dot)
  }

  const next = document.createElement('button')
  next.className = 'onboard-next'
  next.textContent = 'Next'
  next.addEventListener('click', () => { if (onNextCallback) onNextCallback() })

  navEl.appendChild(skip)
  navEl.appendChild(dots)
  navEl.appendChild(next)
  document.body.appendChild(navEl)
}

function updateNav(stepIndex, totalSteps, advance) {
  if (!navEl) return
  const dots = navEl.querySelectorAll('.onboard-dot')
  dots.forEach((d, i) => {
    d.className = 'onboard-dot' + (i < stepIndex ? ' done' : i === stepIndex ? ' active' : '')
  })
  const next = navEl.querySelector('.onboard-next')
  if (advance === 'finish') {
    next.textContent = 'Finish'
  } else if (advance === 'next') {
    next.textContent = 'Next'
    next.style.display = ''
  } else {
    // auto or user-action — hide next button
    next.style.display = 'none'
  }
}

function removeNav() {
  if (navEl) { navEl.remove(); navEl = null }
}

// ===== STEPS =====

const STEPS = [
  {
    // Step 1: The Iron Triangle
    highlight: ['#tri'],
    advance: 'next',
    setup() {
      clickPreset('baseline')
      ensurePaused()
      setSimSpeed('2000')
    },
    narration: `<strong>Welcome to the Iron Triangle simulator.</strong> The <strong style="color:#5DCAA5">green triangle</strong> is your team's baseline capacity — scope, cost, and time in balance. No AI, no pressure, no debt. Everything at equilibrium. <em>Click Next to add AI and see what happens.</em>`,
  },
  {
    // Step 2: AI shifts the frontier
    highlight: ['.left-panel .controls-col:nth-child(2) .ctrl-group:first-child', '#tri'],
    advance: 'next',
    setup() {
      setSlider('ai-gen', 40)
    },
    narration: `AI generation is now at 40%. The <strong style="color:#378ADD">blue triangle</strong> expanded beyond green — that's the theoretical AI frontier. But the <strong style="color:#E24B4A">red triangle</strong> is smaller than blue. That gap is Amdahl's serial bottleneck, overhead, and hidden costs. <em>The blue promise is never the red reality. Click Next.</em>`,
  },
  {
    // Step 3: Time passes, things compound
    highlight: ['.sim-clock', '.debt-bar', '.health-bar'],
    advance: 'auto',
    setup(ctx) {
      setSlider('review', 5)
      ensureRunning()
      setSimSpeed('500')
      ctx.cleanup = waitForWeek(15, () => {
        ensurePaused()
        ctx.autoAdvance()
      })
    },
    narration: `Review is set to just 5% — AI output is shipping without oversight. Watch the simulation run for 15 weeks. The <strong style="color:#EF9F27">debt bar</strong> will climb and <strong style="color:#1D9E75">morale</strong> will start to drop. <em>This is the J-curve — it looks fine at first...</em>`,
  },
  {
    // Step 4: Presets
    highlight: ['#presets'],
    advance: 'preset-click',
    setup(ctx) {
      ensurePaused()
      ctx.cleanup = listenForPresetClick('sweet-spot', () => ctx.autoAdvance())
    },
    narration: `See? Debt climbed to ${document.getElementById('d-pct')?.textContent || '??'}. That happened silently. <strong>Presets</strong> let you jump to pre-configured scenarios instantly. <em>Click the "sweet spot" preset below to see a sustainable configuration.</em>`,
  },
  {
    // Step 5: Feedback loops
    highlight: ['.quality-bar', '.debt-bar', '.jevons-bar', '.health-bar', '.experience-bar'],
    advance: 'auto',
    setup(ctx) {
      ensureRunning()
      setSimSpeed('1000')
      ctx.cleanup = waitForWeek(20, () => {
        ensurePaused()
        ctx.autoAdvance()
      })
    },
    narration: `"Sweet spot" balances AI with review. Watch 20 weeks: <strong>debt</strong> stays low, <strong>morale</strong> holds, <strong>experience</strong> builds (purple bar). Three forces compound automatically — you set the conditions, the simulation shows the trajectory.`,
  },
  {
    // Step 6: Try breaking it
    highlight: ['.left-panel .controls-col:nth-child(2) .ctrl-group:nth-child(4)'],
    advance: 'slider',
    setup(ctx) {
      ensureRunning()
      setSimSpeed('2000')
      ctx.cleanup = listenForSlider('scope-push', v => v >= 70, () => {
        ensurePaused()
        ctx.autoAdvance()
      })
    },
    narration: `Now you drive. <strong>Drag the "Management scope push" slider to 80% or higher.</strong> The <strong style="color:#F5A623">amber triangle</strong> shows what management demands. When it exceeds capacity, quality absorbs the gap.`,
  },
  {
    // Step 7: Go deeper
    highlight: ['.prose-tabs .tab-nav'],
    advance: 'finish',
    setup() {
      ensureRunning()
      setSimSpeed('2000')
    },
    narration: `<strong>Tour complete.</strong> Explore on your own: the <strong>tabs below</strong> cover Amdahl's Law, Jevons Paradox, Goodhart's Law, and the empirical evidence. The <strong>factory floor</strong> visualizes your team. The <strong>Simulate incident</strong> button tests resilience. Try "death march" preset and watch everything collapse. <em>Have fun breaking things.</em>`,
  },
]

// ===== ENGINE =====

let currentStep = -1
let stepCleanup = null

function startOnboarding() {
  currentStep = -1
  clearSpotlight()
  createNav(STEPS.length)
  goToStep(0)
}

function goToStep(n) {
  // Clean up previous step
  if (stepCleanup) { stepCleanup(); stepCleanup = null }
  clearSpotlight()

  currentStep = n
  if (n >= STEPS.length) { endOnboarding(); return }

  const step = STEPS[n]
  const ctx = {
    cleanup: null,
    autoAdvance: () => goToStep(n + 1),
  }

  // Setup
  if (step.setup) step.setup(ctx)
  stepCleanup = () => { if (ctx.cleanup) ctx.cleanup() }

  // Highlight
  if (step.highlight) spotlight(step.highlight)

  // Narrate
  setTimeout(() => narrate(step.narration), 200)

  // Nav
  updateNav(n, STEPS.length, step.advance === 'finish' ? 'finish' : step.advance === 'next' ? 'next' : 'auto')

  // Wire next button
  if (step.advance === 'next' || step.advance === 'finish') {
    onNextCallback = () => {
      if (step.advance === 'finish') endOnboarding()
      else goToStep(n + 1)
    }
  } else {
    onNextCallback = null
  }
}

function endOnboarding() {
  if (stepCleanup) { stepCleanup(); stepCleanup = null }
  clearSpotlight()
  removeNav()
  localStorage.setItem('triangle-onboarding-done', '1')
  onNextCallback = null
  currentStep = -1
}

// ===== AUTO-START =====

// Don't auto-start if user arrived via shared link (URL has slider state)
const hasHashState = window.location.hash.length > 5

if (!hasHashState && !localStorage.getItem('triangle-onboarding-done')) {
  setTimeout(startOnboarding, 1000)
}

// Re-trigger button
document.getElementById('start-tour-btn')?.addEventListener('click', () => {
  startOnboarding()
})
