# effect-regex

A monorepo containing a regex processing CLI tool built with the Effect framework, alongside a Bun-based root workspace.

## Project Structure

This monorepo consists of two main parts:

- **Root workspace**: Bun-based setup with basic configuration and tooling
- **`effect-regex/`**: The main Effect CLI application for regex processing

## Quick Start

### Root Workspace (Bun)

```bash
# Install dependencies
bun install

# Run the root hello world example
bun run index.ts
```

### Effect CLI Application

```bash
# Navigate to the CLI app
cd effect-regex

# Install dependencies
pnpm install

# Run the CLI
pnpm tsx ./src/bin.ts

# Build the application
pnpm build

# Run tests
pnpm test

# Type checking
pnpm check
```

## Technologies

- **[Bun](https://bun.com)**: Fast JavaScript runtime for the root workspace
- **[Effect](https://effect.website)**: Functional programming framework for the CLI app
- **[TypeScript](https://typescriptlang.org)**: Type-safe JavaScript
- **[Biome](https://biomejs.dev)**: Fast linting and formatting
- **[Vitest](https://vitest.dev)**: Testing framework

## Current Status

✅ **M1 Complete**: Core AST, fluent builder, dialect gating, standard library (Tier 1), CLI MVP
✅ **M2 Complete**: CommandSpec builder, tester with corpora, std library (Tier 2/3), improved lint, explain functionality, AI toolkit skeleton
🚀 **M3 In Progress**: MCP server (7 tools), AI pattern generation, pattern optimization

## Development

The root workspace uses Bun for fast development and package management. The `effect-regex/` directory contains a full Effect CLI application with:

- **Core Engine**: AST-based regex builder with deterministic emission
- **Dialect Support**: JS, RE2, PCRE with appropriate gating and warnings
- **Standard Library**: 13 vetted patterns (quotedString, uuidV4, semverStrict, etc.)
- **CommandSpec Builder**: Generate regexes from CLI specifications with semantic capture maps
- **Testing Framework**: Comprehensive pattern testing with timeout protection
- **AI Toolkit**: Propose → test → refine loop for pattern development
- **CLI**: build-pattern, lint, explain, test commands with JSON output
- **MCP Server**: 7 tools for AI assistant integration (Claude Desktop, Cline)

### Available CLI Commands

```bash
# Build standard library patterns
node dist/bin.cjs build-pattern quotedString
node dist/bin.cjs build-pattern uuidV4

# Lint patterns for issues
node dist/bin.cjs lint "[a-z]+"

# Explain pattern structure
node dist/bin.cjs explain "(hello|world)+"

# Test patterns against corpora
node dist/bin.cjs test "[a-z]+" test-cases.json
```

### Standard Library Patterns

**Tier 1 (CLI-focused)**: quotedString, keyValue, pathSegment, filePathBasic, csvList, integer
**Tier 2 (Advanced)**: uuidV4, semverStrict
**Tier 3 (General)**: ipv4, ipv6Compressed, float, isoDate, isoDateTime

See [AGENTS.md](./AGENTS.md) for detailed development commands and guidelines.

## MCP Server Integration

effect-regex includes a Model Context Protocol (MCP) server that exposes 7 powerful regex tools to AI assistants like Claude Desktop and Cline.

### Quick Setup

```bash
# Build the MCP server
cd effect-regex
pnpm build:mcp

# Configure Claude Desktop (macOS example)
# Edit: ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "effect-regex": {
      "command": "node",
      "args": ["/absolute/path/to/effect-regex/effect-regex/dist/server.cjs"]
    }
  }
}
```

### Available MCP Tools

1. **build_regex** - Build patterns from standard library or CommandSpec
2. **test_regex** - Test patterns with timeout protection
3. **lint_regex** - Validate patterns for safety and compatibility
4. **convert_regex** - Convert between dialects (JS, RE2, PCRE)
5. **explain_regex** - Generate human-readable explanations
6. **library_list** - List standard library patterns with filtering
7. **propose_pattern** - AI-assisted pattern generation from examples

See **[docs/mcp-setup.md](./docs/mcp-setup.md)** for complete setup instructions, usage examples, and troubleshooting.

## Coding Guidelines

- **[EFFECT.md](./EFFECT.md)** - Effect framework patterns and best practices
- **[TYPESCRIPT.md](./TYPESCRIPT.md)** - TypeScript coding standards and advanced patterns
- **[AGENTS.md](./AGENTS.md)** - AI assistant guidelines and development workflow
