import { Effect } from "effect";

/**
 * Test case for regex validation
 */
export interface RegexTestCase {
  readonly input: string;
  readonly shouldMatch: boolean;
  readonly expectedCaptures?: Record<string, string | string[]>;
}

/**
 * Result of running a single test case
 */
export interface TestCaseResult {
  readonly caseIndex: number;
  readonly passed: boolean;
  readonly matched: boolean;
  readonly expectedMatch: boolean;
  readonly captures?: Record<string, string | string[]>;
  readonly expectedCaptures?: Record<string, string | string[]>;
  readonly error?: string;
  readonly timedOut: boolean;
  readonly durationMs: number;
}

/**
 * Overall test result
 */
export interface TestResult {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly TestCaseResult[];
  readonly timingMs: number;
  readonly warnings: readonly string[];
}

/**
 * Test a regex pattern against a suite of test cases
 */
export const testRegex = (
  pattern: string,
  dialect: "js" | "re2-sim" | "re2" = "js",
  cases: readonly RegexTestCase[],
  timeoutMs = 100
): Effect<never, never, TestResult> => {
  return Effect.gen(function* () {
    const startTime = Date.now();

    // For now, use JS RegExp. RE2 support would be added later
    let regex: RegExp;
    try {
      if (dialect === "re2-sim") {
        // Simulate RE2 constraints in JS
        regex = new RegExp(pattern);
      } else {
        regex = new RegExp(pattern);
      }
    } catch (error) {
      return {
        total: cases.length,
        passed: 0,
        failed: cases.length,
        failures: cases.map((_, index) => ({
          caseIndex: index,
          passed: false,
          matched: false,
          expectedMatch: _.shouldMatch,
          error: `Invalid regex pattern: ${(error as Error).message}`,
          timedOut: false,
          durationMs: 0,
        })),
        timingMs: Date.now() - startTime,
        warnings: [`Pattern compilation failed: ${(error as Error).message}`],
      };
    }

    const results: TestCaseResult[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < cases.length; i++) {
      const testCase = cases[i];
      const caseStartTime = Date.now();

      try {
        // Run the test with timeout using Effect.promise
        const result = yield* Effect.promise(() =>
          Promise.race([
            runTestCase(regex, testCase),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
            ),
          ])
        );

        const durationMs = Date.now() - caseStartTime;
        results.push({
          caseIndex: i,
          ...result,
          timedOut: false,
          durationMs,
        });

        // Check for timeout warnings
        if (durationMs > timeoutMs * 0.8) {
          warnings.push(`Test case ${i} took ${durationMs}ms (close to ${timeoutMs}ms timeout)`);
        }

      } catch (error) {
        const durationMs = Date.now() - caseStartTime;
        if ((error as Error).message === "TIMEOUT") {
          results.push({
            caseIndex: i,
            passed: false,
            matched: false,
            expectedMatch: testCase.shouldMatch,
            timedOut: true,
            durationMs,
          });
          warnings.push(`Test case ${i} timed out after ${durationMs}ms`);
        } else {
          results.push({
            caseIndex: i,
            passed: false,
            matched: false,
            expectedMatch: testCase.shouldMatch,
            error: (error as Error).message,
            timedOut: false,
            durationMs,
          });
        }
      }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const failures = results.filter(r => !r.passed);

    return {
      total: cases.length,
      passed,
      failed,
      failures,
      timingMs: Date.now() - startTime,
      warnings,
    };
  });
};

/**
 * Run a single test case
 */
const runTestCase = async (
  regex: RegExp,
  testCase: RegexTestCase
): Promise<Omit<TestCaseResult, "caseIndex" | "timedOut" | "durationMs">> => {
  const match = regex.exec(testCase.input);
  const matched = match !== null;

  // Check if match result matches expectation
  if (matched !== testCase.shouldMatch) {
    return {
      passed: false,
      matched,
      expectedMatch: testCase.shouldMatch,
    };
  }

  // If we don't expect a match, we're done
  if (!testCase.shouldMatch) {
    return {
      passed: true,
      matched: false,
      expectedMatch: false,
    };
  }

  // Check captures if expected
  if (testCase.expectedCaptures && match) {
    const captures: Record<string, string | string[]> = {};

    // For named groups (if supported)
    if (match.groups) {
      Object.assign(captures, match.groups);
    }

    // For numbered groups
    for (let i = 1; i < match.length; i++) {
      if (match[i] !== undefined) {
        captures[i.toString()] = match[i];
      }
    }

    // Check if captures match expectations
    const capturesMatch = checkCapturesMatch(captures, testCase.expectedCaptures);

    return {
      passed: capturesMatch,
      matched: true,
      expectedMatch: true,
      captures,
      expectedCaptures: testCase.expectedCaptures,
    };
  }

  return {
    passed: true,
    matched,
    expectedMatch: testCase.shouldMatch,
  };
};

/**
 * Check if actual captures match expected captures
 */
const checkCapturesMatch = (
  actual: Record<string, string | string[]>,
  expected: Record<string, string | string[]>
): boolean => {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (actualValue === undefined) {
      return false;
    }

    if (Array.isArray(expectedValue)) {
      if (!Array.isArray(actualValue) || actualValue.length !== expectedValue.length) {
        return false;
      }
      if (!expectedValue.every((val, idx) => val === actualValue[idx])) {
        return false;
      }
    } else {
      if (actualValue !== expectedValue) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Load and run test corpora from JSON files
 */
export const runCorpora = async (
  corporaPath: string,
  dialect: "js" | "re2-sim" | "re2" = "js",
  timeoutMs = 100
): Promise<Record<string, TestResult>> => {
  // For now, return empty results - would need file system access in real implementation
  // This is a placeholder for the corpora functionality
  return {};
};

/**
 * Validate test case input
 */
const validateTestCase = (testCase: RegexTestCase): string[] => {
  const errors: string[] = [];

  if (!testCase.input || typeof testCase.input !== 'string') {
    errors.push('Test case must have a valid input string');
  }

  if (typeof testCase.shouldMatch !== 'boolean') {
    errors.push('Test case must specify shouldMatch as boolean');
  }

  if (testCase.expectedCaptures) {
    for (const [key, value] of Object.entries(testCase.expectedCaptures)) {
      if (typeof key !== 'string') {
        errors.push(`Capture key must be a string, got: ${typeof key}`);
      }
      if (typeof value !== 'string' && !Array.isArray(value)) {
        errors.push(`Capture value must be string or string array, got: ${typeof value}`);
      }
      if (Array.isArray(value) && !value.every(v => typeof v === 'string')) {
        errors.push('Capture array values must all be strings');
      }
    }
  }

  return errors;
};
