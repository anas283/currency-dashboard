#!/usr/bin/env node
/**
 * Post-test category coverage gate.
 *
 * karma-coverage only enforces global or per-file thresholds. This script
 * reads the JSON coverage map written by karma-coverage and checks aggregate
 * coverage per category using glob patterns.
 */
const fs = require('fs');
const path = require('path');
const { createCoverageMap, createCoverageSummary } = require('istanbul-lib-coverage');
const { minimatch } = require('minimatch');

const COVERAGE_FILE = path.join(__dirname, '..', 'coverage', 'currency-dashboard', 'coverage-final.json');

const METRICS = ['statements', 'branches', 'functions', 'lines'];

const THRESHOLDS = {
  services: 90,
  components: 80,
  utilsPipes: 95,
  overall: 85,
};

const CATEGORIES = {
  services: '**/src/app/core/services/**/*.ts',
  components: '**/src/app/**/*.component.ts',
  utilsPipes: '**/src/app/shared/{utils,pipes}/**/*.ts',
};

function readCoverageFile() {
  try {
    return fs.readFileSync(COVERAGE_FILE, 'utf8');
  } catch (err) {
    console.error(`Category coverage check: could not read ${COVERAGE_FILE}`, err.message);
    return null;
  }
}

function summaryFor(coverageMap, pattern) {
  const summary = createCoverageSummary();
  coverageMap
    .files()
    .filter((file) => minimatch(file, pattern, { dot: true }))
    .forEach((file) => summary.merge(coverageMap.fileCoverageFor(file).toSummary()));
  return summary.toJSON();
}

function checkCategory(coverageMap, name, pattern, threshold) {
  const summary = summaryFor(coverageMap, pattern);
  let failed = false;
  for (const metric of METRICS) {
    const actual = summary[metric].pct;
    if (actual < threshold) {
      failed = true;
      console.error(
        `Category coverage check: ${name} ${metric} coverage (${actual}%) does not meet threshold (${threshold}%)`
      );
    }
  }
  return failed;
}

function main() {
  const raw = readCoverageFile();
  if (!raw) {
    process.exit(1);
  }

  let coverageMap;
  try {
    coverageMap = createCoverageMap(JSON.parse(raw));
  } catch (err) {
    console.error('Category coverage check: failed to parse coverage-final.json', err.message);
    process.exit(1);
  }

  let failed = false;
  for (const [name, pattern] of Object.entries(CATEGORIES)) {
    if (checkCategory(coverageMap, name, pattern, THRESHOLDS[name])) {
      failed = true;
    }
  }

  if (checkCategory(coverageMap, 'overall', '**/*', THRESHOLDS.overall)) {
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  console.log('Category coverage check: all thresholds met.');
}

main();
