# Active Context: effect-regex

**Last Updated**: 2025-10-18
**Current Phase**: M2 Complete → M3 Planning
**Active Focus**: MCP Server Implementation Planning

---

## Current Work Focus

### Primary Objective: MCP Server Implementation (Task 3.1)

The immediate priority is completing the MCP (Model Context Protocol) server implementation to enable AI assistant integration. This will unlock advanced AI-powered pattern development capabilities.

**Status**: In Planning Phase
**Target Completion**: 2025-02-15
**Priority**: P0 (Blocker for M3)

---

## Recent Changes (Last 30 Days)

### 2025-02-01: M2 Milestone Complete
**Summary**: Successfully completed all M2 advanced features

**Key Achievements**:
1. ✅ Implemented AI toolkit skeleton with propose → test → refine loop
2. ✅ Added pattern explainer framework (basic implementation)
3. ✅ Enhanced linting with dialect compatibility checks
4. ✅ Completed standard library Tier 2 (uuidV4, semverStrict) and Tier 3 (ipv4, ipv6Compressed, float, isoDate, isoDateTime)
5. ✅ Built comprehensive pattern tester with timeout protection and corpora support
6. ✅ Implemented CommandSpec builder for CLI parsing

**Files Modified**:
- `src/ai/toolkit.ts`: AI development loop (proposePattern, testPattern, analyzeAndRefine, developPattern)
- `src/core/explainer.ts`: Pattern explanation skeleton
- `src/core/linter.ts`: Enhanced linting with dialect checks
- `src/std/patterns.ts`: Added 7 new patterns (Tier 2 & 3)
- `src/core/tester.ts`: Complete test framework with timeout protection
- `src/command/command-spec.ts`: CommandSpec builder
- `src/Cli.ts`: Added explain and test commands
- `test/corpora/`: Test data for all standard library patterns

**Test Coverage**: 88% overall (up from 85% in M1)

---

### 2025-01-25: Enhanced Linting Complete
**Summary**: Implemented comprehensive linting with dialect validation

**Changes**:
- Syntax validation via RegExp constructor
- Dialect compatibility checks (gating backreferences in RE2, etc.)
- Performance issue detection (nested quantifiers, backtracking potential)
- Structured lint results with severity levels (error, warning, info)
- Integration with CLI `lint` command

**Impact**: Users can now validate patterns before deployment, catching dialect issues early

---

### 2025-01-22: Standard Library Tier 2/3 Complete
**Summary**: Added 7 advanced and utility patterns

**New Patterns**:
- **Tier 2**: uuidV4, semverStrict
- **Tier 3**: ipv4, ipv6Compressed, float, isoDate, isoDateTime

**Notes**:
- All patterns tested with comprehensive corpora
- Some patterns (uuidV4, ipv6Compressed) use simplified implementations (see Known Issues in tasks_plan.md)
- Added to STANDARD_PATTERNS registry with examples

---

### 2025-01-18: Pattern Tester & Corpora
**Summary**: Built robust testing framework with timeout protection

**Features**:
- Positive/negative test cases
- Expected capture validation
- Timeout protection (default 100ms) for catastrophic backtracking
- Dialect support (js, re2, re2-sim)
- Detailed failure reporting
- CLI `test` command

**Corpora**:
- Created `test/corpora/` directory
- Test data for all Tier 1 patterns
- Real-world examples and edge cases

---

### 2025-01-12: CommandSpec Builder
**Summary**: Implemented regex generation from CLI specifications

**Use Case**: CLI parsers need to extract structured data from command invocations

**Features**:
- Parse command syntax definitions
- Generate regex matching command structure
- Semantic capture maps (flags, options, arguments)
- Integration with RegexBuilder

**Example**:
```typescript
const spec = parseCommandSpec("git commit -m <message> [--author <name>]");
const pattern = buildCommandRegex(spec);
// Pattern matches: git commit -m "Initial commit" --author "John Doe"
// Capture map: { message: "Initial commit", author: "John Doe" }
```

---

## Active Decisions & Considerations

### Decision 1: MCP Server Implementation Strategy
**Status**: Under Consideration
**Decision Deadline**: 2025-02-05

