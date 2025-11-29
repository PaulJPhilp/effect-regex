**effect-regex — One‑Page Summary**

- **Project:** `effect-regex` — a TypeScript library and toolkit for building, composing, linting, emitting, and testing regular-expression patterns using an Effect-style functional approach.

- **Purpose:** Provide a safer, testable, and reusable system for defining complex regex patterns as composable ASTs and builders, backed by a small engine (builder, emitter, linter, tester) and a standard pattern library.

- **Key Features:**
  - **AST-based Engine:** Build regexes from an abstract syntax tree to make composition, inspection, and transformations easy.
  - **Builder & Emitter:** Declarative builders produce canonical regex strings via an emitter, keeping pattern generation consistent.
  - **Linter & Tester:** Built-in linting and test harnesses encourage correctness and maintainability of patterns.
  - **Standard Library:** A curated set of reusable effect-patterns (roughly 13 core patterns) for common needs.
  - **CLI & Tooling:** Scripts and CLI integrations for build, test, and MCP workflows.

- **Architecture (Layered):**
  - **CLI / MCP** → **Application commands** → **Core Engine (AST / Builder / Emitter / Linter / Tester)** → **Standard Library** → **Schema validation**
  - Code organized for composition and immutability; primary implementation lives under `effect-regex/src/` and tests under `effect-regex/test/`.

- **Design & Style:**
  - Functional, Effect-style composition (e.g., `Effect.gen`, `pipe`).
  - Emphasis on immutability and small, testable units.
  - Error values are tagged (`_tag`) and types use PascalCase and `readonly` where appropriate.

- **Developer Workflow:**
  - **Install / Build:**
    ```zsh
    pnpm install
    cd effect-regex
    pnpm build
    ```
  - **Run tests:** `pnpm test` (root: `cd effect-regex && pnpm test`)
  - **Lint / Format:** `biome check --apply-unsafe .`
  - **Type check:** `pnpm check`

- **Code Conventions:**
  - **Types:** PascalCase, prefer `readonly` and discriminated unions.
  - **Identifiers:** camelCase for functions/vars, UPPER_SNAKE_CASE for constants.
  - **Imports:** Group logically; use type-only imports when appropriate.
  - **Composition:** Use `Effect.gen` for async effects and `pipe` for function chaining.

- **Where to Look (Quick map):**
  - Core package: `effect-regex/` — source in `effect-regex/src/`, tests in `effect-regex/test/`.
  - Pattern collection: `effect-patterns-repo/` contains related patterns, docs, and examples.
  - Project guidance: top-level `AGENTS.md`, `README.md`, and `docs/` (e.g., `PRD.md`, `mcp-setup.md`).

- **Contributing Notes:**
  - Run linters and tests before submitting PRs.
  - Add unit tests for new patterns and keep functions pure and small.
  - Follow the repository's style rules found in `AGENTS.md` and the codebase.

- If you'd like, I can also:
  - Add a short README-style insertion at `effect-regex/README_SUMMARY.md` or move this to the repo root as `SUMMARY.md`.
  - Commit the change for you and open a branch/PR.
