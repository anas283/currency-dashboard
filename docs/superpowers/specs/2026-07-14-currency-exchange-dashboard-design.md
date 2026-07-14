# Currency Exchange Rate Dashboard — Design

- **Date:** 2026-07-14
- **Source spec:** `spec.md` (Tranglo Front End Project Assessment)
- **Visual system:** `DESIGN.md` (Wise-inspired token set)
- **Stack:** Angular 18 (standalone) + Jasmine/Karma + Cypress
- **Deploy target:** GitHub Pages
- **Build order:** Core → Quality → Advanced

---

## 1. Decisions (locked during brainstorming)

| Topic | Decision |
|---|---|
| Framework | Angular 18 (standalone components, no NgModules). Jasmine/Karma unit, Cypress E2E — per spec, exactly. |
| Data source | ExchangeRateAPI v6 with a real, free-tier API key (user-provided; injected at build time). |
| Historical trends | The spec (§1.2) requires "exchange rate trends over the past month." ExchangeRateAPI's timeseries endpoint is paid-only, so the `HistoryService` fetches **real past-month timeseries** from **frankfurter.app** (ECB-sourced, free, no key). Live rates + conversion still come from your ExchangeRateAPI key. Dual-source is permitted — spec §1.1 names ExchangeRateAPI only as an "e.g.". |
| Real-time updates | RxJS `timer` polling, default 60 s. No WebSocket (free tier has none). Pauses when document hidden or offline; exponential backoff on errors. |
| Offline cache | IndexedDB via `idb-keyval` (≈1 KB). App always renders from cache first, then re-fetches. |
| Charts | Raw **Chart.js v4** wrapped by a thin `ChartComponent`. No ng2-charts. |
| Theming | CSS custom properties keyed off `<html data-theme="light|dark">`. Tokens from DESIGN.md. Choice persisted in `localStorage`, falls back to `prefers-color-scheme`. |
| Architecture | Standalone components + Angular Signals for state, RxJS for the polling engine, services `providedIn: root`. No NgRx. |
| CI/CD | GitHub Actions: lint → typecheck → unit → e2e → build → deploy to `gh-pages` branch. |
| Deploy base | `baseHref: './'` + `.nojekyll` so deep links resolve on GitHub Pages. |

## 2. Architecture & project layout

```
src/
  app/
    core/
      services/   rates history realtime cache theme online
      models/      currency.ts api.types.ts
      tokens/      env.token.ts                 // API url + key (from environments)
    features/
      rates-table/         sortable table + search + currency filter
      trends/              multi-select ≤3 + aggregation toggle + chart
      converter/           amount + from/to + swap + live result
      offline-indicator/   status pill + last-updated timestamp
    shared/
      components/  chart/ button/ card/ badge/ text-input/
      pipes/       sort.pipe currency-filter.pipe
      directives/  sort-header.directive
      utils/       date-buckets.ts             // daily/weekly/monthly aggregation
    ui/                       // DESIGN.md atoms
      button/ card/ badge/ text-input/ nav-bar/ footer/ hero-band/
  styles/  _tokens.scss _theme.scss _typography.scss
  environments/  environment.ts  environment.prod.ts
```

### Routing

- `/` — combined dashboard (hero+converter, rates table, trends stacked).
- `/rates`, `/trends`, `/converter` — individual section routes (lazy via `loadComponent`).

### State boundaries

- Each feature owns its signals (`rateRows`, `trendsSelection`, `converterResult`); components OnPush.
- Cross-cutting state (online status, servedFromCache flag, last-fetched timestamp, base currency, theme) lives in `core` services, injected where needed.
- No global store; no NgRx.

### Build phases

1. **Phase 1 — Core.** App shell + DESIGN.md token system + theme service skeleton; rates table (sort/search/filter); converter; offline indicator shell.
2. **Phase 2 — Quality.** Karma config + unit tests; Cypress E2E for key flows; GitHub Actions pipeline; bundle budget; pre-commit hooks.
3. **Phase 3 — Advanced.** Trends chart + aggregation toggle; real-time polling engine; IndexedDB cache; offline indicator states; dark theme polish.

## 3. Data layer

### ExchangeRateAPI (https://v6.exchangerateapi.com) — live + conversion

| Endpoint | Used for | Tier |
|---|---|---|
| `GET /v6/{KEY}/latest/{BASE}` | latest rates table | free |
| `GET /v6/{KEY}/pair/{FROM}/{TO}/{AMOUNT}` | one-off conversion (only when currencies missing from cached snapshot) | free |

Historical/timeseries endpoints on ExchangeRateAPI are paid — **not used.**

