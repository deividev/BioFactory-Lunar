import { readFileSync } from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const coverageThreshold = 90;
const metrics = ['statements', 'branches', 'functions', 'lines'];

const reports = [
  {
    label: 'unit',
    summaryPath: path.join(workspaceRoot, 'coverage', 'unit', 'coverage-summary.json')
  },
  {
    label: 'angular',
    summaryPath: path.join(workspaceRoot, 'coverage', 'biofactory-lunar', 'coverage-summary.json')
  }
];

const failures = [];

for (const report of reports) {
  const summary = JSON.parse(readFileSync(report.summaryPath, 'utf8'));

  for (const [filePath, metricsByFile] of Object.entries(summary)) {
    if (filePath === 'total') {
      continue;
    }

    for (const metric of metrics) {
      const value = metricsByFile?.[metric]?.pct;

      if (typeof value !== 'number') {
        failures.push(`${report.label}: ${filePath} is missing ${metric} coverage data`);
        continue;
      }

      if (value < coverageThreshold) {
        failures.push(`${report.label}: ${filePath} has ${metric} coverage ${value}% < ${coverageThreshold}%`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Per-file coverage gate failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Per-file coverage gate passed at >=${coverageThreshold}% for unit and angular reports.`);