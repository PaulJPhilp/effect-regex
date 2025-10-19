# Manual Testing Guide: effect-regex

**Purpose**: Comprehensive manual testing checklist for verifying all features of effect-regex
**Time Required**: ~30-45 minutes
**Last Updated**: 2025-10-18

---

## Prerequisites

Before starting, ensure:

```bash
# 1. Navigate to project directory
cd /Users/paul/Projects/effect-regex/effect-regex

# 2. Verify builds exist
ls -lh dist/bin.cjs        # Should be ~200-300 KB
ls -lh dist/server.cjs     # Should be ~669 KB

# 3. If missing, rebuild
pnpm build          # Builds CLI
pnpm build:mcp      # Builds MCP server

# 4. Check Node.js version
node --version      # Should be v20.x or later
```

---

## Part 1: CLI Commands (15 minutes)

### Test 1.1: Build Standard Library Patterns

**Command**: `build-pattern`

```bash
# Test Tier 1 patterns
node dist/bin.cjs build-pattern quotedString
node dist/bin.cjs build-pattern keyValue
node dist/bin.cjs build-pattern pathSegment
node dist/bin.cjs build-pattern filePathBasic
node dist/bin.cjs build-pattern csvList
node dist/bin.cjs build-pattern integer

# Test Tier 2 patterns
node dist/bin.cjs build-pattern uuidV4
node dist/bin.cjs build-pattern semverStrict

# Test Tier 3 patterns
node dist/bin.cjs build-pattern ipv4
node dist/bin.cjs build-pattern ipv6Compressed
node dist/bin.cjs build-pattern float
node dist/bin.cjs build-pattern isoDate
node dist/bin.cjs build-pattern isoDateTime
```

**Expected Results**:
- ✅ Each command returns JSON with `pattern`, `notes`, `captureMap`
- ✅ Pattern field contains valid regex string
- ✅ No error messages

**Example Output**:
```json
{
  "pattern": "\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'",
  "notes": [],
  "captureMap": {}
}
```

### Test 1.2: Pattern Linting

**Command**: `lint`

```bash
# Test valid pattern
node dist/bin.cjs lint "[a-z]+"

# Test invalid pattern (missing closing bracket)
node dist/bin.cjs lint "[a-z"

# Test complex valid pattern
node dist/bin.cjs lint "^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"

# Test pattern with potential issues
node dist/bin.cjs lint "(a+)+"
```

**Expected Results**:
- ✅ Valid patterns: `{"valid": true, "issues": []}`
- ✅ Invalid patterns: `{"valid": false, "issues": [...]}`
- ✅ Issue objects include `code`, `severity`, `message`

### Test 1.3: Pattern Explanation

**Command**: `explain`

```bash
# Simple pattern
node dist/bin.cjs explain "[a-z]+"

# Complex pattern
node dist/bin.cjs explain "^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"

# Pattern with groups
node dist/bin.cjs explain "(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})"
```

**Expected Results**:
- ✅ Returns JSON with `explanation`, `pattern`, `notes`
- ✅ No errors

### Test 1.4: Pattern Testing

**Command**: `test`

**Step 1**: Create test file
```bash
cat > test-email.json << 'EOF'
{
  "positive": [
    "user@example.com",
    "name.surname@company.co.uk"
  ],
  "negative": [
    "@example.com",
    "user@",
    "invalid"
  ]
}
EOF
```

**Step 2**: Run test
```bash
node dist/bin.cjs test "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" test-email.json
```

**Expected Results**:
- ✅ Returns JSON with `passed`, `failed`, `warnings`, `failures`
- ✅ Should show 2 passed, 3 failed (or similar based on pattern accuracy)

**Step 3**: Test timeout protection
```bash
# Create catastrophic backtracking test
cat > test-backtracking.json << 'EOF'
{
  "positive": ["aaaaaaaaaa!"],
  "negative": ["aaaaaaaaaa"]
}
EOF

node dist/bin.cjs test "(a+)+" test-backtracking.json
```

