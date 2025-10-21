import * as Args from "@effect/cli/Args";
import * as Command from "@effect/cli/Command";
import { Console, Effect } from "effect";
import { emit, RegexBuilder } from "./core/builder.js";
import { optimize } from "./core/optimizer.js";
import { STANDARD_PATTERNS } from "./std/patterns.js";

// build-pattern command
const buildPatternCommand = Command.make(
  "build-pattern",
  {
    patternName: Args.text("pattern-name").pipe(
      Args.withDescription("Name of standard library pattern to build")
    ),
  },
  ({ patternName }) =>
    Effect.gen(function* () {
      const stdPattern =
        STANDARD_PATTERNS[patternName as keyof typeof STANDARD_PATTERNS];
      if (!stdPattern) {
        yield* Console.error(`Unknown standard pattern: ${patternName}`);
        yield* Console.error(
          `Available patterns: ${Object.keys(STANDARD_PATTERNS).join(", ")}`
        );
        return;
      }

      const result = emit(stdPattern.pattern, "js", false);
      yield* Console.log(
        JSON.stringify(
          {
            pattern: result.pattern,
            notes: result.notes,
            captureMap: result.captureMap,
          },
          null,
          2
        )
      );
    })
);

// lint command
const lintCommand = Command.make(
  "lint",
  {
    pattern: Args.text("pattern").pipe(
      Args.withDescription("Regex pattern to lint")
    ),
  },
  ({ pattern }) =>
    Effect.gen(function* () {
      try {
        new RegExp(pattern);
        yield* Console.log(
          JSON.stringify(
            {
              valid: true,
              issues: [],
            },
            null,
            2
          )
        );
      } catch (error) {
        yield* Console.log(
          JSON.stringify(
            {
              valid: false,
              issues: [
                {
                  code: "INVALID_PATTERN",
                  severity: "error",
                  message: `Invalid regex pattern: ${(error as Error).message}`,
                },
              ],
            },
            null,
            2
          )
        );
      }
    })
);

// optimize command
const optimizeCommand = Command.make(
  "optimize",
  {
    patternName: Args.text("pattern-name").pipe(
      Args.withDescription("Name of standard library pattern to optimize")
    ),
  },
  ({ patternName }, options) => {
    return Effect.gen(function* () {
      const stdPattern =
        STANDARD_PATTERNS[patternName as keyof typeof STANDARD_PATTERNS];
      if (!stdPattern) {
        yield* Console.error(`Unknown standard pattern: ${patternName}`);
        yield* Console.error(
          `Available patterns: ${Object.keys(STANDARD_PATTERNS).join(", ")}`
        );
        return;
      }

      // Get the AST
      const ast = stdPattern.pattern.getAst();

      // Emit before optimization
      const beforeResult = emit(stdPattern.pattern, "js", false);

      // Optimize (synchronous call - no longer wrapped in Effect)
      const result = optimize(ast);

      // Emit after optimization
      const optimizedBuilder = new RegexBuilder(result.optimized);
      const afterResult = emit(optimizedBuilder, "js", false);

      // Output comparison
      yield* Console.log(
        JSON.stringify(
          {
            pattern: patternName,
            before: {
              pattern: beforeResult.pattern,
              nodes: result.beforeSize,
            },
            after: {
              pattern: afterResult.pattern,
              nodes: result.afterSize,
            },
            optimization: {
              nodesReduced: result.nodesReduced,
              reductionPercent:
                result.beforeSize > 0
                  ? Math.round((result.nodesReduced / result.beforeSize) * 100)
                  : 0,
              passesApplied: result.passesApplied,
              iterations: result.passesApplied.length,
            },
          },
          null,
          2
        )
      );
    });
  }
);

// Main command - simplified for M1
const command = Command.make("effect-regex", {
  subcommands: [buildPatternCommand, lintCommand, optimizeCommand],
});

export const run = Command.run(command, {
  name: "effect-regex",
  version: "0.1.0",
  summary: "Deterministic regex generation, linting, and explanation",
});
