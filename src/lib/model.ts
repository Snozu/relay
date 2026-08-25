import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  defaultModelFor,
  providerSpec,
  type ProviderId,
} from "@/lib/providers";

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
 *
 * Which providers exist and which models each one offers lives in
 * `providers.ts`, shared with the settings panel so the dropdown and the server
 * can never disagree.
 */
export type ProviderName = ProviderId;

/** Shape a caller may supply per request, from the console's settings panel. */
export type ModelOverride = {
  provider?: string | null;
  apiKey?: string | null;
  model?: string | null;
};

function normalise(provider: string | null | undefined): ProviderName {
  const id = provider?.toLowerCase();
  return PROVIDERS.some((p) => p.id === id) ? (id as ProviderName) : DEFAULT_PROVIDER;
}

export function activeProvider(override?: ModelOverride): ProviderName {
  return normalise(override?.provider ?? process.env.RELAY_PROVIDER ?? DEFAULT_PROVIDER);
}

/**
 * Returns the name of the missing environment variable, or null when the
 * request can proceed. A key supplied on the request satisfies this.
 */
export function missingKey(override?: ModelOverride): string | null {
  if (override?.apiKey) return null;
  const envVar = providerSpec(activeProvider(override)).envVar;
  return process.env[envVar] ? null : envVar;
}

export function resolveModel(override?: ModelOverride): {
  model: LanguageModel;
  provider: ProviderName;
  modelId: string;
  usingOwnKey: boolean;
} {
  const provider = activeProvider(override);
  // A model id only travels with the provider it belongs to: a stale
  // `claude-sonnet-5` left in localStorage must not follow a switch to OpenAI.
  const requested = override?.provider ? override?.model : override?.model || process.env.RELAY_MODEL;
  const modelId = requested || defaultModelFor(provider);
  const apiKey = override?.apiKey || process.env[providerSpec(provider).envVar];

  const model =
    provider === "anthropic"
      ? createAnthropic({ apiKey })(modelId)
      : provider === "openai"
        ? createOpenAI({ apiKey })(modelId)
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
