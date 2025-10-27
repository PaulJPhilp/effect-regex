# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

effect-regex is a monorepo containing a regex pattern builder and processing toolkit built with the Effect framework. The core philosophy is **deterministic AST-based construction** - patterns are built using a fluent API, represented as an immutable AST, and emit to different regex dialects (JavaScript, RE2, PCRE).

### Monorepo Structure

- **Root workspace**: Bun-based with basic tooling
- **`effect-regex/`**: Main Effect CLI application (TypeScript, pnpm)

All development commands should be run from the `effect-regex/` directory unless otherwise specified.

## Essential Commands

### Development Workflow

```bash
# Navigate to the main package
cd effect-regex

# Install dependencies (use pnpm, not npm/yarn)
pnpm install

# Type checking (run before committing)
pnpm check

# Run tests
pnpm test

# Run a single test file
pnpm test test/builder.test.ts

# Run tests with coverage
pnpm coverage

# Lint and format with Biome (auto-fix)
pnpm biome check --write .

# Build the CLI application
pnpm build

# Build MCP server only
pnpm build:mcp

# Run the CLI directly (development)
pnpm tsx ./src/bin.ts [command] [args]

# Run built CLI (after build)
node dist/bin.cjs [command] [args]
```

### CLI Commands

```bash
# Build standard library patterns
node dist/bin.cjs build-pattern quotedString
node dist/bin.cjs build-pattern uuidV4 --dialect=re2

# Lint patterns for issues
node dist/bin.cjs lint "[a-z]+" --dialect=js

# Explain pattern structure
node dist/bin.cjs explain "(hello|world)+"

# Test patterns against test cases
node dist/bin.cjs test "[a-z]+" test-cases.json

# Optimize patterns
node dist/bin.cjs optimize quotedString
```

## Architecture

### Core Layers (Bottom to Top)

1. **AST Layer** (`src/core/ast.ts`)
   - Immutable AST nodes: `LitNode`, `SeqNode`, `AltNode`, `GroupNode`, etc.
   - Constructor functions: `lit()`, `seq()`, `alt()`, `group()`, `q()`, etc.
   - AST is the single source of truth for all regex operations

2. **Builder Layer** (`src/core/builder.ts`)
   - `RegexBuilder` class: Fluent API for constructing regex patterns
   - Methods: `.lit()`, `.then()`, `.or()`, `.group()`, `.optional()`, `.zeroOrMore()`, etc.
   - Wraps AST construction in a chainable interface

3. **Core Operations** (`src/core/`)
   - **Emitter** (`emitter.ts`): AST → regex string (dialect-aware)
   - **Linter** (`linter.ts`): AST validation for dialect compatibility
   - **Optimizer** (`optimizer.ts`): AST transformations (constant folding, quantifier merging, etc.)
   - **Explainer** (`explainer.ts`): AST → human-readable explanations
   - **Tester** (`tester.ts`): Pattern execution with timeout protection

4. **Service Layer** (`src/services/`)
   - Effect-based services wrapping core operations
   - `RegexBuilderService`: emit, lint, optimize
   - `LLMService`: AI-powered pattern generation
   - `ValidationService`: Input validation with Schema
   - Services use Effect for error handling and composition

5. **Application Layer** (`src/bin.ts`, `src/mcp/server.ts`)
   - CLI commands using `@effect/cli`
   - MCP server using `@modelcontextprotocol/sdk`
   - Both expose the same underlying capabilities

### Key Design Principles

1. **Pure Functions First**: Core operations (emit, lint, optimize, explain) are pure, deterministic functions. Only wrap in Effect when I/O, async, or error channel is needed.

2. **AST-Based**: All regex operations work on the AST, not strings. This enables:
   - Deterministic code generation
   - Dialect-aware emission
   - Safe optimization passes
   - Static analysis and linting

3. **Immutability**: All data structures are readonly. Operations return new instances.

4. **Tagged Errors**: Use `Data.TaggedError` for all custom errors with `_tag` property for type-safe error handling.

5. **Effect for I/O**: Use Effect for async operations, I/O, and error channels. Not for pure computations.

## Important Patterns

### When to Use Effect vs Pure Functions

**Use Pure Functions (return direct values):**
- `optimize(ast)` - Deterministic AST transformation
- `emit(builder, dialect)` - Deterministic code generation
- `lint(ast, dialect)` - Static analysis
- `explain(ast)` - Deterministic explanation
- All AST constructors

**Use Effect (wrap in Effect):**
- `testRegex(pattern, cases, timeout)` - Requires timeouts, I/O
- `callLLMWithRetry(prompt, config)` - Network I/O
- `proposePatternWithLLM(...)` - Composes effectful operations
- File system operations
- Any operation with side effects

### Service Pattern

Services are defined with `Context.Tag` and implemented with `Layer`:

```typescript
// Define service interface
export interface MyService {
  readonly operation: (input: string) => Effect<Output, MyError, never>;
}

// Create Context tag
export const MyService = Context.Tag<MyService>("MyService");

// Implement with Layer
export const MyServiceLive = Layer.succeed(MyService, {
  operation: (input) => Effect.try({
    try: () => pureImplementation(input),
    catch: (error) => new MyError({ cause: error })
  })
});
```

### Error Handling

All custom errors extend `Data.TaggedError`:

```typescript
export class MyError extends Data.TaggedError("MyError")<{
  readonly field: string;
  readonly cause?: unknown;
}> {}
```

Use `Effect.catchTags` for type-safe error handling:

```typescript
operation.pipe(
  Effect.catchTags({
    ValidationError: (error) => Effect.succeed(defaultValue),
    NetworkError: (error) => Effect.retry(...)
  })
)
```

