/**
 * LLM Client for AI-Powered Pattern Generation
 *
 * Provides a unified interface for calling multiple LLM providers with:
 * - Type-safe Effect-based error handling
 * - Automatic retry logic with exponential backoff
 * - Rate limit handling with respect for retry-after headers
 * - Secure API key management via environment variables
 *
 * **Supported Providers**:
 * - **Anthropic Claude** (fully implemented) - Haiku 3.5 recommended
 * - **OpenAI** (placeholder) - GPT-4 planned
 * - **Local LLM** (placeholder) - Ollama/llama.cpp planned
 *
 * **Security Best Practices**:
 * - API keys read ONLY from environment variables
 * - Never pass API keys in config objects
 * - Use `.env` files for local development
 * - Keep API keys out of version control
 *
 * @module ai/llm-client
 * @see {@link callLLM} - Main LLM call function
 * @see {@link callLLMWithRetry} - Recommended with built-in retry logic
 */

import Anthropic from "@anthropic-ai/sdk";
import { Effect } from "effect";

/**
 * Supported LLM providers
 *
 * - **anthropic**: Claude models via Anthropic API (implemented)
 * - **openai**: GPT models via OpenAI API (not yet implemented)
 * - **local**: Local LLM via Ollama/llama.cpp (not yet implemented)
 * - **none**: Disable LLM usage (heuristic fallback only)
 */
export type LLMProvider = "anthropic" | "openai" | "local" | "none";

/**
 * Configuration for LLM API calls
 *
 * **Security Note**: Never include `apiKey` in config.
 * API keys are automatically read from environment variables:
 * - Anthropic: `ANTHROPIC_API_KEY`
 * - OpenAI: `OPENAI_API_KEY`
 */
export interface LLMConfig {
  /** LLM provider to use */
  readonly provider: LLMProvider;
  /** API key (deprecated - use environment variables instead) */
  readonly apiKey?: string;
  /** Model name override (default: claude-3-5-haiku-20241022 for Anthropic) */
  readonly model?: string;
  /** Maximum tokens in response (default: 2048) */
  readonly maxTokens?: number;
  /** Temperature 0-2 (default: 0.7) - higher = more creative */
  readonly temperature?: number;
}

/**
 * General LLM error
 *
 * Thrown for API errors, network issues, unexpected responses, etc.
 * Retryable errors (should be caught and retried with backoff).
 */
export class LLMError {
  readonly _tag = "LLMError";
  constructor(
    readonly message: string,
    readonly cause?: unknown
  ) {}
}

/**
 * LLM configuration error
 *
 * Thrown for missing API keys, invalid providers, etc.
 * NOT retryable (user must fix configuration).
 */
export class LLMConfigError {
  readonly _tag = "LLMConfigError";
  constructor(readonly message: string) {}
}

/**
 * Rate limit error
 *
 * Special case of retryable error with retry-after information.
 * Automatically handled by {@link callLLMWithRetry}.
 */
export class LLMRateLimitError {
  readonly _tag = "LLMRateLimitError";
  /** Seconds to wait before retry (from API header) */
  constructor(readonly retryAfter?: number) {}
}

/**
 * Default configuration from environment
 */
export const defaultConfig: LLMConfig = {
  provider: "anthropic",
  model: "claude-3-5-haiku-20241022",
  maxTokens: 2048,
  temperature: 0.7,
};

/**
 * Get API key from environment or config
 */
const getApiKey = (
  provider: LLMProvider
): Effect.Effect<string, LLMConfigError> =>
  Effect.gen(function* () {
    const envKey =
      provider === "anthropic"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;

    if (!envKey) {
      return yield* Effect.fail(
        new LLMConfigError(
          `API key not found. Set ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} environment variable`
        )
      );
    }

    return envKey;
  });

/**
 * Call Anthropic Claude API
 */