**Expected Results**:
- ✅ Should timeout and report warnings about catastrophic backtracking

### Test 1.5: Pattern Optimization

**Command**: `optimize`

```bash
# Test with various standard patterns
node dist/bin.cjs optimize quotedString
node dist/bin.cjs optimize csvList
node dist/bin.cjs optimize uuidV4
node dist/bin.cjs optimize semverStrict
```

**Expected Results**:
- ✅ Returns JSON with `before`, `after`, `optimization`
- ✅ Optimization object includes: `nodesReduced`, `reductionPercent`, `passesApplied`, `iterations`
- ✅ Some patterns may already be optimal (0% reduction)

**Example Output**:
```json
{
  "pattern": "quotedString",
  "before": {
    "pattern": "...",
    "nodes": 15
  },
  "after": {
    "pattern": "...",
    "nodes": 12
  },
  "optimization": {
    "nodesReduced": 3,
    "reductionPercent": 20,
    "passesApplied": ["constantFolding"],
    "iterations": 1
  }
}
```

### Test 1.6: Help Command

```bash
node dist/bin.cjs --help
```

**Expected Results**:
- ✅ Displays help text with all commands
- ✅ Shows available standard patterns
- ✅ Includes usage examples

---

## Part 2: Core Functionality Tests (10 minutes)

### Test 2.1: Run Unit Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test test/core.test.ts
pnpm test test/optimizer.test.ts
```

**Expected Results**:
- ✅ Core tests: 16/16 passing
- ✅ Optimizer tests: 23/23 passing
- ⚠️ MCP E2E tests may have timing issues (known issue)

### Test 2.2: Type Checking

```bash
pnpm check
```

**Expected Results**:
- ✅ No TypeScript errors
- ✅ All types compile successfully

### Test 2.3: Linting

```bash
pnpm lint
```

**Expected Results**:
- ✅ No linting errors (or only minor warnings)

---

## Part 3: MCP Server Tests (15 minutes)

### Test 3.1: MCP Server Startup

```bash
# Start MCP server (will run in foreground)
node dist/server.cjs
```

**Expected Results**:
- ✅ Prints: "Effect Regex MCP server running on stdio"
- ✅ No error messages
- ✅ Server waits for input (Ctrl+C to stop)

**Note**: MCP server communicates via stdio (JSON-RPC), so manual testing requires a JSON-RPC client. The automated tests cover this.

### Test 3.2: MCP Server Build Check

```bash
# Verify server build
ls -lh dist/server.cjs

# Check for required dependencies
grep -q "@modelcontextprotocol/sdk" effect-regex/package.json && echo "✅ MCP SDK found" || echo "❌ MCP SDK missing"
```

**Expected Results**:
- ✅ server.cjs exists and is ~669 KB
- ✅ MCP SDK dependency present

### Test 3.3: MCP Tools Verification

**Verify all 8 tools are defined**:

```bash
# Check TOOLS array in server source
grep -A 5 "name: \"build_regex\"" src/mcp/server.ts
grep -A 5 "name: \"test_regex\"" src/mcp/server.ts
grep -A 5 "name: \"lint_regex\"" src/mcp/server.ts
grep -A 5 "name: \"convert_regex\"" src/mcp/server.ts
grep -A 5 "name: \"explain_regex\"" src/mcp/server.ts
grep -A 5 "name: \"library_list\"" src/mcp/server.ts
grep -A 5 "name: \"propose_pattern\"" src/mcp/server.ts
grep -A 5 "name: \"optimize_pattern\"" src/mcp/server.ts
```

**Expected Results**:
- ✅ All 8 tool definitions found
- ✅ Each has description and inputSchema

---

## Part 4: Claude Skill Tests (10 minutes)

### Test 4.1: Skill Files Verification

```bash
# Navigate to skill directory
cd /Users/paul/Projects/effect-regex/.claude/skills/effect-regex

