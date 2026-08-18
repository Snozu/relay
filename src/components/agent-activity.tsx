"use client";

import type { UIMessage } from "ai";
import { useState } from "react";
import { useLocale } from "@/lib/locale";

/**
 * The orchestration, made visible.
 *
 * This is the panel that answers "what is it actually doing?". It shows the
 * orchestrator delegating, each specialist's own tool calls nested underneath,
 * and the real latency of every step. Without it, a multi-agent system looks
 * exactly like a single chatbot.
 */

type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
};

const isToolPart = (p: { type: string }): p is ToolPart => p.type.startsWith("tool-");

const SPECIALIST_ACCENT: Record<string, string> = {
  consult_operations: "text-accent",
  consult_knowledge: "text-signal",
};

type Step =
  | { kind: "delegation"; id: string; tool: string; label: string; accent: string; task: string; state: string; children: Leaf[]; text: string }
  | { kind: "write"; id: string; state: string; summary: string };

type Leaf = { id: string; name: string; state: string; summary: string; ms?: number };

function leavesFromSubagent(output: unknown): { leaves: Leaf[]; text: string } {
  const message = output as UIMessage | undefined;
  if (!message?.parts) return { leaves: [], text: "" };

  const leaves: Leaf[] = [];
  let text = "";

  for (const part of message.parts) {
    if (part.type === "text") {
      text += part.text;
      continue;
    }
    if (!isToolPart(part)) continue;

    const out = part.output as { summary?: string; ms?: number } | undefined;
    leaves.push({
      id: part.toolCallId,
      name: part.type.replace(/^tool-/, ""),
      state: part.state,
      summary: out?.summary ?? (part.state === "output-error" ? (part.errorText ?? "failed") : "running"),
      ms: out?.ms,
    });
  }

  return { leaves, text };
}

export function AgentActivity({ messages, busy }: { messages: UIMessage[]; busy: boolean }) {
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const SPECIALISTS: Record<string, string> = {
    consult_operations: t.operationsSpecialist,
    consult_knowledge: t.knowledgeSpecialist,
  };
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  const steps: Step[] = [];

  if (lastAssistant) {
    for (const part of lastAssistant.parts) {
      if (!isToolPart(part)) continue;
      const name = part.type.replace(/^tool-/, "");

      if (name in SPECIALISTS) {
        const { leaves, text } = leavesFromSubagent(part.output);
        steps.push({
          kind: "delegation",
          id: part.toolCallId,
          tool: name,
          label: SPECIALISTS[name],
          accent: SPECIALIST_ACCENT[name],
          task: String(part.input?.task ?? ""),
          state: part.state,
          children: leaves,
          text,
        });
      } else if (name === "issue_refund") {
        const out = part.output as { summary?: string } | undefined;
        steps.push({
          kind: "write",
          id: part.toolCallId,
          state: part.state,
          summary: out?.summary ?? t.waitingApproval,
        });
      }
    }
  }

  return (
    <div
      className={`flex shrink-0 flex-col border-b border-border ${
        collapsed ? "" : "max-h-[42%]"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="label">{t.activity}</span>
        <span
          className={`size-1.5 rounded-full ${busy ? "bg-accent animate-relay-pulse" : "bg-border"}`}
        />
        <span className="ml-auto font-mono text-[10px] text-muted">{t.topology}</span>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "expand" : "collapse"}
          className="font-mono text-[11px] leading-none text-muted transition-colors hover:text-accent"
        >
          {collapsed ? "+" : "−"}
        </button>
      </div>

      {!collapsed && (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {steps.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[12px] leading-relaxed text-muted">
            {t.activityEmpty}
          </p>
        ) : (
          <ol className="space-y-2">
            {steps.map((step) =>
              step.kind === "delegation" ? (
                <li key={step.id} className="rounded-lg border border-border bg-surface-muted">
                  <div className="flex items-start gap-2 px-3 py-2">
                    <span className="mt-[3px] font-mono text-[10px] text-muted">→</span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12px] font-medium ${step.accent}`}>{step.label}</div>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted">{step.task}</p>
                    </div>
                    {step.state === "output-available" ? (
                      <span className="font-mono text-[10px] text-muted">{t.done}</span>
                    ) : (
                      <span className="size-1.5 shrink-0 rounded-full bg-muted animate-relay-pulse" />
                    )}
                  </div>

                  {step.children.length > 0 && (
                    <ul className="border-t border-border/60 px-3 py-1.5">
                      {step.children.map((leaf) => (
                        <li key={leaf.id} className="flex items-start gap-2 py-1">
                          <span className="mt-[5px] size-1 shrink-0 rounded-full bg-border" />
                          <span className="min-w-0 flex-1">
                            <span className="font-mono text-[11px]">{leaf.name}</span>
                            <span className="ml-1.5 text-[11px] text-muted">{leaf.summary}</span>
                          </span>
                          {typeof leaf.ms === "number" && (
                            <span className="shrink-0 font-mono text-[10px] text-muted">
                              {leaf.ms}ms
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li
                  key={step.id}
                  className="rounded-lg border border-write/40 bg-write-soft px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="label !text-write">{t.writeOrchestrator}</span>
                    <span className="ml-auto rounded border border-write/40 px-1 py-px font-mono text-[9px] uppercase text-write">
                      {t.notDelegated}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{step.summary}</p>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
      )}
    </div>
  );
}
