# Technical Documentation: effect-regex

## 1. Technology Stack

### 1.1 Runtime & Package Management

#### Bun (Root Workspace)
- **Version**: Latest
- **Purpose**: Fast JavaScript runtime and package manager for root monorepo
- **Usage**:
  ```bash
  bun install          # Install dependencies
  bun run index.ts     # Run root hello world
  ```

#### Node.js (Effect CLI)
- **Version**: 22.x+ (via @types/node ^22.5.2)
- **Purpose**: Runtime for Effect CLI application
- **Built output**: CommonJS via tsup for Node.js compatibility

### 1.2 Core Framework

#### Effect (v3.17.7+)
- **Purpose**: Functional programming framework for type-safe, composable code
- **Key Features Used**:
  - Effect type for composable operations
  - Effect.gen for generator-based composition
  - Pipe for function composition
  - Type-safe error handling
  - Context/services for dependency injection

**Effect Patterns in Use**:
```typescript
// Generator-based composition
Effect.gen(function* () {
  const result = yield* someEffect;
  return result;
})

// Pipe composition
pipe(
  data,
  Effect.map(transform),
  Effect.flatMap(process)
)
```

#### @effect/cli (v0.69.0)
- **Purpose**: Declarative CLI framework built on Effect
- **Features Used**:
  - Command.make for command definitions
  - Args for argument parsing
  - Subcommand composition
  - Built-in help generation
  - Validation and error handling

**CLI Pattern**:
```typescript
const command = Command.make("name", {
  arg: Args.text("arg-name").pipe(
    Args.withDescription("Description")
  )
}, ({ arg }) => Effect.gen(function* () {
  // Implementation
}))
```

#### @effect/platform (v0.90.3) & @effect/platform-node (v0.96.0)
- **Purpose**: Platform abstractions for file I/O, HTTP, etc.
- **Current Usage**: Minimal (primarily for future features)
- **Planned Usage**: File operations, network requests

### 1.3 Build & Development

#### TypeScript (v5.6.2)
- **Configuration**: `tsconfig.json`
- **Strict Mode**: Enabled
- **Target**: ES2022
- **Module**: ESNext (compiled to CommonJS for distribution)
- **Key Compiler Options**:
  ```json
  {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
  ```

#### tsup (v8.2.4)
- **Purpose**: TypeScript bundler for CLI distribution
- **Configuration**: `effect-regex/package.json` scripts
- **Build Outputs**:
  - `dist/bin.cjs`: CLI entry point (CommonJS)
  - `dist/**/*.js`: Module files (ESM)
- **Build Command**: `pnpm build`

**Build Process**:
```bash
pnpm build:ts           # Transpile TypeScript
pnpm copy-package-json  # Copy package.json to dist/
```

#### tsx (v4.19.1)
- **Purpose**: TypeScript execution for development
- **Usage**: `tsx src/bin.ts` for quick testing
- **MCP Development**: `pnpm mcp:dev` runs MCP server via tsx

### 1.4 Testing

#### Vitest (v3.2.0)
- **Purpose**: Fast unit testing framework
- **Configuration**: `vitest.config.ts` (inferred)
- **Integration**: @effect/vitest for Effect-specific testing
- **Commands**:
  ```bash
  pnpm test           # Run all tests
  pnpm coverage       # Generate coverage report
  ```

**Test Structure**:
```typescript
import { describe, it, expect } from "vitest";
import { Effect } from "effect";

describe("Feature", () => {
  it("should work", async () => {
    const result = await Effect.runPromise(someEffect);
    expect(result).toBe(expected);
  });
});
```

#### @effect/vitest (v0.25.1)
- **Purpose**: Vitest integration for Effect types
- **Features**:
  - Effect.runPromise for async tests
  - Test context providers
  - Error matchers

### 1.5 External Integrations

#### @modelcontextprotocol/sdk (v0.5.0)
- **Purpose**: Model Context Protocol server implementation
- **Status**: Skeleton implemented in `src/mcp/server.ts`
- **Planned Tools**:
  - build-pattern
  - test-pattern
  - lint-pattern
  - explain-pattern
  - propose-pattern

