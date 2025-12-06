# Contributing to effect-regex

Thank you for your interest in contributing to effect-regex! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- **Node.js**: 18 or higher
- **pnpm**: 10.14.0 (specified in package.json)
- **TypeScript**: 5.6.2 or higher

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/PaulJPhilp/effect-regex.git
cd effect-regex/effect-regex

# Install dependencies
pnpm install

# Verify setup
pnpm build
pnpm test
```

## Development Workflow

### Code Style & Formatting

This project uses **Biome** for code formatting and linting. All code must pass Biome checks.

```bash
# From the root directory
pnpm biome check                    # Check files
pnpm biome format --write           # Format files
pnpm biome lint                     # Lint files
```

Most IDEs support Biome plugins for automatic formatting on save.

### Building

```bash
# Build TypeScript and create distribution
pnpm build

# TypeScript only (without bundling)
pnpm build:ts

# Type checking
pnpm check

# Build MCP server
pnpm build:mcp
```

Build output goes to the `dist/` directory.

### Testing

All new features must include comprehensive tests. Current coverage: **83.5%** (144 tests passing).

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/optimizer.test.ts

# Watch mode for development
pnpm test --watch

# Generate coverage report
pnpm coverage
```

Tests use **Vitest** and **Effect testing utilities**. Run tests before committing.

## Project Structure

```
effect-regex/
├── src/
│   ├── core/                 # Core regex engine
│   │   ├── ast.ts            # AST node types
│   │   ├── builder.ts        # Fluent builder API
│   │   ├── emitter.ts        # Pattern emission to different dialects
│   │   ├── linter.ts         # Pattern validation
│   │   ├── optimizer.ts      # AST optimization passes
│   │   ├── explainer.ts      # Pattern explanation generation
│   │   └── tester.ts         # Testing framework
│   ├── std/                  # Standard pattern library
│   │   ├── patterns.ts       # General patterns
│   │   ├── security-patterns.ts # Security-focused patterns
│   │   └── index.ts          # Unified exports
│   ├── services/             # Service layer (dependency injection)
│   │   ├── regex-builder.ts  # Regex building service
│   │   ├── llm.ts            # LLM integration service
│   │   ├── validation.ts     # Pattern validation service
│   │   └── types.ts          # Service types
│   ├── mcp/                  # MCP server integration
│   │   ├── server.ts         # MCP server entry point
│   │   ├── tools/            # MCP tool implementations
│   │   ├── schemas.ts        # Tool input/output schemas
│   │   └── types.ts          # MCP type definitions
│   ├── ai/                   # AI integration
│   │   ├── toolkit.ts        # High-level AI workflow
│   │   ├── llm-client.ts     # Anthropic API client
│   │   ├── prompts.ts        # LLM prompt templates
│   │   ├── interpreter.ts    # Safe AST interpreter
│   │   └── utils.ts          # Helper functions
│   ├── errors/               # Error type definitions
│   │   ├── types.ts          # Tagged error types
│   │   └── index.ts          # Error exports
│   └── bin.ts                # CLI entry point
├── test/                     # Test suites
├── docs/                     # Documentation
└── package.json
```

## Adding Standard Library Patterns

The standard library contains 40+ vetted patterns. To add a new pattern:

### 1. Create Pattern Definition

Edit `src/std/patterns.ts` (for general patterns) or `src/std/security-patterns.ts` (for security patterns):

```typescript
import { RegexBuilder } from "../core/builder.js";

export const myPattern = RegexBuilder
  .charClass("a-z")
  .oneOrMore()
  .group("name");  // Add descriptive name
```

### 2. Add Metadata

```typescript
export const myPatternMeta = {
  name: "myPattern",
  description: "Matches one or more lowercase letters",
  examples: ["hello", "world"],
  aliases: ["lowercase"],
  dialect: "js", // Can be "js", "re2", "pcre", or ["js", "re2"]
};
```

### 3. Export from Index

Edit `src/std/index.ts` to add your pattern to `STANDARD_PATTERNS`.

### 4. Write Tests

Create comprehensive test cases in the `test/` directory:

```typescript
import { describe, it, expect } from "vitest";
import { myPattern } from "../src/std/patterns.js";
import { emit } from "../src/core/builder.js";

describe("myPattern", () => {
  it("should match lowercase letters", () => {
    const result = emit(myPattern, "js", true);
    const regex = new RegExp(result.pattern);
    expect(regex.test("hello")).toBe(true);
    expect(regex.test("HELLO")).toBe(false);
  });
});
```

### 5. Test Your Pattern

```bash
# Run tests
pnpm test

# Build and test CLI
pnpm build
pnpm tsx ./src/bin.ts build-pattern myPattern
```

## Adding New AST Node Types

To extend the AST with a new node type:

### 1. Define AST Node Interface

Edit `src/core/ast.ts`:

```typescript
export interface MyNode extends AstNode {
  readonly type: "mynode";
  readonly value: string;
}

export function mynode(value: string): MyNode {
  return { type: "mynode", value };
}
```

### 2. Add Emitter Logic

Edit `src/core/emitter.ts` to add emission for each dialect:

```typescript
case "mynode": {
  const n = node as MyNode;
  // Emit to JS dialect
  if (dialect === "js") {
    return escapeRegex(n.value);
  }
  // Similar for re2, pcre
  break;
}
```