### Standard Library Patterns

All patterns in `src/std/patterns.ts` must:
- Use the fluent `RegexBuilder` API (not raw AST)
- Return a `RegexBuilder` instance
- Be pure functions
- Include JSDoc with description and examples

Pattern tiers:
- **Tier 1** (CLI-focused): quotedString, keyValue, pathSegment, filePathBasic, csvList, integer
- **Tier 2** (Advanced): uuidV4, semverStrict
- **Tier 3** (General): ipv4, ipv6Compressed, float, isoDate, isoDateTime

## Testing

### Test Organization

- `test/` directory at package root
- Use Vitest with `@effect/vitest` for Effect-aware testing
- Tests are named `*.test.ts`

### Test Patterns

```typescript
import { describe, it, expect } from '@effect/vitest';
import { Effect } from 'effect';

describe('MyFeature', () => {
  it('should work', () => {
    const program = Effect.gen(function* () {
      const service = yield* MyService;
      return yield* service.operation('input');
    });

    expect(program.pipe(
      Effect.provide(MyServiceLive),
      Effect.runPromise
    )).resolves.toBe('expected');
  });
});
```

### Running Tests

```bash
# All tests
pnpm test

# Single file
pnpm test test/builder.test.ts

# With coverage
pnpm coverage
```

## Code Style

### Naming Conventions

- **Types/Interfaces/Classes**: PascalCase
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Private fields**: Use TypeScript `#private` or `_prefix`

### Imports

- Use `.js` extension for relative imports (TypeScript requirement)
- Group imports: Effect imports first, then local imports
- Use `type` imports when importing only types

```typescript
import { Effect, Context } from 'effect';
import type { MyType } from './types.js';
import { myFunction } from './utils.js';
```

### TypeScript

- Use `readonly` for all immutable data
- Prefer `interface` for object shapes, `type` for unions/primitives
- Use discriminated unions with `type` field for variants
- All function parameters should have explicit types
- Return types are optional but encouraged for public APIs

### Effect Patterns

- Use `Effect.gen` for sequential async operations
- Use `Effect.all` for parallel operations
- Prefer `pipe()` for functional composition
- Always specify all three Effect type parameters when relevant: `Effect<Requirements, Error, Output>`

## Common Tasks

### Adding a New Standard Library Pattern

1. Add pattern function to `src/std/patterns.ts`
2. Export from `src/std/index.ts`
3. Add tests to `test/std-patterns.test.ts`
4. Update pattern list in README if needed

### Adding a New CLI Command

1. Define command spec in `src/bin.ts` using `@effect/cli`
2. Implement command handler function
3. Add to CLI app definition
4. Build and test: `pnpm build && node dist/bin.cjs your-command`

### Adding a New Error Type

1. Define in `src/errors/types.ts` using `Data.TaggedError`
2. Export from `src/errors/index.ts`
3. Document error conditions in JSDoc

### Modifying AST

Changes to AST require updates to:
- AST type definitions (`src/core/ast.ts`)
- Emitter to handle new node types (`src/core/emitter.ts`)
- Linter if dialect-specific (`src/core/linter.ts`)
- Explainer if user-visible (`src/core/explainer.ts`)
- Optimizer if optimizable (`src/core/optimizer.ts`)

## MCP Server

The MCP server exposes 8 tools to AI assistants:

1. `build_regex` - Build from standard library or CommandSpec
2. `test_regex` - Test patterns with timeout protection
3. `lint_regex` - Validate dialect compatibility
4. `convert_regex` - Convert between dialects
5. `explain_regex` - Generate explanations
6. `library_list` - List standard patterns
7. `propose_pattern` - AI-assisted pattern generation
8. `optimize_pattern` - AST optimization passes

### Building and Testing MCP Server

```bash
# Build
pnpm build:mcp

# Configure in Claude Desktop (example)
# Edit: ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": ["/absolute/path/to/effect-regex/effect-regex/dist/server.cjs"]
    }
  }
}

# Test with MCP inspector
npx @modelcontextprotocol/inspector node dist/server.cjs
```

## Tooling

### Biome (Linting & Formatting)

- Configuration: `biome.jsonc` at repo root
- Extends `ultracite` preset with project-specific overrides
- Run: `pnpm biome check --write .` (auto-fix)
- Run: `biome check --apply-unsafe .` (from repo root, includes unsafe fixes)

### TypeScript

- Uses project references (`tsconfig.json` at package root)
- Three sub-configs: `tsconfig.src.json`, `tsconfig.test.json`, `tsconfig.scripts.json`
- Strict mode enabled
- Target: ES2022, module: NodeNext

### Build Tool (tsup)

- Configuration: `effect-regex/tsup.config.ts`
- Outputs CommonJS to `dist/`
- Builds both CLI (`bin.cjs`) and MCP server (`server.cjs`)

## Additional Resources

- **EFFECT.md**: Effect framework patterns and best practices
- **TYPESCRIPT.md**: TypeScript coding standards
- **AGENTS.md**: Condensed agent guidelines and commands
- **README.md**: User-facing documentation and quick start

## Key Files

- `src/bin.ts` - CLI entry point and command definitions
- `src/core/ast.ts` - AST type definitions and constructors
- `src/core/builder.ts` - Fluent RegexBuilder API
- `src/core/emitter.ts` - AST to regex string emission
- `src/core/linter.ts` - Pattern validation and dialect checking
- `src/core/optimizer.ts` - AST optimization passes
- `src/std/patterns.ts` - Standard library of vetted patterns
- `src/services/` - Effect-based service layer
- `src/mcp/server.ts` - MCP server implementation
