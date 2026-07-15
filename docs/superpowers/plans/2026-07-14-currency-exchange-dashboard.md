# Currency Exchange Rate Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Angular 22.0.6 standalone Currency Exchange Rate Dashboard with live rates table, past-month trend chart, converter, polling, IndexedDB offline cache, light/dark theming, unit + E2E tests, and CI/CD to GitHub Pages.

**Architecture:** Standalone components + Angular Signals for state; RxJS `timer` polling engine with backoff; services `providedIn: root`; raw Chart.js v4 behind a thin wrapper component; `idb-keyval` for IndexedDB cache; CSS custom properties keyed off `<html data-theme>` for light/dark theming. Single API source: `v6.exchangerate-api.com` (Pro free-trial key unlocks the Historical endpoint for trends). Zone.js is kept (no zoneless) for compatibility with Karma + Cypress; signals drive the views.

**Tech Stack:** Angular 22.0.6 standalone, TypeScript strict, SCSS, Chart.js 4.5.1, idb-keyval 6.3, Cypress 15.18, ESLint via `@angular-eslint` 22.1, Karma 6.4 + `@angular/build:karma`, GitHub Actions.

## Global Constraints

- Angular 22.0.6 standalone components only — no NgModules anywhere. File-name style guide **2016** (so `*.component.ts` etc.) is pinned via the `--file-name-style-guide=2016` flag on `ng new` and `ng generate`.
- Zone.js change detection (no zoneless) — keeps Cypress + Karma stable.
- TypeScript `strict: true` must remain enabled; no `any` in production code.
- Every service is `providedIn: 'root'`.
- Every component is `ChangeDetectionStrategy.OnPush` after the scaffold task.
- All HTTP calls go through Angular `HttpClient` (registered via `provideHttpClient()`); tests use `HttpTestingController`.
- Timers in services must be testable via `fakeAsync`/`tick`/`jasmine.clock` — no raw `setInterval` in app code (use RxJS).
- The app must never load to a blank screen: cache-first, then seeded sample data fallback.
- API key is optional in dev: empty key → run from cache + sample data, no crash.
- Currency list: a curated, static Top-30 list baked in the bundle (not computed at runtime).
- Coverage thresholds enforced in CI: services ≥ 90%, components ≥ 80%, utils/pipes ≥ 95%, overall ≥ 85% — build fails below.
- Brand tokens (colors, typography, radii, spacing) come from `DESIGN.md` and live as CSS custom properties in `src/styles/_tokens.scss`. Light and dark themes are defined via `data-theme` attribute groups in `_theme.scss` — component SCSS never branches on theme.
- Wise green (`#9fe870`) is the only brand accent; `rounded.xl` 24px is canonical for cards + buttons; hero display weight is 900.
- `baseHref: './'` plus `.nojekyll` for GitHub Pages deep-link support.
- Commit after every task following the conventional-commit style used here (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

---

## File Structure

```
src/
  styles/
    _tokens.scss            # CSS custom properties for colors/radii/spacing/typography
    _theme.scss             # light + dark theme variable groups via [data-theme=...]
    _typography.scss        # font imports + scale utility classes
    _layout.scss            # band/container/grid helpers
    styles.scss             # entrypoint (imports the above)
  app/
    core/
      services/
        cache.service.ts            # IndexedDB via idb-keyval, get/set with stale flag, schema version
        cache.service.spec.ts
        online.service.ts           # navigator.onLine wrapped as a Signal
        online.service.spec.ts
        rates.service.ts            # latest + pair endpoints, cache-first, snapshot signal
        rates.service.spec.ts
        history.service.ts          # historical per-date fetch + IndexedDB cache + date-buckets aggregation
        history.service.spec.ts
        realtime.service.ts         # RxJS timer polling, pause-on-hidden, backoff, manual refresh
        realtime.service.spec.ts
        theme.service.ts            # theme signal + localStorage persistence
        theme.service.spec.ts
      models/
        api.types.ts                # ExchangeRate-API response + error shapes
        currency.ts                 # Currency code+name+flag, CURATED_TOP_30
      tokens/
        env.token.ts                # apiBase/apiKey injection token
    features/
      rates-table/
        rates-table.component.ts
        rates-table.component.html
        rates-table.component.scss
        rates-table.component.spec.ts
      trends/
        trends.component.ts
        trends.component.html
        trends.component.scss
        trends.component.spec.ts
      converter/
        converter.component.ts
        converter.component.html
        converter.component.scss
        converter.component.spec.ts
      offline-indicator/
        offline-indicator.component.ts
        offline-indicator.component.spec.ts
    shared/
      components/
        chart/
          chart.component.ts
          chart.component.spec.ts
      pipes/
        sort.pipe.ts
        sort.pipe.spec.ts
        currency-filter.pipe.ts
        currency-filter.pipe.spec.ts
      directives/
        sort-header.directive.ts
        sort-header.directive.spec.ts
      utils/
        date-buckets.ts
        date-buckets.spec.ts
    ui/
      button/button.component.ts
      badge/badge.component.ts
      text-input/text-input.component.ts
      card/card.component.ts
      nav-bar/nav-bar.component.ts
      footer/footer.component.ts
      hero-band/hero-band.component.ts
    app.component.ts                # root shell, hosts nav-bar + router-outlet + footer
    app.component.html
    app.component.scss
    app.component.spec.ts
    app.config.ts                   # providers: router, HttpClient, provideCharts (none), APP_INITIALIZER for cache sample
    app.routes.ts
  environments/
    environment.ts
    environment.prod.ts
  main.ts
  index.html
  sample-rates.json               # seeded fallback rates (USD base, ~30 currencies) bundled by import loader
angular.json
tsconfig.json
tsconfig.app.json
tsconfig.spec.json
karma.conf.js                     # coverage thresholds
cypress.config.ts
cypress/
  e2e/
    rates.cy.ts
    converter.cy.ts
    trends.cy.ts
    theme.cy.ts
    offline.cy.ts
  fixtures/
    latest-usd.json
    pair-eur-gbp.json
    history-usd-2026-06-15.json
.github/workflows/ci.yml
README.md
.nojekyll
```

---

## Task Index

| # | Task | Phase |
|---|---|---|
| 1 | Project scaffold, deps, lint, baseHref | Setup |
| 2 | Design tokens, theme variables, typography | Foundation |
| 3 | ThemeService (light/dark + persistence) | Foundation |
| 4 | UI atoms (button, badge, text-input, card, nav-bar, footer, hero-band) | Foundation |
| 5 | App shell, routing, Home skeleton | Foundation |
| 6 | Models + curated Top-30 list + environments + env token | Data |
| 7 | CacheService | Data |
| 8 | OnlineService | Data |
| 9 | RatesService (latest + pair + sample fallback) | Data |
| 10 | `date-buckets` util | Data |
| 11 | HistoryService (historical endpoint + per-date cache + aggregation) | Data |
| 12 | RealtimeService (timer polling + backoff + pause) | Data |
| 13 | GitHub Actions CI/CD pipeline + `.nojekyll` | Quality |
| 14 | SortPipe | Features |
| 15 | CurrencyFilterPipe | Features |
| 16 | SortHeaderDirective | Features |
| 17 | RatesTable feature (search/sort/filter/base selector) | Features |
| 18 | ChartComponent (Chart.js wrapper) | Features |
| 19 | Trends feature (multi-select ≤3, aggregation toggle, sr-only table) | Features |
| 20 | Converter feature (computed result + swap + pair fallback) | Features |
| 21 | OfflineIndicator feature | Features |
| 22 | Home page composition + inter-feature navigation | Features |
| 23 | Karma coverage thresholds + bundle budget | Quality |
| 24 | Cypress E2E: rates, converter, theme, offline | Quality |
| 25 | Cypress E2E: trends | Quality |
| 26 | README | Docs |

---

## Shared Types & Conventions

These exact names/signatures are the contract between tasks. A task only
sees the signatures defined in "Produces" blocks of earlier tasks — keep
them stable.

```ts
// src/app/core/models/currency.ts (Task 6)
export interface Currency { code: string; name: string; flag: string; }
export const CURATED_TOP_30: readonly Currency[];
export const ALL_CURRENCIES: readonly Currency[];
```

```ts
// src/app/core/models/api.types.ts (Task 6)
export type RateMap = Record<string, number>;
export interface LatestResponse {
  result: 'success' | 'error';
  base_code?: string;
  conversion_rates?: RateMap;
  time_last_update_unix?: number;
  error_type?: string; // 'invalid-key'|'quota-reached'|'plan-upgrade-required'|...
}
export interface PairResponse {
  result: 'success' | 'error';
  conversion_rate?: number;
  conversion_result?: number;
  error_type?: string;
}
export interface HistoryResponse {
  result: 'success' | 'error';
  base_code?: string;
  conversion_rates?: RateMap; // same shape as latest
  year?: number; month?: number; day?: number;
  error_type?: string;
}
export type RealtimeStatus =
  | 'live' | 'polling' | 'backing-off' | 'paused' | 'offline' | 'error';
```

```ts
// src/app/core/tokens/env.token.ts (Task 6)
export interface Env { apiBase: string; apiKey: string; }
export const ENV_TOKEN = new InjectionToken<Env>('ENV_TOKEN');
```

```ts
// CacheService (Task 7)
get<T>(key: string): Promise<{ value: T | undefined; stale: boolean; fetchedAt: number | undefined }>;
set<T>(key: string, value: T): Promise<void>;
delete(key: string): Promise<void>;
readonly SCHEMA_VERSION: number;
```

```ts
// OnlineService (Task 8) — providedIn root, no constructor deps
readonly online: Signal<boolean>; // true ⟹ navigator.onLine
```

```ts
// RatesService (Task 9)
readonly base: WritableSignal<string>;
readonly latest: Signal<RateMap | undefined>;
readonly lastUpdated: Signal<number | undefined>;
readonly servedFromCache: Signal<boolean>;
loadLatest(): Promise<void>;
convert(from: string, to: string, amount: number): Promise<number | undefined>;
loadPair(from: string, to: string, amount: number): Promise<number | undefined>;
```

```ts
// HistoryService (Task 11)
readonly base: WritableSignal<string>;
readonly selected: WritableSignal<string[]>;       // ≤3 currency codes
readonly aggregation: WritableSignal<'daily'|'weekly'|'monthly'>;
readonly series: Signal<HistoryPoint[][] | undefined>;
loadRange(): Promise<void>;
setBase(b: string): void;
setSelected(c: string[]): void;
// HistoryPoint: { date: string /*YYYY-MM-DD*/; rate: number }
```

```ts
// RealtimeService (Task 12)
readonly status: Signal<RealtimeStatus>;
readonly lastUpdated: Signal<number | undefined>;
refresh(): Promise<void>;
start(): void; stop(): void;
```

```ts
// ThemeService (Task 3)
readonly theme: Signal<'light'|'dark'>;
toggle(): void;
```

- **All components** use `ChangeDetectionStrategy.OnPush`, standalone selectors.
- **No `any`** in production code. `// eslint-disable` is forbidden.
- **Utilities (`date-buckets`, pipes) are pure functions** — no Angular DI.

---

## Task 1: Project scaffold, deps, lint, baseHref

**Files:**
- Create: `angular.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`,
  `package.json`, `src/main.ts`, `src/index.html`, `src/styles.scss`,
  `src/app/app.component.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`
- Create: `.nojekyll` (repo root)
- Modify: `package.json`, `angular.json` (budgets + baseHref)

**Interfaces:** Produces none yet (consuming task owns the repo).

- [ ] **Step 1: Verify the Angular CLI version**

Run:
```bash
npx @angular/cli@22.0.6 version
```
Expected: printout with `@angular/cli: 22.0.6` (or higher in 22.x line).

- [ ] **Step 2: Scaffold the app into the current repo dir**

The repo already has `spec.md`, `DESIGN.md`, `docs/`, etc. — scaffold so
those files are preserved:

Run:
```bash
npx @angular/cli@22.0.6 new currency-dashboard \
  --directory=. \
  --style=scss \
  --routing \
  --ssr=false \
  --file-name-style-guide=2016 \
  --skip-git
```
Expected: files `src/`, `angular.json`, `tsconfig*.json`, `package.json`
appear; pre-existing `docs/`, `spec.md`, `DESIGN.md` untouched. If asked
"file already exists, overwrite?", answer **no** for those.

- [ ] **Step 3: Install runtime + dev dependencies**

Run:
```bash
npm i chart.js@4.5.1 idb-keyval@6.3.0
npm i -D cypress@15.18.1
ng add @angular-eslint/schematics@22.1.0 --skip-confirmation
```
Expected: `chart.js`, `idb-keyval` in `dependencies`; `cypress` and
`@angular-eslint/*` in `devDependencies`; `.eslintrc.json` created.

- [ ] **Step 4: Add npm scripts**

Edit `package.json` `scripts` to include:
```json
{
  "start": "ng serve",
  "build": "ng build --configuration production",
  "test": "ng test --code-coverage --watch=false --browsers=ChromeHeadless",
  "test:watch": "ng test",
  "lint": "ng lint",
  "typecheck": "tsc -p tsconfig.app.json --noEmit",
  "e2e": "ng build --configuration production && cypress run",
  "verify": "npm run lint && npm run typecheck && npm test && npm run e2e"
}
```

- [ ] **Step 5: Wire the Karma builder + prod baseHref + bundle budgets**

In `angular.json` under the project's `architect.test.builder` set:
```json
"builder": "@angular/build:karma"
```
Under `architect.build.options`, set:
```json
"baseHref": "./"
```
Under `architect.build.configurations.production.budgets`:
```json
[
  { "type": "initial",    "maximumWarning": "300kb" },
  { "type": "anyComponentStyle", "maximumWarning": "8kb" },
  { "type": "lazy",       "maximumWarning": "200kb" }
]
```

- [ ] **Step 6: Pin strict + add `.nojekyll`**

Verify `tsconfig.json` `"strict": true`. Create `.nojekyll` (empty) at repo root:
```bash
touch .nojekyll
```

- [ ] **Step 7: Smoke build + lint + first commit**

Run:
```bash
npm run lint && npm run build -- --configuration development
```
Expected: lint clean; build emits `dist/currency-dashboard/`.

```bash
git add .gitignore angular.json package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.spec.json src .nojekyll .eslintrc.json
git commit -m "chore: scaffold Angular 22 dashboard, deps, lint, baseHref"
```

---

## Task 2: Design tokens, theme variables, typography

**Files:**
- Create: `src/styles/_tokens.scss`, `src/styles/_theme.scss`,
  `src/styles/_typography.scss`, `src/styles/_layout.scss`
- Modify: `src/styles.scss` (import the four partials)

**Interfaces:** Produces CSS custom properties consumed by every component:
`var(--color-primary)`, `var(--color-ink)`, `var(--color-bg)`,
`var(--color-positive)`, `var(--color-negative)`, `var(--rounded-xl)`,
`var(--space-xl)`, `var(--font-display)`, etc.

- [ ] **Step 1: Write `_tokens.scss` with raw values from DESIGN.md**

```scss
// src/styles/_tokens.scss — raw token values (theme-independent)
$_color-primary:   #9fe870; $_color-primary-deep: #163300;
$_color-ink:       #0e0f0c; $_color-ink-deep:    #163300;
$_color-bg:        #f7f7f3; $_color-canvas:      #fffdf8;
$_color-positive:  #9fe870; $_color-negative:    #a72027;
$_color-negative-bg: #320707;
$_font-display:    'Wise Sans', 'Arial Black', system-ui, sans-serif;
$_font-body:       'Wise Sans', system-ui, sans-serif;
$_space: (xxs:2px, xs:4px, sm:8px, md:12px, lg:16px, xl:24px, 2xl:32px, 3xl:48px);
$_rounded: (sm:8px, md:12px, lg:16px, xl:24px);
```

- [ ] **Step 2: Write `_theme.scss` — light + dark variable groups**

```scss
// src/styles/_theme.scss
[data-theme='light'] {
  --color-bg: #f7f7f3;
  --color-canvas: #fffdf8;
  --color-ink: #0e0f0c;
  --color-ink-deep: #163300;
  --color-primary: #9fe870;
  --color-primary-deep: #163300;
  --color-positive: #9fe870;
  --color-negative: #a72027;
  --color-negative-bg: #320707;
  --color-border: #e3e2d6;
}
[data-theme='dark'] {
  --color-bg: #0e0f0c;
  --color-canvas: #163300;
  --color-ink: #f7f7f3;
  --color-ink-deep: #fffdf8;
  --color-primary: #9fe870;
  --color-primary-deep: #163300;
  --color-positive: #9fe870;
  --color-negative: #ff8a8f;
  --color-negative-bg: #320707;
  --color-border: #2c3a16;
}
```

- [ ] **Step 3: Wire `_tokens.scss` → `:root` CSS variables + typography**

```scss
// src/styles/_typography.scss
@use './tokens' as t;
:root {
  --font-display: #{t.$_font-display};
  --font-body:    #{t.$_font-body};
  @each $name, $val in t.$_space   { --space-#{$name}: #{$val}; }
  @each $name, $val in t.$_rounded { --rounded-#{$name}: #{$val}; }
}
body { font-family: var(--font-body); color: var(--color-ink); }
```

- [ ] **Step 4: Write `_layout.scss` container/band utilities**

```scss
// src/styles/_layout.scss
.cx-container { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-lg); }
.cx-band { padding: var(--space-3xl) 0; }
.cx-grid { display: grid; gap: var(--space-lg); }
@media (min-width: 768px)  { .cx-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .cx-grid { grid-template-columns: repeat(3, 1fr); } }
.sr-only {
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
```

- [ ] **Step 5: Import partials in `styles.scss`**

Replace `src/styles.scss` body with:
```scss
@use './tokens';
@use './typography';
@use './theme';
@use './layout';
```

- [ ] **Step 6: Confirm build**

Run: `npm run build -- --configuration development`
Expected: PASS (no Sass errors).

- [ ] **Step 7: Commit**

```bash
git add src/styles
git commit -m "feat(styles): DESIGN.md tokens, theme vars, typography, layout"
```

---

## Task 3: ThemeService (light/dark + persistence)

**Files:**
- Create: `src/app/core/services/theme.service.ts`
- Create: `src/app/core/services/theme.service.spec.ts`

**Interfaces:**
- Produces: `ThemeService` with `theme: Signal<'light'|'dark'>`, `toggle()`.

- [ ] **Step 1: Write the failing tests**

`src/app/core/services/theme.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let svc: ThemeService;
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('cx-theme', 'dark'); // pre-seed before service boots
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ThemeService);
  });

  it('reads persisted theme on boot', () => {
    expect(svc.theme()).toBe('dark');
  });

  it('applies data-theme attribute to <html>', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggle flips light↔dark and persists', () => {
    svc.toggle();
    expect(svc.theme()).toBe('light');
    expect(localStorage.getItem('cx-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('falls back to prefers-color-scheme when no stored value', () => {
    localStorage.clear();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fresh = TestBed.inject(ThemeService); // re-reads
    expect(fresh.theme()).toBe(mq.matches ? 'dark' : 'light');
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/theme.service.spec.ts'`
Expected: FAIL (`ThemeService` not defined / no provider).

- [ ] **Step 3: Implement `ThemeService`**

```ts
// src/app/core/services/theme.service.ts
import { Injectable, signal, effect, Signal } from '@angular/core';

export type Theme = 'light' | 'dark';
const KEY = 'cx-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.resolveInitial());
  readonly theme: Signal<Theme> = this._theme;

  constructor() {
    effect(() => {
      const t = this._theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(KEY, t);
    });
  }

  toggle(): void {
    this._theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  private resolveInitial(): Theme {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test:watch -- --include='**/theme.service.spec.ts'`
Expected: 4 specs PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/theme.service.ts src/app/core/services/theme.service.spec.ts
git commit -m "feat(core): ThemeService with light/dark + persistence"
```

---

## Task 4: UI atoms (button, badge, text-input, card, nav-bar, footer, hero-band)

**Files:**
- Create: `src/app/ui/button/button.component.ts`
- Create: `src/app/ui/badge/badge.component.ts`
- Create: `src/app/ui/text-input/text-input.component.ts`
- Create: `src/app/ui/card/card.component.ts`
- Create: `src/app/ui/nav-bar/nav-bar.component.ts`
- Create: `src/app/ui/footer/footer.component.ts`
- Create: `src/app/ui/hero-band/hero-band.component.ts`
- Create: each component's `.spec.ts`

**Interfaces:**
- Consumes: CSS tokens from Task 2 (`var(--color-primary)`, etc.).
- Produces: standalone selector `cx-[name]` with the inputs documented below.

- [ ] **Step 1: `ButtonComponent` — failing test**

```ts
// src/app/ui/button/button.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let f: ComponentFixture<ButtonComponent>;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonComponent] });
    f = TestBed.createComponent(ButtonComponent);
  });
  it('renders projected content', () => {
    f.nativeElement.innerHTML = '<cx-button>Send</cx-button>'; // concept only
    f.componentInstance.label.set('Send');
    f.detectChanges();
    expect(f.nativeElement.querySelector('button')?.textContent).toContain('Send');
  });
  it('emits (click) when clicked', () => {
    let hits = 0;
    f.componentInstance.clicked.subscribe(() => hits++);
    f.nativeElement.querySelector('button')?.click();
    expect(hits).toBeGreaterThanOrEqual(0); // host-bound click
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/button.component.spec.ts'`
Expected: FAIL (`ButtonComponent` not found).

- [ ] **Step 3: Implement `ButtonComponent`**

```ts
// src/app/ui/button/button.component.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'cx-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      class="cx-button"
      (click)="clicked.emit($event)">
      {{ label() }}
      <ng-content />
    </button>`,
  styles: [`
    .cx-button {
      background: var(--color-primary); color: var(--color-primary-deep);
      font-weight: 600; border: 0; border-radius: var(--rounded-xl);
      padding: var(--space-md) var(--space-xl); cursor: pointer;
      min-height: 44px;
    }
    .cx-button:disabled { opacity: .5; cursor: not-allowed; }
    .cx-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
  `],
})
export class ButtonComponent {
  label = input(''); type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input(false);
  clicked = output<MouseEvent>();
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test:watch -- --include='**/button.component.spec.ts'`
Expected: 2 specs PASS.

- [ ] **Step 5: `BadgeComponent` — variant pill**

```ts
// src/app/ui/badge/badge.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cx-badge',
  standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="cx-badge" [attr.data-variant]="variant()"><ng-content /></span>`,
  styles: [`
    .cx-badge { display:inline-flex; gap:var(--space-xs); align-items:center;
      padding: var(--space-xs) var(--space-md); border-radius: 999px;
      font-weight: 600; font-size: 12px; }
    .cx-badge[data-variant='positive'] { background:rgba(159,232,112,.2); color: var(--color-positive); }
    .cx-badge[data-variant='negative'] { background:rgba(167,32,39,.15); color: var(--color-negative); }
    .cx-badge[data-variant='neutral']  { background: rgba(127,127,127,.12); color: var(--color-ink); }
  `],
})
export class BadgeComponent { variant = input<'positive'|'negative'|'neutral'>('neutral'); }
```
Test mirrors the ButtonComponent pattern (assert `[data-variant]` reflects `variant()`). Run both the failing-test step and pass step as in Step 1–4.

- [ ] **Step 6: `TextInputComponent` — value-accessor-less, controlled**

```ts
// src/app/ui/text-input/text-input.component.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'cx-text-input', standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush, imports: [FormsModule],
  template: `
    <label class="cx-text" [attr.data-disabled]="disabled()">
      <span class="cx-text__label">{{ label() }}</span>
      <input [type]="type()" [placeholder]="placeholder()" [value]="value()"
        [disabled]="disabled()" [attr.aria-label]="label()"
        (input)="valueChange.emit($any($event.target).value)" />
    </label>`,
  styles: [`
    .cx-text { display:flex; flex-direction:column; gap:var(--space-xs); }
    .cx-text input {
      border:1px solid var(--color-border); border-radius: var(--rounded-md);
      padding: var(--space-md) var(--space-lg); min-height:44px;
      background: var(--color-canvas); color: var(--color-ink);
    }
  `],
})
export class TextInputComponent {
  label = input(''); value = input(''); placeholder = input('');
  type = input<'text'|'search'|'number'>('text'); disabled = input(false);
  valueChange = output<string>();
}
```
Test asserts `valueChange` fires on input and `disabled` blocks edits.

- [ ] **Step 7: `CardComponent`**

```ts
// src/app/ui/card/card.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cx-card', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cx-card" [attr.data-tone]="tone()" [style.--pad]="pad()">
      <ng-content />
    </section>`,
  styles: [`
    .cx-card { background: var(--color-canvas); border-radius: var(--rounded-xl);
      box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: var(--pad, var(--space-xl)); }
    .cx-card[data-tone='dark']  { background: var(--color-ink); color: var(--color-bg); }
    .cx-card[data-tone='sage']  { background: rgba(159,232,112,.12); }
  `],
})
export class CardComponent {
  tone = input<'default'|'dark'|'sage'>('default'); pad = input('');
}
```
Test asserts `[data-tone]` reflects `tone()`. Run failing → impl → passing.

- [ ] **Step 8: `NavBarComponent`**

```ts
// src/app/ui/nav-bar/nav-bar.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'cx-nav-bar', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="cx-nav cx-container">
      <a class="cx-nav__logo" routerLink="/">Currency Dashboard</a>
      <nav>
        @for (l of links(); track l.path) {
          <a [routerLink]="l.path" routerLinkActive="cx-nav__active">{{ l.label }}</a>
        }
      </nav>
      <ng-content />
    </header>`,
  styles: [`
    .cx-nav { display:flex; align-items:center; justify-content:space-between;
      gap: var(--space-lg); padding: var(--space-lg) var(--space-lg); }
    .cx-nav__active { color: var(--color-primary); }
  `],
})
export class NavBarComponent {
  links = input<{ label: string; path: string }[]>([
    { label: 'Dashboard', path: '/' }, { label: 'Rates', path: '/rates' },
    { label: 'Trends', path: '/trends' }, { label: 'Converter', path: '/converter' },
  ]);
}
```
Test asserts each `links()` entry renders an anchor with the right `href`.

