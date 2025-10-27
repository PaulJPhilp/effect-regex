/**
 * AI Toolkit Utilities
 *
 * Shared utility functions for AI-powered regex development
 */

import type { RegexTestCase } from "../core/tester.js";

/**
 * Create test cases from positive and negative example strings
 *
 * Converts example strings into RegexTestCase format for pattern testing.
 *
 * @param positiveExamples - Strings that should match the pattern
 * @param negativeExamples - Strings that should NOT match the pattern
 * @returns Array of test cases for use with testRegex
 *
 * @example
 * ```typescript
 * const testCases = createTestCasesFromExamples(
 *   ["123", "456"], // Should match
 *   ["abc", "xyz"]  // Should not match
 * );
 * // Returns:
 * // [
 * //   { input: "123", shouldMatch: true },
 * //   { input: "456", shouldMatch: true },
 * //   { input: "abc", shouldMatch: false },
 * //   { input: "xyz", shouldMatch: false }
 * // ]
 * ```
 */
export function createTestCasesFromExamples(
  positiveExamples: readonly string[],
  negativeExamples: readonly string[]
): RegexTestCase[] {
  return [
    ...positiveExamples.map((input) => ({ input, shouldMatch: true })),
    ...negativeExamples.map((input) => ({ input, shouldMatch: false })),
  ];
}
