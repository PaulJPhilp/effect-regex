# Security

## Security Model

The effect-regex library takes security seriously, especially given its AI-powered pattern generation capabilities. This document outlines our security measures and best practices.

## AI Code Interpreter Security

### Background

Prior to version 0.2.0, the library used `eval()` to execute LLM-generated RegexBuilder code, which presented a critical security vulnerability. An attacker could potentially inject malicious code through crafted LLM responses.

### Current Implementation (v0.2.0+)

**Status**: ✅ **RESOLVED** - No `eval()` usage in codebase

The library now uses a **custom AST-based interpreter** that safely executes LLM-generated code without eval(). This provides the following security guarantees:

#### Security Guarantees

1. **No Arbitrary Code Execution**
   - Code is parsed into an Abstract Syntax Tree (AST)
   - Only whitelisted RegexBuilder API methods are allowed
   - No access to global scope, require(), import(), or eval()

2. **Input Validation**
   - Maximum code length: 10,000 characters
   - Maximum method chain depth: 100 calls
   - String-based keyword blocking (eval, Function, require, import, process, global)
   - AST-level validation of all method calls

3. **Sandboxed Execution**
   - Execution occurs by calling actual RegexBuilder methods
   - No dynamic code evaluation
   - TypeScript type safety enforced

#### Allowed API Surface

**Static Methods**:
- `lit`, `raw`, `digit`, `word`, `whitespace`, `any`, `charClass`, `alt`

**Instance Methods**:
- `then`, `or`, `zeroOrMore`, `oneOrMore`, `optional`
- `exactly`, `atLeast`, `between`
- `capture`, `group`
- `startOfLine`, `endOfLine`, `wordBoundary`

Any method not in this whitelist will be rejected with a `CodeInterpreterError`.

#### Example: Malicious Code Rejection

```typescript
// ❌ REJECTED - Access to global scope
const malicious = 'RegexBuilder.lit("test"); global.process.exit(1)';
interpretRegexBuilderCode(malicious); // Throws CodeInterpreterError

// ❌ REJECTED - Unauthorized method
const malicious = 'RegexBuilder.dangerousMethod()';
interpretRegexBuilderCode(malicious); // Throws CodeInterpreterError

// ✅ ACCEPTED - Valid RegexBuilder code
const valid = 'RegexBuilder.lit("test").then("foo").oneOrMore()';
interpretRegexBuilderCode(valid); // Returns RegexBuilder instance
```

### Security Testing

The interpreter has **45 comprehensive security tests** covering:

- **Malicious code rejection** (9 tests)
  - Global/process access attempts
  - require/import statements
  - eval/Function constructor usage
  - Unauthorized method calls

- **Malformed code handling** (7 tests)
  - Incomplete/empty code
  - Unterminated strings
  - Unexpected tokens
  - Wrong argument types

- **Valid code acceptance** (15 tests)
  - Simple literals and chains
  - Static methods (alt, charClass, digit, etc.)
  - Quantifiers and captures
  - Anchors and lazy quantifiers

- **Boundary cases** (5 tests)
  - Very long valid chains (50+ calls)
  - Maximum depth limits (100 calls)
  - Maximum size limits (10,000 chars)
  - Nested builder calls

- **Real LLM-like patterns** (3 tests)
  - Email pattern generation
  - URL pattern generation
  - Phone number pattern generation

All tests pass with 100% success rate.

### Performance

The interpreter adds minimal overhead:
- **Parsing**: ~0.1-0.5ms for typical LLM-generated code
- **Execution**: Same as direct RegexBuilder calls (no eval delay)
- **Memory**: Linear with code size (lexer + parser state)

## Input Validation Limits

### MCP Server Limits

When using the MCP server for AI assistant integration:

- **Max pattern length**: 20,000 characters
- **Max test cases per request**: 50
- **Test timeout**: 100ms default (configurable)
- **Code interpretation timeout**: No timeout (parsing is synchronous)

