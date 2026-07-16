// Karma configuration for Angular 22 unit tests with coverage thresholds.
const path = require('path');

const COVERAGE_DIR = path.join(__dirname, 'coverage', 'currency-dashboard');
const COVERAGE_SUBDIR = '.';

/**
 * Aggregate category coverage reporter.
 *
 * karma-coverage only supports global and per-file thresholds natively.  The
 * requirement here is to enforce *aggregate* coverage per category (services,
 * components, utils/pipes) using glob patterns.  This reporter listens for
 * karma-coverage's in-memory `coverage_complete` event, accumulates per-browser
 * coverage, computes summaries for each category, and fails the build when a
 * threshold is not met.
 */
function CategoryCoverageReporter(emitter) {
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

  this.coverageData = {};
  this.coverageReceived = false;
  let resolveCoveragePromise;
  const coveragePromise = new Promise((resolve) => {
    resolveCoveragePromise = resolve;
  });

  emitter.on('coverage_complete', (browser, data) => {
    Object.assign(this.coverageData, data);
    if (!this.coverageReceived) {
      this.coverageReceived = true;
      resolveCoveragePromise();
    }
  });

  function evaluateCoverage(done) {
    const filePaths = Object.keys(this.coverageData);
    if (filePaths.length === 0) {
      console.error('Category coverage reporter: no coverage data received; coverage may be disabled or no in-memory reporter configured');
      return done(1);
    }

    const coverageMap = createCoverageMap(this.coverageData);
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

  this.onExit = async function (done) {
    const timeoutMs = 5000;
    try {
      await Promise.race([
        coveragePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
      ]);
    } catch {
      console.error('Category coverage reporter: no coverage data received; coverage may be disabled or no in-memory reporter configured');
      return done(1);
    }

    evaluateCoverage.call(this, done);
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
      { 'reporter:category': ['factory', function (emitter) { return new CategoryCoverageReporter(emitter); }] },
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
        { type: 'in-memory' },
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
