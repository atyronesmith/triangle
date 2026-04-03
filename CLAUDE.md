# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive visualization exploring "The Iron Triangle" (scope, time, quality) in the context of AI-assisted project management. Users adjust sliders for AI adoption, scope pressure, review depth, timeline, and paradigm belief — the tool computes constraint tradeoffs and generates contextual narrative commentary.

## Architecture

```
index.html          — markup shell, no inline JS/CSS
style.css           — full theme (CSS custom properties), layout, dark mode
src/
  main.js           — entry point: event wiring, presets, snapshot/risk, tick loop
  model.js          — pure constraint math: getParadigmParams(), computeState()
  engine.js         — debt/morale tick engines (called every 800ms)
  renderer.js       — canvas triangle drawing + DOM stat updates
  dialog.js         — log entry system + analyzeChanges() narrative engine
  constants.js      — presets, paradigm descriptions, timing constants
```

**Data flow:** Sliders -> `readSliders()` -> `computeState()` -> `render()` + `analyzeChanges()`. The tick loop (`engine.js`) mutates `techDebt` and `teamMorale` each 800ms and feeds morale dialog entries back to `main.js`.

`model.js` and `engine.js` are pure (no DOM access) — safe to unit test. `renderer.js` and `dialog.js` touch the DOM.

## Development

```bash
pnpm dev          # Vite dev server with hot reload
pnpm build        # Production build to dist/
pnpm preview      # Preview production build
```

The legacy single-file prototypes (`pm-triangle*.html`) remain in the repo root for reference.

## Key Patterns

- Dark mode: `prefers-color-scheme` media query on CSS custom properties in `:root`
- State is recomputed from sliders on every input event — no persistent state object except `techDebt`, `teamMorale`, and `prevState` (for change detection)
- The narrative engine (`analyzeChanges`) compares current vs previous state and only emits dialog entries on meaningful transitions (threshold crossings, not continuous changes)
- Presets reset accumulated state (debt, morale) to zero before applying slider values