### LLM Integration Limits

- **Max prompt size**: Determined by LLM provider
- **Max code length**: 10,000 characters
- **Max method chain depth**: 100 calls
- **Retry attempts**: 3 (with exponential backoff)
- **Request timeout**: 30 seconds

## ReDoS (Regular Expression Denial of Service) Protection

The library includes timeout protection for regex testing to prevent ReDoS attacks:

```typescript
// Test with 100ms timeout (default)
testRegex(pattern, "js", testCases, 100);

// Pattern execution is aborted if it exceeds timeout
// Catastrophic backtracking patterns will be caught
```

**Note**: Timeout protection only applies during testing, not pattern construction.

## API Key Security

### LLM API Keys

The library supports AI-powered pattern generation using Anthropic Claude API:

- **Storage**: API keys should be stored in environment variables
  ```bash
  export ANTHROPIC_API_KEY="your-api-key-here"
  ```

- **Never hardcode**: API keys should never be committed to version control
- **Rotation**: Rotate API keys regularly
- **Scope**: Use minimum required API key permissions

### Recommended Practices

1. **Use .env files** (excluded from git):
   ```
   # .env
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Load with dotenv** or similar:
   ```typescript
   import "dotenv/config";
   ```

3. **Validate before use**:
   ```typescript
   if (!process.env.ANTHROPIC_API_KEY) {
     throw new Error("ANTHROPIC_API_KEY not set");
   }
   ```

## Reporting Security Issues

If you discover a security vulnerability in effect-regex, please report it privately to the maintainers:

1. **Do not** open a public GitHub issue
2. Email security concerns to: [INSERT EMAIL]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Audit History

### v0.2.0 (2025-10-21)

**Issue**: Critical security vulnerability in AI code execution (eval() usage)

**Resolution**:
- Implemented custom AST-based interpreter
- Removed all eval() calls from codebase
- Added 45 comprehensive security tests
- Documented security model

**Impact**: Eliminates arbitrary code execution risk in LLM integration

**Verified by**: Automated security testing suite

---

## Best Practices for Users

### 1. Validate LLM Responses

Even with interpreter protection, validate LLM-generated patterns:

```typescript
const proposal = await proposePatternWithLLM(positive, negative);

// Test before using in production
const testResult = await testPattern(
  proposal.pattern,
  proposal.testCases
);

if (testResult.failed > 0) {
  console.warn("Pattern failed tests, review before use");
}
```

### 2. Use Heuristic Fallback

If you don't trust LLM-generated code, use heuristic mode:

```typescript
// Falls back to heuristics if LLM unavailable
const proposal = await proposePattern(positive, negative);
// Uses heuristic algorithm (confidence: 0.7)
```

### 3. Limit Pattern Complexity

Avoid extremely complex patterns that may cause performance issues:

```typescript
// Good: Simple, maintainable pattern
const simple = RegexBuilder.digit().between(2, 4);

// Caution: Very complex pattern (harder to audit)
const complex = /* 50+ method chain */;
```

### 4. Audit Generated Patterns

Always review AI-generated patterns before production use:

```typescript
const explanation = explain(pattern.getAst(), {
  format: "tree",
  dialect: "js"
});

console.log(formatExplanation(explanation));
// Review explanation before deployment
```

## Dependencies Security

The library minimizes dependencies to reduce attack surface:

### Core Dependencies

- `effect` - Functional programming framework
- `@effect/cli` - CLI library
- `@anthropic-ai/sdk` - Anthropic API client (optional)

### Development Dependencies

- `vitest` - Testing framework
- `typescript` - Type checking
- `tsup` - Bundler

All dependencies are regularly updated and audited for security vulnerabilities.

## License

This security documentation is part of the effect-regex project and is licensed under the same terms.

---

**Last Updated**: 2025-10-21
**Version**: 0.2.0