# Check all required files exist
ls -lh SKILL.md
ls -lh examples.md
ls -lh reference.md
ls -lh README.md
```

**Expected Results**:
- ✅ SKILL.md exists (~15-20 KB)
- ✅ examples.md exists (~30-40 KB)
- ✅ reference.md exists (~40-50 KB)
- ✅ README.md exists (~8-10 KB)

### Test 4.2: SKILL.md Format Check

```bash
# Check YAML frontmatter
head -n 10 SKILL.md
```

**Expected Results**:
- ✅ Starts with `---`
- ✅ Contains `name: Effect Regex`
- ✅ Contains `description:` with search keywords
- ✅ Contains `allowed-tools: Bash, Read, Write, Edit`
- ✅ Ends frontmatter with `---`

### Test 4.3: Skill Content Verification

```bash
# Check key sections exist
grep -q "## When to Use This Skill" SKILL.md && echo "✅ Usage section found"
grep -q "## Core Capabilities" SKILL.md && echo "✅ Capabilities section found"
grep -q "## Working with Effect Regex" SKILL.md && echo "✅ Instructions found"
grep -q "## Common Workflows" SKILL.md && echo "✅ Workflows section found"
```

### Test 4.4: Install Skill Globally (Optional)

```bash
# Copy to personal skills directory
mkdir -p ~/.claude/skills
cp -r /Users/paul/Projects/effect-regex/.claude/skills/effect-regex ~/.claude/skills/

# Verify installation
ls ~/.claude/skills/effect-regex/SKILL.md
```

**Expected Results**:
- ✅ Skill copied successfully
- ✅ All files present in personal directory

### Test 4.5: Test with Claude Code (If Available)

If you have Claude Code installed:

1. Open this project in Claude Code
2. Ask Claude: "Can you show me the quotedString pattern from the standard library?"
3. Claude should automatically:
   - Recognize the need for regex help
   - Use the Effect Regex skill
   - Run: `node dist/bin.cjs build-pattern quotedString`
   - Show you the pattern

**Expected Results**:
- ✅ Claude uses the skill automatically
- ✅ Executes correct command
- ✅ Returns pattern successfully

---

## Part 5: Documentation Tests (5 minutes)

### Test 5.1: README Completeness

```bash
cd /Users/paul/Projects/effect-regex

# Check README sections
grep -q "## Current Status" README.md && echo "✅ Status section found"
grep -q "M3.3 Complete" README.md && echo "✅ M3.3 marked complete"
grep -q "## Claude Skill" README.md && echo "✅ Skill section found"
grep -q "optimize_pattern" README.md && echo "✅ Optimize tool documented"
```

### Test 5.2: Memory Files Updated

```bash
# Check tasks_plan.md
grep -q "M3.3" memory/tasks/tasks_plan.md && echo "✅ M3.3 in task plan"

# Check active_context.md
grep -q "Pattern Optimization Engine Complete" memory/tasks/active_context.md && echo "✅ Active context updated"
```

### Test 5.3: Example Files Check

```bash
# Verify examples.md has 15 examples
grep -c "^## Example" .claude/skills/effect-regex/examples.md
# Should output: 15

# Verify reference.md has technical details
grep -q "## AST Structure" .claude/skills/effect-regex/reference.md && echo "✅ Technical reference complete"
```

---

## Part 6: Integration Tests (5 minutes)

### Test 6.1: End-to-End Workflow

**Scenario**: Build, Test, Optimize a pattern

```bash
cd /Users/paul/Projects/effect-regex/effect-regex

# Step 1: Build a pattern
echo "Step 1: Building pattern..."
node dist/bin.cjs build-pattern integer

# Step 2: Create test cases
cat > test-integer.json << 'EOF'
{
  "positive": ["123", "-456", "0", "9999"],
  "negative": ["12.3", "abc", "12a", ""]
}
EOF

# Step 3: Test the pattern
echo "Step 2: Testing pattern..."
node dist/bin.cjs test "-?[0-9]+" test-integer.json

# Step 4: Optimize
echo "Step 3: Optimizing pattern..."
node dist/bin.cjs optimize integer

