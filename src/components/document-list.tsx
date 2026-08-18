"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale";

export type DocumentRow = {
  id: string;
  title: string;
  filename: string;
  category: string;
  status: string;
  chunkCount: number;
  sizeBytes: number;
  uploadedAt: string;
};

export function DocumentList({
  documents,
  onChanged,
}: {
  documents: DocumentRow[];
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    try {
      await fetch("/api/documents", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      onChanged();
    } finally {
      setRemoving(null);
    }
  }

  if (documents.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        {t.libraryEmpty}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{d.title}</span>
              <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] text-muted">
                {d.category}
              </span>
              {d.status !== "ready" && (
                <span className="rounded border border-write/40 bg-write-soft px-1.5 py-px font-mono text-[10px] text-write">
                  {d.status}
                </span>
              )}
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted">
              {t.passagesCount(d.chunkCount)} · {(d.sizeBytes / 1024).toFixed(0)}KB · {d.filename}
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove(d.id)}
            disabled={removing === d.id}
            className="shrink-0 font-mono text-[11px] text-muted transition-colors hover:text-danger disabled:opacity-40"
          >
            {removing === d.id ? t.removing : t.remove}
          </button>
        </li>
      ))}
    </ul>
  );
}