### 3. Add Builder Method

Edit `src/core/builder.ts` if users should interact with this node:

```typescript
myNode(value: string): RegexBuilder {
  return new RegexBuilder(mynode(value));
}
```

### 4. Add to Explainer

Edit `src/core/explainer.ts` to generate human-readable explanations.

### 5. Add Tests

Create comprehensive tests for the new node type.

## Adding MCP Tools

To add a new Model Context Protocol tool:

### 1. Create Tool Handler

Edit `src/mcp/tools/my-tool.ts`:

```typescript
export const handleMyTool: ToolHandler<MyToolArgs, MyToolResult> = (args) =>
  Effect.gen(function* () {
    // Implementation
    return result;
  });
```

### 2. Define Input Schema

Edit `src/mcp/schemas.ts`:

```typescript
export const MyToolSchema = {
  type: "object",
  properties: {
    pattern: { type: "string" },
    // ... other properties
  },
  required: ["pattern"],
};
```

### 3. Register Tool

Edit `src/mcp/server.ts`:

```typescript
tools.push({
  name: "my_tool",
  description: "Description of what the tool does",
  inputSchema: MyToolSchema,
  handler: handleMyTool,
});
```

## Key Design Principles

### AST-Based Architecture

- All patterns are immutable Abstract Syntax Trees before emission
- Enables deterministic output and cross-dialect compilation
- Never mutate AST nodes in place; create new nodes

### Effect Framework Usage

- Use `Effect` for async operations and error handling
- Use `Data.TaggedError` for domain-specific errors
- Use `pipe()` for effect composition
- Refer to EFFECT.md for patterns

### Security First

- **Never use eval()** — use safe interpreter in `src/ai/interpreter.ts`
- Validate all user input at system boundaries
- Include input size limits to prevent DoS
- Test patterns for catastrophic backtracking using `tester.ts`

### Dialect Compatibility

Check dialect support before emitting features:

```typescript
if (dialect === "re2" && hasNamedGroups) {
  warnings.push("RE2 doesn't support named groups");
}
```

## Pull Request Process

### 1. Fork and Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

- Write code following project patterns
- Run tests: `pnpm test`
- Format code: `pnpm biome format --write`
- Update documentation

### 3. Commit with Clear Messages

```bash
git commit -m "feat: Add new pattern for validating email addresses

- Implement pattern using fluent API
- Add comprehensive test cases
- Update README with example usage
- Add pattern to standard library exports"
```

### 4. Push and Create PR

```bash
git push origin feature/my-feature
```

Then open a pull request on GitHub with:
- Clear description of changes
- Link to any related issues
- Test results (should show all tests passing)
- Before/after examples if applicable

### 5. Address Review Feedback

- Make requested changes
- Maintain clean commit history
- Ensure all tests pass

## Error Handling

Use **tagged errors** from `src/errors/types.ts` for domain errors:

```typescript
import { RegexCompilationError } from "../errors/types.js";
import { Effect } from "effect";

export const myFunction = (): Effect<never, RegexCompilationError, string> => {
  try {
    // pattern compilation
  } catch (error) {
    return Effect.fail(new RegexCompilationError({
      pattern,
      dialect: "js",
      cause: error,
    }));
  }
};
```

Consumers can then use type-safe error handling:

```typescript
Effect.catchTag("RegexCompilationError", (error) => {
  // Handle compilation errors
});
```

## Performance Considerations

### Testing Performance

Use the `tester.ts` timeout mechanism (default 100ms) to detect catastrophic backtracking:

```bash
pnpm test test/tester-extended.test.ts
```

### Pattern Optimization

The optimizer runs 4 passes:
1. **Constant Folding**: Simplify literal sequences
2. **Quantifier Simplification**: Optimize redundant quantifiers
3. **Character Class Merging**: Combine adjacent character classes
4. **Alternation Deduplication**: Remove duplicate alternatives

Use `pnpm tsx ./src/bin.ts optimize <pattern-name>` to see optimization impact.

## Testing Guidelines

### Coverage Target

Maintain **83.5%+ code coverage** on all new code.

```bash
pnpm coverage
```

### Test Categories

- **Happy Path**: Expected behavior with valid input
- **Edge Cases**: Empty inputs, single characters, boundary values
- **Error Cases**: Invalid patterns, type mismatches
- **Dialect-Specific**: Test dialect gating and compatibility
- **Performance**: Test timeout handling and backtracking

## Documentation

### Code Comments

Use TSDoc for public APIs:

```typescript
/**
 * Build a pattern matching one or more digits
 *
 * @returns New RegexBuilder with digit pattern
 * @example
 * ```typescript
 * RegexBuilder.digit().oneOrMore()  // [0-9]+
 * ```
 */
static digit(): RegexBuilder {
  return new RegexBuilder(charClass("0-9"));
}
```

### README Updates

When adding features:
- Update README.md with new examples
- Update API reference section
- Add to feature list if applicable
- Update installation instructions if dependencies changed

## Getting Help

- **Documentation**: Check `docs/` directory and README.md
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Code Examples**: See `test/` directory for usage patterns

## License

By contributing to effect-regex, you agree that your contributions are licensed under the MIT License, the same license as the project.

---

Thank you for contributing to effect-regex! We appreciate your effort in making regex building safer and more accessible. 🎉
