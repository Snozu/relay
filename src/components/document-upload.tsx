"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/lib/locale";

const CATEGORIES = ["policy", "carrier", "product", "other"] as const;

export function DocumentUpload({ onUploaded }: { onUploaded: () => void }) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>("policy");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMessage(null);

    const body = new FormData();
    body.append("file", file);
    body.append("category", category);

    try {
      const res = await fetch("/api/documents", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Upload failed." });
      } else {
        setMessage({
          kind: "ok",
          text: t.indexedInto(data.document.title, data.document.chunkCount),
        });
        onUploaded();
      }
    } catch {
      setMessage({ kind: "error", text: "Upload failed." });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) upload(file);
        }}
        className={`rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-border bg-surface"
        }`}
      >
        <p className="text-sm">
          {busy ? (
            <span className="text-muted">{t.processing}</span>
          ) : (
            <>
              {t.dropFile}{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-medium text-accent underline underline-offset-2"
              >
                {t.chooseFile}
              </button>
            </>
          )}
        </p>
        <p className="mt-1.5 text-[11px] text-muted">{t.uploadNote}</p>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                category === c
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.txt,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </div>

      {message && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            message.kind === "ok"
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-danger/40 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
