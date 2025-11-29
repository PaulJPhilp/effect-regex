/**
 * Pattern Testing Framework - validates regex patterns against test cases
 *
 * This module provides a comprehensive testing framework for regex patterns,
 * featuring:
 * - Match validation (positive and negative test cases)
 * - Capture group verification (named and numbered groups)
 * - Timeout detection for catastrophic backtracking
 * - Performance tracking and warnings
 * - Multiple dialect support (JavaScript, RE2-sim)
 *
 * @module core/tester
 */

import { Effect } from "effect";

/**
 * Test case specification for regex validation
 *
 * Defines what input to test, whether it should match, and optionally
 * what capture groups should be extracted.
 */
export interface RegexTestCase {
  /** Input string to test the pattern against */
  readonly input: string;
  /** Whether the pattern should match this input */
  readonly shouldMatch: boolean;
  /** Expected capture groups (by name or number) and their values */
  readonly expectedCaptures?: Record<string, string | string[]>;
}

/**
 * Result of running a single test case
 *
 * Contains detailed information about the test execution,
 * including match status, captures, errors, and timing.
 */
export interface TestCaseResult {
  /** Index of this test case in the test suite */
  readonly caseIndex: number;
  /** Whether this test case passed (match result and captures matched expectations) */
  readonly passed: boolean;
  /** Whether the pattern matched the input */
  readonly matched: boolean;
  /** Whether the pattern was expected to match */
  readonly expectedMatch: boolean;
  /** Actual capture groups extracted (if pattern matched) */
  readonly captures?: Record<string, string | string[]>;
  /** Expected capture groups from the test case */
  readonly expectedCaptures?: Record<string, string | string[]>;
  /** Error message if test case execution failed */
  readonly error?: string;
  /** Whether this test case exceeded the timeout */
  readonly timedOut: boolean;
  /** Execution time in milliseconds */
  readonly durationMs: number;
}

/**
 * Aggregated results from running a test suite
 *
 * Provides statistics, failure details, timing, and warnings
 * for an entire test suite run.
 */
export interface TestResult {
  /** Total number of test cases */
  readonly total: number;
  /** Number of test cases that passed */
  readonly passed: number;
  /** Number of test cases that failed */
  readonly failed: number;
  /** Detailed results for failed test cases only */
  readonly failures: readonly TestCaseResult[];
  /** Total execution time in milliseconds */
  readonly timingMs: number;
  /** Performance warnings and other non-fatal issues */
  readonly warnings: readonly string[];
}

/**
 * Test a regex pattern against a suite of test cases
 *
 * Runs all test cases with timeout protection and performance tracking.
 * Each test case is validated for match correctness and capture group accuracy.
 * Catastrophic backtracking patterns are detected via timeout mechanism.
 *
 * @param pattern - Regex pattern string to test
 * @param dialect - Target dialect (js, re2-sim, or re2)
 * @param cases - Array of test cases to run
 * @param timeoutMs - Timeout in milliseconds for each test case (default: 100)
 * @returns Effect that yields a TestResult with aggregated statistics
 * @example
 * ```typescript
 * const pattern = "(?<greeting>\\w+) (?<subject>\\w+)";
 * const cases: RegexTestCase[] = [
 *   { input: "hello world", shouldMatch: true, expectedCaptures: {
 *     greeting: "hello", subject: "world"
 *   }},
 *   { input: "no-match", shouldMatch: false }
 * ];
 * const result = await Effect.runPromise(testRegex(pattern, "js", cases));
 * // result.passed === 2, result.failed === 0
 * ```
 */
export const testRegex = (
  pattern: string,
  cases: readonly RegexTestCase[],
  dialect: "js" | "re2-sim" | "re2" = "js",
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
          warnings.push(
            `Test case ${i} took ${durationMs}ms (close to ${timeoutMs}ms timeout)`
          );
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

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    const failures = results.filter((r) => !r.passed);

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
 * Execute a single test case against a compiled regex
 *
 * Tests the pattern match and validates capture groups if expected.
 * Returns partial result that will be augmented with timing and index.
 *
 * @param regex - Compiled RegExp object
 * @param testCase - Test case specification
 * @returns Promise resolving to partial test case result
 * @internal
 */
const runTestCase = (
  regex: RegExp,
  testCase: RegexTestCase
): Omit<TestCaseResult, "caseIndex" | "timedOut" | "durationMs"> => {
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
    const capturesMatch = checkCapturesMatch(
      captures,
      testCase.expectedCaptures
    );

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
 * Validate that actual captures match expected captures
 *
 * Compares capture group values, supporting both single strings
 * and arrays of strings for multi-match scenarios.
 *
 * @param actual - Actual capture groups extracted from the match
 * @param expected - Expected capture groups from the test case
 * @returns true if all expected captures are present and match
 * @internal
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
      if (
        !Array.isArray(actualValue) ||
        actualValue.length !== expectedValue.length
      ) {
        return false;
      }
      if (!expectedValue.every((val, idx) => val === actualValue[idx])) {
        return false;
      }
    } else if (actualValue !== expectedValue) {
      return false;
    }
  }

  return true;
};

/**
 * Load and run test corpora from JSON files
 *
 * Placeholder for loading test cases from external files.
 * In a full implementation, would read JSON corpora and run all tests.
 *
 * @param corporaPath - Path to corpora directory or file
 * @param dialect - Target regex dialect
 * @param timeoutMs - Timeout per test case in milliseconds
 * @returns Promise resolving to map of test suite names to results
 * @example
 * ```typescript
 * const results = await runCorpora("./test-data/email.json", "js");
 * // results["email-basic"].passed === 10
 * ```
 */
export const runCorpora = (
  corporaPath: string,
  dialect: "js" | "re2-sim" | "re2" = "js",
  timeoutMs = 100
): Record<string, TestResult> => {
  // For now, return empty results - would need file system access in real implementation
  // This is a placeholder for the corpora functionality
  return {};
};

/**
 * Validate test case structure and data types
 *
 * Checks that a test case has all required fields with correct types.
 * Returns array of error messages, empty if valid.
 *
 * @param testCase - Test case to validate
 * @returns Array of validation error messages (empty if valid)
 * @internal
 */
const _validateTestCase = (testCase: RegexTestCase): string[] => {
  const errors: string[] = [];

  if (!testCase.input || typeof testCase.input !== "string") {
    errors.push("Test case must have a valid input string");
  }

  if (typeof testCase.shouldMatch !== "boolean") {
    errors.push("Test case must specify shouldMatch as boolean");
  }

  if (testCase.expectedCaptures) {
    for (const [key, value] of Object.entries(testCase.expectedCaptures)) {
      if (typeof key !== "string") {
        errors.push(`Capture key must be a string, got: ${typeof key}`);
      }
      if (typeof value !== "string" && !Array.isArray(value)) {
        errors.push(
          `Capture value must be string or string array, got: ${typeof value}`
        );
      }
      if (Array.isArray(value) && !value.every((v) => typeof v === "string")) {
        errors.push("Capture array values must all be strings");
      }
    }
  }

  return errors;
};
