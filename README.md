# Currency Exchange Rate Dashboard

Live demo: <https://anas.github.io/currency-dashboard>

A real-time Currency Exchange Rate Dashboard built with Angular 22.
It shows sortable exchange rates, historical trend charts, a currency
converter, offline support, and light/dark theming.

---

## Tech Stack

- **Framework:** Angular 22.0.6 (standalone components, signals, RxJS)
- **Language:** TypeScript 6.0 (strict mode)
- **Styling:** SCSS + CSS custom properties for theming
- **Charts:** Chart.js 4.5.1
- **Offline cache:** IndexedDB via `idb-keyval` 6.3
- **Testing:** Karma 6.4 + Jasmine (unit), Cypress 15.18 (E2E)
- **Linting:** ESLint via `@angular-eslint` 22.1
- **CI/CD:** GitHub Actions → GitHub Pages

---

## Getting Started

```bash
git clone https://github.com/anas/currency-dashboard.git
cd currency-dashboard
npm install
npm start
```

Open <http://localhost:4200> in your browser. The dev server reloads
automatically on file changes.

---

## API Key

The app consumes [ExchangeRate-API] (v6 endpoints: `latest`, `pair`,
`history`).

[ExchangeRate-API]: https://www.exchangerate-api.com

1. Sign up for a free key at <https://www.exchangerate-api.com>.
2. Add the key to `src/environments/environment.ts`:

   ```typescript
   export const environment = {
     apiBase: 'https://v6.exchangerate-api.com/v6',
     apiKey: 'YOUR_KEY_HERE',
     pollInterval: 60_000,
     staleThreshold: 300_000,
   };
   ```

   The production build uses `src/environments/environment.prod.ts`,
   where the key is injected by CI via `secrets.EXCHANGERATE_API_KEY`.

3. If `apiKey` is left empty, the app runs from:
   - cached IndexedDB data (if available), or
   - built-in sample rates (`sample-rates.json`) as a fully offline
     fallback.

---

## Architecture Overview

- **Standalone components** — no `NgModule`s; each component is
  self-contained.
- **Angular Signals** — state lives in services as signals; components
  read with `computed` and bind directly in templates.
- **Services (`providedIn: 'root'`)**
  - `RatesService` — fetches latest rates, caches them, and falls back
    to sample data.
  - `HistoryService` — loads historical time-series and aggregates
    daily / weekly / monthly.
  - `RealtimeService` — RxJS `timer` polling engine with exponential
    backoff; pauses when the tab is hidden or the browser goes offline.
  - `CacheService` — typed IndexedDB wrapper with schema versioning and
    stale thresholds.
  - `OnlineService` — tracks `navigator.onLine` with window event
    listeners.
  - `ThemeService` — toggles light/dark themes by setting
    `<html data-theme>` and persists the choice in `localStorage`.
- **Theming** — CSS custom properties keyed off `data-theme`; no
  runtime stylesheet swaps.
- **Offline / cache strategy** — every API read checks IndexedDB first,
  serves cached data immediately, then refreshes from the network. If the
  network fails and no cache exists, sample data is used and an offline
  indicator is shown.

---

## Folder Structure

```text
src/app/
├── core/
│   ├── services/          # Rates, History, Realtime, Cache, Online, Theme
│   ├── models/            # TypeScript interfaces and API types
│   └── tokens/            # ENV_TOKEN injection token
├── features/
│   ├── home/              # Landing / dashboard shell
│   ├── rates-table/       # Sortable, searchable rates grid
│   ├── trends/            # Multi-currency historical chart
│   ├── converter/         # Amount + from/to currency calculator
│   └── offline-indicator/ # Badge when data is stale or offline
├── shared/
│   ├── components/
│   │   └── chart/         # Thin Chart.js wrapper
│   ├── pipes/             # SortPipe, CurrencyFilterPipe
│   ├── directives/        # SortHeaderDirective
│   └── utils/             # Date-bucketing helpers
└── ui/
    ├── nav-bar/           # Top navigation
    ├── hero-band/         # Hero banner
    ├── card/              # Reusable card shell
    ├── badge/             # Status badge
    ├── button/            # Action buttons
    ├── text-input/        # Form inputs
    └── footer/            # Page footer
```

---

## Testing

### Unit tests

```bash
npm test
```

Runs Karma in headless Chrome, collects coverage, and then checks
category thresholds:

| Category    | Threshold |
|-------------|-----------|
| Services    | ≥ 90 %    |
| Components  | ≥ 80 %    |
| Utils/Pipes | ≥ 95 %    |
| Overall     | ≥ 85 %    |

### End-to-end tests

```bash
npm run e2e
```

Builds the production bundle, serves it locally, and runs Cypress
headless. Coverage includes rates loading, currency conversion, theme
toggle, offline mode, and trends chart.

---

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. `npm ci`
2. Inject production API key into `environment.prod.ts`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`
6. `npm run e2e`
7. `npm run build`
8. Deploy `dist/currency-dashboard/browser` to GitHub Pages (only on
   `main` push)

A `.nojekyll` file at the repo root disables Jekyll processing so
deep-linking works on GitHub Pages. The build uses `baseHref: './'`
for relative path compatibility.

---

## Scripts

| Script              | Description                                            |
|---------------------|--------------------------------------------------------|
| `npm start`         | Dev server (`ng serve`)                                |
| `npm run build`     | Production build (ng build --configuration production) |
| `npm test`          | Unit tests + coverage + category gate                  |
| `npm run test:watch`| Unit tests in watch mode                               |
| `npm run lint`      | ESLint                                                 |
| `npm run typecheck` | TypeScript `noEmit` check                              |
| `npm run e2e`       | Build + serve + Cypress headless                       |
| `npm run verify`    | Lint → typecheck → test → e2e (full validation)        |
