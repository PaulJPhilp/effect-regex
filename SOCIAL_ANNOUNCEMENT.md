# Social Media Announcements

## Twitter/X

### Main Announcement

🎉 Introducing **effect-regex** v0.6.0 - Type-safe regex builder for TypeScript

Build patterns with a fluent API that compiles to multiple dialects (JS, RE2, PCRE). 40+ standard patterns. MCP server integration for AI assistants. Production-ready.

🔗 <https://github.com/PaulJPhilp/effect-regex>
📦 <https://www.npmjs.com/package/effect-regex>

# TypeScript #Regex #Effect #RegexBuilder

---

### Technical Thread

1/ We just released **effect-regex** - a type-safe regex composition library for TypeScript built on the Effect framework. Inspired by Swift's Regex Builder pattern, but for TypeScript.

Stop writing raw regex strings. Build patterns with a fluent API that's composable, testable, and type-safe.

2/ Features:
✅ Multi-dialect support (JS, RE2, PCRE)
✅ 40+ standard patterns
✅ Fluent builder API
✅ Pattern optimization
✅ 473 tests, 83.5% coverage
✅ MCP server integration

3/ Before:
```
const pattern = /^[a-z]+@[a-z]+\.[a-z]{2,}$/i;
```

After:
```
const pattern = Regex.sequence(
  Regex.chars('a-z'),
  Regex.lit('@'),
  Regex.chars('a-z'),
  Regex.lit('.'),
  Regex.range('a', 'z').min(2)
);
```

4/ Multi-dialect compilation means write once, use everywhere:

```
pattern.toStringJS()    // JavaScript regex
pattern.toStringRE2()   // RE2 regex  
pattern.toStringPCRE()  // PCRE regex
```

5/ Pre-built standard library patterns for common use cases: email, URL, UUID, IPv4, IPv6, phone numbers, dates, times, and security patterns (SQL injection detection, path traversal prevention)

6/ MCP server integration with Claude & Cline:

- Pattern building & testing
- Dialect conversion
- AI-powered pattern generation
- AST optimization

7/ Production-ready with:

- Type safety throughout
- No eval() or unsafe code execution
- Comprehensive input validation
- 473 tests across 21 test files
- Full TypeScript documentation

Get started: `bun install effect-regex`

Docs: <https://github.com/PaulJPhilp/effect-regex>

---

## LinkedIn

**Announcing effect-regex v0.6.0 - Type-Safe Regex Builder for TypeScript**

I'm excited to announce the public release of effect-regex, a production-ready library that brings type safety and composability to regular expression building in TypeScript.

**The Problem**
Regular expressions are powerful but error-prone. Raw regex strings lack IDE support, are hard to test, and don't compose well. Switching between JS, RE2, and PCRE requires rewriting patterns.

**The Solution**
effect-regex provides a fluent, type-safe API for pattern composition:

- **Fluent Builder API** - Chainable methods for intuitive pattern building
- **Multi-Dialect Support** - Compile to JavaScript, RE2, or PCRE
- **Standard Library** - 40+ vetted patterns (email, UUID, IPv4, security patterns)
- **Optimization Engine** - Automatic pattern optimization with 4 AST passes
- **MCP Integration** - 8 tools for AI assistants like Claude
- **Comprehensive Testing** - 473 tests with 83.5% coverage

**Why It Matters**
Type safety in regex means fewer runtime errors. Pattern reusability across dialects means less code duplication. And the standard library means you get battle-tested patterns out of the box.

Built on the Effect framework for elegant async workflows and composable error handling.

**Get Started**
```
bun install effect-regex
```

Check out the repository: <https://github.com/PaulJPhilp/effect-regex>

---

## Dev.to / Blog Post

See RELEASE_ANNOUNCEMENT.md for full blog post version

---

## Discord / Community

Hey everyone! 👋

**effect-regex v0.5.0 is now live!**

This is a type-safe regex builder for TypeScript that lets you compose patterns with a fluent API instead of writing raw regex strings.

Key highlights:

- 🎯 Multi-dialect support (JS, RE2, PCRE)
- 🔧 Fluent builder API
- 📦 40+ standard patterns
- 🤖 MCP server with 8 tools
- ⚡ Pattern optimization engine
- 🧪 473 tests, 83.5% coverage

Built with Effect framework for type safety and composability.

**Get it:** `bun install effect-regex`
**Repo:** <https://github.com/PaulJPhilp/effect-regex>
**Docs:** <https://github.com/PaulJPhilp/effect-regex#readme>

Would love your feedback! 🚀