**MCP Server Pattern**:
```typescript
const server = new Server({
  name: "effect-regex",
  version: "0.1.0"
}, {
  capabilities: {
    tools: {}
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Handle tool invocation
});
```

### 1.6 Code Quality

#### Biome (via .biomeignore, .editorconfig)
- **Purpose**: Fast linting and formatting
- **Status**: Configuration present, integrated in development
- **Future**: Replace/augment with Biome for faster linting

#### EditorConfig (.editorconfig)
- **Purpose**: Consistent editor settings across team
- **Settings**:
  - Indent: 2 spaces
  - Charset: UTF-8
  - End of line: LF
  - Trim trailing whitespace

## 2. Development Environment Setup

### 2.1 Prerequisites
```bash
# Required
node >= 22.0.0
bun >= 1.0.0 (for root workspace)
pnpm >= 10.14.0 (for effect-regex/)

# Optional
git >= 2.0.0
```

### 2.2 Installation

#### Root Workspace (Bun)
```bash
# Clone repository
git clone <repo-url>
cd effect-regex

# Install dependencies
bun install

# Verify setup
bun run index.ts
```

#### Effect CLI Application
```bash
# Navigate to CLI
cd effect-regex

# Install dependencies
pnpm install

# Verify setup
pnpm check           # Type checking
pnpm test            # Run tests
pnpm tsx src/bin.ts  # Run CLI
```

### 2.3 Development Workflow

#### Hot Reload Development
```bash
# Run CLI in watch mode (using tsx)
cd effect-regex
pnpm tsx --watch src/bin.ts build-pattern quotedString
```

#### Testing Workflow
```bash
# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test src/core/builder.test.ts

# Generate coverage
pnpm coverage
```

#### Building & Distribution
```bash
# Build for distribution
pnpm build

# Test built CLI
node dist/bin.cjs build-pattern quotedString

# Clean build artifacts
pnpm clean
```

## 3. Project Structure

```
effect-regex/
├── effect-regex/              # Main CLI application
│   ├── src/
│   │   ├── core/              # Core engine (AST, builder, emitter, etc.)
│   │   │   ├── ast.ts         # AST types and constructors
│   │   │   ├── builder.ts     # Fluent builder API
│   │   │   ├── emitter.ts     # Pattern emission with dialects
│   │   │   ├── linter.ts      # Pattern validation
│   │   │   ├── tester.ts      # Test execution framework
│   │   │   └── explainer.ts   # Pattern explanation
│   │   ├── std/               # Standard library
│   │   │   └── patterns.ts    # Vetted pattern registry
│   │   ├── command/           # CommandSpec builder
│   │   │   └── command-spec.ts
│   │   ├── ai/                # AI toolkit
│   │   │   └── toolkit.ts     # Propose/test/refine loop
│   │   ├── mcp/               # MCP server
│   │   │   └── server.ts      # MCP protocol implementation
│   │   ├── schemas/           # Data validation schemas
│   │   ├── Cli.ts             # CLI command definitions
│   │   └── bin.ts             # CLI entry point
│   ├── test/
│   │   ├── core.test.ts       # Core engine tests
│   │   ├── mcp-e2e.test.ts    # MCP integration tests
│   │   └── corpora/           # Test data
│   ├── dist/                  # Build output (generated)
│   ├── package.json           # CLI package definition
│   ├── tsconfig.json          # TypeScript configuration
│   └── vitest.config.ts       # Test configuration
├── memory/                    # Project memory files
│   ├── docs/                  # Documentation
│   │   ├── product_requirement_docs.md
│   │   ├── architecture.md
│   │   └── technical.md
│   └── tasks/                 # Task tracking
│       ├── tasks_plan.md
│       └── active_context.md
├── docs/                      # Additional documentation
├── tools/                     # Development utilities (Python)
├── .github/                   # GitHub workflows
├── .vscode/                   # VS Code settings
├── .husky/                    # Git hooks
├── package.json               # Root workspace package
├── bun.lock                   # Bun lockfile
├── AGENTS.md                  # AI assistant rules
├── EFFECT.md                  # Effect patterns guide
├── TYPESCRIPT.md              # TypeScript conventions
└── README.md                  # Project overview
```

