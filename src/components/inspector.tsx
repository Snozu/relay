"use client";

import { useCallback, useEffect, useState } from "react";
import { DocumentUpload } from "@/components/document-upload";
import { DocumentList, type DocumentRow } from "@/components/document-list";
import { RetrievalPreview } from "@/components/retrieval-preview";
import { useLocale } from "@/lib/locale";
import { SettingsPanel } from "@/components/settings-panel";

type Tab = "knowledge" | "audit" | "data" | "settings";

type AuditCall = {
  id: string;
  name: string;
  input: unknown;
  outputSummary: string;
  status: string;
  durationMs: number;
  createdAt: string;
};

export type Stats = {
  provider: string;
  model: string;
  business: {
    orders: number;
    customers: number;
    tickets: number;
    shipments: number;
    refunds: number;
    delayed: number;
  };
  knowledge: { documents: number; chunks: number };
  activity: { toolCalls: number; avgMs: number };
};

export function Inspector({
  stats,
  onRefreshStats,
  onSettingsChanged,
}: {
  stats: Stats | null;
  onRefreshStats: () => void;
  onSettingsChanged: () => void;
}) {
  const { t } = useLocale();
  const TABS: { id: Tab; label: string }[] = [
    { id: "knowledge", label: t.tabKnowledge },
    { id: "audit", label: t.tabAudit },
    { id: "data", label: t.tabData },
    { id: "settings", label: t.tabSettings },
  ];
  const [tab, setTab] = useState<Tab>("knowledge");
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [calls, setCalls] = useState<AuditCall[]>([]);

  const loadDocuments = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocuments(data.documents ?? []);
    onRefreshStats();
  }, [onRefreshStats]);

  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/audit");
    const data = await res.json();
    setCalls(data.calls ?? []);
  }, []);

  useEffect(() => {
    if (tab === "knowledge") void loadDocuments();
    if (tab === "audit") void loadAudit();
  }, [tab, loadDocuments, loadAudit]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
              tab === t.id ? "bg-surface-muted font-medium" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        {tab === "audit" && (
          <button
            type="button"
            onClick={() => void loadAudit()}
            className="ml-auto font-mono text-[10px] text-muted transition-colors hover:text-accent"
          >
            {t.refresh}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "knowledge" && (
          <div className="space-y-4">
            <DocumentUpload onUploaded={loadDocuments} />
            <DocumentList documents={documents} onChanged={loadDocuments} />
            <div>
              <h3 className="mb-1 text-[12px] font-medium">{t.retrievalPreview}</h3>
              <p className="mb-2 text-[11px] leading-snug text-muted">{t.retrievalNote}</p>
              <RetrievalPreview />
            </div>
          </div>
        )}

        {tab === "audit" && (
          <>
            {calls.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted">
                {t.auditEmpty}
              </p>
            ) : (
              <ul className="space-y-1">
                {calls.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{c.name}</span>
                      {c.name === "issue_refund" && (
                        <span className="rounded border border-write/40 bg-write-soft px-1 font-mono text-[9px] uppercase text-write">
                          write
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[10px] text-muted">
                        {c.durationMs}ms
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {c.createdAt.slice(11, 19)}
                      </span>
                    </div>
                    <p className={`mt-0.5 ${c.status === "ok" ? "text-muted" : "text-danger"}`}>
                      {c.outputSummary}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "settings" && <SettingsPanel onChanged={onSettingsChanged} />}

        {tab === "data" && stats && (
          <div className="space-y-4">
            <Section
              title={t.businessData}
              caption={t.businessDataNote}
              rows={[
                [t.statOrders, stats.business.orders],
                [t.statDelayed, stats.business.delayed],
                [t.statCustomers, stats.business.customers],
                [t.statShipments, stats.business.shipments],
                [t.statTickets, stats.business.tickets],
                [t.statRefunds, stats.business.refunds],
              ]}
            />
            <Section
              title={t.knowledgeBase}
              caption={t.knowledgeBaseNote}
              rows={[
                [t.statDocuments, stats.knowledge.documents],
                [t.statPassages, stats.knowledge.chunks],
              ]}
            />
            <Section
              title={t.activityStats}
              caption={t.activityNote}
              rows={[
                [t.statToolCalls, stats.activity.toolCalls],
                [t.statLatency, `${stats.activity.avgMs}ms`],
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  caption,
  rows,
}: {
  title: string;
  caption: string;
  rows: [string, string | number][];
}) {
  return (
    <div>
      <h3 className="text-[12px] font-medium">{title}</h3>
      <p className="mb-2 text-[11px] leading-snug text-muted">{caption}</p>
      <dl className="overflow-hidden rounded-lg border border-border bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 last:border-0">
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className="font-mono text-[12px]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
