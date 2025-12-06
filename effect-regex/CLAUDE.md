# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

effect-regex is a monorepo containing a type-safe, AST-based regex builder with Effect framework integration. The project consists of:

- **Root workspace**: Bun-based setup for workspace management
- **effect-regex/**: Main Effect CLI application with comprehensive regex tooling

Key features: fluent API for building regexes, deterministic AST emission to multiple dialects (JS, RE2, PCRE), standard library of vetted patterns, MCP server integration, AI-powered pattern generation and optimization.

## Development Commands

### Setup
```bash
# Root workspace
bun install

# Effect CLI app
cd effect-regex
pnpm install
```

### Building
```bash
cd effect-regex
pnpm build          # Build TypeScript and create dist/ directory
pnpm build:ts       # TypeScript only (tsup)
pnpm build:mcp      # Build MCP server (same as pnpm build)
```

### Testing
```bash
cd effect-regex
pnpm test                    # Run all tests (Vitest)
pnpm test test/llm.test.ts   # Run single test file
pnpm test --watch           # Watch mode
pnpm coverage               # Generate coverage report
```

### Linting & Type Checking
```bash
cd effect-regex
pnpm check         # TypeScript type checking (tsc -b)
pnpm lint          # Linting (via Biome in root)
```

### CLI Usage
```bash
cd effect-regex
pnpm tsx ./src/bin.ts build-pattern quotedString
pnpm tsx ./src/bin.ts explain uuidV4
pnpm tsx ./src/bin.ts lint "[a-z]+"
pnpm tsx ./src/bin.ts test "[a-z]+" test-cases.json
pnpm tsx ./src/bin.ts optimize quotedString
```

### MCP Development
```bash
cd effect-regex
pnpm mcp:dev      # Run MCP server in development mode
```

## Architecture

### Core Engine (`src/core/`)
- **ast.ts**: Type-safe AST node definitions (LitNode, RawNode, SeqNode, AltNode, CharClassNode, GroupNode, etc.). All nodes are immutable and discriminated unions.
- **builder.ts**: `RegexBuilder` class with fluent API for constructing ASTs. Supports chaining via `then()`, `or()`, quantifiers (`zeroOrMore()`, `oneOrMore()`, etc.), groups, captures, lookahead/lookbehind.
- **emitter.ts**: Converts AST to regex strings for specific dialects (JS, RE2, PCRE) with optional warnings for dialect-specific features. Returns `EmitResult` with pattern, notes, and capture group mapping.
- **linter.ts**: Validates patterns and detects issues (syntax errors, dialect incompatibilities, performance concerns).
- **explainer.ts**: Generates human-readable explanations of regex patterns.
- **tester.ts**: Test framework for validating patterns against test cases with timeout protection.
- **optimizer.ts**: Pure function that applies 4 AST transformation passes: constant folding, quantifier simplification, character class merging, alternation deduplication.

### Service Layer (`src/services/`)
Services enable dependency injection via Effect's Context system. All services implement interface-based design:

- **RegexBuilderService**: Wraps core AST functionality (build, emit, lint, explain, test). Pure functions operating on AST nodes.
- **LLMService**: Anthropic Claude API integration for pattern generation. Handles API calls, error handling, cost tracking.
- **ValidationService**: Pattern validation and compatibility checking.

Service implementations (Live layers) are in separate files. Service types are defined in `types.ts`. Export pattern in `index.ts` provides both interface and implementation exports.

### Standard Library (`src/std/`)
- **patterns.ts**: 13 vetted patterns (quotedString, keyValue, pathSegment, filePathBasic, csvList, integer, uuidV4, semverStrict, ipv4, ipv6Compressed, float, isoDate, isoDateTime).
- **security-patterns.ts**: Security-focused patterns (email, url, username, passwordStrong, hexColor, cssColor, timeHHMMSS, usPhone).
- **index.ts**: Exports `STANDARD_PATTERNS` map.

All patterns are built using the fluent API. Each pattern includes metadata (name, description, examples, dialect gating).

### MCP Server (`src/mcp/`)
Exposes 8 tools to AI assistants:

- **build-regex**: Build from standard library or CommandSpec
- **test-regex**: Test patterns with timeout protection
- **lint-regex**: Validate patterns
- **convert-regex**: Dialect conversion
- **explain-regex**: Generate explanations
- **library-list**: List patterns with filtering
- **propose-pattern**: AI-assisted generation (optional Anthropic API)
- **optimize-pattern**: Run optimizer passes

Tools are in `tools/` subdirectory. Schemas and types in `schemas.ts` and `types.ts`. The `converter.ts` handles dialect conversion logic.

### AI Toolkit (`src/ai/`)
- **llm-client.ts**: Raw API client for Anthropic Claude
- **prompts.ts**: Prompt templates for pattern generation
- **toolkit.ts**: Higher-level propose/test/refine workflow
- **interpreter.ts**: Safe AST interpreter (replaces eval() for security)
- **utils.ts**: Helper functions

### Error Types (`src/errors/`)
Tagged errors using Effect's `Data.TaggedError` for type-safe error handling:

- `RegexCompilationError`: Pattern compilation failures
- `OptimizationError`: AST optimization failures
- `TestExecutionError`: Test execution failures (timeout, invalid pattern)
- `ValidationError`: Pattern validation failures
- `DialectIncompatibilityError`: Unsupported features in target dialect
- `PatternParseError`: String pattern parsing failures
- `LLMError`: API call failures
- `ConfigurationError`: Configuration validation failures
- `FileSystemError`: File I/O failures
- `UnexpectedError`: Catch-all for unhandled conditions

Use `Effect.catchTag()` and `Effect.catchTags()` for error handling.

### CLI (`src/bin.ts`)
Simple command dispatcher without Effect CLI integration. Commands: build-pattern, lint, explain, test, optimize.

## Key Design Patterns

### AST-Based Architecture
All patterns are represented as immutable AST nodes before emission. This enables:
- Deterministic output (same input → same output always)
- Cross-dialect compilation (JS, RE2, PCRE)
- Safe optimization via AST transformations
- Pattern analysis and explanation without parsing user input

### Service Layer with Effect Context
Services are defined as Effect Tags and accessed via `Effect.service()`. Use `pipe()` for effect composition. Live implementations provide concrete behavior (real API calls, actual optimization). Mock implementations available for testing.

### Effect Framework Usage
- Pure functions where possible (avoid monadic wrappers for simple operations like optimize)
- Effect for complex workflows involving errors, dependencies, async operations
- Data-based error types for type-safe error handling
- Layer pattern for service composition

### Safe Interpreter
The `interpreter.ts` module provides safe AST evaluation without `eval()`. Uses pattern matching on AST node types with hardcoded transformation logic.

## Common Development Tasks

### Adding a Standard Library Pattern
1. Create pattern definition in `src/std/patterns.ts` using fluent API
2. Add to `STANDARD_PATTERNS` export
3. Include metadata (name, description, examples, dialect info)
4. Add test cases in `test/` directory
5. Test with: `pnpm tsx ./src/bin.ts build-pattern <name>`

### Adding an AST Node Type
1. Define interface in `src/core/ast.ts` extending `AstNode`
2. Create factory function (e.g., `export function myNode(...): MyNode { ... }`)
3. Add emitter logic in `src/core/emitter.ts` for each dialect
4. Add to `explainer.ts` for pattern explanation
5. Update `builder.ts` with fluent method if needed

### Adding an MCP Tool
1. Create tool file in `src/mcp/tools/`
2. Define input schema in `src/mcp/schemas.ts`
3. Implement tool handler function
4. Export from `src/mcp/tools/index.ts`
5. Register in `src/mcp/server.ts`

### Running Tests
Always run the full test suite after changes:
```bash
cd effect-regex
pnpm test
```

For development, use watch mode for faster iteration:
```bash
pnpm test --watch
```

Single file testing:
```bash
pnpm test test/optimizer.test.ts
```

## Package Management

- **Root**: Bun (bun install, bun run)
- **effect-regex**: pnpm (monorepo-aware, faster lockfile)
- **pnpm version**: 10.14.0 (specified in package.json)

When adding dependencies to effect-regex:
```bash
cd effect-regex
pnpm add <package>      # Production dependency
pnpm add -D <package>   # Dev dependency
```

## Build Output

`pnpm build` outputs to `dist/`:
- `dist/` - CommonJS and ESM bundles
- `dist/server.cjs` - MCP server entry point
- `dist/bin.cjs` - CLI entry point (also accessible via pnpm tsx ./src/bin.ts)

The `tsup` configuration builds both CommonJS and ESM formats. Package exports are configured in `package.json` publishConfig.

## Testing Framework

Vitest with Effect integration (@effect/vitest). Tests use:
- `Effect.runSync()` or `Effect.runPromise()` to execute effects
- `.vitest()` for Effect-specific testing utilities
- Standard assertions for validation

Coverage generated via `@vitest/coverage-v8`.

## Important Notes

- **Avoid eval()**: Use safe interpreter in `src/ai/interpreter.ts` for AST evaluation
- **Immutability**: All AST nodes are readonly. Never mutate patterns in place.
- **Determinism**: AST emission must be deterministic. No randomization or ordering assumptions.
- **Error handling**: Always use tagged errors for domain errors. Catch with `Effect.catchTag()`.
- **Dialect gating**: Check dialect support before emitting features (lookahead, named groups, etc.)
- **Performance**: Use optimizer for production patterns. Monitor test timeouts with `testRegex()`.
- **MCP/CLI compatibility**: Commands should work via both MCP tools and CLI, with matching output format (usually JSON).
