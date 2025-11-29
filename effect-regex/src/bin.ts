#!/usr/bin/env node

// Simple CLI for M1/M2 - will upgrade to Effect CLI later
import { readFileSync } from "node:fs";
import { Effect } from "effect";
import { emit, RegexBuilder } from "./core/builder.js";
import { explain, formatExplanation } from "./core/explainer.js";
import { optimize } from "./core/optimizer.js";
import { type RegexTestCase, testRegex } from "./core/tester.js";
import { STANDARD_PATTERNS } from "./std/patterns.js";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log(`
effect-regex v0.1.0 - Deterministic regex generation, linting, and explanation

Commands:
  build-pattern <name>           Build a standard library pattern
  lint <pattern>                 Lint a regex pattern (basic syntax check)
  explain <name> [--format=X]    Explain a standard library pattern structure
                                 Formats: tree (default), summary
  test <pattern> <json-file>     Test a pattern against JSON test cases
                                 JSON format: [{"input": "...", "shouldMatch": true}, ...]
  optimize <name>                Optimize a standard library pattern
  --help                         Show this help

Available standard patterns:
  quotedString, keyValue, pathSegment, filePathBasic, csvList, integer
  email, url, username, passwordStrong
  uuidV4, semverStrict, hexColor, cssColor, timeHHMMSS, usPhone
  ipv4, ipv6Compressed, float, isoDate, isoDateTime

Examples:
  node dist/bin.cjs build-pattern quotedString
  node dist/bin.cjs lint "[a-z]+"
  node dist/bin.cjs explain quotedString
  node dist/bin.cjs explain uuidV4 --format=summary
  node dist/bin.cjs test "\\d{3}" test-cases.json
  node dist/bin.cjs optimize quotedString

Note: The 'explain' command currently only works with standard library patterns.
      Full regex string parsing will be added in a future release.
`);
  process.exit(0);
}

const command = args[0];

