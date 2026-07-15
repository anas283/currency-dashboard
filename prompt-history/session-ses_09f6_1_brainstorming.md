# Currency Exchange Dashboard build

**Session ID:** ses_09f676035ffeSaGu7VUfp2eAxp
**Created:** 7/14/2026, 8:27:22 PM
**Updated:** 7/14/2026, 9:37:12 PM

---

## User

use superpower to build the Currency Exchange Dashboard, here's spec.md and DESIGN.md

---

## Assistant

**Tool: skill**

**Tool: bash**

---

## Assistant

**Tool: read**

**Tool: read**

---

## Assistant

Using the brainstorming skill before any implementation work, per superpowers protocol.

**Tool: skill**

---

## Assistant

**Tool: todowrite**

---

## Assistant

I've read both files. The Tranglo assessment is fairly prescriptive (Angular, Jasmine/Karma, Cypress/Protractor) but the scope is large for a 5-day window. Let me ask a few clarifying questions before designing.

**Question 1 — Stack commitment:**

**Tool: question**

---

## Assistant

Got it — Angular + Jasmine/Karma + Cypress, per spec.

**Question 2 — Data source:**

**Tool: question**

---

## Assistant

**Question 3 — API key & the historical-datagap:**

**Tool: question**

---

## Assistant

**Question 4 — CI/CD "deploy to staging"target:**

**Tool: question**

---

## Assistant

**Question 5 — Scope priority for the 5-day window:**

**Tool: question**

---

## Assistant

Good — I have enough to design. Let me propose high-level architecture approaches first.

## Three architecture approaches

**Approach A — Modern lean Angular (Recommended)**
Standalone components (no NgModules) + Angular **Signals** for state + RxJS `interval` for polling + **IndexedDB** (via tiny `idb-keyval` wrapper) for offline + **ng2-charts** (Chart.js) for trends + SCSS CSS custom properties keyed off `data-theme` for theming. Minimal deps, fastest to build, idiomatic for current Angular.

**Approach B — Conventional enterprise Angular**
NgModules + **NgRx** feature store with Effects for side effects + **localStorage** for offline + **D3.js** for charts. More boilerplate and a steeper setup, but matches what large Angular teams often expect to see in a portfolio.

**Approach C — Nx monorepo**
Nx workspace with feature libraries, NgRx Data, Chart.js, IndexedDB. Most "enterprise" and most scalable, but upfront scaffolding overhead is significant for a 5-day, single-app scope.

**Tool: question**

---

## Assistant

**Tool: todowrite**

---

## Assistant

Locked in: Approach A with raw Chart.js. Now presenting the design in sections. Please confirm each before I move to the next.

---

## Design — Section 1 of 5: Architecture & project layout

**Stack & versions**
- Angular 18, standalone components, `provideHttpClient` + `provideRouter`, zone-change detection OnPush throughout.
- Signals for component + service state, RxJS `timer`/`interval` for the polling engine.
- Raw `chart.js` v4 wrapped by a thin `ChartComponent` (no ng2-charts).
- `idb-keyval` (≈1 KB) for IndexedDB offline cache.
- Design tokens from DESIGN.md materialized as SCSS variables + CSS custom properties; theme switch toggles `data-theme="dark"` on `<html>`.

**App shell**

```
src/
  app/
    core/
      services/
        rates.service.ts          // latest rates + conversion via ExchangeRateAPI
        history.service.ts        // last-month series (derived from polling snapshots)
        realtime.service.ts       // RxJS polling engine, pause/resume, error backoff
        cache.service.ts          // idb-keyval wrapper (get/set/clear + stale flag)
        theme.service.ts          // 'light' | 'dark', persisted in localStorage
        online.service.ts         // navigator.onLine + window online/offline events
      models/
        currency.ts               // Currency, RateRow, HistoryPoint, ConvertResult
        api.types.ts
      tokens/
        env.token.ts              // API url, key (injected from environments)
    features/
      rates-table/                // sortable table + search + filter
      trends/                     // multi-select (≤3) + aggregation toggle + chart
      converter/                  // from/to + amount → result
      offline-indicator/         // small banner / badge
    shared/
      components/  chart/ button/ card/ badge/ text-input/
      pipes/       sort.pipe.ts currency-filter.pipe.ts
      directives/ sort-header.directive.ts
      utils/       date-buckets.ts (daily/weekly/monthly aggregation)
    ui/                            // design-system atoms per DESIGN.md
      button/ card/ badge/ text-input/ nav-bar/ footer/ hero-band/
  styles/
    _tokens.scss                   // brand colors, type, spacing, radii (from DESIGN.md)
    _theme.scss                   // light/dark CSS custom property groups
    _typography.scss
  environments/
    environment.ts                // dev defaults
    environment.prod.ts           // prod (API key read from env at build)
```

