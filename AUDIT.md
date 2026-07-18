# UI Audit — Playwright, Light+Dark, Mobile/Tablet/Desktop

Scope: all 4 routes (`/`, `/rates`, `/trends`, `/converter`), both themes, 375/768/1440 widths. Contrast (WCAG AA), layout, DESIGN.md token conformance, interaction testing (dropdowns/sort/search/toggle/swap), console errors. All findings confirmed live via computed styles / DOM / pixel inspection — not theoretical.

No console errors on any route/theme/viewport. One recurring benign Angular deprecation warning (`allowSignalWrites`), ignorable.

---

## Critical

### 1. Nav overflows viewport on mobile — every route
`src/app/ui/nav-bar/nav-bar.component.scss` — `.nav-bar__nav` has no `flex-wrap`, no breakpoint, no hamburger. At 375px: page `scrollWidth` 576px vs 375px viewport (201px horizontal scroll). Converter/Trends links and Dark toggle clipped off-screen. Confirmed via bounding rects: `.nav-bar__toggle` right edge at x=577.

### 2. Offline-status badge unreadable — home route, all viewports/themes
`src/app/ui/badge/badge.component.scss:13-16` `.badge--negative` — `color: var(--color-on-primary)` (`#0e0f0c`) on `background: var(--color-negative-bg)` (`#320707`). Contrast **1.07:1** (need 4.5:1). Confirmed rendered: `rgb(14,15,12)` on `rgb(50,7,7)`. Same in light AND dark theme (color pair is theme-invariant). Also visually clipped on mobile.

### 3. Trends chart never renders data — trends route, all viewports/themes
`src/app/core/services/history.service.ts` — `RatesService` falls back to `sample-rates.json` when no API key (`rates.service.ts:79`), but `HistoryService.loadHistory` has **no such fallback** — with empty apiKey (default `environment.ts`) and empty cache, `dateResponses` stays empty → `series.set([])`. Confirmed live: canvas has axis gridlines + legend chip only, zero data pixels drawn. Any currency selection shows blank chart, no error/empty-state message.

### 4. Base-currency selector on Rates page doesn't recompute rates — rates route
`src/app/features/rates-table/rates-table.component.ts:57,123-125` — `onBaseChange` sets `ratesService.base` signal, which only relabels the "Base" column text; `rows` still reads the original `snapshot.conversion_rates` (fetched against the original base). Confirmed: switching Base dropdown AED→EUR changes every row's "Base" label to EUR but Rate values stay byte-identical (USD still "1", EUR still "0.92" — should be ~1.09/1 if truly EUR-based). Misleading data.

### 5. Negative amount accepted in Converter — converter route
`src/app/features/converter/converter.component.html` — `<app-text-input type="number">` has no `min="0"`. Typing `-5` produces `-5.43 USD` result with no validation/error state.

---

## High

### 6. Converter currency `<select>` boxes have no border/background/radius — converter route, all viewports/themes
`src/app/features/converter/converter.component.scss:23,30-33` — uses `var(--color-ink-soft)`, `var(--color-border)`, `var(--radius-md)`, `var(--color-surface)` — **none of these custom properties exist** (defined tokens are `--color-mute`, `--color-ink`, `--rd-md`, `--color-canvas`). Confirmed: computed `border: 0px none`, transparent background. Native selects render as bare text, violating DESIGN.md `text-input` spec (1px ink border, canvas bg, rd-md radius — same as the Amount field beside it). On mobile the unstyled/unconstrained select also causes horizontal overflow (text clipped at viewport edge).

### 7. Trends page heading unstyled — trends route, all viewports/themes
`src/app/features/trends/trends.component.scss:8` — `font: var(--text-heading-md)`, undefined token (real tokens are `--text-display-*`). "Trends" `<h1>` renders as plain unstyled text instead of a heading.

### 8. Converter card missing signature border — converter route
`src/app/features/converter/converter.component.html:1` uses `<app-card variant="content">` (no border) instead of DESIGN.md's `currency-converter-card` spec (1px solid ink border required). `card.component.ts` doesn't define a converter-specific bordered variant.

---

## Medium

### 9. `mute` text fails AA in light theme
`--color-mute` (`#868685`) on `--color-canvas`/`--color-canvas-soft`: light 3.64:1 / 3.03:1 (fail), dark 5.28:1 / 4.71:1 (pass). Used for captions/hints (`rates-table.component.scss:90,95`, `trends.component.scss:45,55`). Fails WCAG AA normal text (needs 4.5:1); OK only as large text.

### 10. Footer inverts identity in dark theme
`src/app/ui/footer/footer.component.scss:1-2` — `background: var(--color-ink); color: var(--color-canvas-soft)`. Light theme: correct dark footer band (15.98:1). Dark theme: `--color-ink` flips to near-white (`#f5f5f5`), `--color-canvas-soft` flips to near-black — footer becomes a light band with dark text, contradicting DESIGN.md's "dark footer band" description. Still passes contrast (15.74:1) — cosmetic/consistency issue, not accessibility.

Same root-cause token collision (`ink` used as both adaptive text-color AND fixed-dark-surface-color) also makes `card--feature-dark` / `hero-band--dark` variants (`card.component.scss:21-24`, `hero-band.component.scss:11-13`) unreadable in dark theme (1.35:1) — currently dead code, not wired to any route, but breaks the instant `variant="dark"` is used.

### 11. Hero headline uses wrong type scale
`src/app/ui/hero-band/hero-band.component.scss` headline uses `var(--text-display-xl)` (64px/900) instead of DESIGN.md-specified `display-mega` (126px/900) for `hero-band`.

### 12. `badge--positive` fails contrast in dark theme
`badge.component.scss:9-10`, `positive-deep` (`#054d28`) on `primary-pale` (dark-theme value `#1a3c00`): **1.24:1**. Light theme fine (8.76:1). Live-status badge unreadable in dark mode.

---

## Low / data oddity

### 13. "Backing off · fetched 810121m ago"
`offline-indicator.component.ts` `formatMinutesAgo` has no cap/formatting for stale sample data. `sample-rates.json` `time_last_update_unix` = 2025-01-01 fixed timestamp; against current date this produces a nonsense multi-hundred-thousand-minute figure instead of a sane fallback ("data unavailable" / date string).

### 14. `accent-cyan`/`accent-orange` fail contrast on canvas in light theme
1.93:1 / 1.59:1 (dark theme passes: 9.95/12.09). No current usage found as text/icon color (only used as chart line color const in `trends.component.ts:23`, drawn on canvas, not as DOM text) — flag if repurposed as text/icon color later.