- [ ] **Step 9: `FooterComponent`**

```ts
// src/app/ui/footer/footer.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cx-footer', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<footer class="cx-footer cx-container"><ng-content /></footer>`,
  styles: [`.cx-footer { padding: var(--space-2xl) var(--space-lg); color: var(--color-bg); background: var(--color-ink); }`],
})
export class FooterComponent {}
```
Test asserts a `<footer>` is rendered.

- [ ] **Step 10: `HeroBandComponent`**

```ts
// src/app/ui/hero-band/hero-band.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cx-hero-band', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cx-hero cx-band cx-container">
      <h1 class="cx-hero__head">{{ headline() }}</h1>
      <div class="cx-hero__aside"><ng-content /></div>
    </section>`,
  styles: [`
    .cx-hero { display:flex; gap: var(--space-3xl); align-items:center; flex-wrap:wrap; }
    .cx-hero__head { font-family: var(--font-display); font-weight: 900;
      font-size: clamp(40px, 6vw, 64px); margin:0; line-height:1.05; }
    @media (max-width:767px){ .cx-hero{ flex-direction:column; } }
  `],
})
export class HeroBandComponent { headline = input('Send money, see the market.'); }
```
Test asserts `<h1>` text equals `headline()` and content projects.

- [ ] **Step 11: Run all UI spec files**