**Routing** — single shell route with sections (`/rates`, `/trends`, `/converter`), plus a combined dashboard `/` that lays them out vertically. Nav bar links, sticky, per DESIGN.md `nav-bar` token.

**State boundary**: each feature owns its signals (`ratesSignal`, `trendsSignal`, `converterSignal`). Cross-cutting state (online status, last-fetch timestamp, base currency, theme) lives in `core` services accessed via injection — no global store. Services are `providedIn: root`.

**Build phases** mapped to your build order:
- **Phase 1 (core)**: rates-table, converter, search/filter, basic app shell + DESIGN.md token system + theme service skeleton.
- **Phase 2 (quality)**: unit + Karma config, Cypress E2E for key flows, GitHub Actions: lint → test → build → deploy to gh-pages.
- **Phase 3 (advanced)**: trends chart + aggregation toggle, real-time polling, offline cache + indicator, full dark theme polish.

**Tool: question**

---

## Assistant

## Design — Section 2 of 5: Data layer & API

**ExchangeRateAPI (https://v6.exchangerateapi.com)** — free tier endpoints used:
- `GET /v6/{API_KEY}/latest/{BASE}` → latest rates for ~160 currencies against `BASE`.
- `GET /v6/{API_KEY}/pair/{FROM}/{TO}/{AMOUNT}` → converter result. *(Free-tier pair endpoint.)*
- Historical / timeseries endpoints are paid — **not used.**

**History is derived** (your call): `HistoryService` appends every polled `latest` snapshot to an IndexedDB ring buffer `{ base, date, rates }`. On opening the Trends view, if `< 30` days are present it **backfills the missing dates** by interpolating linearly between the two nearest stored snapshots (deterministic, clearly labeled "simulated" in the UI). Once enough real polls accumulate, simulated points age out. Always labeled in the chart legend with a small *simulated* badge.

**Polling engine (`RealtimeService`)**
- RxJS `timer(0, POLL_INTERVAL)` — default **60 s** (constant in `environments`). Exposed as a Signal `lastUpdated$`.
- Pauses when `document.hidden` and when `navigator.onLine === false`; resumes on visibility/online events.
- Exponential backoff on HTTP error (1s → 2s → 4s → …, capped 60s), resets on success.
- Manual refresh button bypasses the timer once.

**Cache (`CacheService`, IndexedDB via idb-keyval)**
- Keys: `latest::{base}`, `history::{base}`, `meta::lastFetch`, `meta::apiError`.
- Shape fully typed (`api.types.ts`). `get<T>(key)` returns `{ value, stale: boolean, fetchedAt }`.
- On app boot, `RatesService.loadLatest()` first serves cache then re-fetches; sets a `servedFromCache` signal that drives the offline indicator.

**Online detection (`OnlineService`)** — Signal wrapping `navigator.onLine` + window `online`/`offline` events. The app never blocks the user on offline — every fetch falls back to cache + the indicator shows "Offline — showing cached data".

**Rate limiting / failure modes**
- HTTP 401/403 (bad key) → toast "API key invalid — using cached data" + stop polling.
- Other 5xx / network → backoff + serve cache.
- All errors are non-fatal; the dashboard always renders.

**Conversion calculation** uses the live `latest` rates table already in memory (no extra call) unless a one-off `pair` call is preferred — design choice: use in-memory math from the latest snapshot to minimize API calls; fall back to `pair` endpoint only if the requested currencies aren't in the cached snapshot.

**Environment** — `apiBase`, `apiKey` injected via `envToken`. `apiKey` read from `process.env` via a `src/environments/environment.prod.ts` built by the CI step; in dev it can be empty and the app runs from cache (so the dev/test environment runs without keys).

**Tool: question**

---

## Assistant

## Design — Section 3 of 5: Components & UX flows

**App shell**
- `Nav-bar` (sticky, DESIGN.md `nav-bar`) with logo mark, links: *Dashboard · Rates · Trends · Converter*, theme toggle on the right (icon button, `:sun`/`:moon` SVG).
- `<router-outlet>` below.
- `Footer` (dark band, DESIGN.md `footer`).

**Home `/`** — single scroll layout, all four features stacked in this order:

1. **Hero band** (DESIGN.md `hero-band`, sage canvas) — Wise-Sans-weight-900 headline "Send money, see the market." (≈ `display-xl` on desktop, `display-md` on mobile) + an **embedded converter card** on the right (`currency-converter-card` token). This satisfies the brand's signature moment *and* the converter feature in one block.
2. **Rates table band** (`content-band`, white) — sortable table + search + currency filter.
3. **Trends band** (`card-feature-sage`-style) — multi-select ≤ 3 + aggregation toggle + chart.

**Rates table component (`features/rates-table`)**
- Columns: *Currency code* (with flag SVG), *Rate* (relative to current base — base selector as a pill dropdown at top-left of the table header), *Base*. (Base column reflects the chosen base; visible because the spec lists it.)
- Sortable column headers via `sort-header.directive` (click cycles asc → desc → off; arrow indicator).
- **Search** `text-input` (left), **Filter by currency** multi-select pill (right) — defaults to "Top 30 by trading volume"; "All" toggle reveals the full ~160.
- Row hover highlights; tap row → opens Trends pre-populated with that currency.
- Empty state when search returns nothing — `ex-empty-state-card` token.

**Trends component (`features/trends`)**
- Currency picker: chip-style multi-select, max 3 enforced. "Compare" hint shows "Pick up to 3".
- **Aggregation toggle** (segmented control): *Daily · Weekly · Monthly*. Weekly = bucket-to-week-start mean; Monthly = month-mean of the stored series.
- `ChartComponent` (thin wrapper over Chart.js `Line` instance): one line per selected currency, x = date, y = rate. Legend includes the *simulated* badge when applicable. Accessibility: `aria-label` describing series + a `<table>` mirroring the chart data for screen readers (hidden visually).

**Converter component (`features/converter`)** — embedded in hero on `/`, also a standalone `/converter` route.
- `text-input` amount, two currency pill-dropdowns (from/to), a swap button (`button-icon-circular`, rotates currencies + amount), live result label below.
- Uses the in-memory latest rates; result re-computes on any input change via `computed()`.

**Offline indicator (`features/offline-indicator`)** — top-center pill (`badge-negative` when offline, `badge-positive` when served-from-cache-with-stale-data, hidden when live). Polling-status text: *"Live · updated 12s ago"* via `signal` + `lastUpdated`.

**Theme service** — `theme` signal `'light' | 'dark'`. `toggle()` flips `<html data-theme>`. Initial value: `localStorage['cx-theme']` → `prefers-color-scheme: light` fallback. All DESIGN.md tokens become CSS custom properties with light/dark groups so component CSS never branches.

**Responsive** — breakpoints from DESIGN.md (Mobile < 768, Tablet 768–1023, Desktop ≥ 1024). Hero splits at desktop, stacks at tablet/mobile. Grids 1/2/3-up. Table collapses non-essential columns on mobile (keeps code+ rate).

**Tool: question**

---

## Assistant

## Design — Section 4 of 5: Error handling, accessibility, performance

**Error handling**
- **All rates fetches are non-fatal.** `RatesService.loadLatest()` returns a `Result<T, ApiError>` discriminated union; UI switches on a single `status` signal (`'live' | 'stale' | 'offline' | 'error'`). Table/converter always render from whatever data is available.
- **Polling error backoff** — described in §2. After 5 consecutive failures the polling interval doubles up to 5 min and a toast suggests verifying the API key.
- **Bad API key (HTTP 401/403)** — stop polling, show a `card-feature-dark` notice in the hero area: "Demo mode — showing cached sample rates. Add a valid ExchangeRateAPI key." Easy to spot during assessment review without crashing.
- **No data at all (cold cache + offline + no key)** — seeded sample rates baked into the bundle so the app never loads to a blank screen. Clearly labeled "sample data".
- **Toasts** (`ex-toast` token) for transient messages, auto-dismiss 4s, queued ≤ 3, never block UI.

**Accessibility (WCAG AA target)**
- Semantic landmarks: `<header>` nav, `<main>`, sections with `<h2>` headings, `<footer>`.
- Table is a real `<table>` with `<th scope="col">`, sortable headers are `<button>` with `aria-sort` reflecting state, live region for the sort description.
- Chart `aria-label` describes series; mirrored data table under chart for screen readers (visually hidden via `.sr-only`).
- All interactive controls ≥ 44 px target on mobile; color contrast: Wise green primary `#9fe870` on ink `#0e0f0c` passes AA for large text; inverted for body. Color is never the sole indicator — every rate change shows ↑/↓ glyph + value.
- Keyboard: full tab order, Esc closes dropdowns, focus-visible ring in brand primary.
- `prefers-reduced-motion` → disable chart animations + polling fetch spinner pulse.

**Performance**
- OnPush + Signals everywhere; chart uses `chart.update()` instead of re-creating instances.
- Currency list rendered with `*trackBy` on currency code; top-30 default avoids ~160-row paint.
- Routes lazy-loaded via `loadComponent`.
- Polling engine idles when tab hidden (`document.visibilitychange`).
- IndexedDB writes are debounced (1 s) to avoid write storms on rapid polls.
- Bundle budget enforced in CI: `maximumWarning` for main ≥ 300 KB, any lazy chunk ≥ 200KB.

**Tool: question**

---

## Assistant

## Design — Section 5 of 5: Testing & CI/CD

**Unit tests (Jasmine + Karma)**
- `ng test` headless Chrome (CI) / Chromium (local).
- Coverage targets: services ≥ 90%, components ≥ 80%, utils/pipes ≥ 95%, overall ≥ 85% (enforced via karma coverage thresholds — build fails below).
- **Services** — `RatesService` (success / 401 / 5xx / network → cache fallback), `HistoryService` (backfill interpolation edge cases: 0 points, 1 point, ≥30 points, leap-over gaps), `RealtimeService` (timer pause/resume on hidden, backoff sequence, manual-refresh short-circuit), `CacheService` (stale flag, version mismatch), `ThemeService` (persistence + system-preference fallback), `OnlineService` (events update signal).
- **Components** — table render, sort cycles, search filter, row→trends navigation; trends chart setup/teardown, max-3 enforcement, aggregation bucketing (uses fake `Date.now`); converter computed result on from/to/amount change + swap button; offline indicator states; chart wrapper canvas lifecycle.
- **Pipes/utils** — `sort.pipe`, `CurrencyFilterPipe`, `date-buckets` daily/weekly/monthly aggregation correctness, UTC offset stability.
- HTTP mocked with Angular `HttpTestingController`; timers with `fakeAsync`/`tick` + `jasmine.clock`.

**E2E tests (Cypress)**
- `cypress/e2e/` — `rates.cy.ts`, `converter.cy.ts`, `trends.cy.ts`, `theme.cy.ts`, `offline.cy.ts`.
- **Network stubbed** via `cy.intercept` against ExchangeRateAPI to deterministic fixtures (no flakiness, no key needed, runs offline in CI).
- Flows: load dashboard → assert table populated → search filters → sort toggles → open trends → pick 3 currencies → switch aggregation → assert chart legend/series count → switch theme → toggle offline via `cy.intercept` 5xx → assert cached + indicator → converter amount live-updates result.
- `cypress run` headless, Chrome, recorded video on failure.

**CI/CD — `.github/workflows/ci.yml`** (single workflow on push/PR to `main`):
1. **lint** — `npm run lint` (Angular ESLint, type-aware rules).
2. **typecheck** — `npx tsc -p tsconfig.app.json --noEmit`.
3. **unit** — `ng test --code-coverage --watch=false --browsers=ChromeHeadless`; upload `coverage/` artifact; fail if thresholds unmet.
4. **e2e** — `ng build` + `cypress run` (job runs after unit passes).
5. **build** — `ng build --configuration production` (prod EnvKey injected via `${{ secrets.EXCHANGERATE_API_KEY }}` → replace placeholder in `environment.prod.ts` with `sed`.
6. **deploy** — on `main` only: `gh-pages` action to publish `dist/currency-dashboard` to the `gh-pages` branch. Use Angular `baseHref: './'` and a `.nojekyll` file so deep links resolve.

**Quality gates on every commit**: pre-commit husky hook running `lint-staged` (eslint --fix, prettier --write), and a `verify` npm script (`lint && typecheck && test && e2e && build`).

**Tool: question**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: write**

---

## Assistant

Now the spec self-review per the brainstorming workflow.

**Tool: todowrite**

---

## Assistant

Self-review found one ambiguity worth tightening: "Top 30 by trading volume" — this list isn't computed at runtime. Let me make it explicit.

**Tool: edit**

---

## Assistant

**Tool: todowrite**

---

## Assistant

Spec written and saved to `docs/superpowers/specs/2026-07-14-currency-exchange-dashboard-design.md`. (I did **not** git-init or commit — the workflow recommends it but I'm respecting your "explicit commit only" preference; say the word and I'll init a repo and commit the spec.)

Please review the spec file and let me know if you want any changes before I move on to writing the implementation plan. A few things worth a second look:
- §3.2 derived-history interpolation — does the "simulated" labeling satisfy you, or would you prefer always showing a disclaimer banner?
- §6 coverage thresholds (services ≥ 90% / components ≥ 80% / utils ≥ 95% / overall ≥ 85%) — comfortable, or too aggressive for a 5-day window?
- §3.4 row-tap navigates to Trends pre-populated — does that feel right, or should tapping a row just toggle it into the trends multi-select without navigating?

**Tool: question**

---

## Assistant

Honestly — no, "simulated" sits slightly off the spec's intent. The spec (§1.2) says "compare exchange rate trends ... over the past month." A linearly interpolated series doesn't reflect real past-month rates; it only shows a plausible shape that ages into real data over time. It satisfies the *letter* (a past-month chart exists, aggregation toggle works), but the numbers aren't real historical rates — and an assessor reading the badge may judge that as cutting a corner.

There's a cleaner path that fully satisfies §1.2 with no key:

**frankfurter.app** (free, no API key, ECB-sourced) exposes:
- `GET /2025-06-01..2025-06-30?from=USD&to=EUR,GBP,JPY` — real daily timeseries.
- This is exactly "exchange rate trends ... over the past month", with `daily`/weekly`/`monthly` aggregation trivially derived.

The spec named ExchangeRateAPI only as an "**e.g.**" (§1.1), so using a second free, no-key source for the historical slice is within bounds. Hybrid data sources is a common production pattern.

My recommendation: revise the spec to **dual-source** — your real ExchangeRateAPI key for live rates + conversion (as you chose), and frankfurter.app for the historical timeline (real data, no key, no "simulated" caveat needed). It's strictly better forthe assessment.

**Tool: question**

---

## Assistant

Revising the spec to dual-source. Making targetededits.

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: grep**

---

## Assistant

**Tool: grep**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: grep**

---

## Assistant

**Tool: grep**

---

## Assistant

Spec revised to dual-source. Changes:
- §1 Decisions — historical-trends row now uses real frankfurter.app timeseries (no key, no "simulated" caveat).
- §3 — split data layer into ExchangeRateAPI (live+conversion) and frankfurter.app (history) endpoints; rewrote `HistoryService` as a real fetch + cache + aggregation layer; cache key now `history::{base}:{currencies}:{range}`.
- §4 Trends — removed the "simulated" badge; chart builds from real cached timeseries.
- §6 Tests — `HistoryService` test cases now cover frankfurter fetch/cache TTL/aggregation, no interpolation tests.

Verified no stale `simulated`/`interpolat`/`derive` references remain.

**Tool: question**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: write**

---

## Assistant

**Tool: bash**

---

## Assistant

Committed as `a85c6fb`. Now transitioning to the implementation plan via the writing-plansskill.

**Tool: todowrite**

---

## Assistant

Using the writing-plans skill to produce the implementation plan from the approved spec.

**Tool: skill**

---

## Assistant

I'm using the writing-plans skill to create the implementation plan.

**Tool: bash**

---

## Assistant

Now writing the implementation plan. Given the scope (24 tasks across 3 phases), this is a substantial document.

---

## User

update design doc, replace frankfurter with exchangerate-api, pro free trial support historical data

---

## Assistant

**Tool: grep**

---

## Assistant

**Tool: webfetch**

---

## Assistant

**Tool: webfetch**

---

## Assistant

Confirmed — ExchangeRate-API is the same provider named in the spec (the v6 host `v6.exchangerate-api.com` is exactly what was meant). The Historical endpoint requires Pro/Business/Volume plans, formats as `GET /v6/{KEY}/history/{BASE}/{YEAR}/{MONTH}/{DAY}` — one call per date returns all currencies. Building a 30-day series means 30 calls per base, so aggressive caching is critical.

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: grep**

---

## Assistant

Let me also update the bad-key message for consistency, and check the env / CI section mentions of the secretname.

**Tool: grep**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: bash**

---

## Assistant

Done — committed as `6718813`. Design doc now uses **ExchangeRate-API** (`v6.exchangerate-api.com`) as the single source, with a Pro free-trial key unlocking the **Historical** endpoint (`GET /v6/{KEY}/history/{BASE}/{YEAR}/{MONTH}/{DAY}`). Key updates:
- §1 Decisions — single source, Pro free trial; history fetched per-date and cached infinitely in IndexedDB (cold load ≈ 30 calls, warm load 0).
- §3 Data layer — replaces `frankfurter.app` with the ExchangeRate-API Historical endpoint; 200 ms sequential pacing; `quota-reached` handling that degrades to cached partial data.
- §3.5 Bad-key flow — message now references the Pro free trial.
- §6 — `HistoryService` test cases and E2E `cy.intercept` host updated.
- No stale `frankfurter` references remain.

---

