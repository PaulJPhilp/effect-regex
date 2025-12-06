# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2024-12-06

### Added

#### Core Regex Engine
- **Fluent Builder API**: Chainable methods for building regex patterns
- **Multi-Dialect Support**: Compile to JavaScript, RE2, or PCRE with automatic compatibility checks
- **AST-Based Architecture**: Deterministic pattern generation from abstract syntax tree
- **Named Capture Groups**: Full support for named groups across dialects
- **Backreferences**: Support for both named (`\k<name>`) and numbered (`\1`) backreferences
- **Assertions**: Complete lookahead/lookbehind support (positive and negative)
- **TryCapture**: Capture groups with validation metadata for better error messages
- **Pattern Optimization**: AST-based optimization passes (constant folding, quantifier simplification, character class merging, alternation deduplication)

#### Standard Pattern Library (40+ patterns)
- **General Patterns**: email, URL, UUID v4, semantic versions, phone numbers (US/international)
- **Colors**: hex, CSS named colors, RGB/RGBA, HSL/HSLA
- **Network**: IPv4, IPv6, MAC addresses, domains, hostnames
- **Dates/Times**: ISO 8601, HH:MM:SS formats
- **Numbers**: integers, floats, decimals with various formats
- **File System**: file paths, safe filenames
- **Text**: quoted strings, identifiers, alphanumeric

#### Security Patterns
- **Input Validation**: alphanumeric, safe text, whitelist/blacklist character sets
- **SQL Injection Detection**: SQL metacharacters and comment patterns
- **Path Traversal Prevention**: directory traversal attempt detection
- **PII Validation**: SSN, credit card formats (with note: validation-only, not production use)
- **Network Security**: safe URL patterns, hostname validation

#### MCP Server Integration
- **8 MCP Tools** for AI assistant integration:
  - `build_regex`: Build from standard library or CommandSpec
  - `test_regex`: Test patterns with timeout protection
  - `lint_regex`: Validate for safety and dialect compatibility
  - `convert_regex`: Convert between dialects with compatibility warnings
  - `explain_regex`: Generate AST-based explanations (stub implementation)
  - `library_list`: List and filter standard library patterns
  - `propose_pattern`: AI-assisted pattern generation from examples (Anthropic Claude)
  - `optimize_pattern`: Apply AST optimization passes
- **Modular Architecture**: Extracted from monolithic implementation (846→153 lines, -82%)
- **Input Validation**: Comprehensive validation with safety limits
- **Error Handling**: Type-safe McpError with detailed error codes

#### CLI Tools
- Pattern building from standard library
- Pattern linting and validation
- Pattern optimization
- Pattern testing with test cases
- CommandSpec-based CLI pattern generation

#### Testing & Quality
- **473 tests** across 21 test files
- **83.5% test coverage** (statements)
- **84 MCP-specific tests**: 20 E2E + 31 unit (handlers) + 33 unit (validation)
- **Effect-based testing**: Using @effect/vitest for Effect workflow testing
- **Security testing**: 45 tests for AI code interpreter safety patterns

#### Documentation
- **Comprehensive TSDoc**: Full API documentation with @module, @param, @returns, @example tags
- **README**: Complete usage guide with examples
- **Pattern Library Reference**: All 40+ patterns documented
- **MCP Setup Guide**: Integration instructions for AI assistants

### Technical Details

- **Effect Integration**: Full Effect library integration for error handling and composability
- **TypeScript**: Full type safety with type inference
- **Dialect Compatibility**: Automatic downgrade warnings when converting to limited dialects (e.g., RE2)
- **Safety Limits**: Input size constraints to prevent DoS (MAX_PATTERN_LENGTH, MAX_TEST_CASES, etc.)
- **Timeout Protection**: Pattern testing with configurable timeouts to prevent catastrophic backtracking

### Known Limitations (Deferred to Future Releases)

- **Regex String → AST Parsing**: Currently only standard library patterns can be fully explained/optimized
- **OpenAI LLM Provider**: Only Anthropic Claude implemented for `propose_pattern`
- **Local LLM Provider**: Planned Ollama/llama.cpp integration not yet implemented
- **AST Input**: `build_regex` only supports 'std' (standard library) and 'command' (CLI) types

### Dependencies

- Effect ^3.17.7
- @effect/cli ^0.69.0
- @effect/platform ^0.90.3
- @modelcontextprotocol/sdk ^0.5.0
- @anthropic-ai/sdk ^0.67.0
- TypeScript ^5.6.2
- Vitest ^4.0.3

---

## [Unreleased]

### Planned Features (P2/Post-0.5.0)

- Regex string → AST parser for arbitrary pattern analysis
- OpenAI provider for `propose_pattern` tool
- Local LLM provider (Ollama/llama.cpp)
- AST input support for `build_regex` tool
- Additional optimization passes
- Extended dialect support

---

[0.5.0]: https://github.com/PaulJPhilp/effect-regex/releases/tag/v0.5.0
