/**
 * Error Module Exports
 *
 * Centralized export point for all error types.
 */

export {
  RegexCompilationError,
  OptimizationError,
  TestExecutionError,
  ValidationError,
  DialectIncompatibilityError,
  CodeInterpreterError,
  EmitError,
  LLMError,
  LLMConfigError,
  LLMRateLimitError,
} from "./types.js";

export type { Dialect, RegexLibraryError } from "./types.js";
