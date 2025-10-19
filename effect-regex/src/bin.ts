#!/usr/bin/env node

// Simple CLI for M1/M2 - will upgrade to Effect CLI later
import { emit, RegexBuilder } from "./core/builder.js"
import { testRegex } from "./core/tester.js"
import { explain, formatExplanation } from "./core/explainer.js"
import { STANDARD_PATTERNS } from "./std/patterns.js"
import { optimize } from "./core/optimizer.js"
import { Effect } from "effect"

const args = process.argv.slice(2)

if (args.length === 0 || args[0] === "--help") {
  console.log(`
effect-regex v0.1.0 - Deterministic regex generation, linting, and explanation

Commands:
  build-pattern <name>    Build a standard library pattern
  lint <pattern>          Lint a regex pattern
  explain <pattern>       Explain a regex pattern structure
  test <pattern> <json>   Test a pattern against JSON test cases
  optimize <name>         Optimize a standard library pattern
  --help                  Show this help

Available standard patterns:
  quotedString, keyValue, pathSegment, filePathBasic, csvList, integer
  uuidV4, semverStrict, ipv4, ipv6Compressed, float, isoDate, isoDateTime

Examples:
  node dist/bin.cjs build-pattern quotedString
  node dist/bin.cjs lint "[a-z]+"
  node dist/bin.cjs explain "(hello|world)+"
  node dist/bin.cjs test "[a-z]+" test-cases.json
`)
  process.exit(0)
}

const command = args[0]

switch (command) {
  case "build-pattern": {
    if (args.length < 2) {
      console.error("Usage: build-pattern <name>")
      process.exit(1)
    }
    const patternName = args[1]
    const stdPattern = STANDARD_PATTERNS[patternName as keyof typeof STANDARD_PATTERNS]
    if (!stdPattern) {
      console.error(`Unknown standard pattern: ${patternName}`)
      console.error(`Available patterns: ${Object.keys(STANDARD_PATTERNS).join(", ")}`)
      process.exit(1)
    }

    const result = emit(stdPattern.pattern, "js", false)
    console.log(JSON.stringify({
      pattern: result.pattern,
      notes: result.notes,
      captureMap: result.captureMap
    }, null, 2))
    break
  }

  case "lint": {
    if (args.length < 2) {
      console.error("Usage: lint <pattern>")
      process.exit(1)
    }
    const pattern = args[1]
    try {
      new RegExp(pattern)
      console.log(JSON.stringify({
        valid: true,
        issues: []
      }, null, 2))
    } catch (error) {
      console.log(JSON.stringify({
        valid: false,
        issues: [{
          code: "INVALID_PATTERN",
          severity: "error",
          message: `Invalid regex pattern: ${(error as Error).message}`
        }]
      }, null, 2))
    }
    break
  }

  case "explain": {
    if (args.length < 2) {
      console.error("Usage: explain <pattern>")
      process.exit(1)
    }
    const pattern = args[1]

    try {
      // For now, create a simple AST and explain it
      // TODO: Parse pattern into AST properly
      console.log(JSON.stringify({
        explanation: "Pattern explanation",
        pattern,
        notes: ["AST-based explanation coming soon"]
      }, null, 2))
    } catch (error) {
      console.error(`Error explaining pattern: ${(error as Error).message}`)
      process.exit(1)
    }
    break
  }

  case "test": {
    if (args.length < 3) {
      console.error("Usage: test <pattern> <json-file>")
      process.exit(1)
    }
    const pattern = args[1]
    const jsonFile = args[2]

    try {
      // For now, just show the command
      console.log(JSON.stringify({
        command: "test",
        pattern,
        jsonFile,
        notes: ["Full test execution coming soon"]
      }, null, 2))
    } catch (error) {
      console.error(`Error testing pattern: ${(error as Error).message}`)
      process.exit(1)
    }
    break
  }

  case "optimize": {
    if (args.length < 2) {
      console.error("Usage: optimize <name>")
      process.exit(1)
    }
    const patternName = args[1]
    const stdPattern = STANDARD_PATTERNS[patternName as keyof typeof STANDARD_PATTERNS]
    if (!stdPattern) {
      console.error(`Unknown standard pattern: ${patternName}`)
      console.error(`Available patterns: ${Object.keys(STANDARD_PATTERNS).join(", ")}`)
      process.exit(1)
    }

    // Get the AST
    const ast = stdPattern.pattern.getAst()

    // Emit before optimization
    const beforeResult = emit(stdPattern.pattern, "js", false)

    // Optimize (run Effect synchronously)
    try {
      const result = Effect.runSync(optimize(ast))

      // Emit after optimization
      const optimizedBuilder = new RegexBuilder(result.optimized)
      const afterResult = emit(optimizedBuilder, "js", false)

      // Output comparison
      console.log(JSON.stringify({
        pattern: patternName,
        before: {
          pattern: beforeResult.pattern,
          nodes: result.beforeSize
        },
        after: {
          pattern: afterResult.pattern,
          nodes: result.afterSize
        },
        optimization: {
          nodesReduced: result.nodesReduced,
          reductionPercent: result.beforeSize > 0
            ? Math.round((result.nodesReduced / result.beforeSize) * 100)
            : 0,
          passesApplied: result.passesApplied,
          iterations: result.passesApplied.length
        }
      }, null, 2))
    } catch (error) {
      console.error(`Error optimizing pattern: ${(error as Error).message}`)
      process.exit(1)
    }
    break
  }

  default:
    console.error(`Unknown command: ${command}`)
    console.error("Run with --help for usage")
    process.exit(1)
}
