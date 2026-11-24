# Project Guide

## Scope
- Standalone TypeScript browser library. Work only in this repository unless explicitly asked otherwise; neighboring Wysi, worker, and edumacation projects are out of scope.
- `src/` holds implementation, `icons/` the built-in source SVGs, `examples/` the demo, and `tests/` unit/browser regressions. `dist/` is generated and committed; do not hand-edit it.

## Commands
```sh
npm ci
npm run typecheck
npm run build
npm test
npm run test:browser
```
- Use focused tests while iterating; run the checks above before a release. CI currently runs typecheck, build, and unit tests.
- Rebuild after changing TypeScript, CSS, or built-in icons; review generated output with source changes. Never commit `node_modules/` or `tests/.artifacts/`.

## Behavioral contracts
- Enhance a native button with `setupTernary`; preserve author-owned content and native labels. Values are numeric `-1`, `0`, `1`, default `0`, cycle `0 -> 1 -> -1 -> 0`.
- Do not introduce mixed-checkbox or mixed-pressed semantics. Preserve native keyboard activation, state descriptions, and live feedback.
- Preserve optional hidden-field submission, disabled/fieldset behavior, external form ownership, canceled resets, and ownership-aware teardown.
- Preserve classic/global and ESM builds and their cross-build ID isolation; keep runtime dependencies at zero.

## SVG and theming
- Never inject unvalidated SVG or weaken the allowlist, local-reference checks, expansion/size budgets, or abort/stale-load guards to accommodate an export.
- Reserved source black is foreground; white is background. Other colors and opacity remain intact. Missing root fill maps the SVG default black through the configured source palette; never override an explicit or inherited fill per shape.
- Shared and per-state foreground/background overrides resolve independently: state override, shared override, preset default. Keep CSS variable expressions live for theme changes.
- Recolorable SVGs are validated/rebuilt inline; unchanged image URLs remain isolated images. Optimized Inkscape exports must still satisfy the validator; editor metadata is not accepted.

## Releases
- See README for the release checklist. `private: true` intentionally prevents npm publishing.
- Do not commit, push, tag, publish, or deploy without user direction.
