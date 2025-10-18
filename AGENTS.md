# Effect Regex - Agent Guidelines

## Commands
- **Install**: `bun install` (root), `pnpm install` (effect-regex/)
- **Build**: `pnpm build` (effect-regex/)
- **Test**: `pnpm test` (all tests), `pnpm vitest run Dummy.test.ts` (single test)
- **Lint**: `bun biome check` or `bun biome format`
- **Type check**: `pnpm check`
- **Run**: `bun run index.ts` (root), `pnpm tsx ./src/bin.ts` (CLI)

## Architecture
- **Root**: Bun-based workspace with minimal setup
- **effect-regex/**: Effect CLI application template using pnpm
- **Framework**: Effect for functional programming, @effect/cli for CLI
- **Structure**: src/ (CLI code), test/ (vitest tests), scripts/ (build tools)
- **Build**: tsup bundler, TypeScript strict mode

## Code Style
- **Runtime**: Use Bun APIs (Bun.serve, Bun.file, etc.) per CLAUDE.md
- **Imports**: ES modules, verbatim module syntax
- **Types**: Strict TypeScript, no unused locals/parameters allowed in config
- **Testing**: @effect/vitest with globals, coverage via v8
- **Formatting**: Biome with ultracite preset
- **CLI**: Effect Command patterns, NodeContext for runtime</content>
