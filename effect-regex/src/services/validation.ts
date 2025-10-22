/**
 * ValidationService Implementation
 *
 * Provides pattern validation and testing through a service layer:
 * - test: Execute regex patterns against test cases with timeout protection
 * - validateForDialect: Check pattern compatibility with target dialect
 */

import { Effect, Layer } from "effect";
import { emit } from "../core/emitter.js";
import { lint } from "../core/linter.js";
import { testRegex as coreTestRegex } from "../core/tester.js";
import { TestExecutionError } from "../errors/index.js";
import { ValidationService } from "./types.js";

/**
 * Live implementation of ValidationService
 */
export const ValidationServiceLive = Layer.succeed(ValidationService, {
  test: (pattern, dialect = "js", cases, timeoutMs = 100) =>
    coreTestRegex(pattern, dialect, cases, timeoutMs).pipe(
      Effect.mapError(
        (error) =>
          new TestExecutionError({
            pattern,
            reason: error instanceof Error ? error.message : String(error),
            timedOut:
              error instanceof Error && error.message.includes("timeout"),
          })
      )
    ),

  validateForDialect: (pattern, dialect) =>
    Effect.gen(function* () {
      const result = emit(pattern, dialect);
      const lintResult = lint(result.ast, dialect);
      return {
        valid: lintResult.valid,
        issues: lintResult.issues.map((issue) => issue.message),
      };
    }),
});
