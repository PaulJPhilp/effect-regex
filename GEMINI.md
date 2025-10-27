# Gemini Project: effect-regex

This document provides instructions for Gemini on how to interact with the `effect-regex` project.

## Project Overview

`effect-regex` is a monorepo containing a CLI tool for processing regular expressions, built with the Effect framework. The project is structured with a Bun-based root workspace and the main CLI application in the `effect-regex/` directory.

The CLI tool provides several features for working with regular expressions, including:
- Building patterns from a standard library or a CommandSpec.
- Testing patterns against test cases.
- Linting patterns for safety and performance.
- Explaining the structure of a pattern.
- Converting patterns between different dialects (JS, RE2, PCRE).
- AI-assisted pattern generation using the Anthropic Claude API.

The project also includes a Model Context Protocol (MCP) server to expose these tools to AI assistants like Claude Desktop and Cline, and a Claude Skill for natural language interaction.

## Technologies

- **Runtime**: Bun (root), Node.js (for `effect-regex` CLI)
- **Language**: TypeScript
- **Framework**: Effect
- **Package Manager**: Bun (root), pnpm (`effect-regex/`)
- **Testing**: Vitest
- **Linting/Formatting**: Biome

## Building and Running

### Root Workspace

- **Install dependencies**: `bun install`
- **Run example**: `bun run index.ts`

### effect-regex CLI

The following commands should be run from the `effect-regex/` directory.

- **Install dependencies**: `pnpm install`
- **Run the CLI**: `pnpm tsx ./src/bin.ts`
- **Build the application**: `pnpm build`
- **Build the MCP server**: `pnpm build:mcp`
- **Run tests**: `pnpm test`
- **Type checking**: `pnpm check`

## Development Conventions

- Use `pnpm` for package management within the `effect-regex` directory.
- Before committing, run `pnpm check` and `pnpm test` to ensure the code is correct and passes all tests.
- Follow the coding standards and patterns outlined in `EFFECT.md` and `TYPESCRIPT.md`.
- For detailed development commands and guidelines for AI assistants, refer to `AGENTS.md`.
