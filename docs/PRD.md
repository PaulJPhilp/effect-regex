# Product Requirements Document (PRD)
Project: effect-regex
Owner: Paul (System Architect with Coding Agent)
Date: 2025-10-18
Version: 1.0

## 1. Overview
effect-regex is a layered system for deterministic, dialect-aware regex generation, linting, testing, and explanation, optimized for CLI command parsing and AI agent use. It provides:
- A core, Effect-based fluent regex builder with an explainable AST and linting
- A standard library of vetted patterns
- A developer CLI for build/lint/explain/test operations
- An AI Toolkit to safely compose propose → test → refine loops
- An MCP server exposing these capabilities to clients
- A Claude Skill focused on command regex building

## 2. Objectives and Success Metrics
### 2.1 Objectives
- Deterministic regex synthesis across dialects (JS, RE2, PCRE-like)
- Safety: prevent catastrophic backtracking, enforce dialect constraints
- Explainability: human-readable breakdown of generated patterns
- AI-readiness: LLM-usable APIs with guardrails and test harness
- Developer utility: usable CLI and pattern library engineers adopt independently

### 2.2 Success Metrics
- Determinism: identical output patterns and capture maps across runs given same inputs
- Safety: 100% of emitted patterns pass lint "error" checks; backtracking timeouts never hang the process
- Coverage: ≥95% unit test coverage for core emit/lint; ≥90% for CLI and std
- Adoption: at least 3 canonical CLI specs (git, docker, kubectl) fully supported with passing corpora
- Latency: CLI build/lint/explain commands complete in <150 ms typical; MCP tool calls <300 ms typical for 50 test cases
- Stability: no crashes on malformed input; JSON schemas validated end to end
- AI loop: propose → test → refine reaches green within ≤3 iterations on provided corpora

## 3. Users and Use Cases
### 3.1 Users
- AI engineers and agents needing safe regex synthesis and testing
- Devs building CLI tooling or command parsers
- Security-minded engineers validating patterns for RE2/infra constraints

### 3.2 Primary Use Cases
- Generate robust regexes for CLI command parsing with semantic capture maps
- Convert and lint patterns for portability between JS and RE2
- Test patterns against corpora and detect pathological performance
- Guide an LLM to iteratively refine patterns until tests pass
- Expose capabilities via MCP/Claude Skills for interactive workflows

## 4. Scope
### 4.1 In Scope (MVP → v1)
- Core AST + fluent builder with deterministic emission
- Dialects: JS and RE2 (PCRE support flagged as "best-effort," no lookbehind for RE2)
- Lint rules for RE2-incompatible features and backtracking heuristics
- Standard library: uuidV4, semverStrict, ipv4, ipv6Compressed, quotedString, keyValue, csvList, pathSegment, filePathBasic, integer, float, isoDate, isoDateTime
- CommandSpec → regex builder with semantic captureMap
- Test runner for regex with per-case timeout
- CLI: build/lint/explain/test with JSON in/out
- MCP server: build_regex, test_regex, lint_regex, convert_regex (best-effort), explain_regex, library_{save,load,list}
- Claude Skill: "Command Regex Builder" with docs, examples, and corpora

### 4.2 Out of Scope (v1)
- Full PCRE feature parity and reliable cross-dialect auto-conversion for all constructs
- Rich AST editor UI
- Full RFC-accurate URL/Email patterns (provide pragmatic subsets only)
- Distributed pattern library registry (local-only library in v1)

## 5. Product Requirements
### 5.1 Functional Requirements

**FR-1 Core Fluent Builder**
- FR-1.1 Provide primitives: lit, raw, seq, alt, cls, group(name?), noncap, q(min,max,lazy), anchors
- FR-1.2 Deterministic emission: sort/dedupe alternations; non-capturing by default
- FR-1.3 Dialect gating: JS allows named groups/lookbehind; RE2 disallows named groups/lookbehind/backrefs; emit notes for downgrades
- FR-1.4 Lint function reporting errors/warnings with codes and messages
- FR-1.5 Explain function to produce a structured breakdown of nodes

**FR-2 Standard Library**
- FR-2.1 Export common patterns with positive/negative corpora
- FR-2.2 Document pattern intent, tradeoffs, and dialect caveats
- FR-2.3 All patterns pass lint for JS/RE2 (with notes as needed)

