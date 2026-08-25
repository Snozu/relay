/**
 * The provider and model catalogue.
 *
 * One list, read by both sides: the settings panel renders it, the server
 * resolves against it. A model that is not in here is still allowed — the panel
 * has a custom field — but the listed ones are the ones this demo is known to
 * work with, which is the only thing a prospect on a call cares about.
 *
 * Two rules governed what made the list:
 *
 *   1. It must support tool calling. Relay is nine tools and a delegation step;
 *      a model that cannot call a tool cannot run the demo at all.
 *   2. The first entry of each provider is the default, and it is the cheap,
 *      fast one. A visitor pasting their own key should not discover the bill
 *      afterwards.
 */
export const PROVIDER_IDS = ["deepseek", "anthropic", "openai"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type ModelChoice = {
  id: string;
  label: string;
  /** One line, shown under the dropdown. Why you would pick this one. */
  note: string;
};

export type ProviderSpec = {
  id: ProviderId;
  label: string;
  envVar: string;
  keyPlaceholder: string;
  keysUrl: string;
  /** First entry is the default for this provider. */
  models: readonly ModelChoice[];
};

export const PROVIDERS: readonly ProviderSpec[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    envVar: "DEEPSEEK_API_KEY",
    keyPlaceholder: "sk-…",
    keysUrl: "https://platform.deepseek.com/api_keys",
    models: [
      {
        id: "deepseek-chat",
        label: "DeepSeek Chat",
        note: "The demo default. Cheapest run of the full flow, tool calling included.",
      },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    envVar: "ANTHROPIC_API_KEY",
    keyPlaceholder: "sk-ant-…",
    keysUrl: "https://console.anthropic.com/settings/keys",
    models: [
      {
        id: "claude-sonnet-5",
        label: "Claude Sonnet 5",
        note: "Balanced. The best read of a messy operations question per dollar.",
      },
      {
        id: "claude-haiku-4-5",
        label: "Claude Haiku 4.5",
        note: "Fastest and cheapest. Good when you want the console to feel instant.",
      },
      {
        id: "claude-opus-5",
        label: "Claude Opus 5",
        note: "Strongest reasoning, slowest and most expensive of the three.",
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    keyPlaceholder: "sk-proj-…",
    keysUrl: "https://platform.openai.com/api-keys",
    models: [
      {
        id: "gpt-5.4-mini",
        label: "GPT-5.4 mini",
        note: "Fast and cheap. The sensible default for trying the demo on your own key.",
      },
      {
        id: "gpt-5.5",
        label: "GPT-5.5",
        note: "Flagship. Best quality, and newer accounts may need verification to reach it.",
      },
      {
        id: "gpt-4.1",
        label: "GPT-4.1",
        note: "Older, broadly available. Use it if the newer two are not enabled on your account.",
      },
    ],
  },
] as const;

export const DEFAULT_PROVIDER: ProviderId = "deepseek";

export function providerSpec(id: string | null | undefined): ProviderSpec {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS.find((p) => p.id === DEFAULT_PROVIDER)!;
}

export function defaultModelFor(id: string | null | undefined): string {
  return providerSpec(id).models[0].id;
}

export function isKnownModel(providerId: string | null | undefined, modelId: string): boolean {
  return providerSpec(providerId).models.some((m) => m.id === modelId);
}

/**
 * Guesses the provider from the shape of the key.
 *
 * Every provider here issues `sk-` keys, so the prefix alone is not enough.
 * Anthropic and OpenAI both namespace theirs; DeepSeek's is a bare 32-character
 * hex string, which is what makes it identifiable at all.
 *
 * A guess, not a verdict: the panel pre-selects it and the visitor can override
 * it with one click. Returns null when the shape says nothing.
 */
export function detectProvider(key: string): ProviderId | null {
  const k = key.trim();
  if (!k) return null;
  if (k.startsWith("sk-ant-")) return "anthropic";
  if (k.startsWith("sk-proj-") || k.startsWith("sk-svcacct-") || k.startsWith("sk-None-")) {
    return "openai";
  }
  if (/^sk-[0-9a-f]{32}$/.test(k)) return "deepseek";
  return null;
}