### frankfurter.app (https://api.frankfurter.app) — history (ECB-sourced, no key)

| Endpoint | Used for |
|---|---|
| `GET /{fromDate}..{toDate}?from={BASE}&to={CUR1,CUR2,CUR3}` | real past-month timeseries for the Trends chart |
| `GET /currencies` | canonical currency code → name + flag mapping |

No API key, CORS-enabled, daily granularity. The Trends view calls this once on selection change; the result is cached in IndexedDB keyed by `{base, currencies, month-range}`.

### History fetch (`HistoryService`)

- On Trends load (or selection change), fetch the real past-30-day timeseries from frankfurter for each selected currency against the chosen base.
- Cache the response in IndexedDB keyed by `{base, currencies:[cur1,cur2,cur3], range: 'YYYY-MM-DD..YYYY-MM-DD'}`; reuse within the day, refetch when the user changes selection or 24 h elapse.
- Aggregation (`Daily` / `Weekly` / `Monthly`) is computed client-side from the cached daily points via `date-buckets` util — no extra network calls.
  - **Daily** → as fetched.
  - **Weekly** → bucket by ISO week-start (Monday), mean of points in the week.
  - **Monthly** → mean across all points in the month (when range spans < 31 days, this is identical to "past month mean").
- Offline behavior: if frankfurter fetch fails while cache exists, serve cache and show the `badge-negative` offline indicator. If no cache and offline → empty state (no chart) with a "History unavailable offline" message.

### Polling engine (`RealtimeService`)

- RxJS `timer(0, POLL_INTERVAL)` — `POLL_INTERVAL=60000` in `environments`.
- Pauses when `document.hidden` (visibilitychange) OR `navigator.onLine === false`. Resumes on the opposite event.
- Exponential backoff on HTTP error: 1s → 2s → 4s → 8s → … cap 60s. Resets to base on success.
- After 5 consecutive failures, doubles base interval up to 5 min and emits a toast suggesting the user verify the API key.
- Manual refresh button short-circuits the timer once.
- Exposes Signals: `lastUpdated$` (timestamp), `status$` (`'live' | 'polling' | 'backing-off' | 'paused' | 'offline' | 'error'`).

### Cache (`CacheService`, IndexedDB via idb-keyval)

- Keys: `latest::{base}`, `history::{base}:{currencies}:{range}`, `meta::lastFetch`, `meta::apiError`, `meta::schemaVersion`.
- `get<T>(key)` returns `{ value, stale: boolean, fetchedAt }` where `stale = now - fetchedAt > STALE_THRESHOLD` (default 15 min).
- On boot `RatesService.loadLatest()` serves cache immediately, then re-fetches; sets `servedFromCache` signal that drives the offline indicator.
- Schema version guards old cache shapes on app upgrades.

### Online detection (`OnlineService`)

- Signal wrapping `navigator.onLine` + `window.online`/`window.offline` events.

### Failure modes (all non-fatal)

| Condition | Behavior |
|---|---|
| HTTP 401/403 (bad key) | Stop polling, show `card-feature-dark` notice in hero: "Demo mode — using cached sample rates. Add a valid ExchangeRateAPI key." Serve cache. |
| HTTP 5xx / network | Backoff poll, serve cache, show `badge-negative` indicator. |
| Cold cache + offline + no key | Render **seeded sample rates** bundled in the app; labeled "sample data". |
| Any payload validation error | Treat as network error; serve cache. |

The dashboard **never** loads to a blank screen.

### Environment

- `apiBase`, `apiKey` injected via `envToken`.
- In dev, `apiKey` can be empty → app runs from cache + sample data so tests/dev never need a key.
- In prod, CI replaces a placeholder in `environment.prod.ts` with `${{ secrets.EXCHANGERATE_API_KEY }}` via `sed` before build.

## 4. Components & UX flows

### App shell

- Sticky `Nav-bar` (DESIGN.md `nav-bar`): logo, links *Dashboard · Rates · Trends · Converter*, theme toggle (`button-icon-circular` with sun/moon SVG).
- `<router-outlet>` below; `<footer>` (dark band, DESIGN.md `footer`) at the bottom of every page.

### Home `/` (combined dashboard)

1. **Hero band** (DESIGN.md `hero-band`, sage canvas). Wise-Sans-weight-900 headline "Send money, see the market." — `display-xl` (64 px) on desktop, `display-md` (40 px) on mobile. But the converter on the right (`currency-converter-card`) — brand's signature moment — replaces a separate converter route for first impression.
2. **Rates table band** (`content-band`, white).
3. **Trends band** (`card-feature-sage`-style band).

