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
import { useLocale } from "@/lib/locale";

const PROVIDERS = [
  { id: "deepseek", label: "DeepSeek", placeholder: "sk-…", url: "https://platform.deepseek.com/api_keys" },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-…", url: "https://console.anthropic.com/settings/keys" },
] as const;

export function SettingsPanel({ onChanged }: { onChanged: () => void }) {
  const { t } = useLocale();
  const [settings, setSettings] = useState<RelaySettings>(EMPTY_SETTINGS);
  const [draftKey, setDraftKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const active = Boolean(settings.apiKey);
  const provider = PROVIDERS.find((p) => p.id === (settings.provider || "deepseek"))!;

  function persist(next: RelaySettings) {
    setSettings(next);
    saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onChanged();
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
              onClick={() => persist({ ...settings, provider: p.id })}
              className={`rounded-console border px-2.5 py-1 text-[12px] transition-colors ${
                (settings.provider || "deepseek") === p.id
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
              if (!draftKey.trim()) return;
              persist({ ...settings, provider: settings.provider || "deepseek", apiKey: draftKey.trim() });
              setDraftKey("");
            }}
            className="flex gap-2"
          >
            <input
              type="password"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder={provider.placeholder}
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

        <p className="mt-2 text-[11px] leading-snug text-muted">
          {t.keyPrivacy}{" "}
          <a
            href={provider.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline underline-offset-2"
          >
            {t.getKey(provider.label)}
          </a>
        </p>
      </div>

      <div>
        <label className="label mb-1.5 block">{t.modelOptional}</label>
        <input
          value={settings.model}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          onBlur={() => persist(settings)}
          placeholder={settings.provider === "anthropic" ? "claude-sonnet-5" : "deepseek-chat"}
          className="w-full rounded-console border border-border bg-background px-2 py-1.5 font-mono text-[11px] outline-none placeholder:text-muted focus:border-accent"
        />
      </div>

      {saved && <p className="text-[11px] text-signal">{t.settingsSaved}</p>}
    </div>
  );
}