**Context**:
The MCP server needs to expose 5 tools (build-pattern, test-pattern, lint-pattern, explain-pattern, propose-pattern) via the Model Context Protocol for AI assistant integration.

**Options**:

**Option A: Thin Wrapper Approach**
- MCP server as thin wrapper over existing core functions
- Tool handlers directly call core engine (emit, testRegex, lint, etc.)
- Minimal duplication, fast implementation

**Pros**:
- Quick to implement (~3 days)
- Reuses all existing logic
- Easy to maintain consistency

**Cons**:
- Limited MCP-specific features
- May require awkward JSON serialization
- Less flexibility for MCP optimizations

**Option B: Dedicated MCP Layer**
- Create MCP-specific service layer
- Transform core types to MCP-friendly formats
- Add MCP-specific features (streaming, progress, etc.)

**Pros**:
- Better separation of concerns
- Easier to add MCP-specific features later
- Cleaner API boundaries

**Cons**:
- Longer implementation (~1 week)
- More code to maintain
- Risk of duplication

**Current Lean**: Option A (thin wrapper) for M3, refactor to Option B post-1.0 if needed

**Next Step**: Implement prototype with Option A, evaluate during testing

---

### Decision 2: AI Pattern Generation LLM Selection
**Status**: Under Consideration
**Decision Deadline**: 2025-02-20

**Context**:
Task 3.2 (Advanced AI Generation) requires integration with external LLM APIs for pattern generation.

**Options**:

**Option A: Multi-Provider Support**
- Support OpenAI, Anthropic, local LLMs
- User configures preferred provider via env vars
- Unified interface for all providers

**Pros**:
- Flexibility for users
- Cost optimization (use cheaper providers)
- Resilience (fallback to other providers)

**Cons**:
- More complex implementation
- Testing overhead (need to test all providers)
- API key management complexity

**Option B: Single Provider (Anthropic)**
- Focus on Claude for best results
- Simpler implementation
- Easier to optimize prompts

**Pros**:
- Faster implementation
- Better prompt optimization
- Aligned with project (already using Claude Code)

**Cons**:
- Vendor lock-in
- Limited user choice
- Potential cost concerns

**Current Lean**: Option B (Anthropic only) for M3, add multi-provider in post-1.0

**Next Step**: Research Claude API pricing and rate limits

---

### Decision 3: Documentation Generator Scope
**Status**: Open
**Decision Deadline**: 2025-03-10

**Context**:
Task 3.5 (Documentation Generator) needs scope definition.

**Questions**:
1. Should we generate API docs from TSDoc? (TypeDoc integration)
2. Should we generate interactive examples? (MDX, Jupyter-style)
3. Should we generate visual diagrams? (Mermaid, Graphviz)
4. What's the target audience? (developers, end-users, both)

**Next Step**: Define requirements document for doc generator

---

## Next Steps (Immediate Actions)

### Week of 2025-02-05

#### Priority 1: MCP Server Implementation (Task 3.1) - CRITICAL
**Goal**: Complete basic MCP server with all 5 tools

**Action Items**:
1. [ ] Finalize MCP implementation strategy (Decision 1)
2. [ ] Implement tool: `build-pattern` (lookup standard library)
3. [ ] Implement tool: `test-pattern` (run test cases)
4. [ ] Implement tool: `lint-pattern` (validate patterns)
5. [ ] Implement tool: `explain-pattern` (pattern analysis)
6. [ ] Implement tool: `propose-pattern` (AI generation via heuristics)
7. [ ] Add tool schemas with Effect Schema
8. [ ] Configure stdio transport

**Deliverables**:
- Functional MCP server (src/mcp/server.ts)
- 5 working tools
- Tool schemas defined

**Time Estimate**: 5-7 days

---

#### Priority 2: MCP Integration Testing
**Goal**: Verify MCP server works with real clients

**Action Items**:
1. [ ] Write integration tests (test/mcp-e2e.test.ts)
2. [ ] Test with Claude desktop (manual)
3. [ ] Test with Cline MCP client (manual)
4. [ ] Document setup process in README.md
5. [ ] Create example MCP configurations (claude_desktop_config.json, etc.)