**FR-3 CommandSpec Builder**
- FR-3.1 Accept CommandSpec describing name, subcommands, flags, options, positionals, interleaving rules
- FR-3.2 Emit anchored pattern and captureMap keyed by semantic names: subcommand, flag_<name>, flag_<name>_value, opt_<key>_value, pos_<name>
- FR-3.3 Deterministic ordering; interleaving of flags/options; support separators "=" and space
- FR-3.4 Provide notes for dialect constraints and pattern design

**FR-4 Tester**
- FR-4.1 Execute patterns with per-case timeout; aggregate pass/fail and timings
- FR-4.2 Accept expected captures; report mismatches clearly
- FR-4.3 Provide warnings on timeouts and complexity limits

**FR-5 CLI**
- FR-5.1 Commands: build, lint, explain, test
- FR-5.2 JSON-only output with fields: pattern, notes, issues, captureMap, results
- FR-5.3 Global flags: --dialect js|re2, --anchor, --input files/stdin
- FR-5.4 Non-zero exit code on lint errors or test failures

**FR-6 MCP Server**
- FR-6.1 Tools with schemas and validation:
  - build_regex, test_regex, lint_regex, convert_regex, explain_regex, library_{save,load,list}
- FR-6.2 Enforce per-call timeouts, input size limits, and case count caps
- FR-6.3 Return structured warnings and notes; never hang or crash on bad input

**FR-7 Claude Skill**
- FR-7.1 Package with SKILL.md, guidelines, dialects, pitfalls, test-harness docs
- FR-7.2 Focused prompts for command regex synthesis and testing
- FR-7.3 Uses MCP tools; includes sample corpora for git/docker/kubectl

### 5.2 Non-Functional Requirements

**NFR-1 Determinism**
- NFR-1.1 All builders produce identical output for same inputs across runs
- NFR-1.2 Canonicalization removes redundant groups and normalizes spacing

**NFR-2 Performance**
- NFR-2.1 CLI build/lint/explain under 150 ms typical; tester under 300 ms for 50 cases
- NFR-2.2 Emission algorithm O(n log n) for alternation sorting; pattern length capped

**NFR-3 Safety**
- NFR-3.1 Lint must run on every emitted pattern; reject on error
- NFR-3.2 Limits: pattern length ≤ 20k chars; groups ≤ 200; alternation depth ≤ 10
- NFR-3.3 Tester enforces per-case timeout (default 100 ms, configurable)

**NFR-4 Quality**
- NFR-4.1 Unit test coverage: core ≥95%, std ≥95%, cli ≥90%
- NFR-4.2 Golden snapshot tests per dialect
- NFR-4.3 Property tests where feasible (semver, uuid)

**NFR-5 Security**
- NFR-5.1 No eval; no shell unless via sandbox service (not in v1)
- NFR-5.2 MCP validates JSON schemas and strips unsafe characters from logs

**NFR-6 Documentation**
- NFR-6.1 Package READMEs with API, examples, dialect tables
- NFR-6.2 CHANGELOGs per package; Conventional Commits in repo

## 6. Milestones and Deliverables
M1: Core + Std + CLI MVP (2 weeks)
- Core: AST/builder/emit/lint/explain implemented; tests and snapshots
- Std: uuidV4, semverStrict, quotedString, ipv4/6Compressed; corpora and tests
- CLI: build/lint/explain; JSON output; basic docs

M2: CommandSpec + Tester (1–2 weeks)
- buildCommandRegex with captureMap and notes
- Test runner with expected captures, timeouts
- Corpora for git/docker/kubectl; golden patterns

M3: AI Toolkit (1–2 weeks)
- proposeCommandPattern, refinePattern, runCycle
- Deterministic change logs; explanations
- Tests simulating typical agent loops

M4: MCP Server (1 week)
- Tools wired with JSON Schemas and limits
- E2E tests via stdio transport
- Docs for integration

M5: Claude Skill (1 week)
- SKILL package with docs and examples
- Validation in Desktop

## 7. Assumptions and Dependencies
- Node 20.x, TypeScript 5.6.x, Effect v3.x available
- Bun used for root workspace tooling only; PNPM for packages
- RE2 execution in v1 uses JS engine with RE2 gating; true RE2 engine may be added later
- Biome, Vitest, tsup available in CI