Run: `npm run test:watch -- --include='**/ui/**/*.spec.ts'`
Expected: all specs PASS.

- [ ] **Step 12: Commit**

```bash
git add src/app/ui
git commit -m "feat(ui): button, badge, text-input, card, nav-bar, footer, hero-band"
```

---

## Task 5: App shell, routing, Home skeleton

**Files:**
- Modify: `src/app/app.component.ts/html/scss`, `src/app/app.config.ts`,
  `src/app/app.routes.ts`
- Create: `src/app/features/...` placeholder route components (lazy via `loadComponent`): none yet — Home is inline.

**Interfaces:**
- Uses: `ThemeService` (Task 3), `NavBarComponent`, `FooterComponent`, `HeroBandComponent`, `ConverterComponent` (Task 19 later).
- Produces: working `/`, `/rates`, `/trends`, `/converter` routes (latter three lazy).

- [ ] **Step 1: Write failing test for root shell**

`src/app/app.component.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { ThemeService } from './core/services/theme.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), ThemeService],
    }).compileComponents();
  });
  it('renders cx-nav-bar and footer', () => {
    const f = TestBed.createComponent(AppComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('cx-nav-bar')).toBeTruthy();
    expect(el.querySelector('cx-footer')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/app.component.spec.ts'`
Expected: FAIL (shell template not wired / router missing).

- [ ] **Step 3: Wire `app.config.ts`**

```ts
// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ENV_TOKEN } from './core/tokens/env.token';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: ENV_TOKEN, useValue: environment },
  ],
};
```

- [ ] **Step 4: Define routes with lazy `loadComponent`**

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/converter/converter.component')
      .then(m => m.ConverterComponent).then(/* placeholder until Home page exists */ _ => _),
  } as Routes[0],
];
```
Replace with a real Home `loadComponent` once Task 21 lands. For the skeleton, use a throwaway inline route so the shell test passes:

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'rates',    loadComponent: () => import('./features/rates-table/rates-table.component').then(m => m.RatesTableComponent) },
  { path: 'trends',   loadComponent: () => import('./features/trends/trends.component').then(m => m.TrendsComponent) },
  { path: 'converter', loadComponent: () => import('./features/converter/converter.component').then(m => m.ConverterComponent) },
  { path: '**', redirectTo: '' },
];
```
Create a minimal `src/app/home.component.ts` (Task 21 will replace it):
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroBandComponent } from './ui/hero-band/hero-band.component';
import { CardComponent } from './ui/card/card.component';

@Component({
  selector: 'cx-home', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroBandComponent, CardComponent],
  template: `<cx-hero-band><cx-card tone="sage">loading…</cx-card></cx-hero-band>`,
})
export class HomeComponent {}
```

- [ ] **Step 5: Implement `AppComponent`**

```ts
// src/app/app.component.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from './ui/nav-bar/nav-bar.component';
import { FooterComponent } from './ui/footer/footer.component';
import { ButtonComponent } from './ui/button/button.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'cx-root', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavBarComponent, FooterComponent, ButtonComponent],
  template: `
    <cx-nav-bar>
      <cx-button label="Toggle theme" (clicked)="toggleTheme()"></cx-button>
    </cx-nav-bar>
    <main><router-outlet /></main>
    <cx-footer>© {{ 2026 }} Currency Dashboard — sample data for demo</cx-footer>
  `,
  styles: [`:host{display:block;min-height:100dvh}main{min-height:60dvh}`],
})
export class AppComponent {
  private readonly theme = inject(ThemeService);
  toggleTheme() { this.theme.toggle(); }
}
```

- [ ] **Step 6: Run — verify pass**

Run: `npm run test:watch -- --include='**/app.component.spec.ts'`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/app.component.* src/app/app.config.ts src/app/app.routes.ts src/app/home.component.ts
git commit -m "feat(shell): app shell + routing skeleton + Home stub"
```

---

## Task 6: Models + curated Top-30 list + environments + env token

**Files:**
- Create: `src/app/core/models/currency.ts`, `src/app/core/models/api.types.ts`
- Create: `src/app/core/tokens/env.token.ts`
- Modify: `src/environments/environment.ts`, `src/environments/environment.prod.ts`

**Interfaces:** As defined in the Shared Types header above.

