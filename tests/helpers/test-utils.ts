/**
 * Lightweight, zero-dependency Test Runner & Assertion Library for kuyumpanel E2E & Unit Test Suites.
 * Designed for execution via `npx tsx tests/run-all-tests.ts`.
 */

export interface TestResult {
  tier: string;
  featureId: number;
  featureName: string;
  suiteName: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  error?: Error | string;
}

export interface SuiteSummary {
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}

export interface GlobalTestReport {
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDurationMs: number;
  tierBreakdown: Record<string, { total: number; passed: number; failed: number }>;
  featureMatrix: Record<number, { featureName: string; tier1: number; tier2: number; tier3: number; tier4: number; passed: boolean }>;
  failures: Array<{ suite: string; test: string; error: string }>;
}

let currentTier = 'Tier 1';
let currentFeatureId = 1;
let currentFeatureName = 'Centralized Constants & Enums';
let currentSuiteName = 'Default Suite';

const testRegistry: Array<() => Promise<TestResult>> = [];

export function setTestContext(tier: string, featureId: number, featureName: string, suiteName: string) {
  currentTier = tier;
  currentFeatureId = featureId;
  currentFeatureName = featureName;
  currentSuiteName = suiteName;
}

export function describe(suiteName: string, fn: () => void) {
  const previousSuite = currentSuiteName;
  currentSuiteName = suiteName;
  fn();
  currentSuiteName = previousSuite;
}

export function it(testName: string, testFn: () => void | Promise<void>) {
  test(testName, testFn);
}

export function test(testName: string, testFn: () => void | Promise<void>) {
  const tier = currentTier;
  const featureId = currentFeatureId;
  const featureName = currentFeatureName;
  const suiteName = currentSuiteName;

  testRegistry.push(async (): Promise<TestResult> => {
    const startTime = performance.now();
    try {
      await testFn();
      const durationMs = performance.now() - startTime;
      return {
        tier,
        featureId,
        featureName,
        suiteName,
        testName,
        passed: true,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = performance.now() - startTime;
      return {
        tier,
        featureId,
        featureName,
        suiteName,
        testName,
        passed: false,
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

export function clearRegistry() {
  testRegistry.length = 0;
}

export async function runRegisterededTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const testRunner of testRegistry) {
    const res = await testRunner();
    results.push(res);
  }
  return results;
}

// ---------------------- ASSERTION ENGINE ----------------------

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function expect<T>(actual: T) {
  const matchers = {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new AssertionError(`Expected ${JSON.stringify(expected)} (type: ${typeof expected}), but received ${JSON.stringify(actual)} (type: ${typeof actual})`);
      }
    },
    toEqual(expected: any) {
      const actualJson = JSON.stringify(actual);
      const expectedJson = JSON.stringify(expected);
      if (actualJson !== expectedJson) {
        throw new AssertionError(`Expected deep equality:\nExpected: ${expectedJson}\nReceived: ${actualJson}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new AssertionError(`Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new AssertionError(`Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new AssertionError(`Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual > expected) {
        throw new AssertionError(`Expected ${actual} <= ${expected}`);
      }
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      if (typeof actual !== 'number') {
        throw new AssertionError(`Expected number, but received ${typeof actual}`);
      }
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      if (diff > tolerance) {
        throw new AssertionError(`Expected ${actual} to be close to ${expected} with precision ${precision} (diff: ${diff}, tolerance: ${tolerance})`);
      }
    },
    toContain(item: any) {
      if (typeof actual === 'string') {
        if (!actual.includes(String(item))) {
          throw new AssertionError(`Expected string "${actual}" to contain substring "${item}"`);
        }
      } else if (Array.isArray(actual)) {
        if (!actual.some(x => JSON.stringify(x) === JSON.stringify(item) || x === item)) {
          throw new AssertionError(`Expected array ${JSON.stringify(actual)} to contain item ${JSON.stringify(item)}`);
        }
      } else {
        throw new AssertionError(`toContain expected array or string, but received ${typeof actual}`);
      }
    },
    toMatch(regex: RegExp) {
      if (typeof actual !== 'string' || !regex.test(actual)) {
        throw new AssertionError(`Expected "${actual}" to match pattern ${regex}`);
      }
    },
    toThrow(expectedMessageOrSubstring?: string) {
      if (typeof actual !== 'function') {
        throw new AssertionError(`Expected a function to test for throws, but received ${typeof actual}`);
      }
      let threw = false;
      let errorThrown: any = null;
      try {
        (actual as any)();
      } catch (err) {
        threw = true;
        errorThrown = err;
      }
      if (!threw) {
        throw new AssertionError(`Expected function to throw an error, but it returned normally.`);
      }
      if (expectedMessageOrSubstring) {
        const msg = errorThrown instanceof Error ? errorThrown.message : String(errorThrown);
        if (!msg.includes(expectedMessageOrSubstring)) {
          throw new AssertionError(`Expected thrown error message to contain "${expectedMessageOrSubstring}", but got "${msg}"`);
        }
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new AssertionError(`Expected value to be defined, but received undefined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new AssertionError(`Expected value to be undefined, but received ${actual}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new AssertionError(`Expected null, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new AssertionError(`Expected truthy value, but received ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new AssertionError(`Expected falsy value, but received ${actual}`);
      }
    },
    toHaveLength(expectedLength: number) {
      if (!actual || typeof (actual as any).length !== 'number') {
        throw new AssertionError(`Expected object with length property, received ${actual}`);
      }
      if ((actual as any).length !== expectedLength) {
        throw new AssertionError(`Expected length ${expectedLength}, but got ${(actual as any).length}`);
      }
    },
  };

  const notMatchers = {
    toBe(expected: T) {
      if (actual === expected) {
        throw new AssertionError(`Expected value NOT to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: any) {
      const actualJson = JSON.stringify(actual);
      const expectedJson = JSON.stringify(expected);
      if (actualJson === expectedJson) {
        throw new AssertionError(`Expected values NOT to be deeply equal: ${actualJson}`);
      }
    },
    toContain(item: any) {
      if (typeof actual === 'string') {
        if (actual.includes(String(item))) {
          throw new AssertionError(`Expected string "${actual}" NOT to contain substring "${item}"`);
        }
      } else if (Array.isArray(actual)) {
        if (actual.some(x => JSON.stringify(x) === JSON.stringify(item) || x === item)) {
          throw new AssertionError(`Expected array NOT to contain item ${JSON.stringify(item)}`);
        }
      }
    },
    toMatch(regex: RegExp) {
      if (typeof actual === 'string' && regex.test(actual)) {
        throw new AssertionError(`Expected "${actual}" NOT to match pattern ${regex}`);
      }
    },
    toBeNull() {
      if (actual === null) {
        throw new AssertionError(`Expected value NOT to be null`);
      }
    },
    toBeDefined() {
      if (actual !== undefined) {
        throw new AssertionError(`Expected value NOT to be defined`);
      }
    },
    toBeUndefined() {
      if (actual === undefined) {
        throw new AssertionError(`Expected value NOT to be undefined`);
      }
    },
    toBeTruthy() {
      if (actual) {
        throw new AssertionError(`Expected value NOT to be truthy`);
      }
    },
    toBeFalsy() {
      if (!actual) {
        throw new AssertionError(`Expected value NOT to be falsy`);
      }
    },
  };

  return {
    ...matchers,
    not: notMatchers,
  };
}

