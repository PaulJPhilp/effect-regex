/**
 * Test Regex Tool - Validate patterns against test cases
 *
 * @module mcp/tools/test-regex
 */

import { Effect } from "effect";
import { type RegexTestCase, testRegex } from "../../core/tester.js";
import { LIMITS, type TestRegexArgs, type ToolHandler } from "../types.js";
import { toMcpError, validateInputEffect } from "../utils/validation.js";

/**
 * Handle test_regex tool requests
 *
 * Runs pattern against test cases with:
 * - Timeout protection (default 100ms per case)
 * - Match validation (should/shouldn't match)
 * - Capture group verification
 * - Catastrophic backtracking detection
 *
 * @param args - Pattern, test cases, dialect, and timeout
 * @returns Test results with pass/fail statistics and detailed failures
 */
export const handleTestRegex: ToolHandler<TestRegexArgs, any> = (args) =>
  Effect.gen(function* () {
    yield* validateInputEffect(args);

    const {
      pattern,
      cases,
      dialect = "js",
      timeoutMs = LIMITS.DEFAULT_TIMEOUT_MS,
    } = args;

    const testCases: RegexTestCase[] = cases.map((c) => ({
      input: c.input,
      shouldMatch: c.shouldMatch ?? true,
      expectedCaptures: c.expectedCaptures,
    }));

    const result = yield* testRegex(
      pattern,
      testCases,
      dialect as any,
      timeoutMs
    );

    return result;
  }).pipe(
    Effect.catchAll((error) => Effect.fail(toMcpError(error, "Test failed")))
  );