## 4. Key Technical Decisions

### 4.1 Monorepo Structure
**Decision**: Use Bun root workspace with pnpm for Effect CLI

**Rationale**:
- Bun for fast root-level tooling
- pnpm for Effect ecosystem compatibility
- Separation of concerns (root vs. CLI app)

**Trade-offs**:
- Two package managers (added complexity)
- Better isolation and flexibility

### 4.2 Effect Framework
**Decision**: Build on Effect for functional programming

**Rationale**:
- Type-safe error handling
- Composable effects
- Rich ecosystem (@effect/cli, @effect/platform)
- Testability (pure functions, dependency injection)

**Trade-offs**:
- Steeper learning curve
- Smaller community vs. mainstream frameworks
- Better long-term maintainability and correctness

### 4.3 AST-Based Approach
**Decision**: Use AST instead of string templates

**Rationale**:
- Deterministic emission
- Type safety
- Composability
- Dialect gating at AST level

**Trade-offs**:
- More complex implementation
- Cannot easily parse existing regex strings
- Superior testability and reliability

### 4.4 CommonJS Distribution
**Decision**: Build to CommonJS for CLI distribution

**Rationale**:
- Universal Node.js compatibility
- Simpler bin script execution
- Avoid ESM/CJS interop issues

**Trade-offs**:
- ESM source, CJS output (requires transpilation)
- Works everywhere

### 4.5 Schema Validation
**Decision**: Use Effect Schema for runtime validation

**Rationale**:
- Type-safe parsing and serialization
- Integration with Effect error model
- Automatic schema inference

**Trade-offs**:
- Learning Effect Schema syntax
- Superior type safety and developer experience

## 5. Design Patterns

### 5.1 Builder Pattern
**Usage**: RegexBuilder fluent API

**Example**:
```typescript
RegexBuilder
  .lit("hello")
  .then(RegexBuilder.whitespace().oneOrMore())
  .then(RegexBuilder.word().oneOrMore())
  .capture("greeting")
```

**Benefits**:
- Readable, declarative pattern construction
- Type-safe chaining
- Immutability (new instance per operation)

### 5.2 Visitor Pattern
**Usage**: AST traversal in emitter, linter, explainer

**Example**:
```typescript
function emitNode(node: AstNode): string {
  switch (node.type) {
    case "lit": return node.value;
    case "seq": return node.children.map(emitNode).join("");
    // ... other cases
  }
}
```

**Benefits**:
- Clean separation of concerns
- Easy to add new AST operations
- Type exhaustiveness checking

### 5.3 Registry Pattern
**Usage**: STANDARD_PATTERNS registry

**Example**:
```typescript
export const STANDARD_PATTERNS = {
  quotedString: { pattern, description, examples, dialect },
  // ... more patterns
} as const;
```

**Benefits**:
- Centralized pattern management
- Type-safe pattern lookup
- Metadata co-location

### 5.4 Effect Composition
**Usage**: Throughout application for operations

**Example**:
```typescript
const program = Effect.gen(function* () {
  const pattern = yield* proposePattern(examples);
  const testResult = yield* testPattern(pattern, cases);
  const suggestions = yield* analyzeAndRefine(pattern, testResult);
  return suggestions;
});
```

**Benefits**:
- Readable async/error handling
- Composable effects
- Testable without mocking

## 6. Performance Characteristics

### 6.1 AST Construction
- **Complexity**: O(n) where n = number of builder operations
- **Memory**: O(n) for AST nodes
- **Optimization**: Structural sharing (immutable nodes)

### 6.2 Pattern Emission
- **Complexity**: O(n) where n = AST nodes
- **Memory**: O(m) where m = output regex length
- **Optimization**: Single-pass traversal, deterministic

