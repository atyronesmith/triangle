# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive simulation exploring "The Iron Triangle" (scope, cost, time, quality) in the context of AI-assisted project management. Integrates Amdahl's Law, Jevons Paradox, and Goodhart's Law. Users adjust 10 sliders, the tool computes constraint tradeoffs with 5 compounding tick engines, and generates contextual narrative commentary.

Deployed at: https://atyronesmith.github.io/triangle/

## Architecture

```
index.html          — markup shell, no inline JS/CSS
style.css           — full theme (CSS custom properties), layout, dark mode
public/avatar.png   — steampunk project avatar
src/
  main.js           — entry point, tick loop (setTimeout, configurable speed), all state vars
  model.js          — constraint math: Amdahl, paradigm params, seniority, experience, computeState()
  engine.js         — tick engines: debt, morale, Jevons, seniority attrition
  learning.js       — org learning curve: experience accumulation/decay
  renderer.js       — canvas triangle (uniform + distorted modes) + DOM stat updates
  factory.js        — conveyor belt animation (15fps): workers, robots, manager, customer, furnace, debt pit
  amdahl-chart.js   — auto-scaling Amdahl curve with 4 operating points
  goodhart.js       — dashboard vs reality split panel (Goodhart's Law)
  dialog.js         — log entry system + analyzeChanges() narrative engine
  sparkline.js      — ring buffer inline trend charts (5 metrics)
  quotes.js         — 160+ sentiment-rated quotes with color gradient
  tooltip.js        — JS-positioned tooltips (avoids overflow clipping)
  url-state.js      — shareable URL hash encoding/decoding
  onboarding.js     — 7-step guided walkthrough (DOM-event driven, no main.js coupling)
  constants.js      — 12 presets, descriptions, timing constants
```

**Data flow:** Sliders → `readSliders()` → `computeState(sliders, techDebt, teamMorale, jevonsScope, teamExperience)` → `render()` + `analyzeChanges()`. Tick loop mutates 5 accumulated state vars each simulated week: `techDebt`, `teamMorale`, `jevonsScope`, `seniorityDrift`, `teamExperience`.

**Module coupling:** `model.js`, `engine.js`, `learning.js` are pure (no DOM). `onboarding.js` interacts with `main.js` through DOM events only (no import coupling). All other modules touch the DOM.

## Development

```bash
pnpm dev          # Vite dev server with hot reload
pnpm build        # Production build to dist/
pnpm preview      # Preview production build
make dev          # Makefile alternative
```

Deploy: GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to Pages on push to main.

## Key Patterns

- **Dark mode:** `prefers-color-scheme` media query on CSS custom properties
- **Tick loop:** `setTimeout`-based (not `setInterval`) so speed changes take effect immediately. Speed selector: 0.5x-8x.
- **State:** Recomputed from sliders on every input. 5 accumulated vars persist across ticks (reset on preset/reset).
- **Narrative engine:** `analyzeChanges()` compares current vs previous state, emits dialog entries on meaningful transitions. Periodic commentary every 8/13 weeks.
- **Factory animation:** 15fps throttled, pauses with simulation. Hit regions rebuilt each frame for canvas tooltips.
- **Onboarding:** Standalone module, detects first-time users via localStorage, skips if URL has hash state.
- **URL state:** Encodes non-default slider values in hash, debounced 150ms. Decoded on init.
- **Presets:** Reset all accumulated state + apply slider values. Preset objects include `tip` for tooltips.

## Sliders (10)

paradigm, elasticity, amdahl, aiGen, aiReview, aiMgmt, scope, review, time, seniority

## Accumulated State (5 vars in main.js)

techDebt (0-100), teamMorale (0-100), jevonsScope (0-150), seniorityDrift (-100..0), teamExperience (0-100)
