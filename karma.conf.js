// Karma configuration for Angular 22 unit tests with coverage thresholds.
const path = require('path');

const COVERAGE_DIR = path.join(__dirname, 'coverage', 'currency-dashboard');
const COVERAGE_SUBDIR = '.';

/**
 * Aggregate category coverage reporter.
 *
 * karma-coverage only supports global and per-file thresholds natively.  The
 * requirement here is to enforce *aggregate* coverage per category (services,
 * components, utils/pipes) using glob patterns.  This reporter runs after the
 * test suite completes, reads the JSON coverage map written by karma-coverage,
 * computes summaries for each category, and fails the build when a threshold is
 * not met.
 */
function CategoryCoverageReporter() {
  const fs = require('fs');
  const { createCoverageMap, createCoverageSummary } = require('istanbul-lib-coverage');
  const { minimatch } = require('minimatch');

  const metrics = ['statements', 'branches', 'functions', 'lines'];
  const thresholds = {
    services: 90,
    components: 80,
    utilsPipes: 95,
    overall: 85,
  };

  const categories = {
    services: '**/src/app/core/services/**/*.ts',
    components: '**/src/app/**/*.component.ts',
    utilsPipes: '**/src/app/shared/{utils,pipes}/**/*.ts',
  };

  // Derive the JSON coverage output path from the same source of truth as the
  // Karma config (the constants below are reused in coverageReporter.dir/subdir).
  const coverageFile = path.join(COVERAGE_DIR, COVERAGE_SUBDIR, 'coverage-final.json');

  function readCoverageFile() {
    try {
      return fs.readFileSync(coverageFile, 'utf8');
    } catch {
      return null;
    }
  }

  function checkCoverage(done) {
    const maxAttempts = 30;
    const intervalMs = 100;
    let attempt = 0;

    function tryRead() {
      attempt += 1;
      const raw = readCoverageFile();
      if (raw) {
        return evaluateCoverage(raw, done);
      }
      if (attempt >= maxAttempts) {
        console.error(`Category coverage reporter: coverage-final.json not found at ${coverageFile}`);
        return done(1);
      }
      setTimeout(tryRead, intervalMs);
    }

    tryRead();
  }

  function evaluateCoverage(raw, done) {
    let coverageMap;
    try {
      coverageMap = createCoverageMap(JSON.parse(raw));
    } catch (err) {
      console.error('Category coverage reporter: failed to parse coverage-final.json', err);
      return done(1);
    }

    const files = coverageMap.files();
    let failed = false;

    function summaryFor(pattern) {
      const summary = createCoverageSummary();
      files
        .filter((file) => minimatch(file, pattern, { dot: true }))
        .forEach((file) => summary.merge(coverageMap.fileCoverageFor(file).toSummary()));
      return summary.toJSON();
    }

    function checkCategory(name, pattern, threshold) {
      const summary = summaryFor(pattern);
      for (const metric of metrics) {
        const actual = summary[metric].pct;
        if (actual < threshold) {
          failed = true;
          console.error(
            `Category coverage reporter: ${name} ${metric} coverage (${actual}%) does not meet threshold (${threshold}%)`
          );
        }
      }
    }

    for (const [name, pattern] of Object.entries(categories)) {
      checkCategory(name, pattern, thresholds[name]);
    }

    // Overall threshold is already enforced by karma-coverage's global check;
    // re-check here so the report explicitly mentions it.
    checkCategory('overall', '**/*', thresholds.overall);

    done(failed ? 1 : 0);
  }

  this.onExit = function (done) {
    checkCoverage(done);
  };
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      { 'reporter:category': ['type', CategoryCoverageReporter] },
    ],
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: COVERAGE_DIR,
      subdir: COVERAGE_SUBDIR,
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'json' },
      ],
      check: {
        global: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
    reporters: ['progress', 'kjhtml', 'coverage', 'category'],
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: true,
  });
};
