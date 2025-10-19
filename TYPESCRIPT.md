# TypeScript Coding Guidelines

## Overview

This document outlines the TypeScript coding standards and best practices for the effect-regex project. These guidelines ensure consistency, type safety, and maintainability across the codebase.

## Table of Contents

- [Type Definitions](#type-definitions)
- [Imports and Exports](#imports-and-exports)
- [Error Handling](#error-handling)
- [Generics](#generics)
- [Advanced TypeScript Features](#advanced-typescript-features)
- [Naming Conventions](#naming-conventions)
- [Code Organization](#code-organization)
- [Effect-Specific Patterns](#effect-specific-patterns)

## Type Definitions

### Interfaces vs Types

```typescript
// ✅ Use interfaces for object shapes that may be extended
interface RegexOptions {
  readonly global?: boolean;
  readonly ignoreCase?: boolean;
  readonly multiline?: boolean;
}

// ✅ Use type aliases for unions, primitives, and complex types
type RegexResult = {
  readonly matches: readonly string[];
  readonly count: number;
} | null;

// ✅ Use interfaces for classes and implementation contracts
interface RegexProcessor {
  process(input: string): Effect<never, RegexError, RegexResult>;
}
```

### Readonly Modifiers

```typescript
// ✅ Use readonly for immutable data
interface RegexMatch {
  readonly index: number;
  readonly groups: readonly string[];
  readonly input: string;
}

// ✅ Use readonly arrays and tuples
type Coordinate = readonly [number, number];
type StringList = readonly string[];
```

### Discriminated Unions

```typescript
// ✅ Use discriminated unions for type-safe pattern matching
type RegexCommand =
  | { readonly type: 'match'; readonly pattern: string; readonly input: string }
  | { readonly type: 'replace'; readonly pattern: string; readonly replacement: string; readonly input: string }
  | { readonly type: 'validate'; readonly pattern: string };

function executeCommand(command: RegexCommand): Effect<never, RegexError, string> {
  switch (command.type) {
    case 'match':
      return matchRegex(command.pattern, command.input);
    case 'replace':
      return replaceRegex(command.pattern, command.replacement, command.input);
    case 'validate':
      return validatePattern(command.pattern);
  }
}
```

## Imports and Exports

### Import Organization

```typescript
// ✅ Group and order imports logically
import { Effect, Context } from 'effect';
import * as NodeContext from '@effect/platform-node/NodeContext';
import type { RegexOptions } from './types.js';

// Empty line between groups
import { matchRegex } from './regex/match.js';
import { validatePattern } from './regex/validate.js';
```

### Export Patterns

```typescript
// ✅ Use named exports for public APIs
export interface RegexConfig {
  readonly pattern: string;
  readonly options: RegexOptions;
}

export const createRegexConfig = (pattern: string, options: RegexOptions = {}): RegexConfig => ({
  pattern,
  options,
});

// ✅ Use default export sparingly, only for main entry points
export default class RegexProcessor {
  // implementation
}
```

### Type-Only Imports

```typescript
// ✅ Use type-only imports when importing only types
import type { Effect, Context } from 'effect';
import type { RegexOptions, RegexResult } from './types.js';

// ✅ Separate type and value imports
import { Effect } from 'effect';
import type { Context } from 'effect';
```

## Error Handling

### Custom Error Types

```typescript
// ✅ Define specific error types
export class RegexCompilationError extends Error {
  readonly _tag = 'RegexCompilationError';

  constructor(
    message: string,
    readonly pattern: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RegexCompilationError';
  }
}

export class RegexMatchError extends Error {
  readonly _tag = 'RegexMatchError';

  constructor(
    message: string,
    readonly input: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'RegexMatchError';
  }
}
```

### Error Type Unions

```typescript
// ✅ Use union types for comprehensive error handling
type RegexError = RegexCompilationError | RegexMatchError | ValidationError;

type RegexEffect<A> = Effect<never, RegexError, A>;
```

## Generics

### Generic Constraints

```typescript
// ✅ Use generic constraints for type safety
interface Processor<TInput, TOutput> {
  process(input: TInput): Effect<never, RegexError, TOutput>;
}

// ✅ Constrain generics when necessary
type StringProcessor<T extends string> = Processor<T, string>;

type NumberProcessor<T extends number> = Processor<T, number>;
```

### Generic Functions

```typescript
// ✅ Use generics for reusable utility functions
const createProcessor = <TInput, TOutput>(
  processor: (input: TInput) => Effect<never, RegexError, TOutput>
): Processor<TInput, TOutput> => ({
  process: processor,
});

// ✅ Infer generic types when possible
const stringProcessor = createProcessor((input: string) => Effect.succeed(input.toUpperCase()));
```

## Advanced TypeScript Features

### Utility Types

```typescript
// ✅ Use built-in utility types appropriately
type PartialRegexOptions = Partial<RegexOptions>;
type RequiredRegexOptions = Required<RegexOptions>;
type ReadonlyRegexOptions = Readonly<RegexOptions>;

// ✅ Create custom utility types
type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
type RegexOptionsWithPattern = OptionalExcept<RegexOptions & { pattern: string }, 'pattern'>;
```

### Conditional Types

```typescript
// ✅ Use conditional types for complex type logic
type IsArray<T> = T extends readonly unknown[] ? true : false;

type ArrayElement<T> = T extends readonly unknown[] ? T[number] : never;

type Flatten<T> = T extends readonly (infer U)[] ? Flatten<U> : T;
```

### Template Literal Types

```typescript
// ✅ Use template literal types for string manipulation
type RegexFlag = 'g' | 'i' | 'm' | 's' | 'u' | 'y';

type RegexFlags = '' | RegexFlag | `${RegexFlag}${RegexFlag}` | `${RegexFlag}${RegexFlag}${RegexFlag}`;

type RegexPattern<T extends RegexFlags = ''> = `/${string}/${T}`;
```

### Mapped Types

```typescript
// ✅ Use mapped types for transformations
type OptionalKeys<T> = {
  [K in keyof T]?: T[K];
};

type RequiredKeys<T> = {
  [K in keyof T]-?: T[K];
};

// ✅ Use key remapping for advanced transformations
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

## Naming Conventions

### General Rules

```typescript
// ✅ Use PascalCase for types, interfaces, classes, and enums
interface RegexOptions {}
type RegexResult = {};
class RegexProcessor {}
enum RegexFlag {}

// ✅ Use camelCase for variables, functions, and properties
const regexPattern = '';
function validatePattern() {}
const options = { global: true };

// ✅ Use UPPER_SNAKE_CASE for constants
const MAX_PATTERN_LENGTH = 1000;
const DEFAULT_TIMEOUT = 5000;

// ✅ Use leading underscore for private properties (if not using #)
class Processor {
  private _config: Config;
}
```

### Specific Patterns

```typescript
// ✅ Use descriptive names with type suffixes when helpful
type UserId = string;
type UserName = string;
type UserEmail = string;

// ✅ Use 'T' prefix for generic type parameters
type Processor<TInput, TOutput> = {};

// ✅ Use meaningful names for discriminated union tags
type Result<T> =
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: Error };
```

## Code Organization

### File Structure

```
src/
├── core/           # Core business logic
├── effects/        # Effect definitions and services
├── types/          # Type definitions and interfaces
├── utils/          # Utility functions
└── index.ts        # Main exports
```

### Module Organization

```typescript
// ✅ Organize related functionality in modules
// types/regex.ts
export interface RegexOptions {}
export type RegexResult = {};

// core/regex.ts
export const compileRegex = () => {};
export const executeRegex = () => {};

// effects/regex.ts
export const RegexService = Context.Tag<RegexService>();
export const RegexLayer = Layer.effect(RegexService, /* ... */);
```

### Barrel Exports

```typescript
// ✅ Use barrel exports for clean imports
// types/index.ts
export * from './regex.js';
export * from './errors.js';

// core/index.ts
export * from './regex.js';
export * from './validation.js';
```

## Effect-Specific Patterns

### Service Definitions

```typescript
// ✅ Define services with Context.Tag
export interface RegexService {
  readonly compile: (pattern: string, options?: RegexOptions) => Effect<never, RegexCompilationError, RegExp>;
  readonly match: (regex: RegExp, input: string) => Effect<never, RegexMatchError, RegexResult>;
}

export const RegexService = Context.Tag<RegexService>('RegexService');
```

### Layer Composition

```typescript
// ✅ Compose layers for dependency injection
export const RegexServiceLive = Layer.effect(
  RegexService,
  Effect.gen(function* () {
    // Implementation
    return {
      compile: () => Effect.succeed(/test/),
      match: () => Effect.succeed(null),
    };
  })
);

// ✅ Combine layers
export const MainLayer = RegexServiceLive.pipe(
  Layer.provide(NodeContext.layer)
);
```

### Effect Error Handling

```typescript
// ✅ Use Effect.catchTags for typed error handling
export const safeRegexOperation = (pattern: string, input: string) =>
  Effect.gen(function* () {
    const regex = yield* RegexService.compile(pattern);
    const result = yield* RegexService.match(regex, input);
    return result;
  }).pipe(
    Effect.catchTags({
      RegexCompilationError: (error) => Effect.fail(new ValidationError(`Invalid pattern: ${error.pattern}`)),
      RegexMatchError: (error) => Effect.fail(new ProcessingError(`Match failed: ${error.message}`)),
    })
  );
```

### Type Safety with Effect

```typescript
// ✅ Leverage Effect's type safety
type RegexProgram = Effect<
  RegexService,           // Required services
  RegexError,            // Possible errors
  RegexResult           // Success type
>;

// ✅ Compose effects safely
export const complexRegexOperation = (
  patterns: readonly string[],
  input: string
): RegexProgram =>
  Effect.forEach(patterns, (pattern) =>
    safeRegexOperation(pattern, input)
  ).pipe(
    Effect.map(results => results.filter(Boolean))
  );
```

These guidelines ensure that our TypeScript code is type-safe, maintainable, and follows functional programming principles with Effect. Follow these patterns consistently across the codebase.</content>
</xai:function_call">## 📋 **TypeScript Coding Guidelines Created!**

I've created a comprehensive `TYPESCRIPT.md` file with detailed coding standards for your Effect/TypeScript project. The guidelines cover:

### 🎯 **Key Areas Covered:**

#### **1. Type Definitions**
- Interface vs Type usage patterns
- Readonly modifiers for immutability
- Discriminated unions for type safety

#### **2. Imports and Exports**
- Import organization and grouping
- Named vs default exports
- Type-only imports

#### **3. Error Handling**
- Custom error types with `_tag` properties
- Error type unions for comprehensive handling
- Effect-compatible error patterns

#### **4. Generics**
- Generic constraints and functions
- Type-safe utility functions

#### **5. Advanced TypeScript Features**
- Utility types (Partial, Required, etc.)
- Conditional types
- Template literal types
- Mapped types

#### **6. Naming Conventions**
- PascalCase for types/classes
- camelCase for variables/functions
- UPPER_SNAKE_CASE for constants

#### **7. Code Organization**
- File structure patterns
- Module organization
- Barrel exports

#### **8. Effect-Specific Patterns**
- Service definitions with Context.Tag
- Layer composition
- Effect error handling
- Type-safe Effect composition

### 🚀 **Integration with Your Workflow:**

The guidelines are now available for:
- **AI Assistants**: All your configured AI tools (Cursor, Windsurf, Cline, etc.) can reference these TypeScript rules
- **Team Members**: Clear standards for consistent code style
- **Code Reviews**: Objective criteria for TypeScript best practices

### 📖 **Next Steps:**

1. **Review and customize** the guidelines for your team's preferences
2. **Reference in PR templates** or contributing guidelines  
3. **Update your CI/CD** to enforce these patterns if desired
4. **Train AI assistants** to follow these specific TypeScript conventions

Would you like me to integrate these TypeScript guidelines into your existing rule files or create any additional coding standards? The guidelines are now part of your comprehensive development environment! 🎉</content>
</xai:function_call: create_file>
<parameter name="path">/Users/paul/Projects/effect-regex/TYPESCRIPT.md
