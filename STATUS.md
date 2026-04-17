# Project Status — Iron Triangle Simulation

Interactive simulation of the Iron Triangle (scope, cost, time, quality) with AI-assisted project management dynamics.
Deployed at: https://atyronesmith.github.io/triangle/

**Last updated:** 2026-04-17 10:00:05 EDT

## Current State

Live and functional. 19 modules, 14 presets, 13 tabs. Features: Amdahl/Jevons/Goodhart law visualizations, dual history charts, ROI index, sparklines, factory animation, mobile-responsive layout, accessibility improvements, GoatCounter analytics (privacy-friendly, no cookies), onboarding walkthrough, URL state sharing via hash.

## Architecture

See CLAUDE.md for full architecture details, module list, data flow, and slider/state documentation. Core pattern: sliders → `computeState()` → render + narrative. Five accumulated state vars (techDebt, teamMorale, jevonsScope, seniorityDrift, teamExperience) mutate each tick via pure engine functions.

## Recent Work

```
7b1f42b Add GoatCounter analytics — privacy-friendly, no cookies
680a7d5 Add color-only fixes, Model Assumptions tab, Seniority & Learning tab, citation URLs
d5ca4f5 Add mobile responsive layout and accessibility improvements
678aaa3 Add ROI Index methodology tab explaining formula and caveats
0c2033f Add simulation history panel with dual charts and ROI index
a404710 fix: upgrade vite to >=6.4.2 to patch file-read and path-traversal vulnerabilities
```

## Known Gaps / Roadmap

- No undo / redo for slider state
- No custom preset save/load
- No export (CSV, PNG, shareable report)
- No sensitivity analysis ("what-if" sweep)
- Property-based tests cover the pure math modules (model, engine, learning); DOM/render modules untested
- No Jira/project-tool integration (north-star feature)

## Dev Commands

See CLAUDE.md dev section. Short version: `pnpm dev`, `pnpm build`, `pnpm test`.
