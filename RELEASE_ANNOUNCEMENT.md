# Effect-Regex v0.6.0 - Initial Public Release

**Type-safe regex builder for TypeScript with multi-dialect support is now available.**

We're excited to announce **effect-regex**, a production-ready regex composition library built on the Effect framework.

## What is effect-regex?

effect-regex provides a fluent, type-safe API for building regular expressions that compile to multiple dialects (JavaScript, RE2, PCRE). Instead of writing raw regex strings, compose patterns using a chainable builder API with full TypeScript support.

```typescript
import { Regex } from 'effect-regex';

const emailPattern = Regex.sequence(
  Regex.chars('a-zA-Z0-9._%-'),
  Regex.lit('@'),
  Regex.chars('a-zA-Z0-9.-'),
  Regex.lit('.'),
  Regex.range('a', 'z').min(2)
);

const jsRegex = emailPattern.toStringJS();
const re2Regex = emailPattern.toStringRE2();
```

## Key Features

🎯 **Multi-Dialect Support** - Compile patterns to JavaScript, RE2, or PCRE with automatic compatibility checking

🔧 **Fluent Builder API** - Chainable methods for intuitive pattern composition

📦 **40+ Standard Patterns** - Pre-built, vetted patterns for common use cases:
- General: email, URL, UUID, semantic versions, phone numbers
- Network: IPv4, IPv6, MAC addresses, domains
- Dates/Times: ISO 8601, HH:MM:SS
- Security: SQL injection detection, path traversal prevention, PII validation

🤖 **MCP Server Integration** - 8 tools for AI assistants (Claude, Cline):
- Pattern building and testing
- Dialect conversion
- AI-powered pattern generation
- AST optimization

⚡ **Optimization Engine** - Automatic pattern optimization with 4 AST transformation passes

🧪 **Comprehensive Testing** - 473 tests with 83.5% code coverage

📖 **Full Documentation** - Complete TSDoc, examples, and guides

## Why effect-regex?

**Safety** - Type-safe pattern composition eliminates string-based regex errors

**Reusability** - Build patterns once, use in multiple dialects

**Clarity** - Fluent API makes complex patterns readable

**Integration** - Native Effect framework support for elegant async workflows

**AI-Ready** - MCP server exposes pattern tools to Claude and other AI assistants

## Getting Started

```bash
bun install effect-regex
```

```typescript
import { Regex } from 'effect-regex';

// Build a pattern
const pattern = Regex.sequence(
  Regex.oneOrMore(Regex.digit()),
  Regex.lit('-'),
  Regex.oneOrMore(Regex.digit())
);

// Emit to different dialects
console.log(pattern.toStringJS());    // JavaScript regex
console.log(pattern.toStringRE2());   // RE2 regex
console.log(pattern.toStringPCRE());  // PCRE regex

// Test patterns
const { testRegex } = await import('effect-regex/core');
const result = await testRegex('\\d+-\\d+', [
  { input: '123-456', shouldMatch: true },
  { input: 'abc-def', shouldMatch: false }
]);
```

## Standard Library Patterns

Access pre-built patterns:

```typescript
import { buildPattern } from 'effect-regex/std';

const emailRegex = buildPattern('email');
const uuidRegex = buildPattern('uuidV4');
const ipv4Regex = buildPattern('ipv4');
```

Available patterns: `quotedString`, `keyValue`, `pathSegment`, `filePathBasic`, `csvList`, `integer`, `uuidV4`, `semverStrict`, `ipv4`, `ipv6Compressed`, `float`, `isoDate`, `isoDateTime`, and more.

## MCP Server Integration

Use effect-regex with Claude Desktop or Cline:

```json
{
  "mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": ["/path/to/effect-regex/dist/server.cjs"]
    }
  }
}
```

Available tools:
- `build_regex` - Build from standard library or specs
- `test_regex` - Validate patterns with test cases
- `lint_regex` - Check dialect compatibility
- `convert_regex` - Convert between dialects
- `explain_regex` - Generate human-readable explanations
- `library_list` - Browse available patterns
- `propose_pattern` - AI-assisted pattern generation
- `optimize_pattern` - Apply optimization passes

## Security & Production Ready

- No `eval()` or unsafe dynamic code execution
- Safe AST interpreter for pattern validation
- Comprehensive input validation with limits
- Tested with 473 test cases across 21 test files
- Full type safety with TypeScript

## Project Status

- ✅ Core AST engine with deterministic emission
- ✅ Multi-dialect support (JS, RE2, PCRE)
- ✅ 40+ standard library patterns
- ✅ MCP server integration (8 tools)
- ✅ Pattern optimization engine
- ✅ Comprehensive test suite
- ✅ Full documentation

## Links

- **GitHub:** https://github.com/PaulJPhilp/effect-regex
- **npm:** https://www.npmjs.com/package/effect-regex
- **Documentation:** https://github.com/PaulJPhilp/effect-regex#readme
- **Issues:** https://github.com/PaulJPhilp/effect-regex/issues

## What's Next

Future releases will include:
- Regex string → AST parsing (convert existing regexes to the builder API)
- OpenAI provider for pattern generation
- Local LLM support
- AST input for advanced use cases

## Credits

Built with [Effect](https://effect.website) - a powerful TypeScript framework for building type-safe, composable applications.

---

**effect-regex v0.5.0 is production-ready and available now.**

Give it a try: `bun install effect-regex`