**Deliverables**:
- Passing integration tests
- Setup documentation
- Example configurations

**Time Estimate**: 3-4 days

---

#### Priority 3: Documentation Updates
**Goal**: Reflect M2 completion and M3 planning

**Action Items**:
1. [x] Update memory files (product_requirement_docs.md, architecture.md, technical.md, tasks_plan.md, active_context.md)
2. [ ] Update README.md with M2 features
3. [ ] Add MCP setup guide
4. [ ] Document standard library patterns (examples, use cases)
5. [ ] Update AGENTS.md with MCP development guidelines

**Deliverables**:
- Updated memory files (DONE)
- Enhanced README.md
- MCP setup guide
- Standard library reference

**Time Estimate**: 2-3 days

---

### Week of 2025-02-12

#### Priority 1: AI Generation Research (Task 3.2 Prep)
**Goal**: Prepare for advanced AI pattern generation

**Action Items**:
1. [ ] Research Claude API (pricing, rate limits, best practices)
2. [ ] Design prompt templates for pattern generation
3. [ ] Create evaluation dataset (examples with ground truth patterns)
4. [ ] Prototype LLM integration (basic)
5. [ ] Compare Claude vs. heuristic-based generation

**Deliverables**:
- LLM API research document
- Prompt templates (draft)
- Evaluation dataset
- Prototype implementation

**Time Estimate**: 4-5 days

---

#### Priority 2: Standard Library Refinement
**Goal**: Address known issues in standard library patterns

**Action Items**:
1. [ ] Review uuidV4 pattern (use proper hex ranges, not literal placeholder)
2. [ ] Review ipv6Compressed pattern (add missing compression variants)
3. [ ] Expand test corpora with edge cases
4. [ ] Document known limitations
5. [ ] Add validation tests

**Deliverables**:
- Improved uuidV4 and ipv6Compressed patterns
- Expanded corpora
- Documentation updates

**Time Estimate**: 2-3 days

---

## Blockers & Dependencies

### Blocker 1: MCP Testing Requires Manual Setup
**Issue**: MCP integration tests require manual configuration with Claude desktop or Cline

**Impact**: Slows down testing cycle, harder to automate

**Mitigation**:
- Create Docker environment for MCP testing
- Mock MCP client for automated tests
- Document manual testing procedures

**Status**: Planning workaround

---

### Blocker 2: AI Generation Requires LLM API Keys
**Issue**: Task 3.2 requires access to Claude API (or other LLM APIs)

**Impact**: Cannot complete advanced AI generation without API access

**Mitigation**:
- Set up API key management (env vars, config file)
- Implement API key validation and error handling
- Document API setup in README

**Status**: Will address in Week of 2025-02-12

---

### Dependency 1: Effect Ecosystem Updates
**Issue**: Frequent updates to Effect packages may introduce breaking changes

**Impact**: Build breaks, refactoring required

**Mitigation**:
- Pin dependency versions in package.json
- Regular update cycles with testing
- Monitor Effect release notes

**Status**: Monitoring (no issues currently)

---

## Open Questions

### Question 1: Should MCP Server Support Streaming?
**Context**: MCP protocol supports streaming responses for long-running operations

**Relevance**: Pattern testing/generation could benefit from streaming progress updates

**Options**:
- Yes: Implement streaming for test/propose tools
- No: Return final results only (simpler)

**Next Step**: Research MCP streaming examples, evaluate complexity

---

### Question 2: How to Handle Large Test Corpora in MCP?
**Context**: Test corpora can be large (100+ cases). MCP has message size limits.

**Options**:
- A: Send test cases in chunks (streaming)
- B: Reference corpora by name (server loads from disk)
- C: Compress test cases (gzip, etc.)

**Next Step**: Test MCP message size limits, prototype solutions

---

### Question 3: Should We Support Regex Parsing (String → AST)?
**Context**: Out of scope for M3, but frequently requested feature

**Options**:
- Defer to post-1.0 (current plan)
- Add basic parsing in M3 (simple patterns only)
- Community contribution (document extension point)

**Next Step**: Gather user feedback, assess demand

---

## Recent Learnings & Insights

