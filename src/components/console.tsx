"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { ToolCall } from "@/components/tool-call";
import { ApprovalCard, type ApprovalState } from "@/components/approval-card";
import { Markdown } from "@/components/markdown";
import { AgentActivity } from "@/components/agent-activity";
import { ToolRender, HAS_RENDER } from "@/components/renders";
import { Architecture } from "@/components/architecture";
import { Inspector, type Stats } from "@/components/inspector";
import { useLocale } from "@/lib/locale";
import { LOCALES } from "@/lib/i18n";
import { loadSettings, settingsHeaders } from "@/lib/settings";

type ToolPart = {
  type: string;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "approval-requested"
    | "approval-responded"
    | "output-available"
    | "output-error"
    | "output-denied";
  input?: Record<string, unknown>;
  output?: { summary?: string; ms?: number } & Record<string, unknown>;
  errorText?: string;
  approval?: { id: string; isAutomatic?: boolean; approved?: boolean; reason?: string };
};

const isToolPart = (p: { type: string }): p is ToolPart => p.type.startsWith("tool-");

export function Console() {
  const { locale, setLocale, t } = useLocale();
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<"console" | "architecture">("console");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Bumped whenever the settings panel changes, so the header badge re-reads.
  const [settingsVersion, setSettingsVersion] = useState(0);
  const ownKey = useMemo(() => loadSettings().apiKey !== "", [settingsVersion]);

  const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // A function, not a fixed object: the key is read fresh on every request,
      // so pasting one takes effect on the very next message.
      headers: () => settingsHeaders(),
    }),
    // Two different continuations. A completed tool call resumes the loop, and
    // so does an approval decision — without the second, pressing Approve
    // records the decision and the write never actually runs.
    sendAutomaticallyWhen: (options) =>
      lastAssistantMessageIsCompleteWithToolCalls(options) ||
      lastAssistantMessageIsCompleteWithApprovalResponses(options),
  });

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      setStats(await res.json());
    } catch {
      // The console still works without the header counters.
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!busy) void loadStats();
  }, [busy, loadStats]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* ── header ─────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-3 py-2.5 sm:gap-3 sm:px-4">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-signal" aria-hidden />
          <span className="text-[16px] font-semibold tracking-[-0.02em]">Relay</span>
        </span>
        <span className="hidden h-3.5 w-px bg-border-strong sm:block" aria-hidden />
        <span className="label hidden sm:inline">{t.subtitle}</span>

        <span className="ml-1 flex shrink-0 overflow-hidden rounded-console border border-border text-[11px] sm:ml-4">
          {(["console", "architecture"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-2.5 py-1 transition-colors ${
                view === v ? "bg-surface-muted font-medium" : "text-muted hover:text-foreground"
              }`}
            >
              {v === "console" ? t.viewConsole : t.viewArchitecture}
            </button>
          ))}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px] text-muted sm:gap-3">
          {stats && (
            <>
              <span className="hidden md:inline">
                {stats.business.orders} {t.orders} · {stats.knowledge.chunks} {t.passages}
              </span>
              <span
                className={`hidden rounded border px-1.5 py-0.5 sm:inline ${
                  ownKey ? "border-signal/50 text-signal" : "border-border"
                }`}
                title={ownKey ? "Running on your own API key" : undefined}
              >
                {stats.provider}/{stats.model}
                {ownKey ? " · your key" : ""}
              </span>
            </>
          )}
          <span className="flex overflow-hidden rounded border border-border">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`px-2 py-1 uppercase transition-colors sm:px-1.5 sm:py-0.5 ${
                  locale === l ? "bg-accent text-accent-contrast" : "hover:text-accent"
                }`}
              >
                {l}
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="shrink-0 rounded border border-border px-2 py-1 transition-colors hover:text-accent lg:hidden"
          >
            {panelOpen ? t.hide : t.inspect}
          </button>
        </div>
      </header>

      {view === "architecture" ? (
        <Architecture messages={messages} />
      ) : (
      <div className="flex min-h-0 flex-1">
        {/* ── conversation ─────────────────────────────────────────────── */}
        <section className={`flex min-w-0 flex-1 flex-col ${panelOpen ? "hidden lg:flex" : "flex"}`}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-4 py-6">
              {messages.length === 0 && (
                <div className="py-8">
                  <p className="label mb-3">{t.eyebrow}</p>
                  <h2 className="max-w-lg text-[32px] font-semibold leading-[1.1] tracking-[-0.03em]">
                    {t.heading}
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{t.intro}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {t.starters.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => submit(s)}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-sm transition-colors hover:border-accent hover:text-accent"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className="mb-5">
                  {message.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-sm text-accent-contrast">
                        {message.parts.map((p, i) =>
                          p.type === "text" ? <span key={i}>{p.text}</span> : null,
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {message.parts.map((part, i) => {
                        if (part.type === "text") {
                          return <Markdown key={i}>{part.text}</Markdown>;
                        }

                        if (!isToolPart(part)) return null;
                        const name = part.type.replace(/^tool-/, "");

                        if (name === "issue_refund" && part.state !== "input-streaming") {
                          return (
                            <ApprovalCard
                              key={part.toolCallId}
                              state={part.state as ApprovalState}
                              approved={part.approval?.approved}
                              summary={part.output?.summary}
                              errorText={part.errorText}
                              input={
                                part.input as {
                                  orderNumber?: string;
                                  amountUsd?: number;
                                  reason?: string;
                                }
                              }
                              onDecision={(approved) =>
                                addToolApprovalResponse({ id: part.approval!.id, approved })
                              }
                            />
                          );
                        }

                        // A delegation carries the specialist's whole message.
                        // Its tool results are what the operator actually wants
                        // to see, so they are rendered here as real components
                        // rather than left buried in the activity panel.
                        const nested = name.startsWith("consult_")
                          ? ((part.output as { parts?: ToolPart[] } | undefined)?.parts ?? []).filter(
                              isToolPart,
                            )
                          : [];

                        return (
                          <div key={part.toolCallId}>
                            <ToolCall
                              name={
                                name === "consult_operations"
                                  ? t.operationsSpecialist
                                  : name === "consult_knowledge"
                                    ? t.knowledgeSpecialist
                                    : name
                              }
                              state={part.state}
                              input={part.input}
                              output={
                                name.startsWith("consult_")
                                  ? { summary: t.reportedBack }
                                  : part.output
                              }
                              errorText={part.errorText}
                            />

                            {nested
                              .filter(
                                (n) =>
                                  n.state === "output-available" &&
                                  HAS_RENDER.has(n.type.replace(/^tool-/, "")),
                              )
                              .map((n) => (
                                <ToolRender
                                  key={n.toolCallId}
                                  name={n.type.replace(/^tool-/, "")}
                                  output={n.output}
                                />
                              ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {busy && messages.at(-1)?.role === "user" && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span className="size-1.5 rounded-full bg-muted animate-relay-pulse" />
                  {t.routing}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger">
                  {error.message}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-surface">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
              className="mx-auto flex w-full max-w-2xl items-end gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                rows={1}
                placeholder={t.composer}
                className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-[16px] outline-none placeholder:text-muted focus:border-accent"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-opacity disabled:opacity-40"
              >
                {t.send}
              </button>
            </form>
          </div>
        </section>

        {/* ── inspector ────────────────────────────────────────────────── */}
        <aside
          className={`min-h-0 w-full shrink-0 flex-col border-border bg-background lg:flex lg:w-[27rem] lg:border-l ${
            panelOpen ? "flex" : "hidden"
          }`}
        >
          <AgentActivity messages={messages} busy={busy} />
          <Inspector
            stats={stats}
            onRefreshStats={loadStats}
            onSettingsChanged={() => setSettingsVersion((v) => v + 1)}
          />
        </aside>
      </div>
      )}
    </div>
  );
}
