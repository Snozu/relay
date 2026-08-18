"use client";

import { useLocale } from "@/lib/locale";

/**
 * The confirmation card.
 *
 * The most persuasive element in the demo. A client deciding whether to let an
 * AI touch their systems is really asking "can it do something expensive
 * without me?". The answer is on this card: the agent proposes, a human
 * approves, and nothing moves until they do.
 *
 * The card reports only what has actually happened. "Approved" and "executed"
 * are two different states and it never conflates them — claiming a write
 * landed before it did would be the one lie that discredits the whole system.
 */
export type ApprovalState =
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-denied"
  | "output-error";

export function ApprovalCard({
  input,
  state,
  approved,
  summary,
  errorText,
  onDecision,
}: {
  input: { orderNumber?: string; amountUsd?: number; reason?: string };
  state: ApprovalState;
  approved?: boolean;
  summary?: string;
  errorText?: string;
  onDecision: (approved: boolean) => void;
}) {
  const { t } = useLocale();
  const amount =
    typeof input.amountUsd === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.amountUsd)
      : "—";

  return (
    <div className="my-3 overflow-hidden rounded-console border border-write/40 bg-write-soft">
      <div className="flex items-center gap-2 border-b border-write/25 px-4 py-2">
        <span className="label !text-write">{t.approvalRequired}</span>
        <span className="label ml-auto">{t.writeOrchestrator} · {t.notDelegated}</span>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm">{t.approvalIntro}</p>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">{t.order}</dt>
          <dd className="font-mono">{input.orderNumber ?? "—"}</dd>
          <dt className="text-muted">{t.amount}</dt>
          <dd className="font-mono font-semibold tnum">{amount}</dd>
          <dt className="text-muted">{t.reason}</dt>
          <dd>{input.reason ?? "—"}</dd>
        </dl>

        {state === "approval-requested" && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onDecision(true)}
              className="rounded-console bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
            >
              {t.approveRefund}
            </button>
            <button
              type="button"
              onClick={() => onDecision(false)}
              className="rounded-console border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-muted"
            >
              {t.cancel}
            </button>
          </div>
        )}

        {state === "approval-responded" && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            {approved ? (
              <>
                <span className="size-1.5 rounded-full bg-write animate-relay-pulse" />
                {t.executing}
              </>
            ) : (
              t.declined
            )}
          </p>
        )}

        {state === "output-available" && (
          <p className="mt-3 text-sm text-foreground">
            {summary} {t.written}
          </p>
        )}

        {state === "output-denied" && (
          <p className="mt-3 text-sm text-muted">{t.declined}</p>
        )}

        {state === "output-error" && (
          <p className="mt-3 text-sm text-danger">
            {t.refundFailed} {errorText}
          </p>
        )}
      </div>
    </div>
  );
}