## 8. Risks and Mitigations
- Risk: Dialect conversion ambiguities
  - Mitigation: best-effort convert with explicit notes; avoid auto-converting unsupported features
- Risk: False negatives/positives in lint heuristics
  - Mitigation: conservative rules; allow overrides via config in later versions
- Risk: Scope creep in std library
  - Mitigation: prioritize CLI-relevant patterns first; track backlog for others
- Risk: AI tool misuse leading to unsafe patterns
  - Mitigation: enforce gating, lint-before-emit, and per-call limits; AI Toolkit restricts inputs to AST or validated strings

## 9. Open Questions
- Do we need named group support in JS emission for command-spec, or keep all semantic mapping in captureMap only? Proposed: allow named groups in JS, but always return captureMap; downgrade to numeric for RE2.
- Add node-re2 or re2-wasm for true RE2 execution in tester? Proposed: backlog for post-v1, keep gating + notes now.
- Library persistence format: JSON with semver and metadata in a local folder? Proposed: yes for v1.

## 10. Acceptance Criteria (v1 Release)
- CLI can build/lint/explain/test uuid/semver/quoted and command-spec patterns with deterministic output
- buildCommandRegex produces stable patterns and captureMap for git/docker/kubectl specs
- Lint errors block emission; warnings/notes included in output
- MCP server exposes all tools; basic E2E happy paths pass; timeouts enforced
- Claude Skill demo successfully synthesizes and tests a pattern for a provided command spec using the MCP server

## Appendix A: Data Schemas (summaries)
**CommandSpec**
- name: string
- subcommands?: string[]
- flags?: { name: string; short?: string; takesValue?: boolean; valuePattern?: string; repeatable?: boolean }[]
- options?: { key: string; short?: string; valuePattern: string; required?: boolean; repeatable?: boolean; separator?: "=" | " " }[]
- positionals?: { name: string; pattern?: string; optional?: boolean; repeatable?: boolean }[]
- allowInterleaving?: boolean

**BuildRegexOutput**
- pattern: string
- captureMap: Record<string, number | number[]>
- notes: string[]

**TestRegexInput**
- dialect: "js" | "re2" | "pcre"
- pattern: string
- cases: { input: string; shouldMatch: boolean; expectedCaptures?: Record<string, string | string[]> }[]
- timeoutMs?: number

**TestResult**
- total: number
- passed: number
- failures: { caseIndex: number; reason: string; gotCaptures?: Record<string, string | string[]> }[]
- timingMs: number
- warnings?: string[]

## Appendix B: Coding Rules
- Enforce the strict coding rules already defined: TypeScript strict, Effect services, determinism, lint, tests, CLI JSON output, MCP schemas, limits, CI gates.

If you want, I can generate:
- JSON Schemas for all MCP tools
- The initial three CommandSpec definitions (git commit, docker run, kubectl get) and golden patterns
- A GitHub Actions CI workflow enforcing build/lint/test across all packages</content>
</xai:function_call: MXMgY29tcGxldGUgUkQgb2YgdGhlIGVmZmVjdC1yZWdleCBwcm9qZWN0IGJhc2VkIG9uIHRoZSBQUkQuIEl0J3MgYSBjb21wcmVoZW5zaXZlIGRvY3VtZW50IHRoYXQgZGVmaW5lcyBhIGxheWVyZWQgcmVnZXggc3lzdGVtIGZvciBkZXRlcm1pbmlzdGljLCBkaWFsZWN0LWF3YXJlIHJlZ2V4IGdlbmVyYXRpb24sIGxpbnRpbmcsIHRlc3RpbmcsIGFuZCBleHBsYW5hdGlvbi4gTGV0IG1lIGtub3cgaWYgeW91IGhhdmUgcXVlc3Rpb25zIGFib3V0IGl0IG9yIGlmIHlvdSdkIGxpa2UgbWUgdG8gZ2VuZXJhdGUgdGhlIHRocmVlIHRoaW5ncyB5b3UgbWVudGlvbmVkIGF0IHRoZSBlbmQhIENhbiBJIGFsc28gaGVscCB5b3Ugc3RhcnQgaW1wbGVtZW50aW5nIGl0Pw==