### Rates table (`features/rates-table`)

- Columns: **Currency code** (with flag SVG), **Rate** (relative to the selected base), **Base** (echoes the chosen base).
- Sortable headers via `SortHeaderDirective` — click cycles asc → desc → off; arrow indicator + `aria-sort`.
- **Base selector** — pill dropdown top-left of table header.
- **Search** (`text-input`, left) — substring match on currency code or common name.
- **Currency filter** — multi-select pill (right). Defaults to a curated static **"Top 30" list** (seeded from a well-known FX trading-volume ranking, baked into the app bundle — not computed at runtime); "All" toggle reveals the full ~160.
- Row hover highlight; tap row → navigates to Trends pre-populated with that currency.
- Empty state when search yields nothing — `ex-empty-state-card`.

### Trends (`features/trends`)

- Currency picker: chip-style multi-select, max **3** enforced (4th pick disabled with hint "Max 3 reached — remove another to add").
- **Aggregation toggle** — segmented control: *Daily · Weekly · Monthly*. Weekly buckets to week-start (Mon) mean; Monthly computes month mean of stored series.
- `ChartComponent` (thin wrapper around a Chart.js `Line` instance): one line per selected currency, x=date, y=rate. Builds from the real past-30-day timeseries returned by frankfurter (cached in IndexedDB).
- Accessibility mirror: real `<table>` (visually hidden via `.sr-only`) representing the chart series for screen readers.
- Pre-populated target currency when navigated from a table row.

### Converter (`features/converter`)

- Embedded in hero on `/`, also wired at `/converter`.
- `text-input` amount; two currency pill-dropdowns (from/to); `button-icon-circular` swap (rotates currencies + amount); live result label.
- Result computed via `computed()` from the in-memory latest snapshot — no API call unless both currencies are absent from the snapshot, in which case the `pair` endpoint is used as a fallback.

### Offline indicator (`features/offline-indicator`)

- Top-center pill:
  - `badge-positive` — "Live · updated 12s ago" when polling healthy.
  - `badge-positive` (amber-tinted) — "Cached · fetched {n}m ago" when serving stale cache.
  - `badge-negative` — "Offline — showing cached data".
- Label driven by `RealtimeService.status$`.

### Theme service (`ThemeService`)

- `theme` signal `'light' | 'dark'`. `toggle()` flips `<html data-theme>`. Initial value: `localStorage['cx-theme']` → `prefers-color-scheme` fallback.
- All DESIGN.md tokens materialized as CSS custom properties; `_theme.scss` defines light + dark groups so component CSS never branches on theme.

### Responsive

- Mobile (< 768 px): hero stacks; converter card full-width below headline; grids 1-up; rates table drops the `Base` column, keeps *code + rate*.
- Tablet (768–1023 px): grids 2-up.
- Desktop (≥ 1024 px): hero split (headline left, converter right); 3-up grids.

## 5. Error handling, accessibility, performance

### Error handling

- All fetches return a `Result<T, ApiError>` discriminated union; UI switches on a single `status` signal (`'live' | 'stale' | 'offline' | 'error'`). Table/converter always render from whatever data is available.
- Bad-key flow stops polling and renders a `card-feature-dark` notice in the hero (see §3.5).
- Toasts (`ex-toast`) for transient messages, auto-dismiss 4 s, queue capped at 3, never block UI.

### Accessibility (WCAG AA target)

- Semantic landmarks: `<header>`, `<main>`, section `<h2>`s, `<footer>`.
- Table: real `<table>`, `<th scope="col">`, sortable headers are `<button>` with `aria-sort` reflecting state; live region announces sort description.
- Chart: `aria-label` describing series + visually-hidden mirror `<table>`.
- Interactive controls ≥ 44 px target on mobile. Wise green primary `#9fe870` on ink `#0e0f0c` passes AA for large text; inverted for body. Color never the sole indicator — every rate change shows ↑/↓ glyph + value.
- Keyboard: tab order, Esc closes dropdowns, brand-green `:focus-visible` ring.
- `prefers-reduced-motion` disables chart animations and the polling spinner pulse.

### Performance

- OnPush + Signals everywhere; `ChartComponent` calls `chart.update()` instead of recreating instances.
- Currency list uses `trackBy` on currency code; top-30 default avoids ~160-row paint.
- Routes lazy via `loadComponent`.
- Polling idles when tab hidden.
- IndexedDB writes debounced 1 s to avoid write storms on rapid polls.
- Bundle budget in CI: warn if main ≥ 300 KB or any lazy chunk ≥ 200 KB.

