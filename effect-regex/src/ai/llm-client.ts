/**
 * LLM Client for AI-powered pattern generation
 * Supports multiple providers with Effect-based error handling
 */

import Anthropic from "@anthropic-ai/sdk";
import { Effect } from "effect";

/**
 * Supported LLM providers
 */
export type LLMProvider = "anthropic" | "openai" | "local" | "none";

/**
 * LLM configuration
 */
export interface LLMConfig {
  readonly provider: LLMProvider;
  readonly apiKey?: string;
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

/**
 * LLM error types
 */
export class LLMError {
  readonly _tag = "LLMError";
  constructor(
    readonly message: string,
    readonly cause?: unknown
  ) {}
}

export class LLMConfigError {
  readonly _tag = "LLMConfigError";
  constructor(readonly message: string) {}
}

export class LLMRateLimitError {
  readonly _tag = "LLMRateLimitError";
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
            retryAfter ? Number.parseInt(retryAfter) : undefined
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
 * Main LLM call function with provider routing
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
 * Call LLM with retry logic and fallback
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

      // Don't retry config errors
      if (error._tag === "LLMConfigError") {
        return yield* Effect.fail(error);
      }

      // Handle rate limiting with exponential backoff
      if (error._tag === "LLMRateLimitError") {
        const delay = error.retryAfter
          ? error.retryAfter * 1000
          : 2 ** attempt * 1000;

        yield* Effect.sleep(delay);
        continue;
      }

      lastError = error;

      // Exponential backoff for other errors
      if (attempt < maxRetries - 1) {
        yield* Effect.sleep(2 ** attempt * 1000);
      }
    }

    return yield* Effect.fail(
      lastError || new LLMError("Max retries exceeded")
    );
  });
};

/**
 * Check if LLM is available (API key configured)
 */
export const isLLMAvailable = (
  provider: LLMProvider = "anthropic"
): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const result = yield* Effect.either(getApiKey(provider));
    return result._tag === "Right";
  });
