"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale";

type Passage = {
  chunkId: string;
  documentTitle: string;
  category: string;
  ordinal: number;
  content: string;
  score: number;
  matchedBy: ("semantic" | "keyword")[];
};

/**
 * Retrieval, made visible.
 *
 * RAG is otherwise invisible machinery: a client sees an answer and has to
 * take on faith that it came from their document. This panel shows the actual
 * passages, which method found each one, and how long it took.
 */
export function RetrievalPreview() {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [passages, setPassages] = useState<Passage[] | null>(null);
  const [tookMs, setTookMs] = useState(0);
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/documents/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setPassages(data.passages ?? []);
      setTookMs(data.tookMs ?? 0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={run} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.retrievalPlaceholder}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || query.trim().length < 3}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {t.retrieve}
        </button>
      </form>

      {passages && (
        <div className="mt-3">
          <p className="mb-2 font-mono text-[11px] text-muted">
            {passages.length} {t.passages} · {tookMs}ms · {t.fused}
          </p>

          {passages.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface px-3 py-4 text-sm text-muted">
              {t.noMatches}
            </p>
          ) : (
            <ul className="space-y-2">
              {passages.map((p) => (
                <li key={p.chunkId} className="rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-medium">{p.documentTitle}</span>
                    <span className="font-mono text-muted">passage {p.ordinal + 1}</span>
                    {p.matchedBy.map((m) => (
                      <span
                        key={m}
                        className={`rounded border px-1 py-px font-mono text-[10px] ${
                          m === "semantic"
                            ? "border-accent/40 bg-accent-soft text-accent"
                            : "border-signal/40 bg-signal-soft text-signal"
                        }`}
                      >
                        {m}
                      </span>
                    ))}
                    <span className="ml-auto font-mono text-muted">{p.score.toFixed(4)}</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-muted">
                    {p.content.replace(/\s+/g, " ").slice(0, 320)}
                    {p.content.length > 320 ? "…" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
