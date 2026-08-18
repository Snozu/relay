"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale";

type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

/**
 * The visible machinery.
 *
 * A chat that only streams text looks like a wrapper around ChatGPT. Showing
 * the tool name, the arguments, the result line and the real latency is what
 * makes a buyer believe there is a system behind the conversation.
 */
export function ToolCall({
  name,
  state,
  input,
  output,
  errorText,
}: {
  name: string;
  state: ToolState;
  input?: unknown;
  output?: { summary?: string; ms?: number } & Record<string, unknown>;
  errorText?: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const isWrite = name === "issue_refund";

  const status = (() => {
    switch (state) {
      case "input-streaming":
        return { label: t.preparing, tone: "muted" as const };
      case "input-available":
        return { label: t.running, tone: "muted" as const };
      case "approval-requested":
        return { label: t.waitingApproval, tone: "write" as const };
      case "approval-responded":
        return { label: t.approved, tone: "accent" as const };
      case "output-available":
        return { label: output?.summary ?? t.done, tone: "accent" as const };
      case "output-error":
        return { label: errorText ?? "failed", tone: "danger" as const };
      case "output-denied":
        return { label: t.declinedByOperator, tone: "danger" as const };
    }
  })();

  const toneClass =
    status.tone === "accent"
      ? "text-accent"
      : status.tone === "write"
        ? "text-write"
        : status.tone === "danger"
          ? "text-danger"
          : "text-muted";

  const running = state === "input-streaming" || state === "input-available";

  return (
    <div className="my-2 rounded-lg border border-border bg-surface-muted text-[13px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
      >
        <span
          aria-hidden
          className={`mt-[3px] size-1.5 shrink-0 rounded-full ${
            running ? "bg-muted animate-relay-pulse" : status.tone === "danger" ? "bg-danger" : "bg-accent"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="font-mono font-medium">{name}</span>
          {isWrite && (
            <span className="ml-1.5 rounded border border-write/40 bg-write-soft px-1 py-px label text-write">
              write
            </span>
          )}
          <span className={`ml-2 ${toneClass}`}>{status.label}</span>
        </span>
        {typeof output?.ms === "number" && (
          <span className="shrink-0 font-mono text-[11px] text-muted">{output.ms}ms</span>
        )}
        <span className="shrink-0 font-mono text-[11px] text-muted">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="scroll-x border-t border-border px-3 py-2">
          <div className="mb-1 font-mono label">input</div>
          <pre className="mb-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(input ?? {}, null, 2)}
          </pre>
          {output !== undefined && (
            <>
              <div className="mb-1 font-mono label">
                result
              </div>
              <pre className="font-mono text-[11px] leading-relaxed">
                {JSON.stringify(output, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
