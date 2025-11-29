# effect-regex

[![npm version](https://badge.fury.io/js/effect-regex.svg)](https://www.npmjs.com/package/effect-regex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A type-safe, composable regex builder for TypeScript using the Effect library. Build complex regex patterns with a fluent API that compiles to multiple dialects (JS, RE2, PCRE).

**Current Version:** 0.5.0 (Initial Public Release)

## Features

- 🎯 **Fluent Builder API**: Chainable methods for building regex patterns
- 🔒 **Type-Safe**: Full TypeScript support with type inference
- 🌐 **Multi-Dialect**: Compile to JS, RE2, or PCRE with automatic compatibility checks
- 📚 **Rich Pattern Library**: 40+ pre-built patterns for common use cases
- 🛡️ **Security-Focused**: Patterns for input validation and SQL injection detection
- ✅ **TryCapture**: Capture groups with validation metadata
- 🔍 **Backreferences**: Support for named and numbered backreferences
- 👀 **Lookahead/Lookbehind**: Full assertion support
- 🔧 **AST-Based**: Deterministic pattern generation from abstract syntax tree
- ⚡ **Effect Integration**: Leverages Effect for error handling and composability

## Installation

```bash
npm install effect-regex
# or
pnpm add effect-regex
# or
yarn add effect-regex
```

## Quick Start

### Basic Usage

```typescript
import { RegexBuilder, emit } from "effect-regex/core/builder";

// Build a simple email pattern
const emailPattern = RegexBuilder.charClass("a-zA-Z0-9._%+-")
  .oneOrMore()
  .then(RegexBuilder.lit("@"))
  .then(RegexBuilder.charClass("a-zA-Z0-9.-").oneOrMore())
  .then(RegexBuilder.lit("."))
  .then(RegexBuilder.charClass("a-zA-Z").between(2, 10))
  .group("email");

// Emit to different dialects
const jsPattern = emit(emailPattern, "js", true); // anchored
const re2Pattern = emit(emailPattern, "re2");
const pcrePattern = emit(emailPattern, "pcre");

console.log(jsPattern.pattern);
// ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$

// Use the pattern
const regex = new RegExp(jsPattern.pattern);
console.log(regex.test("user@example.com")); // true
```

### Using Pre-Built Patterns

```typescript
import { email, ipv4, hexColor } from "effect-regex/std";
import { emit } from "effect-regex/core/builder";

// Use standard library patterns
const emailRegex = new RegExp(emit(email, "js", true).pattern);
console.log(emailRegex.test("user@example.com")); // true

const ipRegex = new RegExp(emit(ipv4, "js", true).pattern);
console.log(ipRegex.test("192.168.1.1")); // true

const colorRegex = new RegExp(emit(hexColor, "js", true).pattern);
console.log(colorRegex.test("#FF0000")); // true
```

### Security Patterns

```typescript
import { safeFilename, sqlMetaChars } from "effect-regex/std/security-patterns";
import { emit } from "effect-regex/core/builder";

// Validate safe filenames
const filenamePattern = emit(safeFilename, "js", true);
const filenameRegex = new RegExp(filenamePattern.pattern);
console.log(filenameRegex.test("document.pdf")); // true
console.log(filenameRegex.test("../../../etc/passwd")); // false

// Detect SQL injection attempts
const sqlPattern = emit(sqlMetaChars, "js");
const sqlRegex = new RegExp(sqlPattern.pattern);
console.log(sqlRegex.test("normal input")); // false
console.log(sqlRegex.test("'; DROP TABLE users--")); // true
```

### Advanced: TryCapture with Validation

```typescript
import { RegexBuilder, emit } from "effect-regex/core/builder";

// Capture with validation metadata
const usernamePattern = RegexBuilder.charClass("a-zA-Z0-9_")
  .atLeast(3)
  .tryCapture("username", {
    description: "must be 3+ alphanumeric characters",
    pattern: "[a-zA-Z0-9_]{3,}"
  });

const result = emit(usernamePattern, "js");
console.log(result.notes);
// ["TryCapture validation: must be 3+ alphanumeric characters (pattern: [a-zA-Z0-9_]{3,})"]
```

### Backreferences

```typescript
import { RegexBuilder, emit } from "effect-regex/core/builder";

// Match repeated words
const repeatPattern = RegexBuilder.word()
  .oneOrMore()
  .capture("word")
  .then(RegexBuilder.whitespace().oneOrMore())
  .then(RegexBuilder.backref("word"));

const result = emit(repeatPattern, "js");
// Pattern: ([a-zA-Z0-9_]+)[\s]+\k<word>

const regex = new RegExp(result.pattern);
console.log(regex.test("hello hello")); // true
console.log(regex.test("hello world")); // false
```

## Pattern Library

The standard library provides 40+ pre-built patterns:

### General Patterns

- **Email, URL, Username, Password**
- **UUID v4, Semantic Versions**
- **Colors** (hex, CSS named, rgb/rgba, hsl/hsla)
- **Phone Numbers** (US, international)
- **IP Addresses** (IPv4, IPv6)
- **Dates/Times** (ISO formats, HH:MM:SS)
- **Numbers** (integers, floats, decimals)
- **File Paths**

### Security Patterns

- **Input Validation** (alphanumeric, safe text)
- **SQL Injection Detection**
- **Path Traversal Prevention**
- **PII Format Validation** (SSN, credit cards)
- **Network Validation** (MAC, domains, hostnames)
- **Character Whitelisting/Blacklisting**

See [Pattern Library Documentation](./docs/pattern-library.md) for full reference.

## API Reference

### Core Builder

```typescript
import { RegexBuilder } from "effect-regex/core/builder";

// Character classes
RegexBuilder.digit()           // [0-9]
RegexBuilder.word()            // [a-zA-Z0-9_]
RegexBuilder.whitespace()      // [\s]
RegexBuilder.any()             // .
RegexBuilder.charClass("a-z")  // [a-z]

// Literals
RegexBuilder.lit("hello")      // hello (escaped)

// Quantifiers
.oneOrMore()                   // +
.zeroOrMore()                  // *
.optional()                    // ?
.exactly(n)                    // {n}
.between(min, max)             // {min,max}
.atLeast(n)                    // {n,}

// Groups
.capture(name?)                // (...)  or (?<name>...)
.group(name?)                  // Non-capturing (?:...) or named
.tryCapture(name?, validation?)// Capture with validation metadata

// Alternation
.or(pattern)                   // |
RegexBuilder.alt(p1, p2, ...)  // (p1|p2|...)

// Assertions
RegexBuilder.lookahead(p)      // (?=...)
RegexBuilder.lookbehind(p)     // (?<=...)
RegexBuilder.negativeLookahead(p)    // (?!...)
RegexBuilder.negativeLookbehind(p)   // (?<!...)

// Backreferences
RegexBuilder.backref("name")   // \k<name>
RegexBuilder.backref(1)        // \1

// Anchors
.startOfLine()                 // ^
.endOfLine()                   // $
.wordBoundary()                // \b
```

### Pattern Discovery

```typescript
import {
  listPatterns,
  searchPatterns,
  getPattern
} from "effect-regex/std";

// List all patterns
const all = listPatterns();

// Search by keyword
const phonePatterns = searchPatterns("phone");
// Returns: ["usPhone", "intlPhone"]

// Get specific pattern
const pattern = getPattern("email");
console.log(pattern.description);
console.log(pattern.examples);
```

## Dialect Support

### JavaScript (js)
Full feature support including:
- Named groups
- Backreferences
- Lookahead/lookbehind

### RE2 (re2)
Google's RE2 engine with limitations:
- No named groups (downgraded to numbered)
- No backreferences
- No lookbehind

### PCRE (pcre)
Full feature support similar to JS.

## CLI Usage

```bash
# Build a pattern from standard library
pnpm tsx src/bin.ts build-pattern uuidV4 --dialect js

# Lint a pattern
pnpm tsx src/bin.ts lint "^[a-z]+$" --dialect re2

# Optimize a pattern
pnpm tsx src/bin.ts optimize uuidV4

# Test a pattern
pnpm tsx src/bin.ts test "^\\d+$" --cases "123,abc,456"
```

## MCP Server Integration

The project includes an MCP (Model Context Protocol) server that exposes regex tools to AI assistants:

- `build_regex`: Build patterns from standard library or AST
- `test_regex`: Test patterns with timeout protection
- `lint_regex`: Validate patterns for safety and dialect compatibility
- `convert_regex`: Convert between dialects
- `explain_regex`: Generate AST-based explanations
- `library_list`: List standard library patterns
- `optimize_pattern`: Optimize patterns with AST transformations

See [MCP Setup Guide](./docs/mcp-setup.md) for integration instructions.

## Development

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build:ts

# Build MCP server
pnpm build:mcp

# Run tests
pnpm test

# Run specific test file
pnpm test test/core.test.ts

# Lint code
pnpm biome check

# Format code
pnpm biome format --write
```

## Project Structure

```
effect-regex/
├── src/
│   ├── core/           # Core regex engine
│   │   ├── ast.ts      # AST node types
│   │   ├── builder.ts  # Fluent builder API
│   │   ├── emitter.ts  # Pattern emission
│   │   ├── linter.ts   # Pattern validation
│   │   ├── optimizer.ts # AST optimization
│   │   └── explainer.ts # Pattern explanation
│   ├── std/            # Standard pattern library
│   │   ├── patterns.ts         # General patterns
│   │   ├── security-patterns.ts # Security patterns
│   │   └── index.ts            # Unified exports
│   ├── mcp/            # MCP server
│   ├── ai/             # AI integration
│   └── bin.ts          # CLI entry point
├── test/               # Test suites
└── docs/               # Documentation
```

## Testing

The project has comprehensive test coverage:

- **Core Tests** (16 tests): AST, builder, emitter
- **TryCapture Tests** (24 tests): Validation metadata, dialect support
- **Linter Tests** (25 tests): Backreferences, assertions, complexity
- **Optimizer Tests** (23 tests): AST transformations
- **Security Tests** (45 tests): AI code interpreter safety

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test test/core.test.ts
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

Built with:
- [Effect](https://effect.website/) - Powerful TypeScript library for building robust applications
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vitest](https://vitest.dev/) - Fast unit testing framework

## Links

- [Documentation](./docs/)
- [Pattern Library Reference](./docs/pattern-library.md)
- [MCP Setup Guide](./docs/mcp-setup.md)
- [GitHub Repository](https://github.com/PaulJPhilp/effect-regex)

## Status

✅ **v0.5.0 Released** - Available on npm
✅ Phase 1 Complete: Backreferences, Assertions, Linter validation
✅ Phase 2 Complete: TryCapture with validation metadata
✅ Pattern Library: 40+ pre-built patterns
✅ Security Patterns: Input validation and injection detection
✅ MCP Server: 8 tools for AI integration (Grade A- test suite)
✅ Test Coverage: 473 tests, 83.5% coverage
🚀 Production Ready

### What's New in v0.5.0

- **npm Package**: Now available at https://www.npmjs.com/package/effect-regex
- **MCP Server**: Refactored to modular architecture (8 tools, 84 comprehensive tests)
- **Comprehensive Testing**: 473 tests across 21 test files with 83.5% coverage
- **Full Documentation**: Complete TSDoc, CHANGELOG, pattern library reference
- **AI Integration**: MCP tools for pattern generation, optimization, and validation

See [CHANGELOG.md](./CHANGELOG.md) for full release notes.
