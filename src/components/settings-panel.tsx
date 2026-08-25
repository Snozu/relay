"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_SETTINGS,
  clearSettings,
  loadSettings,
  maskKey,
  saveSettings,
  type RelaySettings,
} from "@/lib/settings";
import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  defaultModelFor,
  detectProvider,
  providerSpec,
  type ProviderId,
} from "@/lib/providers";
import { useLocale } from "@/lib/locale";

/** Sentinel option: the visitor wants a model id that is not on the list. */
const CUSTOM = "__custom";

export function SettingsPanel({ onChanged }: { onChanged: () => void }) {
  const { t } = useLocale();
  const [settings, setSettings] = useState<RelaySettings>(EMPTY_SETTINGS);
  const [draftKey, setDraftKey] = useState("");
  const [detected, setDetected] = useState<ProviderId | null>(null);
  // null = derive it from the stored model id; a boolean = the visitor chose.
  const [customMode, setCustomMode] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const active = Boolean(settings.apiKey);
  const provider = providerSpec(settings.provider || DEFAULT_PROVIDER);
  const selectedModel = settings.model || provider.models[0].id;
  const listed = provider.models.find((m) => m.id === selectedModel);
  const custom = customMode ?? !listed;

  function persist(next: RelaySettings) {
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onChanged();
  }

  /** Provider and model move together: a model id is meaningless on its own. */
  function selectProvider(id: ProviderId) {
    setCustomMode(false);
    persist({ ...settings, provider: id, model: defaultModelFor(id) });
  }

  /**
   * The key itself says which provider it belongs to, so typing one switches
   * the selection and the model list underneath it. Still overridable: the
   * guess is a shortcut, not a lock.
   */
  function onKeyDraft(value: string) {
    setDraftKey(value);
    const guess = detectProvider(value);
    setDetected(guess);
    if (guess && guess !== settings.provider) selectProvider(guess);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[12px] font-medium">{t.settingsTitle}</h3>
        <p className="mt-1 text-[11px] leading-snug text-muted">{t.settingsIntro}</p>
      </div>

      <div
        className={`rounded-console border px-3 py-2 text-[11px] ${
          active ? "border-signal/40 bg-signal-soft text-signal" : "border-border bg-surface text-muted"
        }`}
      >
        {active ? t.usingOwnKey(provider.label) : t.usingServerKey}
      </div>

      <div>
        <label className="label mb-1.5 block">{t.provider}</label>
        <div className="flex gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectProvider(p.id)}
              className={`rounded-console border px-2.5 py-1 text-[12px] transition-colors ${
                (settings.provider || DEFAULT_PROVIDER) === p.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label mb-1.5 block">{t.apiKey}</label>

        {active ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-console border border-border bg-surface px-2 py-1.5 font-mono text-[11px]">
              {maskKey(settings.apiKey)}
            </code>
            <button
              type="button"
              onClick={() => {
                clearSettings();
                setSettings(EMPTY_SETTINGS);
                setDraftKey("");
                setDetected(null);
                setCustomMode(null);
                onChanged();
              }}
              className="shrink-0 font-mono text-[11px] text-muted transition-colors hover:text-danger"
            >
              {t.removeKey}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const key = draftKey.trim();
              if (!key) return;
              const id = detectProvider(key) ?? (settings.provider || DEFAULT_PROVIDER);
              persist({
                ...settings,
                provider: id,
                apiKey: key,
                model: settings.model || defaultModelFor(id),
              });
              setDraftKey("");
              setDetected(null);
            }}
            className="flex gap-2"
          >
            <input
              type="password"
              value={draftKey}
              onChange={(e) => onKeyDraft(e.target.value)}
              placeholder={provider.keyPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-console border border-border bg-background px-2 py-1.5 font-mono text-[11px] outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              type="submit"
              disabled={!draftKey.trim()}
              className="shrink-0 rounded-console bg-accent px-2.5 py-1.5 text-[12px] font-medium text-accent-contrast transition-opacity disabled:opacity-40"
            >
              {t.useKey}
            </button>
          </form>
        )}

        {detected && !active && (
          <p className="mt-1.5 text-[11px] text-signal">{t.providerDetected(providerSpec(detected).label)}</p>
        )}

        <p className="mt-2 text-[11px] leading-snug text-muted">
          {t.keyPrivacy}{" "}
          <a
            href={provider.keysUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline underline-offset-2"
          >
            {t.getKey(provider.label)}
          </a>
        </p>
      </div>

      <div>
        <label className="label mb-1.5 block">{t.model}</label>
        <select
          value={custom ? CUSTOM : selectedModel}
          onChange={(e) => {
            if (e.target.value === CUSTOM) {
              setCustomMode(true);
              return;
            }
            setCustomMode(false);
            persist({ ...settings, model: e.target.value });
          }}
          className="w-full rounded-console border border-border bg-background px-2 py-1.5 font-mono text-[11px] outline-none focus:border-accent"
        >
          {provider.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value={CUSTOM}>{t.modelCustom}</option>
        </select>

        {custom ? (
          <input
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            onBlur={() => persist(settings)}
            placeholder={t.modelCustomPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 w-full rounded-console border border-border bg-background px-2 py-1.5 font-mono text-[11px] outline-none placeholder:text-muted focus:border-accent"
          />
        ) : (
          listed && <p className="mt-1.5 text-[11px] leading-snug text-muted">{listed.note}</p>
        )}
      </div>

      {saved && <p className="text-[11px] text-signal">{t.settingsSaved}</p>}
    </div>
  );
}
