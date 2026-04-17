# Your Boss Doesn't Know About Jevons Paradox — And It's Costing Your AI Strategy

*Aaron Smith | 2026-04-10 | AI Enablement*

---

## The pitch your leadership heard

"AI will let us do more with less. Double the scope, cut the timelines, reduce headcount. The tools pay for themselves."

Sound familiar? Every engineering org is hearing some version of this right now. And on the surface, it makes sense — AI coding assistants genuinely accelerate individual tasks. The vendor dashboards show 40-60% productivity gains. The demos are impressive. The quarterly slide deck writes itself.

Here's the problem: **three well-established economic laws predict this strategy will backfire.** Not might. Will. And they've been predicting it since 1865.

## The three laws your AI strategy is ignoring

### Jevons Paradox (1865)

When efficiency makes a resource cheaper, total consumption increases — not decreases. William Stanley Jevons observed this with coal: more efficient steam engines didn't reduce coal use, they made coal viable for entirely new industries. Consumption exploded.

Applied to AI: when cognitive output becomes cheaper (AI writes code faster), the organization doesn't bank the savings. It discovers new projects, expands scope, and demands more. Every efficiency gain gets consumed before it can be captured. **The triangle doesn't shrink. Scope fills it.**

### Amdahl's Law (1967)

The speedup of any system is limited by the fraction that can't be accelerated. If only 40% of your workflow is AI-accelerable (the rest is judgment, architecture, stakeholder alignment, integration), then even a 10x AI speedup gives you only 1.56x total improvement. The serial fraction is the ceiling, and no amount of AI investment moves it.

**Your "40% AI productivity boost" isn't a 40% project speedup.** It's maybe 15% after the serial bottleneck — and that's before accounting for overhead, debt, and the review burden.

### Goodhart's Law (1975)

When a measure becomes a target, it ceases to be a good measure. The dashboard says "PRs merged up 98%." What it doesn't say: review time also up 91%, DORA delivery metrics unchanged, and code churn doubled. **The numbers that look great on the executive dashboard are not the numbers that predict project outcomes.**

## I built a tool to show this — interactively

**[The Iron Triangle in the Age of AI](https://atyronesmith.github.io/triangle/)** is an interactive simulator that lets you stress-test AI adoption strategies against these economic laws in real time.

Set your AI adoption level, scope pressure, review investment, and paradigm belief — then watch what happens over 26, 52, or 100 simulated weeks. Debt compounds. Morale erodes. Jevons expands scope. Seniors leave. The dashboard looks great while reality deteriorates.

### Try these scenarios

**Click "Your Boss's Plan"** — the most common failure pattern: high AI, doubled scope, cut timelines, minimal review. Watch ROI crater below break-even within 20 weeks while the Goodhart dashboard shows "productivity up 65%."

**Click "Sweet Spot"** — moderate AI, adequate review, manageable scope. Watch ROI climb above 100 and hold there. Boring. Sustainable. The configuration nobody gets promoted for advocating.

**Click "Agent Swarm"** — 5 AI agents in parallel with orchestration. Massive throughput. Watch Jevons devour the gains at 5x speed while the C-level exec in the corner office asks "why is AI so expensive?"

### What the tool shows

- **Two visualization modes** — equilateral (capacity vs demand) and distorted (which constraint is binding)
- **Five compounding engines** — tech debt, morale, Jevons scope, seniority attrition, organizational learning
- **Factory floor animation** — watch the manager yell "VIBE CODE IT!!" while the C-level asks "Claude costs HOW much?"
- **Amdahl's Law curve** — see the gap between vendor-promised gains and actual throughput
- **Goodhart's Law panel** — dashboard metrics vs reality, side by side
- **Simulation history charts** — full time-series of all metrics + an ROI Index that answers "is the AI spend paying for itself?"
- **14 presets** including the provocatively named "Your Boss's Plan" and "Agent Swarm"
- **12 prose tabs** with cited research — every claim links to the underlying study

## The research behind it

This isn't opinion. The simulation is calibrated against published findings:

- **METR (2025):** In a randomized controlled trial, experienced developers using AI tools took 19% *longer* to complete tasks — while perceiving a 24% speedup. A 39-percentage-point perception gap.
- **Dubach synthesis (2026):** Six independent studies consolidated: teams merged 98% more PRs but review time increased 91%, with DORA delivery metrics unchanged. Convergence on ~10% organizational gains vs. 40-60% vendor claims.
- **IJSET (2026):** AI accelerates MVP development by 40-60% but produces 4x code duplication and 2x code churn vs. 2021 baselines.
- **Zhang & Zhang (2026):** Formalized the "Structural Jevons Paradox" — firms don't just consume more AI, they redesign architectures to consume dramatically more.

All citations are hyperlinked in the tool's Evidence tab.

## The balanced view

The tool isn't anti-AI. It models the bull case too — set the paradigm slider to "True Believer" and watch what happens when AI genuinely reduces overhead and iteration costs. The "Sweet Spot" and "Review Heavy" presets show configurations where AI delivers genuine positive ROI.

The point is that **the constraints don't disappear — they move.** The organizations that succeed with AI adoption are the ones that understand which constraint they're relaxing and which they're holding. The ones that fail are the ones that assume all constraints relax simultaneously.

## How to use this for your team

1. **Workshop format:** Project the tool, click "Baseline," then progressively add AI adoption. Let the team watch what happens. Ask: "Where are we on this spectrum?"
2. **Strategy stress-test:** Set the sliders to match your actual AI adoption, scope pressure, and review investment. Run for 50 weeks. Is the trajectory sustainable?
3. **Executive communication:** The Goodhart panel is specifically designed to show leadership why the dashboard metrics and the ground truth can diverge.
4. **Hiring/retention conversations:** The seniority attrition mechanic shows why "replace seniors with AI + juniors" has a delayed-but-devastating cost.

## Try it

**Live tool:** [https://atyronesmith.github.io/triangle/](https://atyronesmith.github.io/triangle/)

**Source code:** [https://github.com/atyronesmith/triangle](https://github.com/atyronesmith/triangle)

Open source, no login, no tracking cookies. Works on desktop and mobile.

Click "Your Boss's Plan." Watch the spiral. Then ask yourself: does this look familiar?

---

*Aaron Smith is a software engineer at Red Hat working on AI enablement. The Iron Triangle simulator is an open source tool for understanding AI adoption tradeoffs. Feedback and contributions welcome on GitHub.*
