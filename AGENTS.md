# effect-regex Agent Guidelines

## Commands
- **Build**: `cd effect-regex && pnpm build` (TypeScript → CommonJS)
- **Lint**: `biome check --apply-unsafe .` (formatting/linting)
- **Test**: `cd effect-regex && pnpm test` (Vitest)
- **Single test**: `cd effect-regex && pnpm test src/core/builder.test.ts`
- **Type check**: `cd effect-regex && pnpm check`

## Architecture
Monorepo with Bun root + Effect CLI. Layered: CLI/MCP → Application commands → Core Engine (AST/Builder/Emitter/Linter/Tester) → Standard Library (13 patterns) → Schema validation. Functional programming with Effect framework.

## Code Style
- **Types**: PascalCase, readonly modifiers, discriminated unions
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Imports**: Group logically, use type-only imports
- **Errors**: Tagged with `_tag`, Effect error channel
- **Composition**: `Effect.gen` for async, pipe for chaining
- **Services**: `Context.Tag<>()` pattern
- **Immutability**: New instances, no mutation
- **Effect**: Pure functions when possible, Effect for I/O/async