switch (command) {
  case "build-pattern": {
    if (args.length < 2) {
      console.error("Usage: build-pattern <name>");
      process.exit(1);
    }
    const patternName = args[1];
    const stdPattern =
      STANDARD_PATTERNS[patternName as keyof typeof STANDARD_PATTERNS];
    if (!stdPattern) {
      console.error(`Unknown standard pattern: ${patternName}`);
      console.error(
        `Available patterns: ${Object.keys(STANDARD_PATTERNS).join(", ")}`
      );
      process.exit(1);
    }

    const result = emit(stdPattern.pattern, "js", false);
    console.log(
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
    break;
  }

  case "lint": {
    if (args.length < 2) {
      console.error("Usage: lint <pattern>");
      process.exit(1);
    }
    const pattern = args[1];
    try {
      // Validate pattern by constructing RegExp
      const regex = new RegExp(pattern);
      // Use the regex to prevent tree-shaking (test against empty string)
      regex.test("");
      console.log(
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
      console.log(
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
    break;
  }

  case "explain": {
    if (args.length < 2) {
      console.error("Usage: explain <name> [--format=tree|summary]");
      console.error("\nExample: explain quotedString");
      process.exit(1);
    }
    const patternName = args[1];

    // Parse optional format flag
    const formatArg = args.find((arg) => arg.startsWith("--format="));
    const format = formatArg
      ? (formatArg.split("=")[1] as "tree" | "summary")
      : "tree";

    // Lookup pattern in standard library
    const stdPattern =
      STANDARD_PATTERNS[patternName as keyof typeof STANDARD_PATTERNS];
    if (!stdPattern) {
      console.error(`Unknown standard pattern: ${patternName}`);
      console.error(
        `Available patterns: ${Object.keys(STANDARD_PATTERNS).join(", ")}`
      );
      console.error(
        "\nNote: explain command only works with standard library patterns."
      );
      console.error(
        "      Full regex string parsing will be added in a future release."
      );
      process.exit(1);
    }

    try {
      // Get the AST from the pattern
      const ast = stdPattern.pattern.getAst();

      // Generate explanation
      const explanation = explain(ast, {
        format,
        dialect: "js",
        maxDepth: 10,
      });

      // Output based on format
      if (format === "summary") {
        // Summary format - just top-level description
        console.log(
          JSON.stringify(
            {
              pattern: patternName,
              description: stdPattern.description,
              explanation: explanation.description,
              regexPattern: explanation.pattern,
              notes: explanation.notes || [],
            },
            null,
            2
          )
        );
      } else {
        // Tree format (default) - full structured breakdown
        console.log(
          JSON.stringify(
            {
              pattern: patternName,
              description: stdPattern.description,
              explanation,
              formatted: formatExplanation(explanation),
            },
            null,
            2
          )
        );
      }
    } catch (error) {
      console.error(`Error explaining pattern: ${(error as Error).message}`);
      console.error((error as Error).stack);
      process.exit(1);
    }
    break;
  }

  case "test": {
    if (args.length < 3) {
      console.error("Usage: test <pattern> <json-file>");
      console.error(
        '\nJSON format: [{"input": "test", "shouldMatch": true}, ...]'
      );
      console.error("\nExample: test '\\d{3}' test-cases.json");
      process.exit(1);
    }
    const pattern = args[1];
    const jsonFile = args[2];

    // Parse optional flags
    const dialectArg = args.find((arg) => arg.startsWith("--dialect="));
    const dialect = dialectArg
      ? (dialectArg.split("=")[1] as "js" | "re2-sim" | "re2")
      : "js";

    const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
    const timeout = timeoutArg
      ? Number.parseInt(timeoutArg.split("=")[1], 10)
      : 100;

    try {
      // Read and parse test cases from JSON file
      const fileContents = readFileSync(jsonFile, "utf-8");
      let testCases: RegexTestCase[];

      try {
        testCases = JSON.parse(fileContents);
      } catch (parseError) {
        console.error(
          `Error parsing JSON file: ${(parseError as Error).message}`
        );
        console.error(
          '\nExpected format: [{"input": "...", "shouldMatch": true}, ...]'
        );
        process.exit(1);
      }

      // Validate test cases structure
      if (!Array.isArray(testCases)) {
        console.error("Error: JSON file must contain an array of test cases");
        process.exit(1);
      }

      for (const testCase of testCases) {
        if (
          typeof testCase.input !== "string" ||
          typeof testCase.shouldMatch !== "boolean"
        ) {
          console.error(
            "Error: Each test case must have 'input' (string) and 'shouldMatch' (boolean)"
          );
          process.exit(1);
        }
      }

      // Run the tests using Effect
      const testEffect = testRegex(pattern, testCases, dialect, timeout);

      Effect.runPromise(testEffect)
        .then((result) => {
          // Output test results as JSON
          console.log(
            JSON.stringify(
              {
                pattern,
                dialect,
                total: result.total,
                passed: result.passed,
                failed: result.failed,
                successRate:
                  result.total > 0
                    ? Math.round((result.passed / result.total) * 100)
                    : 0,
                timingMs: result.timingMs,
                warnings: result.warnings,
                failures: result.failures.map((failure) => ({
                  caseIndex: failure.caseIndex,
                  input: testCases[failure.caseIndex].input,
                  expectedMatch: failure.expectedMatch,
                  actualMatch: failure.matched,
                  timedOut: failure.timedOut,
                  durationMs: failure.durationMs,
                  error: failure.error,
                })),
              },
              null,
              2
            )
          );

          // Exit with error code if any tests failed
          process.exit(result.failed > 0 ? 1 : 0);
        })
        .catch((error) => {
          console.error(`Error running tests: ${error.message}`);
          console.error(error.stack);
          process.exit(1);
        });
    } catch (error) {
      console.error(`Error testing pattern: ${(error as Error).message}`);
      process.exit(1);
    }
    break;
  }

  case "optimize": {
    if (args.length < 2) {
      console.error("Usage: optimize <name>");
      process.exit(1);
    }
    const patternName = args[1];
    const stdPattern =
      STANDARD_PATTERNS[patternName as keyof typeof STANDARD_PATTERNS];
    if (!stdPattern) {
      console.error(`Unknown standard pattern: ${patternName}`);
      console.error(
        `Available patterns: ${Object.keys(STANDARD_PATTERNS).join(", ")}`
      );
      process.exit(1);
    }

    // Get the AST
    const ast = stdPattern.pattern.getAst();

    // Emit before optimization
    const beforeResult = emit(stdPattern.pattern, "js", false);

    // Optimize (synchronous call - no longer wrapped in Effect)
    try {
      const result = optimize(ast);

      // Emit after optimization
      const optimizedBuilder = RegexBuilder.fromAst(result.optimized);
      const afterResult = emit(optimizedBuilder, "js", false);

      // Output comparison
      console.log(
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
    } catch (error) {
      console.error(`Error optimizing pattern: ${(error as Error).message}`);
      process.exit(1);
    }
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    console.error("Run with --help for usage");
    process.exit(1);
}
