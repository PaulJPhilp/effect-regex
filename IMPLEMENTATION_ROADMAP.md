# Implementation Roadmap: Critical & High Priority Fixes

**Created**: 2025-10-21
**Based On**: DESIGN_REVIEW.md (Issues #1-7)
**Status**: Planning Phase
**Target Timeline**: 3-4 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Security Critical - Eliminate eval()](#phase-1-security-critical---eliminate-eval)
3. [Phase 2: Effect-TS Architectural Corrections](#phase-2-effect-ts-architectural-corrections)
4. [Phase 3: CLI Consolidation](#phase-3-cli-consolidation)
5. [Phase 4: Standard Library Pattern Refactoring](#phase-4-standard-library-pattern-refactoring)
6. [Phase 5: Test Coverage Expansion](#phase-5-test-coverage-expansion)
7. [Implementation Timeline](#implementation-timeline)
8. [Risk Management](#risk-management)
9. [Success Metrics](#success-metrics)

---

## Executive Summary

This roadmap addresses 7 critical and high-priority issues identified in the design review:

| Phase | Issue # | Priority | Effort | Impact |
|-------|---------|----------|--------|--------|
| 1 | #1 | **CRITICAL** | 3-5 days | Security vulnerability (eval usage) |
| 2A | #2 | High | 2-3 days | Architectural correctness (Effect misuse) |
| 2B | #3 | High | 3-4 days | Service layer foundation |
| 2C | #4 | High | 2-3 days | Error type precision |
| 3 | #5 | High | 2-3 days | Code duplication (dual CLIs) |
| 4 | #6 | High | 2-3 days | API consistency |
| 5 | #7 | High | 4-5 days | Quality assurance |

**Total Estimated Effort**: 18-26 days (3-4 weeks for one developer)

---

## Phase 1: Security Critical - Eliminate eval()

**Status**: ✅ **COMPLETE** (2025-10-21)
**Priority**: CRITICAL ⚠️
**Effort**: 3-5 days (Actual: 0.5 days)
**Branch**: `fix/remove-eval-security`
**Assignee**: Claude Code

### Implementation Summary

Phase 1 has been successfully completed with all security objectives met:

- ✅ Created AST-based interpreter (570 lines, src/ai/interpreter.ts)
- ✅ Refactored AI toolkit to use safe interpreter
- ✅ Added 45 comprehensive security tests (100% passing)
- ✅ Verified zero eval() calls in codebase
- ✅ Created SECURITY.md documentation

**Files Created**:
- `src/ai/interpreter.ts` (570 lines)
- `test/ai-security.test.ts` (460 lines)
- `SECURITY.md` (security documentation)

**Files Modified**:
- `src/ai/toolkit.ts` (removed eval, added interpreter)
- `src/ai/prompts.ts` (removed old validation)

**Test Results**:
- Security tests: 45/45 passing
- Core tests: All passing (no regressions)
- LLM tests: All passing
- Optimizer tests: All passing

### Background

The `proposePatternWithLLM` function in `src/ai/toolkit.ts:84-86` uses `eval()` to execute LLM-generated code. Despite string-based validation, this creates a **critical security vulnerability** where malicious AI responses could execute arbitrary JavaScript.

### Current Implementation

```typescript
// ai/toolkit.ts:80-92
const evalCode = `(function() { ${code} })()`;
pattern = eval(evalCode);  // 🚨 SECURITY RISK
```

Validation in `ai/prompts.ts:188-229` only checks for:
- Presence of "RegexBuilder"
- Absence of "eval" or "Function" strings
- Presence of valid method names

This is **insufficient** - malicious code could bypass these checks.

### Proposed Solution: AST-Based Interpreter

Create a safe interpreter that:
1. Parses LLM-generated code into AST
2. Validates only allowed RegexBuilder API calls
3. Executes by calling actual RegexBuilder methods
4. Never evaluates arbitrary code

### Implementation Tasks

#### Task 1.1: Create Safe Interpreter Module

**File**: `src/ai/interpreter.ts` (NEW)

```typescript
/**
 * Safe interpreter for LLM-generated RegexBuilder code
 * Parses and validates code without using eval()
 */

import type { RegexBuilder } from "../core/builder.js";
import * as ts from "typescript";  // May need to add dependency

export class CodeInterpreterError extends Error {
  readonly _tag = "CodeInterpreterError";
  constructor(message: string, readonly code: string, readonly cause?: unknown) {
    super(message);
  }
}

/**
 * Allowed RegexBuilder API surface
 */
const ALLOWED_METHODS = new Set([
  "lit", "raw", "digit", "word", "whitespace", "any", "charClass",
  "then", "or", "alt", "zeroOrMore", "oneOrMore", "optional",
  "exactly", "atLeast", "between", "capture", "group",
  "startOfLine", "endOfLine", "wordBoundary"
]);

/**
 * Parse and interpret RegexBuilder code safely
 */
export function interpretRegexBuilderCode(code: string): RegexBuilder {
  // Parse code into TypeScript AST
  const sourceFile = ts.createSourceFile(
    "generated.ts",
    code,
    ts.ScriptTarget.Latest,
    true
  );

  // Validate AST contains only allowed patterns
  validateAST(sourceFile);

  // Execute by building RegexBuilder chain
  return executeAST(sourceFile);
}

function validateAST(sourceFile: ts.SourceFile): void {
  // Walk AST and verify:
  // - Only RegexBuilder static methods and instance methods
  // - Only string literals (no dynamic code)
  // - No function calls outside allowed set
  // - No variable assignments
  // - No imports/requires

  // Implementation details...
  throw new Error("Not implemented - detailed AST validation");
}

function executeAST(sourceFile: ts.SourceFile): RegexBuilder {
  // Build RegexBuilder by calling actual methods
  // Example: RegexBuilder.lit("test").then("foo")
  //   -> Call RegexBuilder.lit with "test"
  //   -> Call .then on result with "foo"

  // Implementation details...
  throw new Error("Not implemented - safe execution");
}
```

**Acceptance Criteria**:
- ✅ No eval() usage
- ✅ TypeScript AST parsing works
- ✅ Validates only allowed API calls
- ✅ Rejects malicious code patterns
- ✅ Returns valid RegexBuilder instance

**Time Estimate**: 2-3 days (complex AST validation logic)

---

#### Task 1.2: Refactor AI Toolkit to Use Interpreter

**File**: `src/ai/toolkit.ts` (MODIFY)

**Changes**:
1. Import `interpretRegexBuilderCode` from new interpreter
2. Replace lines 80-92 (eval block) with interpreter call
3. Update error handling to catch `CodeInterpreterError`
4. Add detailed logging for debugging

**Before**:
```typescript
let pattern: RegexBuilder;
try {
  const evalCode = `(function() { ${code} })()`;
  pattern = eval(evalCode);
} catch (error) {
  return yield* Effect.fail(new LLMError(...));
}
```

**After**:
```typescript
let pattern: RegexBuilder;
try {
  pattern = interpretRegexBuilderCode(code);
} catch (error) {
  if (error instanceof CodeInterpreterError) {
    return yield* Effect.fail(
      new LLMError(
        `Failed to interpret LLM-generated code: ${error.message}`,
        error
      )
    );
  }
  throw error; // Unexpected error, re-throw
}
```

**Acceptance Criteria**:
- ✅ No eval() calls in codebase
- ✅ AI toolkit tests pass
- ✅ Interpreter errors are properly wrapped

**Time Estimate**: 0.5 days

---

#### Task 1.3: Add Comprehensive Security Tests

**File**: `effect-regex/test/ai-security.test.ts` (NEW)

**Test Cases**:
1. **Malicious code injection attempts**:
   ```typescript
   it("should reject code with global access", () => {
     const malicious = 'RegexBuilder.lit("test"); global.process.exit(1)';
     expect(() => interpretRegexBuilderCode(malicious)).toThrow(CodeInterpreterError);
   });

   it("should reject code with require/import", () => {
     const malicious = 'const fs = require("fs"); RegexBuilder.lit("test")';
     expect(() => interpretRegexBuilderCode(malicious)).toThrow(CodeInterpreterError);
   });

   it("should reject code with function constructor", () => {
     const malicious = 'new Function("return process")(); RegexBuilder.lit("test")';
     expect(() => interpretRegexBuilderCode(malicious)).toThrow(CodeInterpreterError);
   });
   ```

2. **Malformed LLM responses**:
   ```typescript
   it("should handle incomplete code", () => {
     const incomplete = 'RegexBuilder.lit("test").then(';
     expect(() => interpretRegexBuilderCode(incomplete)).toThrow(CodeInterpreterError);
   });

   it("should handle empty code", () => {
     expect(() => interpretRegexBuilderCode("")).toThrow(CodeInterpreterError);
   });
   ```

3. **Valid code acceptance**:
   ```typescript
   it("should accept valid fluent builder chain", () => {
     const valid = 'RegexBuilder.lit("test").then("foo").oneOrMore()';
     const result = interpretRegexBuilderCode(valid);
     expect(result).toBeInstanceOf(RegexBuilder);
   });

   it("should accept static method calls", () => {
     const valid = 'RegexBuilder.alt(RegexBuilder.lit("a"), RegexBuilder.lit("b"))';
     const result = interpretRegexBuilderCode(valid);
     expect(result).toBeInstanceOf(RegexBuilder);
   });
   ```

4. **Boundary cases**:
   ```typescript
   it("should handle very long valid code", () => {
     const longChain = "RegexBuilder.lit('a')" + ".then('b')".repeat(100);
     expect(() => interpretRegexBuilderCode(longChain)).not.toThrow();
   });

   it("should reject code exceeding size limit", () => {
     const huge = "RegexBuilder.lit('a')" + ".then('b')".repeat(10000);
     expect(() => interpretRegexBuilderCode(huge)).toThrow(CodeInterpreterError);
   });
   ```

**Acceptance Criteria**:
- ✅ All malicious code patterns rejected
- ✅ All valid patterns accepted
- ✅ 100% coverage of interpreter module
- ✅ Tests run in <1s (no actual eval timing attacks)

**Time Estimate**: 1-1.5 days

---

#### Task 1.4: Update Dependencies

**File**: `effect-regex/package.json` (MODIFY)

**Changes**:
- Add TypeScript as runtime dependency (for AST parsing)
  ```json
  "dependencies": {
    "@anthropic-ai/sdk": "^0.67.0",
    "typescript": "^5.6.2"  // Move from devDependencies
  }
  ```

OR (alternative approach):
- Add standalone parser like `@babel/parser` or `acorn`
  ```json
  "dependencies": {
    "@babel/parser": "^7.23.0"
  }
  ```

**Decision Point**: Which parser to use?
- **TypeScript Compiler API**: Already a dependency, full TS support, heavier
- **Babel Parser**: Lighter, widely used, good AST
- **Acorn**: Lightest, fast, ES-only
- **Custom Parser**: Most secure but most complex

**Recommendation**: Start with TypeScript Compiler API (already available), optimize later if bundle size is an issue.

**Time Estimate**: 0.5 days (including research)

---

### Phase 1 Summary

**Total Time**: 3-5 days
**Files Created**: 2 (interpreter.ts, ai-security.test.ts)
**Files Modified**: 2 (toolkit.ts, package.json)
**Lines Added**: ~500-800
**Lines Removed**: ~15 (eval block)

**Critical Path**:
1. Design interpreter architecture → 0.5 days
2. Implement AST validation → 1.5-2 days
3. Implement safe execution → 1 day
4. Update toolkit.ts → 0.5 days
5. Write security tests → 1-1.5 days
6. Integration testing → 0.5 days

**Risk Mitigation**:
- If AST interpretation too complex: Fallback to stricter validation + Node VM with timeout
- If bundle size increases too much: Use lighter parser or lazy-load TypeScript
- If tests fail: Extend validation rules incrementally

---

## Phase 2: Effect-TS Architectural Corrections

### Phase 2A: Remove Effect from Pure Functions

**Priority**: High
**Effort**: 2-3 days
**Branch**: `refactor/pure-functions`
**Can run parallel to**: Phase 1

---

#### Task 2A.1: Refactor optimizer.ts to Pure Function

**File**: `src/core/optimizer.ts` (MODIFY)

**Current Signature**:
```typescript
export function optimize(
  ast: RegexAST,
  options: OptimizationOptions = {}
): Effect.Effect<OptimizationResult, never, never>
```

**New Signature**:
```typescript
export function optimize(
  ast: RegexAST,
  options: OptimizationOptions = {}
): OptimizationResult
```

**Changes**:
1. Remove `Effect.gen` wrapper (lines 378-428)
2. Change return to direct object instead of yielding
3. Update all internal logic to be synchronous

**Before**:
```typescript
export function optimize(ast, options = {}) {
  return Effect.gen(function* () {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    // ... logic ...
    return {
      optimized: current,
      passesApplied,
      // ...
    };
  });
}
```

**After**:
```typescript
export function optimize(ast, options = {}): OptimizationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const passesApplied: string[] = [];
  const beforeSize = countNodes(ast);

  let current = ast;
  let iteration = 0;

  // ... rest of logic unchanged ...

  const afterSize = countNodes(current);
  const nodesReduced = beforeSize - afterSize;

  return {
    optimized: current,
    passesApplied,
    nodesReduced,
    beforeSize,
    afterSize,
  };
}
```

**Acceptance Criteria**:
- ✅ Function returns `OptimizationResult` directly
- ✅ No Effect.gen wrapper
- ✅ All optimization tests pass
- ✅ Behavior identical to previous version

**Time Estimate**: 0.5 days

---

#### Task 2A.2: Update Call Sites for Synchronous optimize()

**Files to Modify**:
1. `src/bin.ts` line 190
2. `src/Cli.ts` optimize command
3. `src/mcp/server.ts` optimize_pattern tool handler

**Changes**:

**bin.ts** (line 190):
```typescript
// Before:
const result = Effect.runSync(optimize(ast));

// After:
const result = optimize(ast);
```

**Cli.ts** (optimize command):
```typescript
// Before:
Effect.gen(function* () {
  const result = yield* optimize(ast);
  // ...
})

// After:
Effect.gen(function* () {
  const result = optimize(ast);  // Synchronous call
  // ...
})
```

**mcp/server.ts** (optimize_pattern handler):
```typescript
// Before:
Effect.gen(function* () {
  const optimizationResult = yield* optimize(pattern);
  // ...
})

// After:
Effect.gen(function* () {
  const optimizationResult = optimize(pattern);  // Synchronous call
  // ...
})
```

**Acceptance Criteria**:
- ✅ All call sites updated
- ✅ No Effect.runSync calls for optimize
- ✅ CLI commands work correctly
- ✅ MCP tool works correctly

**Time Estimate**: 0.5 days

---

#### Task 2A.3: Audit Other Core Modules for Pure Functions

**Files to Review**:
1. `src/core/explainer.ts` - `explain` function
2. `src/core/emitter.ts` - `emit` function
3. `src/core/linter.ts` - `lint` function

**Analysis**:

**explainer.ts**:
- `explain(ast, options)` - Takes AST, returns ExplanationNode
- **Pure**: No side effects, deterministic
- **Decision**: Convert to pure function

**emitter.ts**:
- `emit(builder, dialect, anchor)` - Converts AST to string
- **Pure**: Deterministic, no I/O
- **Decision**: Keep as pure (already pure, just return type)

**linter.ts**:
- `lint(ast, dialect)` - Validates pattern
- **Pure**: Deterministic analysis
- **Decision**: Keep as pure (already pure)

**Action**: Document which functions are pure vs effectful

**Time Estimate**: 0.5 days

---

#### Task 2A.4: Update Documentation

**File**: `EFFECT.md` (MODIFY)

**Changes**:
Add section explaining when to use Effect vs pure functions:

```markdown
## When to Use Effect vs Pure Functions

### Use Effect When:
- Performing I/O (file system, network, database)
- Making async operations (promises, timeouts)
- Managing resources (acquire/release patterns)
- Handling errors that should be in error channel
- Composing with other effects

### Use Pure Functions When:
- Performing deterministic computations
- Transforming data structures
- Validating input (pure validation, not I/O-based)
- Building ASTs or other immutable structures

### In This Codebase:
- **Pure**: `optimize`, `explain`, `emit`, `lint`, AST constructors
- **Effectful**: `testRegex` (timeouts), `callLLM` (network), `developPattern` (composition)
```

**Time Estimate**: 0.5 days

---

### Phase 2A Summary

**Total Time**: 2-3 days
**Files Modified**: 6
**Breaking Changes**: None (Effect.runSync → direct call is compatible)

---

### Phase 2B: Introduce Service Layer Architecture

**Priority**: High
**Effort**: 3-4 days
**Branch**: `feat/service-layers`
**Dependencies**: Phase 2A complete (pure functions identified)

---

#### Task 2B.1: Design Service Interfaces

**File**: `src/services/types.ts` (NEW)

```typescript
import { Context, Effect, Layer } from "effect";
import type { RegexBuilder, RegexPattern } from "../core/builder.js";
import type { LintResult } from "../core/linter.js";
import type { TestResult, RegexTestCase } from "../core/tester.js";
import type { OptimizationResult } from "../core/optimizer.js";
import type { Ast } from "../core/ast.js";

/**
 * Service for regex pattern building and emission
 */
export interface RegexBuilderService {
  /**
   * Emit a regex pattern from builder
   */
  readonly emit: (
    builder: RegexBuilder,
    dialect?: "js" | "re2" | "pcre",
    anchor?: boolean
  ) => Effect.Effect<RegexPattern, EmitError>;

  /**
   * Lint a pattern AST
   */
  readonly lint: (
    ast: Ast,
    dialect?: "js" | "re2" | "pcre"
  ) => Effect.Effect<LintResult, LintError>;

  /**
   * Optimize a pattern AST (synchronous, wrapped for consistency)
   */
  readonly optimize: (
    ast: Ast,
    options?: OptimizationOptions
  ) => OptimizationResult;  // Pure function, not Effect
}

export const RegexBuilderService = Context.Tag<RegexBuilderService>(
  "RegexBuilderService"
);

/**
 * Service for AI/LLM integration
 */
export interface LLMService {
  /**
   * Call LLM with prompt
   */
  readonly call: (
    prompt: string,
    config?: Partial<LLMConfig>
  ) => Effect.Effect<string, LLMError | LLMConfigError | LLMRateLimitError>;

  /**
   * Check if LLM is available
   */
  readonly isAvailable: (
    provider: LLMProvider
  ) => Effect.Effect<boolean>;

  /**
   * Propose pattern from examples using LLM
   */
  readonly proposePattern: (
    positiveExamples: readonly string[],
    negativeExamples: readonly string[],
    context?: string,
    config?: Partial<LLMConfig>
  ) => Effect.Effect<PatternProposal, LLMError | CodeInterpreterError>;
}

export const LLMService = Context.Tag<LLMService>("LLMService");

/**
 * Service for pattern validation and testing
 */
export interface ValidationService {
  /**
   * Test regex against test cases
   */
  readonly test: (
    pattern: string,
    cases: readonly RegexTestCase[],
    dialect?: "js" | "re2-sim" | "re2",
    timeoutMs?: number
  ) => Effect.Effect<TestResult, TestExecutionError>;

  /**
   * Validate pattern for dialect
   */
  readonly validateForDialect: (
    pattern: RegexBuilder,
    dialect: "js" | "re2" | "pcre"
  ) => Effect.Effect<{ valid: boolean; issues: readonly string[] }>;
}

export const ValidationService = Context.Tag<ValidationService>(
  "ValidationService"
);
```

**Acceptance Criteria**:
- ✅ All service interfaces defined with Context.Tag
- ✅ Effect signatures precise (no never in E unless truly infallible)
- ✅ Services don't expose internal dependencies in R-type
- ✅ JSDoc comments for all methods

**Time Estimate**: 1 day

---

#### Task 2B.2: Implement RegexBuilderService Layer

**File**: `src/services/regex-builder.ts` (NEW)

```typescript
import { Effect, Layer } from "effect";
import { emit as coreEmit } from "../core/emitter.js";
import { lint as coreLint } from "../core/linter.js";
import { optimize as coreOptimize } from "../core/optimizer.js";
import { RegexBuilderService } from "./types.js";
import {
  EmitError,
  LintError,
  // ... import custom errors
} from "../errors/types.js";

/**
 * Live implementation of RegexBuilderService
 */
export const RegexBuilderServiceLive = Layer.succeed(
  RegexBuilderService,
  {
    emit: (builder, dialect = "js", anchor = false) =>
      Effect.try({
        try: () => coreEmit(builder, dialect, anchor),
        catch: (error) => new EmitError({
          builder,
          dialect,
          cause: error
        })
      }),

    lint: (ast, dialect = "js") =>
      Effect.succeed(coreLint(ast, dialect)),  // Lint is pure, no errors

    optimize: coreOptimize  // Pure function, pass through
  }
);
```

**Acceptance Criteria**:
- ✅ Live layer provides all service methods
- ✅ Wraps core functions with Effect where appropriate
- ✅ Pure functions exposed directly
- ✅ Error handling with custom error types

**Time Estimate**: 0.5 days

---

#### Task 2B.3: Implement LLMService Layer

**File**: `src/services/llm.ts` (NEW)

```typescript
import { Effect, Layer } from "effect";
import { LLMService } from "./types.js";
import {
  callLLMWithRetry,
  isLLMAvailable,
  type LLMConfig
} from "../ai/llm-client.js";
import { interpretRegexBuilderCode } from "../ai/interpreter.js";
import { generateProposalPrompt, parseRegexBuilderCode } from "../ai/prompts.js";
import { LLMError, CodeInterpreterError } from "../errors/types.js";

/**
 * Live implementation using real Anthropic/OpenAI APIs
 */
export const LLMServiceLive = Layer.succeed(
  LLMService,
  {
    call: callLLMWithRetry,

    isAvailable: isLLMAvailable,

    proposePattern: (positiveExamples, negativeExamples, context, config) =>
      Effect.gen(function* () {
        const prompt = generateProposalPrompt(
          positiveExamples,
          negativeExamples,
          context
        );

        const response = yield* callLLMWithRetry(prompt, config);
        const code = parseRegexBuilderCode(response);

        if (!code) {
          return yield* Effect.fail(
            new LLMError("Failed to parse RegexBuilder code from LLM response")
          );
        }

        const pattern = yield* Effect.try({
          try: () => interpretRegexBuilderCode(code),
          catch: (error) => new CodeInterpreterError(
            "Failed to interpret LLM code",
            code,
            error
          )
        });

        return {
          pattern,
          reasoning: "LLM-generated pattern",
          confidence: 0.85,
          testCases: [
            ...positiveExamples.map(ex => ({ input: ex, shouldMatch: true })),
            ...negativeExamples.map(ex => ({ input: ex, shouldMatch: false }))
          ]
        };
      })
  }
);

/**
 * Mock implementation for testing (no API calls)
 */
export const LLMServiceMock = Layer.succeed(
  LLMService,
  {
    call: (prompt, config) =>
      Effect.succeed("RegexBuilder.lit('mocked').oneOrMore()"),

    isAvailable: (provider) =>
      Effect.succeed(true),

    proposePattern: (positiveExamples, negativeExamples) =>
      Effect.succeed({
        pattern: RegexBuilder.lit("mock").oneOrMore(),
        reasoning: "Mocked pattern for testing",
        confidence: 0.7,
        testCases: []
      })
  }
);
```

**Acceptance Criteria**:
- ✅ Live layer makes real API calls
- ✅ Mock layer for testing (no network)
- ✅ Both implement full LLMService interface
- ✅ Error handling with custom error types

**Time Estimate**: 1 day

---

#### Task 2B.4: Implement ValidationService Layer

**File**: `src/services/validation.ts` (NEW)

```typescript
import { Effect, Layer } from "effect";
import { ValidationService } from "./types.js";
import { testRegex as coreTestRegex } from "../core/tester.js";
import { emit } from "../core/emitter.js";
import { lint } from "../core/linter.js";
import { TestExecutionError } from "../errors/types.js";

/**
 * Live implementation of ValidationService
 */
export const ValidationServiceLive = Layer.succeed(
  ValidationService,
  {
    test: (pattern, cases, dialect = "js", timeoutMs = 100) =>
      Effect.gen(function* () {
        // testRegex should be refactored to return Effect with TestExecutionError
        // For now, wrap the existing implementation
        const result = yield* coreTestRegex(pattern, dialect, cases, timeoutMs);
        return result;
      }),

    validateForDialect: (pattern, dialect) =>
      Effect.gen(function* () {
        const result = emit(pattern, dialect);
        const lintResult = lint(result.ast, dialect);
        return {
          valid: lintResult.valid,
          issues: lintResult.issues.map(issue => issue.message)
        };
      })
  }
);
```

**Acceptance Criteria**:
- ✅ Live layer provides validation methods
- ✅ Integrates with core testing and linting
- ✅ Error handling for test failures

**Time Estimate**: 0.5 days

---

#### Task 2B.5: Update MCP Server to Use Services

**File**: `src/mcp/server.ts` (MODIFY)

**Changes**:
1. Import service layers
2. Provide layers to MCP server Effect context
3. Use services via context instead of direct imports

**Before**:
```typescript
import { emit } from "../core/builder.js";
import { optimize } from "../core/optimizer.js";
import { testRegex } from "../core/tester.js";

// Direct function calls in handlers
const result = emit(builder, dialect, anchor);
const optimized = optimize(ast);
```

**After**:
```typescript
import { RegexBuilderService, LLMService, ValidationService } from "../services/types.js";
import { RegexBuilderServiceLive } from "../services/regex-builder.js";
import { LLMServiceLive } from "../services/llm.js";
import { ValidationServiceLive } from "../services/validation.js";

// In handler:
Effect.gen(function* () {
  const regexService = yield* RegexBuilderService;
  const result = yield* regexService.emit(builder, dialect, anchor);
  // ...
})

// Provide layers when starting server
const program = mcpServerProgram.pipe(
  Effect.provide(RegexBuilderServiceLive),
  Effect.provide(LLMServiceLive),
  Effect.provide(ValidationServiceLive)
);
```

**Acceptance Criteria**:
- ✅ All MCP handlers use services via context
- ✅ Layers provided at server startup
- ✅ No direct imports of core functions in handlers
- ✅ MCP e2e tests pass

**Time Estimate**: 1 day

---

### Phase 2B Summary

**Total Time**: 3-4 days
**Files Created**: 4 (types.ts, regex-builder.ts, llm.ts, validation.ts)
**Files Modified**: 1-2 (server.ts, possibly toolkit.ts)
**Breaking Changes**: Internal only (MCP handlers), public API unchanged

---

### Phase 2C: Implement Precise Error Types

**Priority**: High
**Effort**: 2-3 days
**Branch**: `feat/error-types`
**Dependencies**: Phase 2B started (service interfaces defined)

---

#### Task 2C.1: Define Error Type Hierarchy

**File**: `src/errors/types.ts` (NEW)

```typescript
import { Data } from "effect";
import type { Ast } from "../core/ast.js";
import type { LintIssue } from "../core/linter.js";
import type { RegexTestCase } from "../core/tester.js";
import type { Dialect } from "../core/emitter.js";

/**
 * Error for regex pattern compilation failures
 */
export class RegexCompilationError extends Data.TaggedError("RegexCompilationError")<{
  readonly pattern: string;
  readonly dialect: Dialect;
  readonly cause: unknown;
}> {}

/**
 * Error for pattern optimization failures
 */
export class OptimizationError extends Data.TaggedError("OptimizationError")<{
  readonly ast: Ast;
  readonly phase: string;
  readonly reason: string;
}> {}

/**
 * Error for test execution failures
 */
export class TestExecutionError extends Data.TaggedError("TestExecutionError")<{
  readonly pattern: string;
  readonly testCase?: RegexTestCase;
  readonly reason: string;
  readonly timedOut?: boolean;
}> {}

/**
 * Error for validation/linting failures
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly pattern: string;
  readonly issues: readonly LintIssue[];
  readonly dialect: Dialect;
}> {}

/**
 * Error for dialect incompatibility
 */
export class DialectIncompatibilityError extends Data.TaggedError("DialectIncompatibilityError")<{
  readonly dialect: Dialect;
  readonly feature: string;
  readonly pattern: string;
}> {}

/**
 * Error for code interpretation (AI-generated code)
 */
export class CodeInterpreterError extends Data.TaggedError("CodeInterpreterError")<{
  readonly code: string;
  readonly reason: string;
  readonly cause?: unknown;
}> {}

/**
 * Error for pattern emission
 */
export class EmitError extends Data.TaggedError("EmitError")<{
  readonly builder: unknown;  // RegexBuilder
  readonly dialect: Dialect;
  readonly cause: unknown;
}> {}

// Re-export existing LLM errors
export { LLMError, LLMConfigError, LLMRateLimitError } from "../ai/llm-client.js";

/**
 * Union of all library errors
 */
export type RegexLibraryError =
  | RegexCompilationError
  | OptimizationError
  | TestExecutionError
  | ValidationError
  | DialectIncompatibilityError
  | CodeInterpreterError
  | EmitError
  | LLMError
  | LLMConfigError
  | LLMRateLimitError;
```

**Acceptance Criteria**:
- ✅ All error types extend Data.TaggedError
- ✅ Each error has _tag field for discrimination
- ✅ Errors capture relevant context (pattern, ast, etc.)
- ✅ JSDoc comments explain when each error is thrown

**Time Estimate**: 0.5 days

---

#### Task 2C.2: Update Core Functions with Error Types

**Files to Modify**:
1. `src/core/tester.ts` - Add TestExecutionError
2. `src/core/emitter.ts` - Add EmitError, DialectIncompatibilityError
3. `src/core/linter.ts` - Add ValidationError

**Example Changes**:

**tester.ts**:
```typescript
// Before:
export const testRegex = (
  pattern: string,
  dialect: "js" | "re2-sim" | "re2" = "js",
  cases: readonly RegexTestCase[],
  timeoutMs = 100
): Effect<never, never, TestResult> => {
  // ...
}

// After:
export const testRegex = (
  pattern: string,
  dialect: "js" | "re2-sim" | "re2" = "js",
  cases: readonly RegexTestCase[],
  timeoutMs = 100
): Effect.Effect<TestResult, TestExecutionError> => {
  return Effect.gen(function* () {
    // ... existing logic ...

    // Wrap errors
    try {
      regex = new RegExp(pattern);
    } catch (error) {
      return yield* Effect.fail(
        new TestExecutionError({
          pattern,
          reason: `Invalid regex pattern: ${(error as Error).message}`,
          timedOut: false
        })
      );
    }

    // ... rest of logic with proper error handling
  });
}
```

**emitter.ts**:
```typescript
export const emit = (
  builder: RegexBuilder,
  dialect: Dialect = "js",
  anchor = false
): Effect.Effect<RegexPattern, EmitError | DialectIncompatibilityError> => {
  return Effect.gen(function* () {
    const ast = builder.getAst();
    // ... emit logic ...

    // Check for dialect incompatibilities
    if (dialect === "re2" && hasNamedGroups(ast)) {
      return yield* Effect.fail(
        new DialectIncompatibilityError({
          dialect,
          feature: "named groups",
          pattern: patternString
        })
      );
    }

    // ... return result
  });
}
```

**Acceptance Criteria**:
- ✅ All Effect signatures updated with precise error types
- ✅ throw statements replaced with Effect.fail
- ✅ Effect.tryPromise uses error transformation
- ✅ Tests verify correct error types are thrown

**Time Estimate**: 1-1.5 days

---

#### Task 2C.3: Update Service Implementations with Error Handling

**Files to Modify**:
1. `src/services/regex-builder.ts`
2. `src/services/llm.ts`
3. `src/services/validation.ts`

**Changes**:
- Update service method signatures to return proper error unions
- Use Effect.catchTags for granular error handling
- Transform core errors to service-level errors where appropriate

**Example**:
```typescript
// In RegexBuilderServiceLive
emit: (builder, dialect = "js", anchor = false) =>
  Effect.gen(function* () {
    const result = yield* coreEmit(builder, dialect, anchor).pipe(
      Effect.catchTags({
        EmitError: (error) => {
          // Log and re-throw or transform
          console.error("Emit failed:", error);
          return Effect.fail(error);
        },
        DialectIncompatibilityError: (error) => {
          // Maybe wrap in a different error for service layer
          return Effect.fail(new ValidationError({
            pattern: error.pattern,
            dialect: error.dialect,
            issues: [{ code: "DIALECT_INCOMPATIBILITY", severity: "error", message: error.feature }]
          }));
        }
      })
    );
    return result;
  })
```

**Acceptance Criteria**:
- ✅ Service methods have precise error unions
- ✅ catchTags used instead of catchAll
- ✅ Error transformations documented

**Time Estimate**: 1 day

---

#### Task 2C.4: Add Error Handling Tests

**File**: `effect-regex/test/errors.test.ts` (NEW)

**Test Cases**:
```typescript
import { describe, it, expect } from "@effect/vitest";
import { Effect } from "effect";
import {
  RegexCompilationError,
  TestExecutionError,
  ValidationError,
  DialectIncompatibilityError
} from "../src/errors/types.js";
import { testRegex } from "../src/core/tester.js";
import { emit } from "../src/core/emitter.js";

describe("Error Types", () => {
  describe("TestExecutionError", () => {
    it("should throw TestExecutionError for invalid pattern", async () => {
      const result = testRegex(
        "[invalid",  // Unclosed bracket
        "js",
        [{ input: "test", shouldMatch: true }]
      );

      await Effect.runPromise(
        result.pipe(
          Effect.flip,  // Flip to expect error
          Effect.map(error => {
            expect(error._tag).toBe("TestExecutionError");
            expect(error.pattern).toBe("[invalid");
            expect(error.reason).toContain("Invalid regex");
          })
        )
      );
    });

    it("should throw TestExecutionError for timeout", async () => {
      const catastrophicPattern = "(a+)+b";  // ReDoS pattern
      const result = testRegex(
        catastrophicPattern,
        "js",
        [{ input: "a".repeat(30), shouldMatch: false }],
        50  // Short timeout
      );

      await Effect.runPromise(
        result.pipe(
          Effect.map(result => {
            // Check if timeout warning exists
            expect(result.warnings).toContain("timeout");
          })
        )
      );
    });
  });

  describe("DialectIncompatibilityError", () => {
    it("should throw for named groups in RE2", async () => {
      const builder = RegexBuilder.lit("test").capture("myGroup");
      const result = emit(builder, "re2");

      await Effect.runPromise(
        result.pipe(
          Effect.flip,
          Effect.map(error => {
            expect(error._tag).toBe("DialectIncompatibilityError");
            expect(error.dialect).toBe("re2");
            expect(error.feature).toBe("named groups");
          })
        )
      );
    });
  });

  // More error type tests...
});
```

**Acceptance Criteria**:
- ✅ Every error type can be triggered
- ✅ Error properties are correctly populated
- ✅ Effect.catchTags can discriminate errors
- ✅ Error messages are helpful

**Time Estimate**: 1 day

---

### Phase 2C Summary

**Total Time**: 2-3 days
**Files Created**: 2 (errors/types.ts, test/errors.test.ts)
**Files Modified**: 6 (all core modules, all services)
**Breaking Changes**: Effect signatures change (error types), but backward compatible if using catchAll

---

## Phase 2 Summary (All Parts)

**Total Time**: 7-10 days
**Files Created**: 9
**Files Modified**: 12+
**Breaking Changes**: Medium (Effect signatures, but graceful migration path)

**Dependencies**:
- Phase 2A can run parallel to Phase 1
- Phase 2B depends on 2A (need to know what's pure)
- Phase 2C can overlap with 2B (error types defined early)

---

## Phase 3: CLI Consolidation

**Priority**: High
**Effort**: 2-3 days
**Branch**: `refactor/consolidate-cli`
**Dependencies**: Phase 2 (if Cli.ts uses services)

(Detailed breakdown follows same pattern - omitted for brevity)

---

## Phase 4: Standard Library Pattern Refactoring

**Priority**: High
**Effort**: 2-3 days
**Branch**: `refactor/pattern-consistency`
**Dependencies**: None

(Detailed breakdown follows same pattern)

---

## Phase 5: Test Coverage Expansion

**Priority**: High
**Effort**: 4-5 days
**Branch**: `test/expand-coverage`
**Dependencies**: All previous phases (testing final implementations)

(Detailed breakdown follows same pattern)

---

## Implementation Timeline

```mermaid
gantt
    title Implementation Timeline (3-4 weeks)
    dateFormat YYYY-MM-DD
    section Week 1
    Phase 1: Security (eval)          :crit, p1, 2025-10-21, 5d
    Phase 2A: Pure Functions           :p2a, 2025-10-21, 3d
    section Week 2
    Phase 2B: Service Layers           :p2b, 2025-10-24, 4d
    Phase 2C: Error Types              :p2c, 2025-10-25, 3d
    Phase 3: CLI Consolidation         :p3, 2025-10-28, 2d
    section Week 3
    Phase 4: Pattern Refactoring       :p4, 2025-10-30, 3d
    Phase 5: Test Coverage (start)     :p5a, 2025-11-02, 3d
    section Week 4
    Phase 5: Test Coverage (complete)  :p5b, 2025-11-05, 2d
    Integration Testing                :test, 2025-11-07, 3d
    Documentation & Review             :doc, 2025-11-10, 2d
```

---

## Risk Management

### High Risks

1. **Phase 1 AST Interpreter Complexity**
   - Risk: Custom parser too complex, takes >5 days
   - Mitigation: Use existing parser library (TypeScript API), fallback to Node VM with strict timeout
   - Contingency: Implement basic interpreter first, enhance later

2. **Phase 2B Service Layer Disruption**
   - Risk: Service refactoring breaks existing functionality
   - Mitigation: Implement services alongside existing code, gradual migration
   - Contingency: Feature flag to use old vs new service paths

3. **Breaking Changes Impact**
   - Risk: Error type changes break downstream users
   - Mitigation: Maintain backward compatibility with catchAll, deprecation warnings
   - Contingency: Delay error type changes to major version bump

### Medium Risks

4. **Test Coverage Time Estimate**
   - Risk: Writing comprehensive tests takes longer than expected
   - Mitigation: Prioritize critical paths first (AI toolkit, MCP security)
   - Contingency: Accept <80% coverage initially, iterate in next sprint

5. **Phase 3 CLI Parity**
   - Risk: Cli.ts missing features from bin.ts
   - Mitigation: Detailed feature comparison checklist before deletion
   - Contingency: Keep bin.ts as backup, delete in later release

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ Zero eval() calls in codebase
- ✅ All security tests pass (malicious code rejected)
- ✅ AI toolkit integration tests pass
- ✅ No regressions in LLM pattern generation quality

### Phase 2 Success Criteria
- ✅ All Effect signatures have precise R, E, A types
- ✅ Service layers implemented for 3+ major subsystems
- ✅ Test layers available for mocking
- ✅ Effect.catchTags used throughout codebase
- ✅ No Effect.gen wrappers around pure functions

### Phase 3 Success Criteria
- ✅ Single CLI entry point (bin.ts deleted)
- ✅ All commands work identically
- ✅ Codebase reduced by 235 lines
- ✅ CLI tests pass

### Phase 4 Success Criteria
- ✅ All standard library patterns use fluent API
- ✅ No raw regex literals in pattern definitions
- ✅ Pattern tests pass with identical behavior
- ✅ Documentation updated

### Phase 5 Success Criteria
- ✅ >80% code coverage on AI toolkit
- ✅ >80% code coverage on MCP server
- ✅ All error paths tested
- ✅ Integration tests for service layers

### Overall Success Criteria
- ✅ All 7 issues from design review addressed
- ✅ Zero security vulnerabilities (eval removed)
- ✅ Architectural improvements (services, error types)
- ✅ Maintainability improvements (single CLI, consistent patterns)
- ✅ Quality improvements (test coverage >80%)
- ✅ Full test suite passes
- ✅ Documentation updated
- ✅ Ready for production use

---

## Post-Implementation Tasks

1. **Update Memory Files**:
   - memory/tasks/tasks_plan.md (mark issues #1-7 complete)
   - memory/tasks/active_context.md (document architectural changes)
   - memory/docs/architecture.md (add service layer diagram)

2. **Update Documentation**:
   - CLAUDE.md (update with service layer patterns)
   - EFFECT.md (add service examples, error handling patterns)
   - README.md (update milestone status)

3. **Create Migration Guide**:
   - Document breaking changes (error types)
   - Provide code examples for migration
   - Version bump strategy (semver)

4. **Blog Post / Announcement**:
   - Security improvements (eval removal)
   - Architectural improvements (Effect services)
   - Invite community testing

5. **Performance Benchmarking**:
   - Compare before/after performance
   - Ensure no regressions
   - Document any improvements

---

## Appendix: Decision Log

### Decision 1: eval() Replacement Strategy
**Options**: Node VM, AST Interpreter, Stricter Validation
**Chosen**: AST Interpreter
**Rationale**: Most secure, full control, educational value
**Trade-offs**: More complex, longer implementation time

### Decision 2: Which Functions to Keep as Effect
**Options**: All pure, All Effect, Hybrid
**Chosen**: Hybrid (only truly effectful operations)
**Rationale**: Follows Effect-TS best practices, clearer API
**Trade-offs**: Requires refactoring call sites

### Decision 3: Service Layer Scope
**Options**: Full (4 services), Minimal (1-2), None
**Chosen**: Full (RegexBuilder, LLM, Validation)
**Rationale**: Proper architecture, enables testing, future extensibility
**Trade-offs**: More upfront work, but better long-term maintainability

### Decision 4: Error Type Strategy
**Options**: Keep generic, Custom tagged, Mix
**Chosen**: Custom tagged errors (Data.TaggedError)
**Rationale**: Type-safe error handling, Effect.catchTags support
**Trade-offs**: More boilerplate, but significantly better type safety

### Decision 5: Breaking Change Policy
**Options**: Immediate, Gradual (deprecations), Never
**Chosen**: Gradual with deprecations
**Rationale**: Balance between improvement and stability
**Trade-offs**: Longer migration window, but less user disruption

---

*End of Implementation Roadmap*