### 6.3 Pattern Testing
- **Complexity**: O(k × m) where k = test cases, m = input length
- **Timeout**: 100ms default (configurable)
- **Optimization**: Early termination on timeout

### 6.4 Linting
- **Complexity**: O(n) for AST traversal
- **Validation**: RegExp constructor for syntax check
- **Optimization**: Cached dialect compatibility checks

## 7. Security Considerations

### 7.1 ReDoS Protection
- **Approach**: Timeout protection in tester
- **Default**: 100ms maximum execution
- **Recommendation**: Use RE2 dialect for untrusted input

### 7.2 Input Sanitization
- **Literals**: Automatically escaped via `lit()` constructor
- **Raw Patterns**: User responsibility (documented)
- **Schema Validation**: All external JSON validated via Effect Schema

### 7.3 Dependency Security
- **Strategy**: Regular updates via Changesets
- **Monitoring**: GitHub Dependabot (configured in .github/)
- **Principle**: Minimal dependencies, trusted sources

## 8. Testing Strategy

### 8.1 Unit Tests
- **Location**: `test/core.test.ts`
- **Coverage**: Core engine components
- **Framework**: Vitest with @effect/vitest

### 8.2 Integration Tests
- **Location**: `test/mcp-e2e.test.ts`
- **Coverage**: MCP server, CLI commands
- **Approach**: Full end-to-end flows

### 8.3 Test Corpora
- **Location**: `test/corpora/`
- **Purpose**: Real-world test cases for standard library
- **Format**: JSON files with positive/negative examples

### 8.4 Property-Based Testing
- **Status**: Planned for M3
- **Tools**: Effect-test or fast-check
- **Focus**: AST construction, emission determinism

## 9. Continuous Integration

### 9.1 GitHub Actions
- **Workflows**: `.github/workflows/`
  - `check.yml`: Type checking, linting
  - `ci.yml`: Test execution, build verification

### 9.2 Checks
- Type checking: `pnpm check`
- Tests: `pnpm test`
- Build: `pnpm build`
- Linting: Biome (future)

## 10. Release Process

### 10.1 Changesets
- **Tool**: @changesets/cli (v2.27.8)
- **Workflow**:
  1. Developer adds changeset: `changeset`
  2. Describe changes and version bump
  3. PR merged → Changesets bot creates release PR
  4. Merge release PR → Publish

### 10.2 Versioning
- **Scheme**: Semantic versioning (semver)
- **Current**: 0.0.0 (pre-release)
- **Target**: 1.0.0 after M3 completion

## 11. Deployment

### 11.1 NPM Package
- **Name**: @template/cli (to be renamed)
- **Registry**: npm (public)
- **Entry Point**: `dist/bin.cjs`
- **Installation**: `npm install -g @template/cli`

### 11.2 MCP Server
- **Protocol**: stdio transport
- **Entry Point**: `dist/mcp/server.cjs`
- **Configuration**: Claude desktop config, Cline MCP settings

## 12. Documentation Standards

### 12.1 Code Documentation
- **TSDoc**: For all public APIs
- **Inline Comments**: Explain "why", not "what"
- **Examples**: Include usage examples in module docs

### 12.2 User Documentation
- **README.md**: Quick start, overview
- **AGENTS.md**: AI assistant development rules
- **EFFECT.md**: Effect patterns and best practices
- **TYPESCRIPT.md**: TypeScript conventions
- **Memory Files**: Architecture, PRD, technical details

### 12.3 Change Documentation
- **Changesets**: Describe user-facing changes
- **Git Commits**: Follow conventional commits
- **Release Notes**: Auto-generated from changesets

## 13. Future Technical Enhancements

### 13.1 Planned Improvements
- Property-based testing with fast-check
- Performance benchmarking suite
- AST optimization (constant folding, etc.)
- Parallel test execution
- Incremental linting

### 13.2 Research Areas
- Regex parsing (string → AST)
- Advanced dialect conversion
- Machine learning for pattern optimization
- Interactive debugger implementation
