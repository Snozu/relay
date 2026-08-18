import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";

/**
 * Relay is not tied to one model vendor.
 *
 * The tool layer, the approval policy and the audit log are the system. The
 * model is a swappable part. A client standardised on one provider does not
 * have to be talked out of it.
 *
 * Credentials can arrive two ways:
 *
 *   1. From the server environment — how a deployment normally runs.
 *   2. From the request, when a visitor supplies their own key in the console.
 *
 * A request-supplied key is used for that one request and then discarded. It is
 * never written to disk, never logged, never placed in the audit trail, and
 * never sent anywhere except the model provider it belongs to.
 */
export type ProviderName = "deepseek" | "anthropic";

const DEFAULT_MODEL: Record<ProviderName, string> = {
  deepseek: "deepseek-chat",
  anthropic: "claude-sonnet-5",
};

const KEY_ENV: Record<ProviderName, string> = {
  deepseek: "DEEPSEEK_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

/** Shape a caller may supply per request, from the console's settings panel. */
export type ModelOverride = {
  provider?: string | null;
  apiKey?: string | null;
  model?: string | null;
};

function normalise(provider: string | null | undefined): ProviderName {
  return provider?.toLowerCase() === "anthropic" ? "anthropic" : "deepseek";
}

export function activeProvider(override?: ModelOverride): ProviderName {
  return normalise(override?.provider ?? process.env.RELAY_PROVIDER ?? "deepseek");
}

/**
 * Returns the name of the missing environment variable, or null when the
 * request can proceed. A key supplied on the request satisfies this.
 */
export function missingKey(override?: ModelOverride): string | null {
  if (override?.apiKey) return null;
  const provider = activeProvider(override);
  return process.env[KEY_ENV[provider]] ? null : KEY_ENV[provider];
}

export function resolveModel(override?: ModelOverride): {
  model: LanguageModel;
  provider: ProviderName;
  modelId: string;
  usingOwnKey: boolean;
} {
  const provider = activeProvider(override);
  const modelId = override?.model || process.env.RELAY_MODEL || DEFAULT_MODEL[provider];
  const apiKey = override?.apiKey || process.env[KEY_ENV[provider]];

  const model =
    provider === "anthropic"
      ? createAnthropic({ apiKey })(modelId)
      : createDeepSeek({ apiKey })(modelId);

  return { model, provider, modelId, usingOwnKey: Boolean(override?.apiKey) };
}

/**
 * Reads a per-request model override from headers.
 *
 * Headers rather than the body so the key never lands in a request log that
 * captures payloads, and never reaches the message history.
 */
export function overrideFromHeaders(headers: Headers): ModelOverride {
  return {
    provider: headers.get("x-relay-provider"),
    apiKey: headers.get("x-relay-key"),
    model: headers.get("x-relay-model"),
  };
}
