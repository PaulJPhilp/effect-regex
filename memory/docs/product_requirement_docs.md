# Product Requirements Document: effect-regex

## 1. Project Vision

effect-regex is a **deterministic regex generation, linting, and explanation toolkit** built with the Effect framework. It addresses the critical challenges in regex development: unpredictability, maintainability, dialect compatibility, and correctness verification.

## 2. Problem Statement

### Core Problems Solved

1. **Non-deterministic Regex Generation**: Traditional string-based regex construction leads to inconsistent results, making testing and debugging difficult.

2. **Dialect Compatibility Issues**: Different regex engines (JS, RE2, PCRE) have incompatible features, causing patterns to break across environments.

3. **Lack of Composability**: Building complex patterns from smaller, tested components is error-prone without proper abstractions.

4. **Testing Complexity**: Regex patterns are notoriously difficult to test comprehensively, with edge cases often missed.

5. **Pattern Explanation**: Understanding existing regex patterns requires manual analysis and deep expertise.

## 3. Core Requirements

### 3.1 Functional Requirements

#### FR1: AST-Based Pattern Construction
- **MUST** provide an Abstract Syntax Tree representation for regex patterns
- **MUST** ensure deterministic emission (same AST always produces same regex)
- **MUST** support all common regex constructs (literals, sequences, alternations, groups, quantifiers, anchors, character classes)

#### FR2: Fluent Builder API
- **MUST** provide a chainable, type-safe API for building patterns
- **MUST** support method chaining for common operations (`.then()`, `.or()`, `.optional()`, `.oneOrMore()`, etc.)
- **MUST** allow composition of smaller patterns into larger ones

#### FR3: Multi-Dialect Support
- **MUST** support JS, RE2, and PCRE dialects
- **MUST** detect and warn about dialect-specific features
- **MUST** gate incompatible features (e.g., backreferences in RE2)
- **SHOULD** provide dialect conversion where possible

#### FR4: Standard Library of Vetted Patterns
- **MUST** provide CLI-focused patterns (Tier 1): quotedString, keyValue, pathSegment, filePathBasic, csvList, integer
- **MUST** provide advanced patterns (Tier 2): uuidV4, semverStrict
- **MUST** provide utility patterns (Tier 3): ipv4, ipv6Compressed, float, isoDate, isoDateTime
- **MUST** include examples and documentation for each pattern

#### FR5: Pattern Testing Framework
- **MUST** support test cases with positive and negative examples
- **MUST** detect catastrophic backtracking with timeout protection
- **MUST** provide detailed test results with failure information
- **MUST** support multiple dialects (js, re2, re2-sim)

#### FR6: Pattern Linting
- **MUST** validate regex syntax
- **MUST** detect dialect incompatibilities
- **MUST** provide severity levels (error, warning, info)
- **MUST** return structured lint results

#### FR7: Pattern Explanation
- **MUST** analyze and explain regex structure
- **SHOULD** provide human-readable descriptions of pattern behavior
- **SHOULD** highlight potential issues and edge cases

#### FR8: CommandSpec Builder
- **MUST** generate regexes from CLI command specifications
- **MUST** support flags, options, and arguments
- **MUST** produce semantic capture maps for extraction
- **MUST** support validation of command structures

#### FR9: AI-Assisted Development
- **MUST** provide propose → test → refine loop
- **MUST** analyze test failures and suggest refinements
- **MUST** support iterative pattern improvement
- **SHOULD** integrate with external AI services for pattern generation

#### FR10: CLI Interface
- **MUST** provide `build-pattern` command for standard library patterns
- **MUST** provide `lint` command for pattern validation
- **MUST** provide `explain` command for pattern analysis
- **MUST** provide `test` command for pattern testing
- **MUST** output JSON for programmatic integration

### 3.2 Non-Functional Requirements

#### NFR1: Type Safety
- **MUST** be fully type-safe with TypeScript
- **MUST** leverage Effect's type system for error handling
- **MUST** provide compile-time guarantees where possible

#### NFR2: Performance
- **MUST** complete pattern emission in <10ms for typical patterns
- **MUST** protect against catastrophic backtracking with 100ms default timeout
- **SHOULD** handle complex patterns efficiently

#### NFR3: Maintainability
- **MUST** follow Effect best practices
- **MUST** maintain clear separation of concerns (AST, builder, emitter, linter, tester)
- **MUST** include comprehensive tests
- **MUST** document all public APIs

#### NFR4: Extensibility
- **MUST** support adding new standard library patterns
- **MUST** allow custom dialect definitions
- **SHOULD** provide plugin architecture for extending functionality

## 4. Success Criteria

### Phase 1 (M1) - Complete ✅
- Core AST types and constructors
- Fluent builder API with chaining
- Basic dialect support (JS, RE2, PCRE)
- Standard library Tier 1 patterns
- CLI MVP with build-pattern and lint commands

### Phase 2 (M2) - Complete ✅
- CommandSpec builder for CLI parsing
- Pattern tester with corpora support
- Standard library Tier 2/3 patterns
- Enhanced linting with dialect checks
- Explain command for pattern analysis
- AI toolkit skeleton (propose/test/refine)

### Phase 3 (M3) - Planned
- MCP (Model Context Protocol) server integration
- Advanced AI pattern generation
- Pattern optimization engine
- Interactive pattern debugging
- Documentation generator
- VS Code extension

## 5. Target Users

### Primary Users
1. **CLI Tool Developers**: Building command-line applications that need robust input parsing
2. **Backend Engineers**: Validating inputs, parsing logs, processing text data
3. **DevOps Engineers**: Writing log parsers, monitoring tools, automation scripts

### Secondary Users
4. **Data Engineers**: Processing and extracting structured data from text
5. **Security Engineers**: Building input validation and detection rules
6. **AI/ML Engineers**: Preprocessing text data with reliable patterns

## 6. Out of Scope

The following are explicitly out of scope for the current version:

1. **Regex Parsing**: Converting existing regex strings to AST (may be added later)
2. **Full PCRE Feature Set**: Only core PCRE features that overlap with JS/RE2
3. **Visual Pattern Builder**: GUI for constructing patterns
4. **Real-time Performance Optimization**: Advanced optimization techniques
5. **Distributed Pattern Testing**: Running tests across multiple machines

## 7. Dependencies

### Core Dependencies
- **Effect** (^3.17.7): Functional programming framework
- **@effect/cli** (^0.69.0): CLI framework
- **@effect/platform** (^0.90.3): Platform abstractions
- **TypeScript** (^5.6.2): Type system

### Build & Test
- **Vitest** (^3.2.0): Testing framework
- **tsup** (^8.2.4): Build tool
- **Bun**: Package manager and runtime

## 8. Milestones & Timeline

| Milestone | Target | Status |
|-----------|--------|--------|
| M1: Core Foundation | Complete | ✅ Done |
| M2: Advanced Features | Complete | ✅ Done |
| M3: AI & Integration | Q1 2025 | 🔄 In Planning |

## 9. Risk Assessment

### Technical Risks
1. **Catastrophic Backtracking**: Mitigated by timeout protection and RE2 dialect
2. **Dialect Incompatibilities**: Mitigated by AST gating and validation
3. **Performance Issues**: Mitigated by deterministic emission and caching

### Process Risks
1. **Scope Creep**: Controlled by clear milestone definitions
2. **API Stability**: Managed through semantic versioning and deprecation notices
3. **Test Coverage**: Addressed by comprehensive test suite with corpora

## 10. Approval & Sign-off

This PRD establishes the foundation for effect-regex development. All implementation work must align with these requirements and success criteria.