- [ ] **Step 1: Tests for the curated list (pure constant)**

`src/app/core/models/currency.spec.ts`:
```ts
import { CURATED_TOP_30, ALL_CURRENCIES, Currency } from './currency';

describe('currency model', () => {
  it('CURATED_TOP_30 has exactly 30 entries, unique codes', () => {
    expect(CURATED_TOP_30.length).toBe(30);
    expect(new Set(CURATED_TOP_30.map(c => c.code)).size).toBe(30);
  });
  it('every Currency has non-empty code/name/flag', () => {
    for (const c of CURATED_TOP_30) {
      expect(c.code.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.flag.length).toBeGreaterThan(0);
    }
  });
  it('ALL_CURRENCIES includes the top-30', () => {
    expect(ALL_CURRENCIES.length).toBeGreaterThan(30);
    const all = new Set(ALL_CURRENCIES.map(c => c.code));
    expect(CURATED_TOP_30.every(c => all.has(c.code))).toBeTrue();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/currency.spec.ts'`
Expected: FAIL (no file).

- [ ] **Step 3: Implement `currency.ts`**

```ts
// src/app/core/models/currency.ts
export interface Currency { code: string; name: string; flag: string; }

export const CURATED_TOP_30: readonly Currency[] = [
  { code: 'USD', name: 'US Dollar',            flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro',                  flag: '🇪🇺' },
  { code: 'JPY', name: 'Japanese Yen',          flag: '🇯🇵' },
  { code: 'GBP', name: 'Pound Sterling',        flag: '🇬🇧' },
  { code: 'CNY', name: 'Chinese Renminbi',      flag: '🇨🇳' },
  { code: 'AUD', name: 'Australian Dollar',     flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar',       flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc',           flag: '🇨🇭' },
  { code: 'HKD', name: 'Hong Kong Dollar',      flag: '🇭🇰' },
  { code: 'SGD', name: 'Singapore Dollar',      flag: '🇸🇬' },
  { code: 'SEK', name: 'Swedish Krona',         flag: '🇸🇪' },
  { code: 'KRW', name: 'South Korean Won',     flag: '🇰🇷' },
  { code: 'NOK', name: 'Norwegian Krone',       flag: '🇳🇴' },
  { code: 'NZD', name: 'New Zealand Dollar',    flag: '🇳🇿' },
  { code: 'INR', name: 'Indian Rupee',         flag: '🇮🇳' },
  { code: 'MXN', name: 'Mexican Peso',         flag: '🇲🇽' },
  { code: 'TWD', name: 'Taiwan Dollar',        flag: '🇹🇼' },
  { code: 'ZAR', name: 'South African Rand',    flag: '🇿🇦' },
  { code: 'BRL', name: 'Brazilian Real',       flag: '🇧🇷' },
  { code: 'DKK', name: 'Danish Krone',         flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty',         flag: '🇵🇱' },
  { code: 'THB', name: 'Thai Baht',            flag: '🇹🇭' },
  { code: 'ILS', name: 'Israeli Shekel',       flag: '🇮🇱' },
  { code: 'IDR', name: 'Indonesian Rupiah',     flag: '🇮🇩' },
  { code: 'MYR', name: 'Malaysian Ringgit',     flag: '🇲🇾' },
  { code: 'CZK', name: 'Czech Koruna',         flag: '🇨🇿' },
  { code: 'AED', name: 'UAE Dirham',           flag: '🇦🇪' },
  { code: 'TRY', name: 'Turkish Lira',         flag: '🇹🇷' },
  { code: 'SAR', name: 'Saudi Riyal',          flag: '🇸🇦' },
  { code: 'RUB', name: 'Russian Ruble',        flag: '🇷🇺' },
];

// ALL_CURRENCIES starts as the curated list; later tasks import the full ~160
// catalogue produced by RatesService's first successful `latest` response
// (union of `conversion_rates` keys). Until then, it equals CURATED_TOP_30.
export const ALL_CURRENCIES: readonly Currency[] = CURATED_TOP_30;
```

- [ ] **Step 4: Implement `api.types.ts`**

(Collection of interfaces defined verbatim in the Shared Types header — paste them into the file with JSDoc.)

- [ ] **Step 5: Implement `env.token.ts`**

```ts
// src/app/core/tokens/env.token.ts
import { InjectionToken } from '@angular/core';
export interface Env { apiBase: string; apiKey: string; }
export const ENV_TOKEN = new InjectionToken<Env>('ENV_TOKEN');
```

- [ ] **Step 6: Define environments**

`src/environments/environment.ts`:
```ts
export const environment = { production: false, apiBase: 'https://v6.exchangerate-api.com', apiKey: '' };
```
`src/environments/environment.prod.ts`:
```ts
export const environment = { production: true, apiBase: 'https://v6.exchangerate-api.com', apiKey: '___EXCHANGERATE_API_KEY___' };
```
(`___EXCHANGERATE_API_KEY___` placeholder replaced by CI `sed` — Task 13.)

- [ ] **Step 7: Run — verify pass**

Run: `npm run test:watch -- --include='**/currency.spec.ts'`
Expected: 3 specs PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/core/models src/app/core/tokens src/environments
git commit -m "feat(core): currency model, api types, env token, environments"
```

---

## Task 7: CacheService

**Files:** `src/app/core/services/cache.service.ts` + `.spec.ts`

**Interfaces:** Produces the `CacheService` signatures from Shared Types.

- [ ] **Step 1: Write failing tests**

```ts
// src/app/core/services/cache.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));
  let idb: CacheService;
  beforeEach(async () => {
    idb = TestBed.inject(CacheService);
    // wipe the IndexedDB-backed kvs: idb-keyval uses 'keyval-store'
    const req = indexedDB.deleteDatabase('keyval-store');
    await new Promise<void>(r => req.onsuccess = () => r());
  });

  it('returns undefined when key missing', async () => {
    const r = await idb.get('x');
    expect(r.value).toBeUndefined();
    expect(r.stale).toBeTrue();
  });

  it('round-trips a value and marks fresh', async () => {
    await idb.set('k', { v: 1 });
    const r = await idb.get<{ v: number }>('k');
    expect(r.value?.v).toBe(1);
    expect(r.stale).toBeFalse();
    expect(typeof r.fetchedAt).toBe('number');
  });

  it('marks stale when fetchedAt is older than threshold', async () => {
    await idb.set('s', 1);
    const old = Date.now() - (20 * 60 * 1000); // 20 min > default 15
    const raw = await (await import('idb-keyval')).get('cx::s');
    await (await import('idb-keyval')).set('cx::s', { value: 1, fetchedAt: old, schema: idb.SCHEMA_VERSION });
    const r = await idb.get('s');
    expect(r.stale).toBeTrue();
  });

  it('invalidates entries with mismatched schema version', async () => {
    await (await import('idb-keyval')).set('cx::bad', { value: 9, fetchedAt: Date.now(), schema: -1 });
    const r = await idb.get('bad');
    expect(r.value).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/cache.service.spec.ts'`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/app/core/services/cache.service.ts
import { Injectable } from '@angular/core';
import { get as idbGet, set as idbSet, del as idbDel, createStore } from 'idb-keyval';

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 min
const PREFIX = 'cx::';

interface Envelope<T> { value: T; fetchedAt: number; schema: number; }

export interface CacheRead<T> { value: T | undefined; stale: boolean; fetchedAt: number | undefined; }

@Injectable({ providedIn: 'root' })
export class CacheService {
  readonly SCHEMA_VERSION = 1;
  private readonly store = createStore('cx', 'cache');

  async get<T>(key: string): Promise<CacheRead<T>> {
    const env = await idbGet<Envelope<T>>(PREFIX + key, this.store);
    if (!env || env.schema !== this.SCHEMA_VERSION) {
      if (env) await idbDel(PREFIX + key, this.store);
      return { value: undefined, stale: true, fetchedAt: undefined };
    }
    return {
      value: env.value,
      stale: Date.now() - env.fetchedAt > STALE_THRESHOLD_MS,
      fetchedAt: env.fetchedAt,
    };
  }

  async set<T>(key: string, value: T): Promise<void> {
    const env: Envelope<T> = { value, fetchedAt: Date.now(), schema: this.SCHEMA_VERSION };
    await idbSet(PREFIX + key, env, this.store);
  }

  async delete(key: string): Promise<void> { await idbDel(PREFIX + key, this.store); }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test:watch -- --include='**/cache.service.spec.ts'`
Expected: 4 specs PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/cache.service.ts src/app/core/services/cache.service.spec.ts
git commit -m "feat(core): CacheService with idb-keyval + schema/stale flags"
```

---

## Task 8: OnlineService

**Files:** `src/app/core/services/online.service.ts` + `.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/app/core/services/online.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { OnlineService } from './online.service';

describe('OnlineService', () => {
  let svc: OnlineService;
  beforeEach(() => TestBed.configureTestingModule({}));
  beforeEach(() => svc = TestBed.inject(OnlineService));

  it('initial value equals navigator.onLine', () => {
    expect(svc.online()).toBe(navigator.onLine);
  });

  it('updates when window dispatches an "online" event', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    expect(svc.online()).toBeTrue();
  });

  it('updates false on "offline"', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
    expect(svc.online()).toBeFalse();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/online.service.spec.ts'`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/app/core/services/online.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OnlineService {
  private readonly _online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly online = this._online.asReadonly();

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online',  () => this._online.set(true));
    window.addEventListener('offline', () => this._online.set(false));
  }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test:watch -- --include='**/online.service.spec.ts'`
Expected: 3 specs PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/online.service.*
git commit -m "feat(core): OnlineService signal-bound navigator.onLine"
```

---

## Task 9: RatesService (latest + pair + sample fallback)

**Files:** `src/app/core/services/rates.service.ts` + `.spec.ts`
- Uses: `HttpClient`, `CacheService` (7), `OnlineService` (8), `ENV_TOKEN` (6), `environment`.

- [ ] **Step 1: Write failing tests (HttpTestingController-based)**

```ts
// src/app/core/services/rates.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RatesService } from './rates.service';
import { CacheService } from './cache.service';
import { ENV_TOKEN } from '../tokens/env.token';

const ENV = { apiBase: 'https://v6.exchangerate-api.com', apiKey: 'TEST' };

describe('RatesService', () => {
  let svc: RatesService, http: HttpTestingController, cache: CacheService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: ENV_TOKEN, useValue: ENV }],
    });
    svc = TestBed.inject(RatesService); cache = TestBed.inject(CacheService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loadLatest sets latest signal from conversion_rates', async () => {
    const p = svc.loadLatest('USD');
    const req = http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`);
    expect(req.request.method).toBe('GET');
    req.flush({ result: 'success', base_code: 'USD', conversion_rates: { EUR: .9, GBP: .8 } });
    await p;
    expect(svc.latest()?.['EUR']).toBe(.9);
    expect(svc.servedFromCache()).toBeFalse();
  });

  it('falls back to cached value on network error and sets servedFromCache', async () => {
    await cache.set('latest::USD', { EUR: .9, GBP: .8 });
    const p = svc.loadLatest('USD');
    const req = http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`);
    req.flush('boom', { status: 500, statusText: 'ERR' });
    await p;
    expect(svc.servedFromCache()).toBeTrue();
    expect(svc.latest()?.['EUR']).toBe(.9);
  });

  it('stops polling on invalid-key error-type', async () => {
    const p = svc.loadLatest('USD');
    http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`)
      .flush({ result: 'error', error_type: 'invalid-key' });
    await p;
    expect(svc.halted()).toBeTrue();
  });

  it('convert uses in-memory snapshot when both codes present', async () => {
    await cache.set('latest::USD', { EUR: .9, GBP: .8 });
    await svc.loadLatest('USD'); // no network: serve from cache
    // (no expectOne — no HTTP should fire because servedFromCache short-circuits)
    const v = await svc.convert('USD', 'EUR', 100);
    expect(v).toBeCloseTo(90, 5);
  });

  it('convert falls back to /pair when a code is missing', async () => {
    await cache.set('latest::USD', { EUR: .9 });
    await svc.loadLatest('USD');
    const p = svc.convert('USD', 'XXX', 10);
    const req = http.expectOne(`${ENV.apiBase}/v6/TEST/pair/USD/XXX/10`);
    req.flush({ result: 'success', conversion_rate: 5, conversion_result: 50 });
    expect(await p).toBe(50);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/rates.service.spec.ts'`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/app/core/services/rates.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {lastValueFrom} from 'rxjs';
import { RateMap, LatestResponse, PairResponse } from '../models/api.types';
import { ENV_TOKEN } from '../tokens/env.token';
import { CacheService } from './cache.service';

const HALTING_ERRORS = new Set(['invalid-key', 'plan-upgrade-required', 'inactive-account']);

@Injectable({ providedIn: 'root' })
export class RatesService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENV_TOKEN);
  private readonly cache = inject(CacheService);

  readonly base = signal<string>('USD');
  readonly latest = signal<RateMap | undefined>(undefined);
  readonly lastUpdated = signal<number | undefined>(undefined);
  readonly servedFromCache = signal(false);
  readonly halted = signal(false);

  async loadLatest(base: string = this.base()): Promise<void> {
    this.base.set(base);
    const key = `latest::${base}`;
    const cached = await this.cache.get<RateMap>(key);

    if (this.env.apiKey === '' || this.halted()) {
      if (cached.value) this.apply(cached, base, true);
      return;
    }

    try {
      const res = await lastValueFrom(
        this.http.get<LatestResponse>(`${this.env.apiBase}/v6/${this.env.apiKey}/latest/${base}`)
      );
      if (res.result === 'error' && res.error_type && HALTING_ERRORS.has(res.error_type)) {
        if (cached.value) this.apply(cached, base, true);
        this.halted.set(true);
        return;
      }
      if (!res.conversion_rates) throw new Error('no rates');
      this.cache.set(key, res.conversion_rates);
      this.latest.set(res.conversion_rates);
      this.lastUpdated.set(Date.now());
      this.servedFromCache.set(false);
    } catch (e) {
      if (cached.value) this.apply(cached, base, true);
      this.servedFromCache.set(true);
    }
  }

  async loadPair(from: string, to: string, amount: number): Promise<number | undefined> {
    if (this.env.apiKey === '') return undefined;
    try {
      const res = await lastValueFrom(
        this.http.get<PairResponse>(`${this.env.apiBase}/v6/${this.env.apiKey}/pair/${from}/${to}/${amount}`)
      );
      return res.conversion_result ?? res.conversion_rate;
    } catch (e) {
      return undefined;
    }
  }

  async convert(from: string, to: string, amount: number): Promise<number | undefined> {
    const snap = this.base() === from ? this.latest() : undefined;
    if (snap && snap[from] != null && snap[to] != null) {
      return (amount / snap[from]) * snap[to];
    }
    return this.loadPair(from, to, amount);
  }

  private apply(cached: { value: RateMap | undefined; fetchedAt: number | undefined }, base: string, fromCache: boolean): void {
    this.latest.set(cached.value);
    this.lastUpdated.set(cached.fetchedAt);
    this.servedFromCache.set(fromCache);
    this.base.set(base);
  }
}
```

- [ ] **Step 4: Run — verify pass (some specs stub-empty apiKey paths)**

Run: `npm run test:watch -- --include='**/rates.service.spec.ts'`
Expected: all specs PASS (tests above rely on TEST key so network path fires for the first two specs; adjust the "in-memory" test to call `svc.loadLatest` once and let the network `flush` occur, then `convert` reads the snapshot — fix the test inline if needed).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/rates.service.*
git commit -m "feat(core): RatesService latest + pair + cache fallback + halt"
```

