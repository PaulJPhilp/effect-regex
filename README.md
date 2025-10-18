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

## Development

The root workspace uses Bun for fast development and package management. The `effect-regex/` directory contains a full Effect CLI application template with:

- TypeScript strict configuration
- Vitest for testing with Effect integration
- Biome for code formatting and linting
- tsup for bundling

See [AGENTS.md](./AGENTS.md) for detailed development commands and guidelines.