const callAnthropic = (
  prompt: string,
  config: LLMConfig
): Effect.Effect<string, LLMError | LLMConfigError | LLMRateLimitError> => {
  return Effect.gen(function* () {
    const apiKey = yield* getApiKey("anthropic");

    const client = new Anthropic({ apiKey });

    const result = yield* Effect.tryPromise({
      try: () =>
        client.messages.create({
          model: config.model || "claude-3-5-haiku-20241022",
          max_tokens: config.maxTokens || 2048,
          temperature: config.temperature || 0.7,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      catch: (error: any) => {
        // Handle rate limiting
        if (error?.status === 429) {
          const retryAfter = error?.headers?.["retry-after"];
          return new LLMRateLimitError(
            retryAfter ? Number.parseInt(retryAfter, 10) : undefined
          );
        }
        return new LLMError(
          `Anthropic API error: ${error?.message || "Unknown error"}`,
          error
        );
      },
    });

    const content = result.content[0];
    if (content.type !== "text") {
      return yield* Effect.fail(
        new LLMError("Unexpected response type from Claude")
      );
    }

    return content.text;
  });
};

/**
 * Call OpenAI API (placeholder for future implementation)
 */
const callOpenAI = (
  prompt: string,
  config: LLMConfig
): Effect.Effect<string, LLMError | LLMConfigError> =>
  Effect.fail(
    new LLMError(
      "OpenAI provider not yet implemented. Use 'anthropic' provider."
    )
  );

/**
 * Call local LLM (placeholder for future implementation)
 */
const callLocal = (
  prompt: string,
  config: LLMConfig
): Effect.Effect<string, LLMError> =>
  Effect.fail(
    new LLMError(
      "Local LLM provider not yet implemented. Use 'anthropic' provider."
    )
  );

/**
 * Call an LLM with the given prompt
 *
 * Routes to the appropriate provider implementation based on configuration.
 * API keys are automatically loaded from environment variables.
 *
 * **Recommendation**: Use {@link callLLMWithRetry} instead for automatic retry logic.
 *
 * **Error Handling**:
 * - `LLMConfigError`: Missing API key or invalid provider (not retryable)
 * - `LLMRateLimitError`: Rate limited (contains retry-after info)
 * - `LLMError`: API error, network issue, etc. (retryable)
 *
 * @param prompt - The prompt to send to the LLM
 * @param config - Optional configuration (provider, model, temperature, etc.)
 * @returns Effect yielding LLM response or errors
 * @example
 * ```typescript
 * // Use default config (Anthropic Haiku, temperature 0.7)
 * const response1 = await Effect.runPromise(
 *   callLLM("Generate a regex for email addresses")
 * );
 *
 * // Custom config
 * const response2 = await Effect.runPromise(
 *   callLLM("Generate a pattern", {
 *     provider: "anthropic",
 *     temperature: 0.5,
 *     maxTokens: 1024
 *   })
 * );
 *
 * // Handle errors
 * const result = await Effect.runPromise(
 *   Effect.either(callLLM("prompt"))
 * );
 * if (result._tag === "Left") {
 *   console.error(result.left.message);
 * }
 * ```
 */
export const callLLM = (
  prompt: string,
  config: Partial<LLMConfig> = {}
): Effect.Effect<string, LLMError | LLMConfigError | LLMRateLimitError> => {
  const fullConfig: LLMConfig = { ...defaultConfig, ...config };

  return Effect.gen(function* () {
    switch (fullConfig.provider) {
      case "anthropic":
        return yield* callAnthropic(prompt, fullConfig);
      case "openai":
        return yield* callOpenAI(prompt, fullConfig);
      case "local":
        return yield* callLocal(prompt, fullConfig);
      case "none":
        return yield* Effect.fail(
          new LLMConfigError(
            "LLM provider set to 'none'. Cannot generate pattern."
          )
        );
      default:
        return yield* Effect.fail(
          new LLMConfigError(`Unknown LLM provider: ${fullConfig.provider}`)
        );
    }
  });
};

/**
 * Call LLM with automatic retry logic and exponential backoff
 *
 * **Recommended** over {@link callLLM} for production use.
 * Handles transient failures, rate limits, and network issues gracefully.
 *
 * **Retry Strategy**:
 * - **Rate Limits**: Respects `retry-after` header, otherwise exponential backoff
 * - **Other Errors**: Exponential backoff with jitter (1s, 2s, 4s, max 10s)
 * - **Config Errors**: No retry (fails immediately)
 *
 * **Exponential Backoff Formula**:
 * ```
 * delay = min(2^attempt * 1000, 10000) + random(0, 30% of delay)
 * ```
 *
 * @param prompt - The prompt to send to the LLM
 * @param config - Optional configuration
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Effect yielding LLM response (LLMRateLimitError converted to LLMError)
 * @example
 * ```typescript
 * // Basic usage (recommended)
 * const response = await Effect.runPromise(
 *   callLLMWithRetry("Generate email regex")
 * );
 *
 * // With custom retries
 * const response2 = await Effect.runPromise(
 *   callLLMWithRetry("Generate pattern", {}, 5)  // 5 retries
 * );
 * ```
 */
export const callLLMWithRetry = (
  prompt: string,
  config: Partial<LLMConfig> = {},
  maxRetries = 3
): Effect.Effect<string, LLMError | LLMConfigError> => {
  return Effect.gen(function* () {
    let lastError: LLMError | LLMConfigError | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = yield* Effect.either(callLLM(prompt, config));

      if (result._tag === "Right") {
        return result.right;
      }

      const error = result.left;

      // Don't retry config errors (API key missing, invalid provider, etc.)
      if (error._tag === "LLMConfigError") {
        return yield* Effect.fail(error);
      }

      // Handle rate limiting with exponential backoff
      if (error._tag === "LLMRateLimitError") {
        const delay = error.retryAfter
          ? error.retryAfter * 1000
          : Math.min(2 ** attempt * 1000, 10_000); // Cap at 10s

        console.warn(
          `LLM rate limited, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        yield* Effect.sleep(delay);
        continue;
      }

      lastError = error;

      // Exponential backoff with jitter for other errors (network, timeout, etc.)
      if (attempt < maxRetries - 1) {
        const baseDelay = 2 ** attempt * 1000; // 1s, 2s, 4s, 8s...
        const maxDelay = Math.min(baseDelay, 10_000); // Cap at 10s
        const jitter = Math.random() * 0.3 * maxDelay; // 0-30% jitter
        const delay = Math.floor(maxDelay + jitter);

        console.warn(
          `LLM call failed, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`,
          error.message
        );
        yield* Effect.sleep(delay);
      }
    }

    return yield* Effect.fail(
      lastError || new LLMError("Max retries exceeded")
    );
  });
};

/**
 * Check if LLM provider is available
 *
 * Determines if the specified provider can be used by checking
 * for the presence of required API keys in environment variables.
 *
 * **Use Case**: Decide whether to use LLM or fallback to heuristics
 *
 * @param provider - LLM provider to check (default: "anthropic")
 * @returns Effect yielding true if API key is configured, false otherwise
 * @example
 * ```typescript
 * const available = await Effect.runPromise(
 *   isLLMAvailable("anthropic")
 * );
 *
 * if (available) {
 *   // Use LLM-powered generation
 *   const proposal = await Effect.runPromise(
 *     proposePatternWithLLM(examples, [], "context")
 *   );
 * } else {
 *   // Fall back to heuristics
 *   const proposal = await Effect.runPromise(
 *     proposePatternHeuristic(examples, [])
 *   );
 * }
 * ```
 */
export const isLLMAvailable = (
  provider: LLMProvider = "anthropic"
): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const result = yield* Effect.either(getApiKey(provider));
    return result._tag === "Right";
  });