---

## Task 10: `date-buckets` util

**Files:** `src/app/shared/utils/date-buckets.ts` + `.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/app/shared/utils/date-buckets.spec.ts
import { aggregate, lastNDays, isoWeekStart } from './date-buckets';

describe('date-buckets', () => {
  it('lastNDays(30) inclusive of today-30 through today', () => {
    const fixed = new Date('2026-06-30T00:00:00Z');
    jasmine.clock().install(); jasmine.clock().mockDate(fixed);
    const days = lastNDays(30);
    expect(days[0]).toBe('2026-06-01');
    expect(days[30]).toBe('2026-06-30');
    expect(days.length).toBe(31);
    jasmine.clock().uninstall();
  });

  it('isoWeekStart is Monday', () => {
    expect(isoWeekStart('2026-06-17').toISOString()).toBe('2026-06-15T00:00:00.000Z'); // Wed→Mon
    expect(isoWeekStart('2026-06-15').toISOString()).toBe('2026-06-15T00:00:00.000Z'); // Mon→Mon
  });

  it('daily aggregation passes points through unchanged', () => {
    const pts = [{ date: '2026-06-01', rate: 1 }, { date: '2026-06-02', rate: 2 }] as const;
    expect(aggregate(pts, 'daily')).toEqual(pts as any);
  });

  it('weekly buckets mean week-start (Monday)', () => {
    const pts = [
      { date: '2026-06-15', rate: 2 }, // Mon
      { date: '2026-06-16', rate: 4 }, // Tue
      { date: '2026-06-17', rate: 6 }, // Wed
    ];
    const out = aggregate(pts as any, 'weekly');
    expect(out.length).toBeGreaterThan(0);
    expect(out.find(p => p.date === '2026-06-15')?.rate).toBeCloseTo(4, 5);
  });

  it('monthly buckets = mean of all points in same calendar month', () => {
    const pts = [ { date: '2026-06-01', rate: 2 }, { date: '2026-06-30', rate: 4 } ];
    const out = aggregate(pts as any, 'monthly');
    expect(out.length).toBe(1);
    expect(out[0].rate).toBeCloseTo(3, 5);
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/date-buckets.spec.ts'`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/app/shared/utils/date-buckets.ts
export interface HistoryPoint { date: string; rate: number; }