### Learning 1: Effect.gen vs. Pipe
**Insight**: Effect.gen is more readable for complex flows, pipe better for simple transformations

**Application**:
- Use Effect.gen for CLI commands (multi-step, branching logic)
- Use pipe for core engine (single-pass transformations)

**Source**: M2 implementation experience

---

### Learning 2: Test Corpora Are Critical
**Insight**: Comprehensive test corpora catch subtle pattern bugs that unit tests miss

**Application**:
- Prioritize corpora creation for all new patterns
- Use real-world examples, not just synthetic cases
- Cover edge cases (empty strings, Unicode, etc.)

**Source**: Standard library Tier 2/3 testing

---

### Learning 3: Timeout Protection Is Essential
**Insight**: Catastrophic backtracking is a real risk, timeout protection saves users from hangs

**Application**:
- Default 100ms timeout for all tests
- Warn users about timeout hits
- Recommend RE2 dialect for production

**Source**: Pattern tester implementation

---

### Learning 4: AI-Generated Patterns Need Human Review
**Insight**: Heuristic-based pattern generation works for simple cases but struggles with complex requirements

**Application**:
- Confidence scoring is critical
- Always require user review/approval
- Iterative refinement is key (not one-shot)

**Source**: AI toolkit skeleton implementation

---

## Monitoring & Metrics

### Current Metrics (as of 2025-02-01)

**Test Coverage**:
- Overall: 88%
- Core engine (AST, builder, emitter): 95%
- Standard library: 100%
- CLI: 85%
- AI toolkit: 80%
- MCP server: 0% (not implemented)

**Performance**:
- Average emission time: <5ms (target: <10ms) ✅
- Average test execution: 2ms per case (excluding timeout cases)
- Max pattern complexity handled: 50+ AST nodes

**Standard Library**:
- Total patterns: 13
- Tier 1: 6 patterns
- Tier 2: 2 patterns
- Tier 3: 5 patterns
- Dialect compatibility: 100% universal (no dialect-specific patterns yet)

**Known Issues**:
- Open bugs: 4 (see tasks_plan.md)
- Critical: 0
- High: 1 (MCP server untested)
- Medium: 2 (explainer incomplete, pattern validation issues)
- Low: 1 (missing regex parser)

---

## Team Context

**Project Status**: Solo development (AI-assisted)
**Development Velocity**: ~15-20 hours/week
**Current Sprint**: M3 Planning (Feb 1-15, 2025)
**Next Milestone**: M3 Complete (Target: April 5, 2025)

**Communication Channels**:
- GitHub Issues: Bug reports, feature requests
- Memory Files: Architecture decisions, task tracking
- Git Commits: Development progress

---

## Environment & Tooling

**Active Development Environment**:
- OS: macOS (Darwin 24.6.0)
- Node: 22.x
- Bun: Latest
- pnpm: 10.14.0
- Editor: VS Code (assumed, .vscode/ config present)
- Git: 2.x

**Active Git Branch**: `main`
**Uncommitted Changes**: Multiple (see git status in project context)

**Recent Workflow Changes**:
- Added `.github/workflows/ci.yml` for continuous integration
- Added Husky git hooks (`.husky/`)
- Configured Biome (`.biomeignore`, `.editorconfig`)

---

## Context for Next Session

**Where We Left Off**:
- M2 milestone successfully completed (2025-02-01)
- Memory files created/updated (2025-10-18)
- MCP server skeleton exists but needs implementation
- Planning phase for M3 underway

**What to Pick Up**:
1. Start MCP server implementation (Task 3.1)
2. Implement 5 MCP tools (build, test, lint, explain, propose)
3. Add integration tests for MCP
4. Update README.md with M2 features and MCP setup guide

**Critical Path**:
MCP Server → AI Generation → Documentation → VS Code Extension

**Quick Wins**:
- Implement `build-pattern` MCP tool (easiest, just STANDARD_PATTERNS lookup)
- Add MCP setup guide to README
- Fix uuidV4 pattern (use proper hex ranges)

---

**Next Review**: 2025-02-15 (after MCP server implementation)
**Contact**: See project README for issue tracker and discussion channels
