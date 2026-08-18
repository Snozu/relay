"use client";

import { useLocale } from "@/lib/locale";

/**
 * How retrieval actually works, drawn.
 *
 * The main architecture graph shows retrieval as one node because that is its
 * place in the system. This is the inside of that node: what happens once per
 * document on ingest, and what happens on every question.
 *
 * Two lanes, because they run at different times and clients conflate them.
 */

const W = 1000;
const H = 340;

type Box = { x: number; y: number; w: number; h: number };

const INGEST: Box[] = [
  { x: 8, y: 44, w: 150, h: 54 },
  { x: 200, y: 44, w: 150, h: 54 },
  { x: 392, y: 44, w: 178, h: 54 },
  { x: 612, y: 44, w: 178, h: 54 },
  { x: 832, y: 44, w: 160, h: 54 },
];

const QUERY: Box[] = [
  { x: 8, y: 214, w: 150, h: 54 },      // question
  { x: 200, y: 214, w: 150, h: 54 },    // embed
  { x: 392, y: 172, w: 178, h: 48 },    // vector
  { x: 392, y: 246, w: 178, h: 48 },    // keyword
  { x: 612, y: 214, w: 178, h: 54 },    // rrf
  { x: 832, y: 214, w: 160, h: 54 },    // cited
];

const right = (b: Box) => ({ x: b.x + b.w, y: b.y + b.h / 2 });
const leftOf = (b: Box) => ({ x: b.x, y: b.y + b.h / 2 });

function arrow(a: Box, b: Box) {
  const p = right(a);
  const q = leftOf(b);
  if (Math.abs(p.y - q.y) < 2) return `M${p.x},${p.y} L${q.x - 6},${q.y}`;
  const mid = p.x + (q.x - p.x) / 2;
  return `M${p.x},${p.y} L${mid},${p.y} L${mid},${q.y} L${q.x - 6},${q.y}`;
}

export function RetrievalDiagram() {
  const { t } = useLocale();
  const c = t.rag as unknown as {
    heading: string;
    intro: string;
    ingestLane: string;
    queryLane: string;
    ingest: readonly { title: string; sub: string }[];
    query: readonly { title: string; sub: string }[];
    note: string;
  };

  const boxCls =
    "absolute rounded-console border border-border bg-surface px-2.5 py-1.5 flex flex-col justify-center";

  return (
    <div className="mt-10">
      <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{c.heading}</h3>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{c.intro}</p>

      <div className="relative mt-4 w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
          <defs>
            <marker id="rag-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,1 L6,4 L0,7 Z" fill="var(--series-1)" />
            </marker>
          </defs>

          {/* lane labels */}
          <text x="8" y="26" className="font-mono" fontSize="10" fill="var(--muted)" letterSpacing="1.4">
            {c.ingestLane.toUpperCase()}
          </text>
          <text x="8" y="150" className="font-mono" fontSize="10" fill="var(--muted)" letterSpacing="1.4">
            {c.queryLane.toUpperCase()}
          </text>
          <line x1="0" y1="128" x2={W} y2="128" stroke="var(--axis)" strokeWidth="1" strokeDasharray="2 5" />

          {INGEST.slice(0, -1).map((b, i) => (
            <path
              key={`i${i}`}
              d={arrow(b, INGEST[i + 1])}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth="1.5"
              markerEnd="url(#rag-arrow)"
            />
          ))}

          {/* question → embed, then the split into two searches, then the merge */}
          <path d={arrow(QUERY[0], QUERY[1])} fill="none" stroke="var(--series-1)" strokeWidth="1.5" markerEnd="url(#rag-arrow)" />
          <path d={arrow(QUERY[1], QUERY[2])} fill="none" stroke="var(--series-1)" strokeWidth="1.5" markerEnd="url(#rag-arrow)" />
          <path d={arrow(QUERY[1], QUERY[3])} fill="none" stroke="var(--series-1)" strokeWidth="1.5" markerEnd="url(#rag-arrow)" />
          <path d={arrow(QUERY[2], QUERY[4])} fill="none" stroke="var(--series-1)" strokeWidth="1.5" markerEnd="url(#rag-arrow)" />
          <path d={arrow(QUERY[3], QUERY[4])} fill="none" stroke="var(--series-1)" strokeWidth="1.5" markerEnd="url(#rag-arrow)" />
          <path d={arrow(QUERY[4], QUERY[5])} fill="none" stroke="var(--series-1)" strokeWidth="1.5" markerEnd="url(#rag-arrow)" />

          {/* the store is written by ingest and read by both searches */}
          <path
            d={`M${INGEST[4].x + INGEST[4].w / 2},${INGEST[4].y + INGEST[4].h} L${INGEST[4].x + INGEST[4].w / 2},118`}
            fill="none"
            stroke="var(--axis)"
            strokeWidth="1.25"
            strokeDasharray="3 4"
          />
          <text x={INGEST[4].x + INGEST[4].w / 2 + 6} y="114" fontSize="9" fill="var(--muted)" className="font-mono">
            same store
          </text>
        </svg>

        {INGEST.map((b, i) => (
          <div
            key={`ib${i}`}
            className={boxCls}
            style={{
              left: `${(b.x / W) * 100}%`,
              top: `${(b.y / H) * 100}%`,
              width: `${(b.w / W) * 100}%`,
              height: `${(b.h / H) * 100}%`,
            }}
          >
            <span className="truncate text-[11px] font-medium">{c.ingest[i].title}</span>
            <span className="mt-0.5 truncate font-mono text-[9px] text-muted">{c.ingest[i].sub}</span>
          </div>
        ))}

        {QUERY.map((b, i) => (
          <div
            key={`qb${i}`}
            className={`${boxCls} ${i === 4 ? "border-signal" : ""}`}
            style={{
              left: `${(b.x / W) * 100}%`,
              top: `${(b.y / H) * 100}%`,
              width: `${(b.w / W) * 100}%`,
              height: `${(b.h / H) * 100}%`,
            }}
          >
            <span className={`truncate text-[11px] font-medium ${i === 4 ? "text-signal" : ""}`}>
              {c.query[i].title}
            </span>
            <span className="mt-0.5 truncate font-mono text-[9px] text-muted">{c.query[i].sub}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-console border border-border bg-surface-muted px-3 py-2 text-[12px] leading-relaxed text-muted">
        {c.note}
      </p>
    </div>
  );
}
