import { describe, expect, it } from 'vitest';
import { getScaffoldReadiness, PROJECT_NAME } from './scaffold';

describe('project scaffold test harness', () => {
  it('executes real TypeScript project code through Vitest', () => {
    expect(PROJECT_NAME).toBe('Biofactory: Lunar');
    expect(getScaffoldReadiness()).toBe('pnpm-test-harness-ready');
  });
});
