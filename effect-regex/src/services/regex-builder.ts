/**
 * RegexBuilderService Implementation
 *
 * Provides core regex operations through a service layer:
 * - emit: Convert RegexBuilder to regex pattern string
 * - lint: Validate pattern for dialect compatibility
 * - optimize: Apply AST optimization passes
 */

import { Effect, Layer } from "effect";
import { emit as coreEmit } from "../core/emitter.js";
import { lint as coreLint } from "../core/linter.js";
import { optimize as coreOptimize } from "../core/optimizer.js";
import { RegexBuilderService } from "./types.js";

/**
 * Live implementation of RegexBuilderService
 *
 * This layer provides the real implementation using core functions.
 * Pure functions (lint, optimize) are passed through directly.
 * Potentially failing functions (emit) are wrapped in Effect.try.
 */
export const RegexBuilderServiceLive = Layer.succeed(RegexBuilderService, {
  emit: (builder, dialect = "js", anchor = false) =>
    Effect.try({
      try: () => coreEmit(builder, dialect, anchor),
      catch: (error) =>
        new Error(
          `Failed to emit regex pattern: ${error instanceof Error ? error.message : String(error)}`
        ),
    }),

  lint: (ast, dialect = "js") => Effect.succeed(coreLint(ast, dialect)),

  optimize: coreOptimize, // Pure function, pass through directly
});