## 6. Testing & CI/CD

### Unit tests (Jasmine + Karma)

- `ng test --code-coverage --watch=false --browsers=ChromeHeadless` in CI.
- Coverage thresholds enforced (Karma coverage karma config): **services ≥ 90 %, components ≥ 80 %, utils/pipes ≥ 95 %, overall ≥ 85 % — build fails below.**
- Services
  - `RatesService` — success / 401 / 5xx / network → cache fallback.
  - `HistoryService` — frankfurter fetch success / 5xx / network failure (serve cache → empty-state), range boundary correctness (inclusive end date), selection-change refetch, 24 h cache TTL, daily/weekly/monthly aggregation outputs (week-start = Monday, DST stability).
  - `RealtimeService` — timer pause/resume on `document.hidden`, backoff sequence, manual-refresh short-circuit.
  - `CacheService` — stale flag math, schema-version mismatch invalidates old cache.
  - `ThemeService` — persistence + system-preference fallback.
  - `OnlineService` — `online`/`offline` events update signal.
- Components
  - Rates table: render, sort cycles, search filter, row → trends navigation.
  - Trends: chart setup/teardown, max-3 enforcement, aggregation bucketing (fake `Date.now`).
  - Converter: `computed` result on from/to/amount change + swap button.
  - Offline indicator: all status states.
  - Chart wrapper: canvas lifecycle (create / update / destroy).
- Pipes / utils
  - `SortPipe` asc/desc/off.
  - `CurrencyFilterPipe` substring + multi-select intersection.
  - `date-buckets` daily/weekly/monthly bucket correctness, week-start (Monday) adherence, UTC offset stability.
- HTTP via Angular `HttpTestingController`; timers via `fakeAsync` + `tick` + `jasmine.clock`.

### E2E tests (Cypress)

- `cypress/e2e/`: `rates.cy.ts`, `converter.cy.ts`, `trends.cy.ts`, `theme.cy.ts`, `offline.cy.ts`.
- **Network stubbed via `cy.intercept`** against ExchangeRateAPI → deterministic fixtures (no flakiness, no key needed, runs offline in CI).
- Flows covered:
  - Dashboard loads → table populated → search filters → sort toggles → row navigates to Trends.
  - Trends: pick 3 currencies (4th blocked) → toggle aggregation → assert legend / series count.
  - Theme: toggle persists across reload.
  - Offline: `cy.intercept` returns 5xx → assert cached + `badge-negative` indicator.
  - Converter: amount change live-updates result; swap button flips from/to.
- `cypress run` headless Chrome, video on failure.

### CI/CD — `.github/workflows/ci.yml`

Single workflow on push/PR to `main`:

1. **lint** — `npm run lint` (Angular ESLint, type-aware).
2. **typecheck** — `npx tsc -p tsconfig.app.json --noEmit`.
3. **unit** — `ng test --code-coverage --watch=false --browsers=ChromeHeadless`; upload `coverage/` artifact; fail on threshold breach.
4. **e2e** — `ng build` + `cypress run` (depends on unit passing).
5. **build** — `ng build --configuration production`; inject `${{ secrets.EXCHANGERATE_API_KEY }}` into `environment.prod.ts` via `sed` before build.
6. **deploy** — on `main` only: publish `dist/currency-dashboard` to `gh-pages` branch via `peaceiris/actions-gh-pages`. Angular `baseHref: './'` + `.nojekyll` for deep-link support.

### Quality gates

- Pre-commit Husky hook running `lint-staged` (eslint --fix, prettier --write).
- `npm run verify` script: `lint && typecheck && test && e2e && build`.

## 7. README outline

The repo `README.md` will contain:
- Project overview + live staging URL (GitHub Pages).
- Run locally: `npm ci`, `npm start` (dev without key runs from cache/sample), `npm test`, `npm run e2e`, `npm run build`.
- How to provide an API key (`.env` or GitHub Actions secret `EXCHANGERATE_API_KEY`).
- Architecture overview (mirrors §2 of this doc, condensed).
- Architecture decisions (mirrors §1 of this doc).
- Folder map.
- Testing strategy + coverage gates.
- CI/CD stages + how to deploy from a fork.

## 8. Out of scope (YAGNI)

- Multi-user accounts / auth — not in spec.
- Push notifications — not in spec.
- Server-side rendering — adds complexity with no assessment payoff.
- Real WebSocket streaming — free tier doesn't support it; polling satisfies spec.
- Currency watchlist/alerting — not in spec.
- Native mobile build — responsive web is sufficient.