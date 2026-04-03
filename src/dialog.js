/**
 * Dialog log and change-analysis engine.
 */

import { getParadigmLabel } from './model.js'
import { DIALOG_MAX_ENTRIES } from './constants.js'

let entryCount = 0

export function addEntry(vertex, msg) {
  const d = document.getElementById('dialog')
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  entryCount++
  const el = document.createElement('div')
  el.className = 'dialog-entry'
  el.innerHTML = `<div class="dialog-ts">${ts} — #${entryCount}</div><div><span class="dialog-vertex ${vertex}">${vertex}</span><span class="dialog-msg">${msg}</span></div>`
  d.appendChild(el)
  d.scrollTop = d.scrollHeight
  if (d.children.length > DIALOG_MAX_ENTRIES) d.removeChild(d.firstChild)
}

export function clearDialog() {
  document.getElementById('dialog').innerHTML = ''
  entryCount = 0
  addEntry('system', 'Log cleared.')
}

/**
 * Analyze slider changes and emit contextual dialog entries.
 * `prevState` is null on first call. Returns the new prevState.
 */
export function analyzeChanges(s, prevState, techDebt, teamMorale) {
  if (!prevState) {
    addEntry('system', 'Baseline. Triangle at equilibrium. Quality 100%. Debt 0. Move sliders or tap a preset.')
    return { ...s }
  }

  const p = prevState
  const isO = s.paradigm > 50
  const isTB = s.paradigm > 80
  const pL = getParadigmLabel(s.paradigm)

  if (Math.abs(s.paradigm - p.paradigm) > 8) {
    if (isTB) {
      addEntry('counter', `<strong>Paradigm: ${pL}.</strong> Overhead drops sharply. Iteration is near-free. Review requirements fall as output quality rises intrinsically. Debt accumulates slower because AI output needs less remediation.`)
      addEntry('rebuttal', `<em>This assumes the improvement curve continues and harder tasks don't absorb all gains. Where on the sigmoid are we?</em>`)
    } else if (isO) {
      addEntry('counter', `<strong>Paradigm: ${pL}.</strong> AI does cognitive work, not just mechanical acceleration. Hidden costs shrink as teams learn. Production function is changing shape.`)
      addEntry('rebuttal', `<em>Generating is cheap. Evaluating correctly is not. You may be trading production cost for evaluation cost.</em>`)
    } else {
      addEntry('system', `<strong>Paradigm: ${pL}.</strong> Higher overhead, more review needed, debt accumulates faster at low review levels.`)
    }
  }

  if (Math.abs(s.ai - p.ai) > 3) {
    if (s.ai > p.ai) {
      addEntry('scope', `AI boost: ${s.ai}%. ${s.ai < 25 ? 'Modest gain — drafting and boilerplate accelerate.' : s.ai < 55 ? 'Substantial throughput increase.' : 'Approaching diminishing returns.'}`)
      if (s.ai > 30 && s.review < s.ai * 0.3) {
        addEntry('debt', `Review (${s.review}%) is below AI velocity (${s.ai}%). Technical debt is accumulating at ~${(s.ai * 0.02 * s.pp.debtRate * (1 - s.review / (s.ai * 0.5 + 5))).toFixed(2)}/tick. This will drag down effective capacity over time.`)
        if (isO) addEntry('counter', `In the optimistic model, debt rate is lower because AI output is intrinsically more correct. But it's not zero — even good AI output creates understanding gaps when shipped without review.`)
      }
      if (isTB && s.ai > 40) addEntry('counter', `At this level, AI isn't just speeding up existing work — it enables work that wouldn't have been attempted. New analyses, broader solution-space exploration. The production function has changed.`)
    } else {
      addEntry('scope', `AI boost reduced to ${s.ai}%. Capacity contracting.`)
    }
  }

  if (Math.abs(s.scope - p.scope) > 3) {
    const demanded = Math.round(s.mgmtR * 100), achievable = Math.round(s.actualR * 100)
    if (s.scope > p.scope) {
      if (demanded <= achievable) {
        addEntry('scope', `Scope ${s.scope}%. Demanded (${demanded}%) within capacity (${achievable}%). Triangle strained but holding.`)
        if (isO) addEntry('counter', `This is the point — AI creates genuine headroom. Triangle expanded, not broke.`)
      } else {
        addEntry('scope', `Scope ${s.scope}%. Management expects ${demanded}%, capacity is ${achievable}%. ${demanded - achievable}% gap.`)
        addEntry('quality', `Quality absorbing the gap. Currently ${s.quality}%.`)
        if (s.quality < 45) addEntry('quality', `<em>At ${s.quality}%, rework costs likely exceed productivity gains.</em>`)
        if (isTB) addEntry('counter', `Even in the optimistic model, scope can outrun capacity. The bull case doesn't mean "unlimited scope" — it means the frontier moved. Management just moved faster.`)
      }
    } else {
      addEntry('scope', `Scope eased to ${s.scope}%. Pressure relaxing.`)
    }
  }

  if (Math.abs(s.review - p.review) > 3) {
    if (s.review > p.review) {
      addEntry('cost', `Review up to ${s.review}%. Trading volume for reliability.`)
      if (techDebt > 20) addEntry('debt', `Higher review is slowing debt accumulation and paying down existing debt. Current debt: ${Math.round(techDebt)}.`)
      if (isTB && s.review > 30) addEntry('counter', `At high paradigm belief, this much review may be over-investing in a declining problem. Models are increasingly self-consistent.`)
    } else {
      addEntry('cost', `Review cut to ${s.review}%.`)
      if (s.ai > 25 && s.review < 15 && !isO) addEntry('quality', `<em>AI at ${s.ai}% with only ${s.review}% review. Unreviewed AI output has different failure modes — plausible-sounding errors that pass casual inspection. Debt will compound.</em>`)
    }
  }

  if (Math.abs(s.time - p.time) > 3) {
    if (s.time < p.time && s.time < 0) {
      addEntry('time', `Timeline compressed to ${100 + s.time}%.`)
      if (isO) {
        addEntry('counter', `AI genuinely compresses cycle time for generation-heavy tasks.`)
        addEntry('rebuttal', `<em>Generation compresses. Review, integration, and decision-making don't.</em>`)
      } else {
        addEntry('quality', `Time pressure degrades quality directly.`)
      }
    } else if (s.time > p.time) {
      addEntry('time', `Timeline extended to ${100 + s.time}%. More room for review and iteration.`)
    }
  }

  // Debt threshold alerts
  if (techDebt > 50 && (p._lastDebtAlert || 0) < 50) {
    addEntry('debt', `<strong>Tech debt at ${Math.round(techDebt)}%.</strong> Legacy AI-generated code is now actively dragging down velocity. Teams spend increasing time understanding, fixing, and refactoring old output. The "AI boost" is fighting itself.`)
    addEntry('system', `<em>This is the "fast now, slow later" inflection point. The debt accumulated during low-review periods is now a binding constraint. It won't resolve without dedicated remediation time — which means scope or timeline has to give.</em>`)
    prevState._lastDebtAlert = techDebt
  } else if (techDebt > 25 && (p._lastDebtAlert || 0) < 25) {
    addEntry('debt', `Tech debt at ${Math.round(techDebt)}. Starting to drag effective capacity. AI boost is ${Math.round(techDebt * 0.3)}% less effective than the slider suggests.`)
    prevState._lastDebtAlert = techDebt
  }

  if (s.quality < 30 && p.quality >= 30) {
    addEntry('quality', `<em>Quality below 30%. This is where the human cost becomes undeniable.</em>`)
    addEntry('morale', `At this quality level, people stop believing in what they're shipping. They know it's not good enough. They know leadership doesn't want to hear it. The cognitive dissonance — being told to "use AI to increase quality" while watching quality degrade — is corrosive. This isn't a metric problem. It's a trust problem.`)
  } else if (s.quality >= 80 && p.quality < 80) {
    addEntry('system', `Quality recovered above 80%. Sustainable — for now.`)
  }

  // Scope-morale interaction
  if (s.scope > 70 && s.scope > p.scope + 5 && teamMorale < 65) {
    addEntry('morale', `Scope is still increasing while team health is at ${Math.round(teamMorale)}. People hear "do more" when they're already drowning. The message leadership thinks they're sending ("AI will help") is not the message being received ("we don't care that you're struggling").`)
  }

  // Time compression morale
  if (s.time < -15 && s.time < p.time - 3 && teamMorale < 70) {
    addEntry('morale', `Timeline compression + low morale is the death spiral combination. Tight deadlines mean no slack for recovery. No slack means errors. Errors mean rework. Rework means tighter deadlines. The people still trying to do good work are being punished for it — every careful review delays the sprint.`)
  }

  // High AI + low review morale warning
  if (s.ai > 40 && s.review < 12 && teamMorale > 55 && teamMorale < 75 && p.ai <= 40) {
    addEntry('morale', `Your team is generating a lot of AI output with thin review. The experienced engineers see the risk but feel unable to slow things down. There's a name for this: moral injury — being required to do work you know isn't good enough, by people who don't understand why it matters.`)
  }

  if (s.quality >= 90 && s.scope >= 30 && isTB && !(p.quality >= 90 && p.scope >= 30 && p.paradigm > 80)) {
    addEntry('counter', `In the true-believer model, high scope with high quality is achievable. If this reflects reality, the triangle hasn't broken — but it's expanded enough to feel irrelevant.`)
    addEntry('rebuttal', `<em>Until something goes wrong. Resilience lives in the constraints you planned for, not the ones you assumed away. Hit "Simulate incident" to see.</em>`)
  }

  return { ...s, _lastDebtAlert: prevState._lastDebtAlert }
}
