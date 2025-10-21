/**
 * Service Layer Exports
 *
 * This module provides a centralized export point for all service definitions and implementations.
 * Services enable dependency injection and composable architecture using Effect's Context system.
 */

// Service type definitions and tags
export {
  RegexBuilderService,
  LLMService,
  ValidationService,
} from "./types.js";
export type {
  RegexBuilderService as IRegexBuilderService,
  LLMService as ILLMService,
  ValidationService as IValidationService,
} from "./types.js";

// Service implementations (Live layers)
export { RegexBuilderServiceLive } from "./regex-builder.js";
export { LLMServiceLive, LLMServiceMock } from "./llm.js";
export { ValidationServiceLive } from "./validation.js";