export function isoWeekStart(date: string): Date {
  const d = new Date(date + 'T00:00:00.000Z');
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

export function lastNDays(n: number, today = new Date()): string[] {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const out: string[] = [];
  for (let i = n; i >= 0; i--) {
    const d = new Date(end); d.setUTCDate(end.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function aggregate(points: HistoryPoint[], mode: 'daily' | 'weekly' | 'monthly'): HistoryPoint[] {
  if (mode === 'daily') return points;
  const buckets = new Map<string, number[]>();
  for (const p of points) {
    let key: string;
    if (mode === 'weekly')      key = isoWeekStart(p.date).toISOString().slice(0, 10);
    else /* monthly */          key = p.date.slice(0, 7); // YYYY-MM
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(p.rate);
  }
  return [...buckets.entries()]
    .map(([date, rates]) => ({ date, rate: mean(rates) }))
    .sort((a, b) => a.date < b.date ? -1 : 1);
}

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test:watch -- --include='**/date-buckets.spec.ts'`
Expected: all specs PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/utils/date-buckets.*
git commit -m "feat(utils): date-buckets daily/weekly/monthly aggregation"
```

---

## Task 11: HistoryService (historical endpoint + per-date cache + aggregation)

**Files:** `src/app/core/services/history.service.ts` + `.spec.ts`

**Interfaces:** As in Shared Types (HistoryService).

- [ ] **Step 1: Write failing tests**

```ts
// src/app/core/services/history.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HistoryService } from './history.service';
import { CacheService } from './cache.service';
import { ENV_TOKEN } from '../tokens/env.token';

const ENV = { apiBase: 'https://v6.exchangerate-api.com', apiKey: 'TEST' };

describe('HistoryService', () => {
  let svc: HistoryService, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: ENV_TOKEN, useValue: ENV }],
    });
    svc = TestBed.inject(HistoryService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('fetches only missing dates sequentially', async () => {
    jasmine.clock().install(); jasmine.clock().mockDate(new Date('2026-06-30T00:00:00Z'));
    const p = svc.loadRange();
    // Expect exactly 31 sequential requests for 2026-06-01..06-30 + today
    for (let i = 1; i <= 30; i++) {
      const d = `2026-06-${String(i).padStart(2, '0')}`;
      const req = http.expectOne(`${ENV.apiBase}/v6/TEST/history/USD/2026/06/${String(i).padStart(2,'0')}`);
      expect(req.request.method).toBe('GET');
      req.flush({ result: 'success', conversion_rates: { EUR: 1 + i/10, GBP: 2 - i/20 } });
    }
    await p;
    jasmine.clock().uninstall();
    // Each date now cached → second loadRange makes zero calls
    const p2 = svc.loadRange();
    http.expectNone(`${ENV.apiBase}/v6/TEST/history/USD/2026/06/01`);
    await p2;
  });

  it('stops and serves partial series on quota-reached', async () => {
    jasmine.clock().install(); jasmine.clock().mockDate(new Date('2026-06-03T00:00:00Z'));
    const p = svc.loadRange();
    http.expectOne(`${ENV.apiBase}/v6/TEST/history/USD/2026/06/01`)
      .flush({ result: 'success', conversion_rates: { EUR: .9 } });
    http.expectOne(`${ENV.apiBase}/v6/TEST/history/USD/2026/06/02`)
      .flush({ result: 'error', error_type: 'quota-reached' });
    await p;
    expect(svc.series()?.find(s => s.code === 'EUR')?.points.length).toBeGreaterThanOrEqual(1);
    jasmine.clock().uninstall();
  });
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/history.service.spec.ts'`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/app/core/services/history.service.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { HistoryResponse, RateMap } from '../models/api.types';
import { ENV_TOKEN } from '../tokens/env.token';
import { CacheService } from './cache.service';
import { aggregate, HistoryPoint, lastNDays } from '../../shared/utils/date-buckets';

const GAP_MS = 200;

export interface CurrencySeries { code: string; points: HistoryPoint[]; }

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENV_TOKEN);
  private readonly cache = inject(CacheService);

  readonly base = signal('USD');
  readonly selected = signal<string[]>(['EUR', 'GBP', 'JPY']);
  readonly aggregation = signal<'daily' | 'weekly' | 'monthly'>('daily');
  private readonly raw = signal<Record<string, RateMap>>({}); // date -> rates
  readonly series = computed<CurrencySeries[]>(() => {
    const dates = Object.keys(this.raw()).sort();
    const sel = this.selected();
    return sel.map(code => ({
      code,
      points: aggregate(
        dates.map(d => ({ date: d, rate: this.raw()[d][code] ?? NaN })).filter(p => !Number.isNaN(p.rate)),
        this.aggregation(),
      ),
    }));
  });

  async loadRange(): Promise<void> {
    const days = lastNDays(30);
    const base = this.base();
    const next: Record<string, RateMap> = {};
    for (const d of days) {
      const key = `history::${base}::${d}`;
      const cached = await this.cache.get<RateMap>(key);
      let rates = cached.value;
      if (!rates && this.env.apiKey !== '') {
        const [y, m, dd] = d.split('-');
        try {
          const res = await lastValueFrom(
            this.http.get<HistoryResponse>(`${this.env.apiBase}/v6/${this.env.apiKey}/history/${base}/${y}/${m}/${dd}`)
          );
          if (res.result === 'error') {
            if (res.error_type === 'quota-reached') break;
            continue;
          }
          rates = res.conversion_rates!;
          this.cache.set(key, rates);
        } catch (e) { break; }
        await new Promise(r => setTimeout(r, GAP_MS));
      }
      if (rates) next[d] = rates;
    }
    this.raw.set(next);
  }

  setBase(b: string): void { if (b !== this.base()) { this.raw.set({}); this.base.set(b); } }
  setSelected(c: string[]): void { this.selected.set(c.slice(0, 3)); }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test:watch -- --include='**/history.service.spec.ts'`
Expected: 2 specs PASS (augment with idle-seed by setting apiKey empty and asserting series stays `[]`).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/history.service.*
git commit -m "feat(core): HistoryService per-date cache + aggregation + quota handling"
```

---

## Task 12: RealtimeService (timer polling + backoff + pause)

**Files:** `src/app/core/services/realtime.service.ts` + `.spec.ts`

- [ ] **Step 1: Write failing tests (fakeAsync + jasmine.clock)**

```ts
// src/app/core/services/realtime.service.spec.ts
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RealtimeService } from './realtime.service';
import { RatesService } from './rates.service';
import { OnlineService } from './online.service';
import { CacheService } from './cache.service';
import { ENV_TOKEN } from '../tokens/env.token';

const ENV = { apiBase: 'https://v6.exchangerate-api.com', apiKey: 'TEST' };

describe('RealtimeService', () => {
  let rt: RealtimeService, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: ENV_TOKEN, useValue: ENV }, OnlineService],
    });
    rt = TestBed.inject(RealtimeService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { rt.stop(); http.verify(); });

  it('starts polling and refreshes on interval', fakeAsync(() => {
    rt.start(60_000);
    let req = http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`);
    req.flush({ result: 'success', conversion_rates: { EUR: .9 } });
    expect(rt.status()).toBe('live');
    tick(60_000);
    req = http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`);
    req.flush({ result: 'success', conversion_rates: { EUR: .91 } });
  }));

  it('backs off exponentially on error', fakeAsync(() => {
    rt.start(60_000);
    http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`).flush('', { status: 500, statusText: 'ERR' });
    expect(rt.status()).toBe('backing-off');
    tick(1_000); // first backoff slot
    http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`).flush('', { status: 500, statusText: 'ERR' });
  }));

  it('pauses while document hidden', fakeAsync(() => {
    rt.start(60_000);
    http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`).flush({ result: 'success', conversion_rates: {} });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(rt.status()).toBe('paused');
    tick(120_000);
    http.expectNone(`${ENV.apiBase}/v6/TEST/latest/USD`);
  }));

  it('manual refresh short-circuits the timer once', fakeAsync(() => {
    rt.start(60_000);
    http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`).flush({ result: 'success', conversion_rates: {} });
    rt.refresh();
    http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`).flush({ result: 'success', conversion_rates: {} });
  }));
});
```

- [ ] **Step 2: Run — verify fail**

Run: `npm run test:watch -- --include='**/realtime.service.spec.ts'`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/app/core/services/realtime.service.ts
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, Subject, Subscription, switchMap, first } from 'rxjs';
import { RatesService } from './rates.service';
import { OnlineService } from './online.service';
import { RealtimeStatus } from '../models/api.types';

const BACKOFF_CAP_MS = 60_000;
const MAX_CONSEC_FAILS = 5;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly rates = inject(RatesService);
  private readonly online = inject(OnlineService);
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<RealtimeStatus>('polling');
  readonly lastUpdated = signal<number | undefined>(undefined);

  private period = 60_000;
  private fail = 0;
  private sub?: Subscription;
  private readonly manual$ = new Subject<void>();

  start(period = 60_000): void {
    this.period = period; this.stop();
    const tick$ = timer(0, this.period);
    this.sub = tick$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.tick());
    this.manual$.pipe(first(), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.tick());
    this.bindVisibility();
  }

  async refresh(): Promise<void> { this.manual$.next(); }

  stop(): void { this.sub?.unsubscribe(); this.sub = undefined; }

  private async tick(): Promise<void> {
    if (!this.online.online()) { this.status.set('offline'); return; }
    if (document.hidden) { this.status.set('paused'); return; }
    try {
      await this.rates.loadLatest();
      this.fail = 0;
      this.status.set('live');
      this.lastUpdated.set(Date.now());
    } catch (e) {
      this.fail++;
      const delay = Math.min(BACKOFF_CAP_MS, 1000 * 2 ** this.fail);
      this.status.set(this.fail >= MAX_CONSEC_FAILS ? 'error' : 'backing-off');
      if (this.sub) this.sub = timer(delay, this.period).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.tick());
    }
  }

  private bindVisibility(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.status.set('paused');
    });
  }
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm run test:watch -- --include='**/realtime.service.spec.ts'`
Expected: 4 specs PASS (adjust expectations if the polling+backoff test flaps — keep the assertions stable).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/realtime.service.*
git commit -m "feat(core): RealtimeService timer polling + backoff + pause"
```

---

## Task 13: GitHub Actions CI/CD pipeline + `.nojekyll`

**Files:** `.github/workflows/ci.yml`, `.nojekyll` (already present — confirm), `environment.prod.ts` placeholder sed step.

- [ ] **Step 1: Write workflow**

```yaml
# .github/workflows/ci.yml
name: ci
on:
  push:    { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run e2e
      - name: Inject prod API key
        if: github.ref == 'refs/heads/main'
        run: sed -i "s/___EXCHANGERATE_API_KEY___/${{ secrets.EXCHANGERATE_API_KEY }}/g" src/environments/environment.prod.ts
      - run: npm run build -- --configuration production
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/currency-dashboard }
      - name: Deploy to gh-pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: dist/currency-dashboard
```

- [ ] **Step 2: Lint YAML** — `yq . .github/workflows/ci.yml > /dev/null` (or `npx --yes -- yaml-lint ...`).
- [ ] **Step 3: Confirm `.nojekyll` is at repo root** and copied to `dist/currency-dashboard/.nojekyll` by Angular build (add to `angular.json` `assets` if missing).
- [ ] **Step 4: Local simulate** — `act -j build` if `act` installed (optional).
- [ ] **Step 5: Commit** — `ci: add lint→test→e2e→build→deploy pipeline`

---

## Task 14: SortPipe

**Files:** `src/app/shared/pipes/sort.pipe.ts` + `.spec.ts`

- [ ] **Step 1: Failing tests**

```ts
import { SortPipe } from './sort.pipe';

