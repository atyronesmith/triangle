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
  const demanded = Math.round(s.mgmtR * 100)
  const achievable = Math.round(s.actualR * 100)
  const gap = demanded - achievable
  const reviewRatio = s.ai > 0 ? s.review / (s.ai * 0.5 + 5) : 1

  // ===== PARADIGM SHIFTS =====
  if (Math.abs(s.paradigm - p.paradigm) > 8) {
    if (isTB) {
      addEntry('counter', `<strong>Paradigm: ${pL}.</strong> Overhead drops sharply. Iteration is near-free. Review requirements fall as output quality rises intrinsically. Debt accumulates slower because AI output needs less remediation.`)
      addEntry('rebuttal', `<em>This assumes the improvement curve continues and harder tasks don't absorb all gains. Where on the sigmoid are we? Every S-curve looks exponential until it doesn't.</em>`)
    } else if (isO) {
      addEntry('counter', `<strong>Paradigm: ${pL}.</strong> AI does cognitive work, not just mechanical acceleration. Hidden costs shrink as teams learn. Production function is changing shape — not just shifting along it.`)
      addEntry('rebuttal', `<em>Generating is cheap. Evaluating correctly is not. The hidden cost isn't in the tool — it's in the human attention required to verify output you didn't write and may not fully understand.</em>`)
    } else if (s.paradigm <= 20) {
      addEntry('system', `<strong>Paradigm: ${pL}.</strong> AI is a productivity tool, not a paradigm shift. Overhead is real — integration, prompt engineering, review, and debugging AI output all consume time that doesn't show up in "AI savings" metrics. Expect 15–30% of theoretical gains to vanish into hidden costs.`)
    } else {
      addEntry('system', `<strong>Paradigm: ${pL}.</strong> Moderate expectations. Real but bounded gains with significant hidden costs. The pragmatist position: measure actual vs. theoretical, and budget for the gap.`)
    }

    // Paradigm-aware compound observation
    if (isTB && techDebt > 30) {
      addEntry('debt', `Note the tension: you've set paradigm to "${pL}" but you're carrying ${Math.round(techDebt)}% debt. If AI output were truly high-quality, debt wouldn't have accumulated this far. Either the paradigm belief is ahead of reality, or the debt came from an earlier, less capable phase. Either way, it's real and it's dragging.`)
    }
    if (s.paradigm < p.paradigm && s.ai > 40) {
      addEntry('system', `You've downgraded your AI belief while running at ${s.ai}% AI adoption. The model now prices in higher overhead and faster debt accumulation at this adoption level. Watch the quality and debt numbers — they'll start reflecting the skeptic's costs.`)
    }
  }

  // ===== AI ADOPTION CHANGES =====
  if (Math.abs(s.ai - p.ai) > 3) {
    if (s.ai > p.ai) {
      if (s.ai < 15) {
        addEntry('scope', `AI boost: ${s.ai}%. Early adoption — autocomplete, drafting assists, boilerplate generation. Low risk, modest gain. Most teams see 5–15% throughput increase at this level.`)
      } else if (s.ai < 30) {
        addEntry('scope', `AI boost: ${s.ai}%. AI is now handling meaningful chunks of work — first drafts, test scaffolding, documentation. Teams report feeling faster, but watch for the review question: who's checking this output?`)
      } else if (s.ai < 55) {
        addEntry('scope', `AI boost: ${s.ai}%. Substantial throughput increase. At this level, AI-generated code is a significant fraction of what ships. The team's relationship to the codebase is changing — they're becoming reviewers of machine output rather than authors. This shift has consequences for understanding, ownership, and institutional knowledge.`)
      } else {
        addEntry('scope', `AI boost: ${s.ai}%. Approaching diminishing returns. Each additional percentage point of AI adoption yields less incremental output but maintains the same overhead and review burden. The marginal cost-benefit is flattening.`)
        if (!isO) addEntry('rebuttal', `<em>At ${s.ai}% AI adoption with a ${pL.toLowerCase()} paradigm, you're in the zone where the gap between theoretical and actual output is widest. The tool dashboards will show one number. Your shipped quality will show another.</em>`)
      }

      // Review gap warnings
      if (s.ai > 30 && s.review < s.ai * 0.3) {
        const debtRate = (s.ai * 0.02 * s.pp.debtRate * (1 - reviewRatio)).toFixed(2)
        addEntry('debt', `Review (${s.review}%) is below AI velocity (${s.ai}%). Technical debt is accumulating at ~${debtRate}/tick. At this rate, the debt drag will neutralize AI gains within ${Math.round(20 / Math.max(0.01, parseFloat(debtRate)))} ticks.`)
        if (isO) addEntry('counter', `In the optimistic model, debt rate is lower because AI output is intrinsically more correct. But it's not zero — even good AI output creates understanding gaps when shipped without review. Code the team doesn't understand is a liability regardless of who wrote it.`)
      }

      // High AI enablement observation
      if (isTB && s.ai > 40) {
        addEntry('counter', `At this level, AI isn't just speeding up existing work — it enables work that wouldn't have been attempted. Broader solution-space exploration, rapid prototyping of alternatives, automated refactoring at scale. If the models are good enough, this is a qualitative shift in what's possible.`)
      }

      // AI + time compression compound
      if (s.ai > 35 && s.time < -10) {
        addEntry('time', `High AI adoption (${s.ai}%) combined with compressed timelines (${100 + s.time}%) is a bet that AI-generated output can ship with less review cycle time. ${isO ? 'In the optimistic model, this is plausible — faster iteration loops.' : 'In the skeptic model, this is where incidents come from — fast output, thin review, compressed validation.'}`)
      }
    } else {
      addEntry('scope', `AI boost reduced to ${s.ai}%. Capacity contracting. ${s.ai < 10 ? 'Near-baseline operation. Teams revert to manual workflows — slower, but with full ownership and understanding of output.' : 'Partial AI usage. The team still has AI-generated code in the codebase from higher adoption, but new output is increasingly human-authored.'}`)
      if (techDebt > 20 && s.ai < p.ai - 10) {
        addEntry('debt', `Reducing AI adoption doesn't reduce existing debt. You still have ${Math.round(techDebt)}% accumulated from the high-adoption phase. Somebody has to understand, maintain, and fix that code — and the people who generated it may have moved on.`)
      }
    }
  }

  // ===== SCOPE CHANGES =====
  if (Math.abs(s.scope - p.scope) > 3) {
    if (s.scope > p.scope) {
      if (gap <= 0) {
        addEntry('scope', `Scope ${s.scope}%. Demanded (${demanded}%) within capacity (${achievable}%). Triangle strained but holding.`)
        if (isO) addEntry('counter', `This is the point — AI creates genuine headroom. The triangle expanded, not broke. Capacity exceeds demand because the production function shifted.`)
        if (gap > -10 && s.scope > 40) addEntry('system', `<em>Capacity exceeds demand — but barely. There's ${Math.abs(gap)}% headroom. One unexpected requirement, one key resignation, one model regression, and you're in the red. Slack isn't waste — it's resilience.</em>`)
      } else {
        addEntry('scope', `<strong>Scope ${s.scope}%.</strong> Management expects ${demanded}%, capacity is ${achievable}%. The ${gap}% gap has to come from somewhere — and "somewhere" is always quality, whether or not anyone admits it.`)
        if (s.quality < 60 && s.quality >= 40) addEntry('quality', `Quality at ${s.quality}%. You're in the zone where output looks plausible but isn't reliable. Tests pass but edge cases fail. Demos work but production doesn't. This is the most dangerous quality range because it's easy to mistake for "good enough."`)
        if (s.quality < 40) addEntry('quality', `<em>Quality at ${s.quality}%. At this level, rework costs are consuming a significant fraction of the throughput gains. You're running to stay in place — shipping fast, then fixing what shipped, then shipping fixes for the fixes.</em>`)
        if (isTB) addEntry('counter', `Even in the optimistic model, scope can outrun capacity. The bull case doesn't mean "unlimited scope" — it means the frontier moved. But management saw the frontier move and moved the goalposts further. The triangle's shape changed; the constraint didn't disappear.`)
        if (s.scope > 80 && !isO) addEntry('morale', `Scope at ${s.scope}% with a ${pL.toLowerCase()} paradigm. The team can see the math doesn't work. They know they're being asked to deliver more than is possible at acceptable quality. When people feel set up to fail, they either disengage or leave.`)
      }
    } else {
      addEntry('scope', `Scope eased to ${s.scope}%. ${s.scope < 20 ? 'Near-baseline expectations. The team has room to focus on quality, pay down debt, and recover sustainable pace.' : 'Pressure relaxing. If review is adequate, quality should recover within a few ticks.'}`)
      if (teamMorale < 60 && s.scope < p.scope - 15) addEntry('morale', `Scope reduction is the single most effective morale intervention at this stage. It signals that leadership understands the constraints and is choosing sustainability over raw output. But it has to be genuine — scope that's "reduced" then quietly re-added through back channels is worse than not reducing it.`)
    }
  }

  // ===== REVIEW CHANGES =====
  if (Math.abs(s.review - p.review) > 3) {
    if (s.review > p.review) {
      addEntry('cost', `Review up to ${s.review}%. ${s.review < 20 ? 'Minimal — catching obvious errors but not structural problems.' : s.review < 40 ? 'Moderate — catching most hallucinations and logic errors. Sweet spot for many teams.' : 'Thorough — approaching traditional code review depth. Slower throughput but substantially fewer defects reaching production.'}`)
      if (techDebt > 20) {
        addEntry('debt', `Higher review is slowing debt accumulation and actively paying down existing debt. Current debt: ${Math.round(techDebt)}%. At this review level, expect debt to decline by ~${((reviewRatio - 1) * 0.5).toFixed(2)}/tick.`)
      }
      if (s.review > 40 && s.ai < 20) addEntry('system', `<em>Review at ${s.review}% with AI at only ${s.ai}% — you're spending more effort reviewing than generating. This makes sense during debt paydown or after an incident, but isn't sustainable as a steady state. Either increase AI adoption to match review investment, or reduce review once debt is paid.</em>`)
      if (isTB && s.review > 30) addEntry('counter', `At high paradigm belief, this much review may be over-investing in a declining problem. If models are increasingly self-consistent, the review burden should be decreasing, not increasing. Are you reviewing because it's necessary, or because it feels responsible?`)
    } else {
      addEntry('cost', `Review cut to ${s.review}%.`)
      if (s.ai > 25 && s.review < 15 && !isO) {
        addEntry('quality', `<em>AI at ${s.ai}% with only ${s.review}% review. This is the configuration that produces plausible-looking output with subtle, hard-to-detect errors — code that passes tests but fails in production, documentation that reads well but describes the wrong behavior, tests that provide false confidence. Debt will compound silently.</em>`)
      }
      if (s.ai > 50 && s.review < 10) {
        addEntry('risk', `<strong>Warning:</strong> High AI output (${s.ai}%) with near-zero review (${s.review}%). Every tick increases the probability that a hallucination reaches production. The question isn't whether an incident will happen — it's when, and how much institutional trust it will cost.`)
      }
    }
  }

  // ===== TIME CHANGES =====
  if (Math.abs(s.time - p.time) > 3) {
    if (s.time < p.time && s.time < 0) {
      addEntry('time', `Timeline compressed to ${100 + s.time}%. ${s.time < -20 ? 'Severe compression — at this level, even well-functioning teams cut corners.' : 'Moderate compression — achievable with AI assistance, but review cycles will be squeezed.'}`)
      if (isO) {
        addEntry('counter', `AI genuinely compresses cycle time for generation-heavy tasks. If most of the timeline was spent on drafting and iteration, and AI handles both, compression is real.`)
        addEntry('rebuttal', `<em>Generation compresses. Review, integration, deployment, and decision-making don't. The non-AI parts of the timeline become the binding constraint, and those are the parts organizations consistently underestimate.</em>`)
      } else {
        addEntry('quality', `Time pressure degrades quality through two mechanisms: less time for review (explicit) and more pressure to skip edge cases (implicit). Both compound with AI adoption because there's more output to review in less time.`)
      }
    } else if (s.time > p.time) {
      addEntry('time', `Timeline extended to ${100 + s.time}%. ${s.time > 20 ? 'Generous buffer. Room for thorough review, iteration, and debt paydown. This is what sustainable AI adoption looks like.' : 'More room for review and iteration. Slack in the timeline is not waste — it\'s where learning and quality improvement happen.'}`)
      if (techDebt > 30 && s.time > 10) addEntry('debt', `Extended timeline + existing debt (${Math.round(techDebt)}%) = opportunity to remediate. If the team spends the extra time on debt paydown rather than new features, capacity will recover. But this requires explicit prioritization — debt paydown doesn't happen by accident.`)
    }
  }

  // ===== COMPOUND SCENARIO ANALYSIS =====

  // The "everything is fine" illusion — high AI, low review, quality hasn't dropped yet
  if (s.ai > 40 && s.review < 15 && s.quality > 70 && techDebt < 15 && techDebt > 5 && !(p._shownIllusion)) {
    addEntry('system', `<em>The numbers look good right now — high AI adoption, decent quality, low debt. This is the J-curve's deceptive phase. Debt is accumulating but hasn't hit the threshold where it drags velocity. In 15–20 ticks, you'll see the inflection. This is exactly the moment where teams decide "review isn't necessary" and lock in the trajectory.</em>`)
    prevState._shownIllusion = true
  }

  // Cost paradox — spending more but delivering less
  if (s.costPct > 130 && s.quality < 50 && gap > 20) {
    addEntry('cost', `<strong>Cost paradox:</strong> You're spending ${s.costPct}% of baseline budget but delivering below 50% quality with a ${gap}% scope gap. The AI investment is increasing costs without resolving the constraint mismatch. This is the scenario where CFOs start asking hard questions about ROI.`)
  }

  // The sweet spot recognition
  if (s.ai > 25 && s.ai < 55 && s.review > 20 && s.review < 45 && s.quality > 75 && techDebt < 15 && s.scope < 50 && teamMorale > 70 && !(p._shownSweetSpot)) {
    addEntry('system', `<strong>Sustainable configuration detected.</strong> AI adoption (${s.ai}%) with adequate review (${s.review}%), manageable scope (${s.scope}%), quality above 75%, debt under control. This is the "boring" approach — and it works. The risk is that it looks underutilized to leadership who expected bigger numbers.`)
    prevState._shownSweetSpot = true
  }

  // Debt threshold alerts
  if (techDebt > 50 && (p._lastDebtAlert || 0) < 50) {
    addEntry('debt', `<strong>Tech debt at ${Math.round(techDebt)}%.</strong> Legacy AI-generated code is now actively dragging down velocity. Teams spend increasing time understanding, fixing, and refactoring old output. The "AI boost" is fighting itself — every new feature has to navigate a codebase that nobody fully understands because nobody wrote it.`)
    addEntry('system', `<em>This is the "fast now, slow later" inflection point. The debt accumulated during low-review periods is now a binding constraint. It won't resolve without dedicated remediation time — which means scope or timeline has to give. Leadership typically resists this because it looks like "going backwards." It isn't. It's paying for what was already consumed.</em>`)
    prevState._lastDebtAlert = techDebt
  } else if (techDebt > 25 && (p._lastDebtAlert || 0) < 25) {
    addEntry('debt', `Tech debt at ${Math.round(techDebt)}%. Starting to drag effective capacity. The AI boost is ${Math.round(techDebt * 0.3)}% less effective than the slider suggests. This is the gap between the dashboard metric ("AI productivity boost: ${s.ai}%") and the team's lived experience ("it doesn't feel ${s.ai}% faster").`)
    prevState._lastDebtAlert = techDebt
  } else if (techDebt > 75 && (p._lastDebtAlert || 0) < 75) {
    addEntry('debt', `<strong>Tech debt critical: ${Math.round(techDebt)}%.</strong> At this level, the codebase is actively hostile to development. Simple changes break unrelated features. New hires can't onboard effectively. The team spends more time managing existing AI-generated code than producing new value. This is the state where organizations consider rewrites — which are also expensive and risky.`)
    prevState._lastDebtAlert = techDebt
  }

  // Quality threshold crossings
  if (s.quality < 30 && p.quality >= 30) {
    addEntry('quality', `<em>Quality below 30%. This is where the human cost becomes undeniable.</em>`)
    addEntry('morale', `At this quality level, people stop believing in what they're shipping. They know it's not good enough. They know leadership doesn't want to hear it. The cognitive dissonance — being told to "use AI to increase quality" while watching quality degrade — is corrosive. This isn't a metric problem. It's a trust problem.`)
  } else if (s.quality < 50 && p.quality >= 50) {
    addEntry('quality', `Quality dropped below 50%. You're now in the zone where users notice. Bug reports increase, support tickets rise, internal stakeholders lose confidence. The team knows it's shipping substandard work and feels the gap between what's expected and what's achievable.`)
  } else if (s.quality >= 80 && p.quality < 80) {
    addEntry('system', `Quality recovered above 80%. Sustainable — for now. Note what got you here: the specific combination of AI level, review depth, scope, and timeline that produces acceptable quality. Protect those parameters.`)
  } else if (s.quality >= 95 && p.quality < 95 && s.ai > 20) {
    addEntry('system', `Quality above 95% with active AI adoption (${s.ai}%). This is the target state — AI amplifying output while review and scope management maintain quality. If this holds under load (try increasing scope), you've found a working configuration.`)
  }

  // Scope-morale interaction
  if (s.scope > 70 && s.scope > p.scope + 5 && teamMorale < 65) {
    addEntry('morale', `Scope is still increasing while team health is at ${Math.round(teamMorale)}%. People hear "do more" when they're already drowning. The message leadership thinks they're sending ("AI will help") is not the message being received ("we don't care that you're struggling"). This communication gap is one of the most common failure modes in AI adoption.`)
  }

  // Time compression morale
  if (s.time < -15 && s.time < p.time - 3 && teamMorale < 70) {
    addEntry('morale', `Timeline compression + low morale is the death spiral combination. Tight deadlines mean no slack for recovery. No slack means errors. Errors mean rework. Rework means tighter deadlines. The people still trying to do good work are being punished for it — every careful review delays the sprint, every raised concern is "negativity."`)
  }

  // High AI + low review morale warning
  if (s.ai > 40 && s.review < 12 && teamMorale > 55 && teamMorale < 75 && p.ai <= 40) {
    addEntry('morale', `Your team is generating a lot of AI output (${s.ai}%) with thin review (${s.review}%). The experienced engineers see the risk but feel unable to slow things down. There's a name for this: moral injury — being required to do work you know isn't good enough, by people who don't understand why it matters. The junior engineers, meanwhile, are learning that "this is how it's done" — calibrating their quality bar to a lower standard.`)
  }

  // Recovery recognition
  if (teamMorale > 80 && techDebt < 10 && s.quality > 85 && s.ai > 20 && !(p._shownRecovery) && (p._lastDebtAlert || 0) > 25) {
    addEntry('system', `<strong>Recovery complete.</strong> After a period of high debt and strain, you've reached a sustainable state: quality ${s.quality}%, debt ${Math.round(techDebt)}%, morale ${Math.round(teamMorale)}%. The team is healthy, the codebase is clean, and AI is contributing positively. This is what "AI done right" looks like — and it required deliberate intervention, not just adoption.`)
    prevState._shownRecovery = true
  }

  // Bull case validation
  if (s.quality >= 90 && s.scope >= 30 && isTB && !(p.quality >= 90 && p.scope >= 30 && p.paradigm > 80)) {
    addEntry('counter', `In the true-believer model, high scope with high quality is achievable. If this reflects reality, the triangle hasn't broken — but it's expanded enough to feel irrelevant. The question is whether this state is stable or fragile.`)
    addEntry('rebuttal', `<em>Until something goes wrong. Resilience lives in the constraints you planned for, not the ones you assumed away. Hit "Simulate incident" to test the fragility of this configuration.</em>`)
  }

  // Extreme: everything maxed out
  if (s.ai > 70 && s.scope > 100 && s.time < -20 && s.review < 10 && !(p._shownExtreme)) {
    addEntry('system', `<strong>You've created the scenario that ends careers.</strong> Maximum AI output, maximum scope, compressed timeline, minimal review. This is the configuration that looks fantastic in the quarterly review ("look how much we shipped!") and catastrophic six months later ("why is everything broken?"). Every major AI-related engineering failure in the last two years followed this pattern.`)
    prevState._shownExtreme = true
  }

  return { ...s, _lastDebtAlert: prevState._lastDebtAlert, _shownIllusion: prevState._shownIllusion, _shownSweetSpot: prevState._shownSweetSpot, _shownRecovery: prevState._shownRecovery, _shownExtreme: prevState._shownExtreme }
}