# Step 5: Lint
echo "Step 4: Linting pattern..."
node dist/bin.cjs lint "-?[0-9]+"

# Cleanup
rm test-integer.json
```

**Expected Results**:
- ✅ All steps complete without errors
- ✅ Test results show correct passes/failures
- ✅ Optimization shows metrics
- ✅ Lint validates successfully

### Test 6.2: Multi-Dialect Test

```bash
# Test a pattern that has dialect differences
node dist/bin.cjs lint "(?<=start)\w+"
# Should warn about RE2 incompatibility (lookbehind)

node dist/bin.cjs lint "[a-z]+"
# Should validate cleanly for all dialects
```

---

## Cleanup

```bash
# Remove test files created during testing
cd /Users/paul/Projects/effect-regex/effect-regex
rm -f test-email.json test-backtracking.json test-integer.json
```

---

## Results Checklist

After completing all tests, verify:

### ✅ CLI Features
- [ ] All 13 standard patterns build successfully
- [ ] Lint command validates patterns correctly
- [ ] Test command runs test cases with timeout protection
- [ ] Optimize command produces metrics
- [ ] Explain command provides output
- [ ] Help command displays information

### ✅ Core Functionality
- [ ] Unit tests pass (39/40+ tests, MCP timing issues known)
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build process works (both CLI and MCP server)

### ✅ MCP Server
- [ ] Server builds successfully (~669 KB)
- [ ] Server starts without errors
- [ ] All 8 tools defined in code

### ✅ Claude Skill
- [ ] All 4 skill files exist and have content
- [ ] SKILL.md has correct YAML frontmatter
- [ ] Installation to ~/.claude/skills works
- [ ] (Optional) Skill works with Claude Code

### ✅ Documentation
- [ ] README reflects M3.3 completion
- [ ] README includes Claude Skill section
- [ ] Memory files updated
- [ ] Skill documentation complete

### ✅ Integration
- [ ] End-to-end workflow completes successfully
- [ ] Multi-dialect support works

---

## Known Issues

1. **MCP E2E Tests**: May timeout due to test infrastructure issues. This is a known issue with the test harness, not the MCP server itself. The server builds and starts successfully.

2. **Some patterns already optimal**: Patterns like `quotedString` are already optimized, so optimizer shows 0% reduction. This is expected.

3. **Lint warnings on complex patterns**: Some valid patterns may generate warnings about performance. This is intentional for user awareness.

---

## Troubleshooting

### Issue: "Cannot find module"

**Solution**:
```bash
cd effect-regex
pnpm install
pnpm build
pnpm build:mcp
```

### Issue: Tests fail with timeout

**Solution**: This is known for MCP E2E tests. Core tests should pass. If core tests fail:
```bash
pnpm clean
pnpm install
pnpm build
pnpm test
```

### Issue: Command not found

**Solution**: Ensure you're in the correct directory:
```bash
cd /Users/paul/Projects/effect-regex/effect-regex
ls dist/bin.cjs  # Should exist
```

### Issue: Skill not loading in Claude Code

**Solution**:
1. Verify `.claude/skills/effect-regex/SKILL.md` exists
2. Restart Claude Code
3. Try explicitly: "Use the Effect Regex skill to..."

---

## Success Criteria

**All tests pass when**:
- ✅ All CLI commands execute successfully
- ✅ Core unit tests pass (39/40+)
- ✅ MCP server builds and starts
- ✅ Claude Skill files are complete and well-formatted
- ✅ Documentation is up-to-date
- ✅ End-to-end workflows complete

**Estimated Time**: 30-45 minutes for complete testing

**Next Steps**: After successful testing, the project is ready for:
- Production deployment
- MCP server integration with Claude Desktop
- Claude Skill distribution
- Community sharing

---

**Testing Date**: _______________
**Tested By**: _______________
**Results**: ⬜ PASS | ⬜ FAIL | ⬜ PARTIAL
**Notes**: _________________________________