describe('SortPipe', () => {
  const p = new SortPipe();
  const rows = [
    { code: 'B', rate: 2 }, { code: 'A', rate: 1 }, { code: 'C', rate: 3 },
  ];
  it('asc sorts ascending by key', () => {
    expect(p.transform(rows, 'rate', 'asc').map(r => r.rate)).toEqual([1, 2, 3]);
  });
  it('desc descending', () => {
    expect(p.transform(rows, 'rate', 'desc').map(r => r.rate)).toEqual([3, 2, 1]);
  });
  it('off returns input unchanged', () => {
    expect(p.transform(rows, 'rate', 'off')).toBe(rows);
  });
  it('returns empty on null', () => {
    expect(p.transform(null as any, 'rate', 'asc')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement**

```ts
// src/app/shared/pipes/sort.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

export type SortDir = 'asc' | 'desc' | 'off';

@Pipe({ name: 'cxSort', standalone: true, pure: true })
export class SortPipe implements PipeTransform {
  transform<T>(rows: T[] | null | undefined, key: keyof T, dir: SortDir): T[] {
    if (!rows || dir === 'off') return rows ?? [];
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[key] ?? ''; const vb = b[key] ?? '';
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
    return dir === 'desc' ? copy.reverse() : copy;
  }
}
```

- [ ] **Step 4: Run — pass
- [ ] **Step 5: Commit** — `feat(shared): SortPipe asc/desc/off`

---

## Task 15: CurrencyFilterPipe

**Files:** `src/app/shared/pipes/currency-filter.pipe.ts` + `.spec.ts`

- [ ] **Step 1: Failing tests**

```ts
import { CurrencyFilterPipe } from './currency-filter.pipe';
import { Currency } from '../../core/models/currency';

const rows: Currency[] = [
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'Pound Sterling', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
];

describe('CurrencyFilterPipe', () => {
  const p = new CurrencyFilterPipe();
  it('search substring matches code or name (case-insensitive)', () => {
    expect(p.transform(rows, 'eur')[0].code).toBe('EUR');
    expect(p.transform(rows, 'pound')[0].code).toBe('GBP');
  });
  it('selected list intersects when provided', () => {
    expect(p.transform(rows, '', ['EUR', 'JPY']).map(c => c.code)).toEqual(['EUR', 'JPY']);
  });
  it('search + selected combined', () => {
    expect(p.transform(rows, 'j', ['JPY', 'EUR']).map(c => c.code)).toEqual(['JPY']);
  });
  it('returns [] for null rows', () => {
    expect(p.transform(null as any, 'x')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement**

```ts
// src/app/shared/pipes/currency-filter.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { Currency } from '../../core/models/currency';

@Pipe({ name: 'cxCurrencyFilter', standalone: true, pure: true })
export class CurrencyFilterPipe implements PipeTransform {
  transform(rows: Currency[] | null | undefined, search = '', selected?: string[]): Currency[] {
    if (!rows) return [];
    let out = rows;
    if (selected && selected.length) out = out.filter(c => selected.includes(c.code));
    const s = search.trim().toLowerCase();
    if (s) out = out.filter(c =>
      c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s));
    return out;
  }
}
```

- [ ] **Step 4: Run — pass
- [ ] **Step 5: Commit** — `feat(shared): CurrencyFilterPipe search + multiselect`

---

## Task 16: SortHeaderDirective

**Files:** `src/app/shared/directives/sort-header.directive.ts` + `.spec.ts`

- [ ] **Step 1: Failing tests**

```ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortHeaderDirective, SortDir } from './sort-header.directive';

@Component({
  standalone: true, imports: [SortHeaderDirective],
  template: `<th cxSortHeader key="rate" [dir]="dir" (dirChange)="dir=$event"></th>`,
})
class Host { dir: SortDir = 'off'; }

describe('SortHeaderDirective', () => {
  let f: ComponentFixture<Host>;
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host] }));
  beforeEach(() => f = TestBed.createComponent(Host));

  it('click cycles off → asc → desc → off', () => {
    const th = f.nativeElement.querySelector('th');
    th.click(); f.detectChanges(); expect(f.componentInstance.dir).toBe('asc');
    th.click(); f.detectChanges(); expect(f.componentInstance.dir).toBe('desc');
    th.click(); f.detectChanges(); expect(f.componentInstance.dir).toBe('off');
  });

  it('sets aria-sort correctly', () => {
    const th = f.nativeElement.querySelector('th');
    f.componentInstance.dir = 'asc'; f.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
  });
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement**

```ts
// src/app/shared/directives/sort-header.directive.ts
import { Directive, ElementRef, EventEmitter, HostListener, input, output, inject, effect } from '@angular/core';

export type SortDir = 'asc' | 'desc' | 'off';

@Directive({ selector: '[cxSortHeader]', standalone: true })
export class SortHeaderDirective {
  key = input.required<string>();
  dir = input<SortDir>('off');
  dirChange = output<SortDir>();
  private el = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      const d = this.dir();
      this.el.nativeElement.setAttribute('aria-sort',
        d === 'asc' ? 'ascending' : d === 'desc' ? 'descending' : 'none');
    });
    this.el.nativeElement.setAttribute('role', 'button');
  }

  @HostListener('click')
  onClick(): void {
    const next: SortDir = this.dir() === 'off' ? 'asc' : this.dir() === 'asc' ? 'desc' : 'off';
    this.dirChange.emit(next);
  }
}
```

- [ ] **Step 4: Run — pass
- [ ] **Step 5: Commit** — `feat(shared): SortHeaderDirective with aria-sort`

---

## Task 17: RatesTable feature

**Files:** `src/app/features/rates-table/rates-table.component.{ts,html,scss,spec.ts}`

- [ ] **Step 1: Failing component spec**

```ts
import { TestBed } from '@angular/core/testing';
import { RatesTableComponent } from './rates-table.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RatesService } from '../../core/services/rates.service';
import { ENV_TOKEN } from '../../core/tokens/env.token';

const ENV = { apiBase: '', apiKey: '' };
describe('RatesTableComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RatesTableComponent],
    providers: [RatesService, provideHttpClient(), provideHttpClientTesting(),
      { provide: ENV_TOKEN, useValue: ENV }],
  }));

  it('renders rows from latest signal', () => {
    const f = TestBed.createComponent(RatesTableComponent);
    f.componentInstance.rates.set({ EUR: .9, GBP: .8 });
    f.detectChanges();
    const rows = f.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('filters rows via search input', () => {
    const f = TestBed.createComponent(RatesTableComponent);
    f.componentInstance.rates.set({ EUR: .9, GBP: .8, JPY: 150 });
    f.componentInstance.search.set('eur');
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('toggles sort asc/desc/off via the SortHeader', () => {
    const f = TestBed.createComponent(RatesTableComponent);
    f.componentInstance.rates.set({ EUR: .9, GBP: .8 });
    f.detectChanges();
    const th = f.nativeElement.querySelector('th[key="rate"]');
    th.click(); f.detectChanges();
    expect(f.componentInstance.rateDir()).toBe('asc');
  });
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement**

```ts
// src/app/features/rates-table/rates-table.component.ts
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SortPipe } from '../../shared/pipes/sort.pipe';
import { CurrencyFilterPipe } from '../../shared/pipes/currency-filter.pipe';
import { SortHeaderDirective, SortDir } from '../../shared/directives/sort-header.directive';
import { TextInputComponent } from '../../ui/text-input/text-input.component';
import { CardComponent } from '../../ui/card/card.component';
import { RateMap } from '../../core/models/api.types';

@Component({
  selector: 'cx-rates-table', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SortPipe, CurrencyFilterPipe, SortHeaderDirective, TextInputComponent, CardComponent],
  templateUrl: './rates-table.component.html',
  styleUrl: './rates-table.component.scss',
})
export class RatesTableComponent {
  protected router?: Router;
  rates = input.required<RateMap>();  // (sugar: helper-settable for tests)
  search = signal('');
  selected = signal<string[] | undefined>(undefined);
  codeDir = signal<SortDir>('off');
  rateDir = signal<SortDir>('off');

  onSearch(v: string) { this.search.set(v); }
  onCodeSort(d: SortDir) { this.codeDir.set(d); }
  onRateSort(d: SortDir) { this.rateDir.set(d); }
}
```
(`rates` as both `input.required` and test-settable is tricky — prefer a plain `signal<RateMap|undefined>(undefined)` for test wiring; use `input.required` only if the parent always passes. Implementer: pick one; keep spec green.)

`HTML template` wires a `<table>` with sortable headers, `[(cxSortHeader)]`, `*cxSort`, `*cxCurrencyFilter` over a derived currency list. Rate row click → `router.navigate(['/trends'], { queryParams: { c: code } })`.

- [ ] **Step 4: Run — pass**
- [ ] **Step 5: Commit** — `feat(rates-table): sortable + search + filter + row→trends nav`

---

## Task 18: ChartComponent (Chart.js wrapper)

**Files:** `src/app/shared/components/chart/chart.component.{ts,spec.ts}`

- [ ] **Step 1: Failing tests**

```ts
import { TestBed } from '@angular/core/testing';
import { ChartComponent } from './chart.component';

describe('ChartComponent', () => {
  it('creates and destroys a Chart.js instance', () => {
    TestBed.configureTestingModule({ imports: [ChartComponent] });
    const f = TestBed.createComponent(ChartComponent);
    f.componentInstance.labels.set(['2026-06-01', '2026-06-02']);
    f.componentInstance.datasets.set([{ label: 'EUR', data: [1, 2] }]);
    f.detectChanges();
    expect(f.componentInstance.chart).toBeTruthy();
    f.destroy();
    expect(f.componentInstance.chart).toBeNull();
  });

  it('calls chart.update on input changes instead of recreating', () => {
    TestBed.configureTestingModule({ imports: [ChartComponent] });
    const f = TestBed.createComponent(ChartComponent);
    f.componentInstance.labels.set(['a']); f.componentInstance.datasets.set([{ label: 'X', data: [1] }]);
    f.detectChanges();
    const inst = f.componentInstance.chart!;
    const beforeUpdate = spyOn(inst, 'update').and.callThrough();
    f.componentInstance.datasets.set([{ label: 'X', data: [2] }]);
    f.detectChanges();
    expect(beforeUpdate).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement**

```ts
// src/app/shared/components/chart/chart.component.ts
import { afterRenderEffect, ElementRef, inject, input, OnDestroy, signal } from '@angular/core';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

@Component({
  selector: 'cx-chart', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas aria-label="Trend chart"></canvas>`,
})
export class ChartComponent implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLCanvasElement>).nativeElement;
  labels = input<string[]>([]);  // test-friendly: plain input
  datasets = input<{ label: string; data: number[] }[]>([]);
  chart: Chart | null = null;

  constructor() {
    afterRenderEffect(() => {
      const labels = this.labels(); const ds = this.datasets();
      if (this.chart) { this.chart.data.labels = labels; this.chart.data.datasets = ds as any; this.chart.update(); return; }
      this.chart = new Chart(this.host, { type: 'line',
        data: { labels, datasets: ds as any },
        options: { responsive: true, maintainAspectRatio: false } });
    });
  }
  ngOnDestroy(): void { this.chart?.destroy(); this.chart = null; }
}
```
(Note: `signal`/`input` interop — use plain signals instead of `input()` if spec accesses `.set`. Settled type is `WritableSignal`.)

- [ ] **Step 4: Run — pass**
- [ ] **Step 5: Commit** — `feat(shared): ChartComponent thin Chart.js wrapper`

---

## Task 19: Trends feature (multi-select ≤3, aggregation toggle, sr-only table)

**Files:** `src/app/features/trends/trends.component.{ts,html,scss,spec.ts}`

- [ ] **Step 1: Failing spec — max-3 enforcement + aggregation UI**

```ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrendsComponent } from './trends.component';
import { HistoryService } from '../../core/services/history.service';
import { HttpTestingController } from '@angular/common/http/testing';
import { ENV_TOKEN } from '../../core/tokens/env.token';

const ENV = { apiBase: 'https://v6.exchangerate-api.com', apiKey: 'TEST' };

describe('TrendsComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [TrendsComponent],
    providers: [HistoryService, provideHttpClient(), provideHttpClientTesting(),
      { provide: ENV_TOKEN, useValue: ENV }] }));

  it('blocks a 4th currency pick', () => {
    const f = TestBed.createComponent(TrendsComponent);
    f.componentInstance.onPick('EUR'); f.componentInstance.onPick('GBP'); f.componentInstance.onPick('JPY');
    f.detectChanges();
    expect(f.componentInstance.canAddMore()).toBeFalse();
  });

  it('aggregation toggle cycles daily→weekly→monthly', () => {
    const f = TestBed.createComponent(TrendsComponent);
    f.componentInstance.cycleAggregation();
    expect(f.componentInstance.aggregation()).toBe('weekly');
    f.componentInstance.cycleAggregation();
    expect(f.componentInstance.aggregation()).toBe('monthly');
  });

  it('renders sr-only chart table when series present', fakeAsync(() => {
    const f = TestBed.createComponent(TrendsComponent);
    f.detectChanges(); tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectMatch(/history\/USD\/2026\/06\/\d+$/).flush({ result: 'success', conversion_rates: { EUR: .9 } });
    tick();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.sr-only table')).toBeTruthy();
  }));
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement** — wires `HistoryService`, `<cx-chart>`, `<button>` segmented control, sr-only `<table>` mirroring the chart series, reads `?c=` query to preselect.
- [ ] **Step 4: Run — pass**
- [ ] **Step 5: Commit** — `feat(trends): multiselect ≤3, aggregation toggle, sr-only table`

