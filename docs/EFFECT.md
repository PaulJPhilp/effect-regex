# Effect Coding Guidelines

## Overview

This document outlines the Effect framework coding standards and best practices for the effect-regex project. These guidelines ensure proper functional programming patterns, type safety, and composability using Effect.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Effect Types](#effect-types)
- [Service Architecture](#service-architecture)
- [Layer Composition](#layer-composition)
- [Error Handling](#error-handling)
- [Resource Management](#resource-management)
- [Testing Patterns](#testing-patterns)
- [Performance Considerations](#performance-considerations)
- [Common Patterns](#common-patterns)

## Core Concepts

### Effect Fundamentals

```typescript
// ✅ Basic Effect types
type SyncEffect<A> = Effect<never, never, A>;           // No requirements, no errors
type AsyncEffect<A> = Effect<never, Error, A>;         // Async with possible errors
type ServiceEffect<A> = Effect<MyService, Error, A>;   // Requires service, may error

// ✅ Effect creation patterns
const pureValue = Effect.succeed(42);                  // Pure computation
const failure = Effect.fail(new Error('oops'));        // Explicit failure
const fromPromise = Effect.tryPromise(() => fetchData()); // From Promise
const fromNullable = Effect.fromNullable(maybeValue);  // From nullable
```

### Effect Composition

```typescript
// ✅ Functional composition with Effect.gen
const complexOperation = Effect.gen(function* () {
  const user = yield* getUser(userId);
  const preferences = yield* getUserPreferences(user.id);
  const result = yield* processData(user, preferences);
  return result;
});

// ✅ Sequential composition
const sequential = Effect.flatMap(getData, (data) =>
  Effect.flatMap(processData(data), (processed) =>
    saveResult(processed)
  )
);

// ✅ Parallel composition
const parallel = Effect.all([task1, task2, task3]);
const parallelWithConcurrency = Effect.all(taskList, { concurrency: 3 });
```

## When to Use Effect vs Pure Functions

One of the most important decisions in using Effect is knowing when to wrap computations in Effect and when to use pure functions. This section provides clear guidelines based on our experience refactoring the codebase.

### Use Effect When:

1. **Performing I/O Operations**
   - File system access, network requests, database queries
   - Example: `testRegex` uses Effect because it runs patterns with timeout protection

2. **Async Operations**
   - Operations that return Promises
   - Example: `callLLMWithRetry` wraps API calls in Effect

3. **Managing Resources**
   - Acquire/release patterns (files, connections, etc.)
   - Example: MCP server lifecycle management

4. **Handling Errors in Error Channel**
   - When you want typed errors in the Effect error channel
   - Example: LLM service propagates `LLMError | LLMConfigError`

5. **Composing with Other Effects**
   - When building pipelines with other Effect-based operations
   - Example: `developPattern` composes multiple effectful operations

### Use Pure Functions When:

1. **Deterministic Computations**
   - Same input always produces same output
   - No side effects, no I/O
   - Example: `optimize()` transforms AST to optimized AST

2. **Data Transformations**
   - Mapping, filtering, reducing data structures
   - Example: AST optimization passes (constantFolding, etc.)

3. **Pure Validation**
   - Validation that doesn't require I/O
   - Example: `lint()` analyzes AST for dialect compatibility

4. **Building Immutable Structures**
   - Constructing ASTs, building regexes
   - Example: All AST constructors and `emit()`

### In This Codebase

**Pure Functions** (no Effect wrapper):
- `optimize(ast, options): OptimizationResult` - Deterministic AST transformation
- `emit(builder, dialect): RegexPattern` - Deterministic code generation
- `lint(ast, dialect): LintResult` - Pure static analysis
- `explain(ast, options): ExplanationNode` - Deterministic explanation generation
- All AST constructors (`lit`, `seq`, `alt`, etc.)

**Effect-Wrapped Functions**:
- `testRegex(pattern, dialect, cases, timeout): Effect<TestResult, TestExecutionError>` - Uses timeouts
- `callLLMWithRetry(prompt, config): Effect<string, LLMError | ...>` - Network I/O
- `proposePatternWithLLM(...)` - Composes LLM calls with code interpretation
- `developPattern(...)` - Orchestrates multiple effectful operations

### Anti-Pattern Example

```typescript
// ❌ BAD: Wrapping pure function in Effect unnecessarily
export function optimize(ast: RegexAST): Effect<OptimizationResult, never, never> {
  return Effect.gen(function* () {
    // All synchronous, deterministic operations
    const result = performOptimizations(ast);
    return result;
  });
}

// ✅ GOOD: Pure function returns directly
export function optimize(ast: RegexAST): OptimizationResult {
  // All synchronous, deterministic operations
  const result = performOptimizations(ast);
  return result;
}
```

### Migration Pattern

When converting from Effect to pure:

```typescript
// Before:
const result = yield* optimize(ast);  // Effect.gen context

// After:
const result = optimize(ast);  // Direct synchronous call
```

This keeps the API simpler and avoids unnecessary Effect.runSync/runPromise overhead.

## Effect Types

### Service Dependencies

```typescript
// ✅ Define services with Context.Tag
export interface DatabaseService {
  readonly query: (sql: string) => Effect<never, DatabaseError, readonly Row[]>;
  readonly execute: (sql: string) => Effect<never, DatabaseError, number>;
}

export const DatabaseService = Context.Tag<DatabaseService>('DatabaseService');

// ✅ Generic service pattern
export interface CacheService<T = unknown> {
  readonly get: (key: string) => Effect<never, never, Option<T>>;
  readonly set: (key: string, value: T, ttl?: Duration) => Effect<never, never, void>;
}

export const CacheService = Context.Tag<CacheService>('CacheService');
```

### Error Types

```typescript
// ✅ Tagged error unions for type-safe error handling
export class ValidationError extends Error {
  readonly _tag = 'ValidationError';
  constructor(readonly field: string, readonly reason: string) {
    super(`Validation failed for ${field}: ${reason}`);
  }
}

export class NetworkError extends Error {
  readonly _tag = 'NetworkError';
  constructor(readonly url: string, readonly statusCode: number) {
    super(`Network request failed: ${url} (${statusCode})`);
  }
}

export type RegexError = ValidationError | NetworkError | CompilationError;
```

### Effect Type Aliases

```typescript
// ✅ Meaningful type aliases for complex Effect types
type RegexOperation<A> = Effect<RegexService, RegexError, A>;

type RegexProgram = Effect<
  RegexService | DatabaseService,
  RegexError | DatabaseError,
  RegexResult
>;

// ✅ Layer types for service composition
type RegexLayer = Layer<never, never, RegexService>;
type FullAppLayer = Layer<never, never, RegexService | DatabaseService>;
```

## Service Architecture

### Service Implementation

```typescript
// ✅ Service implementation with Effect.gen
export const RegexServiceLive: Layer<never, never, RegexService> = Layer.effect(
  RegexService,
  Effect.gen(function* () {
    const logger = yield* LoggerService;

    return {
      compile: (pattern: string, options?: RegexOptions) =>
        Effect.tryCatch(
          () => new RegExp(pattern, options?.flags),
          (error) => new CompilationError(pattern, error as Error)
        ).pipe(
          Effect.tap(() => logger.debug(`Compiled regex pattern: ${pattern}`))
        ),

      match: (regex: RegExp, input: string) =>
        Effect.tryCatch(
          () => regex.exec(input),
          (error) => new MatchError(input, error as Error)
        )
    };
  })
).pipe(
  Layer.provide(LoggerServiceLive)
);
```

### Service Composition

```typescript
// ✅ Composable service layers
const DatabaseLive = Layer.effect(DatabaseService, /* ... */);
const CacheLive = Layer.effect(CacheService, /* ... */);
const LoggerLive = Logger.consoleLogger;

// ✅ Layer merging for multiple services
export const AppLayer = Layer.mergeAll(
  RegexServiceLive,
  DatabaseLive,
  CacheLive,
  LoggerLive
);
```

## Layer Composition

### Basic Layer Patterns

```typescript
// ✅ Simple effect layer
const SimpleLayer = Layer.effect(
  MyService,
  Effect.succeed({ method: () => Effect.succeed('result') })
);

// ✅ Scoped layer for resources
const ResourceLayer = Layer.scoped(
  DatabaseService,
  Effect.acquireRelease(
    Effect.tryPromise(() => createConnection()),
    (connection) => Effect.tryPromise(() => connection.close())
  ).pipe(
    Effect.map(connection => ({ /* service implementation */ }))
  )
);

// ✅ Layer from existing services
const CompositeLayer = Layer.effect(
  CombinedService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const cache = yield* CacheService;

    return {
      // Implementation using both services
    };
  })
);
```

### Advanced Layer Patterns

```typescript
// ✅ Layer memoization for expensive resources
const ExpensiveResourceLayer = Layer.effect(
  ExpensiveService,
  Effect.gen(function* () {
    // Expensive initialization
    yield* Effect.sleep(Duration.seconds(2));
    return { /* service */ };
  })
).pipe(
  Layer.memoize
);

// ✅ Layer transformation
const TransformedLayer = DatabaseLive.pipe(
  Layer.map(database => ({
    ...database,
    // Add additional methods or modify existing ones
  }))
);

// ✅ Layer projection (expose only part of service)
const ReadOnlyDatabaseLayer = DatabaseLive.pipe(
  Layer.map(({ query }) => ({ query })) // Only expose query method
);
```

## Error Handling

### Effect Error Patterns

```typescript
// ✅ Catch specific errors by tag
const handleErrors = Effect.gen(function* () {
  const result = yield* riskyOperation.pipe(
    Effect.catchTags({
      ValidationError: (error) => Effect.succeed(`Validation failed: ${error.reason}`),
      NetworkError: (error) => Effect.fail(new RetryableError(error)),
    }),
    Effect.catchAll(() => Effect.succeed('Unknown error occurred'))
  );
  return result;
});

// ✅ Retry with backoff
const retryableOperation = riskyOperation.pipe(
  Effect.retry({
    schedule: Schedule.exponential(Duration.millis(100), 2).pipe(
      Schedule.compose(Schedule.recurs(3))
    )
  })
);

// ✅ Timeout operations
const timedOperation = operation.pipe(
  Effect.timeout(Duration.seconds(30)),
  Effect.catchTag('TimeoutException', () => Effect.fail(new TimeoutError()))
);
```

### Error Recovery

```typescript
// ✅ Fallback patterns
const withFallback = primaryOperation.pipe(
  Effect.orElse(() => fallbackOperation)
);

// ✅ Default values
const withDefault = operation.pipe(
  Effect.catchAll(() => Effect.succeed(defaultValue))
);

// ✅ Error transformation
const transformError = operation.pipe(
  Effect.mapError(error => new CustomError(error.message))
);
```

## Resource Management

### Scope and Cleanup

```typescript
// ✅ Scoped resource management
const withFile = Effect.gen(function* () {
  const file = yield* Effect.acquireRelease(
    Effect.tryPromise(() => fs.promises.open('data.txt', 'r')),
    (handle) => Effect.tryPromise(() => handle.close())
  );

  const content = yield* Effect.tryPromise(() => file.readFile());
  return content;
});

// ✅ Resource scopes
const scopedOperation = Effect.scoped(
  Effect.gen(function* () {
    const resource = yield* acquireResource;
    const result = yield* useResource(resource);
    return result;
  })
);
```

### Finalizers and Cleanup

```typescript
// ✅ Ensure cleanup with Effect.ensuring
const withCleanup = Effect.gen(function* () {
  const tempFile = yield* createTempFile;
  const result = yield* processFile(tempFile).pipe(
    Effect.ensuring(cleanupTempFile(tempFile))
  );
  return result;
});

// ✅ Multiple finalizers
const withMultipleCleanups = operation.pipe(
  Effect.ensuring(cleanup1),
  Effect.ensuring(cleanup2),
  Effect.ensuring(cleanup3)
);
```

## Testing Patterns

### Effect Testing

```typescript
import { describe, it, expect } from '@effect/vitest';
import { Effect } from 'effect';

describe('RegexService', () => {
  it('should compile valid regex patterns', () => {
    const program = Effect.gen(function* () {
      const service = yield* RegexService;
      const regex = yield* service.compile('[0-9]+');
      return regex.test('123');
    });

    // Test with full layer
    expect(program.pipe(
      Effect.provide(RegexServiceLive),
      Effect.runPromise
    )).resolves.toBe(true);
  });

  it('should handle compilation errors', () => {
    const program = Effect.gen(function* () {
      const service = yield* RegexService;
      return yield* service.compile('[invalid');
    });

    expect(program.pipe(
      Effect.provide(RegexServiceLive),
      Effect.runPromise
    )).rejects.toThrow(CompilationError);
  });
});
```

### Service Mocking

```typescript
// ✅ Test with mocked services
const MockedRegexService = Layer.succeed(
  RegexService,
  {
    compile: () => Effect.succeed(new RegExp('mock')),
    match: () => Effect.succeed(['mocked match'])
  }
);

// Usage in tests
const testProgram = program.pipe(
  Effect.provide(MockedRegexService)
);
```

## Performance Considerations

### Effect Optimization

```typescript
// ✅ Avoid nested Effect.gen when possible
const optimized = Effect.flatMap(getData, processData).pipe(
  Effect.flatMap(saveResult)
);

// ✅ Use Effect.all for parallel operations
const parallelProcessing = Effect.all(
  [task1, task2, task3],
  { concurrency: 'unbounded' }
);

// ✅ Memoize expensive computations
const memoizedComputation = expensiveOperation.pipe(
  Effect.cached(Duration.minutes(5))
);
```

### Resource Pooling

```typescript
// ✅ Connection pooling
const ConnectionPool = Layer.scoped(
  DatabaseService,
  Effect.gen(function* () {
    const pool = yield* Effect.acquireRelease(
      Effect.tryPromise(() => createPool()),
      (pool) => Effect.tryPromise(() => pool.close())
    );

    return {
      query: (sql: string) => Effect.tryPromise(() => pool.query(sql)),
      execute: (sql: string) => Effect.tryPromise(() => pool.execute(sql))
    };
  })
);
```

## Common Patterns

### Railway Pattern

```typescript
// ✅ Railway pattern for sequential validation
const validateAndProcess = (input: string) =>
  validateInput(input).pipe(
    Effect.flatMap(validated =>
      processValidatedData(validated)
    ),
    Effect.flatMap(processed =>
      saveProcessedData(processed)
    )
  );
```

### Reader Pattern

```typescript
// ✅ Reader pattern for dependency injection
const readerOperation = Effect.gen(function* () {
  const config = yield* ConfigService;
  const logger = yield* LoggerService;
  const db = yield* DatabaseService;

  // Use all dependencies
  return yield* performComplexOperation(config, logger, db);
});
```

### State Management

```typescript
// ✅ Functional state management
type AppState = {
  readonly regexCache: Map<string, RegExp>;
  readonly requestCount: number;
};

const updateState = (current: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_TO_CACHE':
      return {
        ...current,
        regexCache: new Map(current.regexCache).set(action.pattern, action.regex)
      };
    case 'INCREMENT_COUNT':
      return { ...current, requestCount: current.requestCount + 1 };
    default:
      return current;
  }
};
```

### Stream Processing

```typescript
// ✅ Effect streams for data processing
import { Stream } from '@effect/stream';

const processFileStream = (filePath: string) =>
  Stream.fromFile(filePath).pipe(
    Stream.map(line => line.trim()),
    Stream.filter(line => line.length > 0),
    Stream.map(line => processLine(line)),
    Stream.runFold([], (acc, item) => [...acc, item])
  );
```

These Effect guidelines ensure that our functional programming code is composable, testable, and follows Effect best practices. They work in harmony with our TypeScript guidelines to create a robust, type-safe codebase.</content>
</xai:function_call: create_file>
<parameter name="path">/Users/paul/Projects/effect-regex/EFFECT.md