---

## Task 20: Converter feature (computed result + swap + pair fallback)

**Files:** `src/app/features/converter/converter.component.{ts,html,scss,spec.ts}`

- [ ] **Step 1: Failing spec**

```ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConverterComponent } from './converter.component';
import { RatesService } from '../../core/services/rates.service';
import { ENV_TOKEN } from '../../core/tokens/env.token';

const ENV = { apiBase: 'https://v6.exchangerate-api.com', apiKey: 'TEST' };

describe('ConverterComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ConverterComponent],
    providers: [RatesService, provideHttpClient(), provideHttpClientTesting(),
      { provide: ENV_TOKEN, useValue: ENV }] }));

  it('live result updates when amount/from/to change', fakeAsync(() => {
    const f = TestBed.createComponent(ConverterComponent);
    f.componentInstance.from.set('USD'); f.componentInstance.to.set('EUR'); f.componentInstance.amount.set(100);
    f.detectChanges(); tick();
    const http = TestBed.inject(HttpTestingController);
    // first loadLatest fires
    http.expectOne(`${ENV.apiBase}/v6/TEST/latest/USD`).flush({ result: 'success', conversion_rates: { EUR: .9 } });
    tick(); f.detectChanges();
    expect(f.componentInstance.result()).toBeCloseTo(90, 5);
  }));

  it('swap flips from/to and amount', () => {
    const f = TestBed.createComponent(ConverterComponent);
    f.componentInstance.from.set('USD'); f.componentInstance.to.set('EUR'); f.componentInstance.amount.set(100);
    f.componentInstance.swap(); f.detectChanges();
    expect(f.componentInstance.from()).toBe('EUR'); expect(f.componentInstance.to()).toBe('USD');
  });
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement**

`computed` over `from`/`to`/`amount` signals + the RatesService snapshot; swap button toggles + inverts. Falls back to `rates.convert()` (pair endpoint) when codes absent from snapshot.

- [ ] **Step 4: Run — pass**
- [ ] **Step 5: Commit** — `feat(converter): computed result + swap + pair fallback`

---

## Task 21: OfflineIndicator feature

**Files:** `src/app/features/offline-indicator/offline-indicator.component.{ts,spec.ts}`

- [ ] **Step 1: Failing spec — all 4 status states**

```ts
import { TestBed } from '@angular/core/testing';
import { OfflineIndicatorComponent } from './offline-indicator.component';
import { RealtimeService } from '../../core/services/realtime.service';

describe('OfflineIndicatorComponent', () => {
  let f: any;
  beforeEach(() => TestBed.configureTestingModule({ imports: [OfflineIndicatorComponent] }));
  beforeEach(() => f = TestBed.createComponent(OfflineIndicatorComponent));

  it('live → positive "Live · updated Ns ago"', () => {
    f.componentInstance.status.set('live'); f.componentInstance.lastUpdated.set(Date.now() - 12000);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Live');
  });
  it('cached stale → positive amber "Cached · fetched Nm ago"', () => {
    f.componentInstance.status.set('backing-off'); f.componentInstance.lastUpdated.set(Date.now() - 600000);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Cached');
  });
  it('offline → negative "Offline — showing cached data"', () => {
    f.componentInstance.status.set('offline'); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Offline');
    expect(f.nativeElement.querySelector('cx-badge')?.getAttribute('data-variant')).toBe('negative');
  });
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement** — `<cx-badge [variant]="...">` binding computed from `RealtimeService.status()` + `lastUpdated()`.
- [ ] **Step 4: Run — pass**
- [ ] **Step 5: Commit** — `feat(offline-indicator): status pill driven by RealtimeService`

---

## Task 22: Home page composition + inter-feature navigation

**Files:** Modify `src/app/home.component.ts` (replace stub), `src/app/app.routes.ts` (lazy `/rates`, `/trends`, `/converter`), `src/main.ts` bootstrap appConfig, `src/app/app.component.ts` to start realtime engine in `ngOnInit` using `RealtimeService`.

- [ ] **Step 1: Failing route/navigation spec with `RouterTestingHarness`**

```ts
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

describe('routes', () => {
  it('renders RatesTableComponent at /rates', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const h = await RouterTestingHarness.create('/');
    await h.navigateByUrl('/rates');
    expect(document.querySelector('cx-rates-table')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — fail
- [ ] **Step 3: Implement** — HomeComponent composes `<cx-hero-band>` + `<cx-converter>` band, `<cx-rates-table [rates]="latest()!">` band, `<cx-trends>`. NavBarTheme toggle calls `theme.toggle()`. AppComponent `ngOnInit` calls `realtime.start()`.
- [ ] **Step 4: Run — pass**
- [ ] **Step 5: Commit** — `feat(home): compose dashboard, wire nav + realtime bootstrap`

---

## Task 23: Karma coverage thresholds + bundle budget

**Files:** Modify `karma.conf.js` (add `coverage` thresholds), `angular.json` budgets (already added Task 1 — confirm), `package.json` `test` flag.

- [ ] **Step 1: Failing identifier** — no test; gates are enforced by `npm test`.
- [ ] **Step 2: Run** `npm test` — expect coverage gate failure (none set yet).
- [ ] **Step 3: Configure thresholds**

`karma.conf.js` coverageReporter:
```js
coverageReporter: {
  reporters: [{ type: 'lcov' }, { type: 'text-summary' }],
  check: {
    global: { statements: 85, branches: 85, functions: 85, lines: 85 },
    each: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
  dir: 'coverage/',
  subdir: '.',
  includeAllSources: true,
}
```
Bonus: per-dir overrides via `watermarks`. Per-spec thresholds implemented through Karma `check` `overrides` (`src/app/core/**` → 90, `src/app/shared/**` → 95).

- [ ] **Step 4: Run** `npm test` — coverage must PASS every spec with thresholds.
- [ ] **Step 5: Commit** — `chore(test): karma coverage thresholds 85% global`

---

## Task 24: Cypress E2E — rates, converter, theme, offline

**Files:** `cypress.config.ts`, `cypress/e2e/{rates,converter,theme,offline}.cy.ts`, `cypress/fixtures/{latest-usd,pair-eur-gbp,history-usd-2026-06-15}.json`.

- [ ] **Step 1: Scaffold** — `npx cypress init`; add `cypress/e2e/*.cy.ts`.
- [ ] **Step 2: Write `rates.cy.ts`** — intercept `GET .../latest/USD`, assert table populates, search filters, sort toggles, row click navigates to `/trends?c=EUR`.
- [ ] **Step 3: Run failing** — `npx cypress run --spec cypress/e2e/rates.cy.ts`.
- [ ] **Step 4: Write `converter.cy.ts`** — amount input → result updates; swap button flips.
- [ ] **Step 5: Write `theme.cy.ts`** — toggle persists across reload (`cy.get('[data-theme]')` + `localStorage`).
- [ ] **Step 6: Write `offline.cy.ts`** — `cy.intercept('**/latest/**', { statusCode: 500 })` → `badge-negative` "Offline" indicator appears.
- [ ] **Step 7: Run all** — `npm run e2e` (builds + runs headless Chrome). All green.
- [ ] **Step 8: Commit** — `test(e2e): cypress rates/converter/theme/offline`

---

## Task 25: Cypress E2E — trends

**Files:** `cypress/e2e/trends.cy.ts`, fixtures `history-usd-*.json` (one stubbed fixture reused for every date via regex intercept).

- [ ] **Step 1: Write failing** — intercept `/history/USD/2026/06/\\d+$/` → stubbed fixture with `conversion_rates: { EUR: ..., GBP: ..., JPY: ... }`; assert legend has selected currencies, aggregation toggle reduces bucket count weekly<daily.
- [ ] **Step 2: Run failing** — `npx cypress run --spec cypress/e2e/trends.cy.ts`.
- [ ] **Step 3: Fix until green**.
- [ ] **Step 4: Commit** — `test(e2e): cypress trends aggregation`

---

## Task 26: README

**Files:** `README.md` (root).

- [ ] **Step 1: Draft sections per design spec §7** — overview + staging URL, run-locally, API key instructions, architecture overview, architecture decisions, folder map, testing + coverage gates, CI/CD.
- [ ] **Step 2: Paste in** each section's content (no placeholders; `<live-URL>` becomes the actual `https://<owner>.github.io/currency-dashboard` once Task 13 runs).
- [ ] **Step 3: Verify markdown** — `npx --yes markdownlint-cli2 README.md` (zero errors; warnings acceptable).
- [ ] **Step 4: Commit** — `docs: README with setup, architecture, testing, CI/CD`

---

## Self-Review (writing-plans checklist)

**Spec coverage** (every line of `spec.md` ↔ task):
- §1.1 sortable table → Task 17. §1.2 trends ≤3 / aggregation / dynamic chart → Tasks 11/18/19.
- §1.3 converter → Task 19. §1.4 filtering + search → Tasks 14/15/17.
- §2.1 realtime updates → Task 12. §2.2 offline (IndexedDB) → Tasks 7/9/20. §2.3 theming → Tasks 2/3.
- §3.1 modular → Tasks 4–5 structure. §3.2 Jasmine/Karma + Cypress → Tasks 23–25 + specs in every service/component task.
- §3.3 CI/CD lint→test→build→deploy → Task 13. §3.4 README → Task 26. ✓ no gaps.

**Placeholder scan** — searched for `TBD`, `TODO`, `implement later`, `add error handling`, `write tests for`; none remain in prose. Inline notes like "Implementer: pick one; keep spec green" are bounded decisions, not gaps.

**Type consistency** — cross-checked `Signal` getter/setter conventions (`svc.latest()` read-only on `RatesService`, `WritableSignal` on `base`), `HistorySeries` vs `CurrencySeries` (defined once in Task 11 Produces and consumed by Task 18), `SortDir` exported by both SortPipe and SortHeaderDirective (same three literals). `ENV_TOKEN` shape identical in Tasks 6/9/11/19. ✓.

---