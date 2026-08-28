"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { useLocale } from "@/lib/locale";
import { RetrievalDiagram } from "@/components/retrieval-diagram";

/**
 * The architecture, drawn and alive.
 *
 * A static diagram in a PDF says "here is how it works". This one lights up as
 * the agent runs: the node handling the current step glows, the edge it took is
 * drawn in the path colour, and each specialist shows the tools it actually
 * called with their real latency.
 *
 * Hand-built SVG over positioned HTML rather than a graph library — nine nodes
 * do not justify a dependency, and this way the nodes inherit the console's
 * type and theme tokens directly.
 */

const W = 1220;
const H = 700;

type NodeId =
  | "mcpclient"
  | "mcpendpoint"
  | "browser"
  | "gate"
  | "orchestrator"
  | "operations"
  | "knowledge"
  | "approval"
  | "retrieval"
  | "database"
  | "audit";

type NodeSpec = {
  id: NodeId;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "io" | "agent" | "store" | "guard";
};

const NODES: NodeSpec[] = [
  { id: "mcpclient", x: 985, y: 8, w: 225, h: 54, kind: "io" },
  { id: "mcpendpoint", x: 985, y: 96, w: 225, h: 52, kind: "io" },
  { id: "browser", x: 390, y: 8, w: 220, h: 54, kind: "io" },
  { id: "gate", x: 390, y: 96, w: 220, h: 52, kind: "io" },
  { id: "orchestrator", x: 340, y: 182, w: 320, h: 66, kind: "agent" },
  { id: "operations", x: 30, y: 300, w: 270, h: 96, kind: "agent" },
  { id: "knowledge", x: 365, y: 300, w: 270, h: 96, kind: "agent" },
  { id: "approval", x: 700, y: 300, w: 270, h: 96, kind: "guard" },
  { id: "retrieval", x: 365, y: 432, w: 270, h: 78, kind: "store" },
  { id: "database", x: 150, y: 556, w: 420, h: 62, kind: "store" },
  { id: "audit", x: 700, y: 556, w: 270, h: 62, kind: "store" },
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<NodeId, NodeSpec>;

const cx = (n: NodeSpec) => n.x + n.w / 2;
const bottom = (n: NodeSpec) => n.y + n.h;

/** Orthogonal path from the bottom of `a` to the top of `b`. */
function link(a: NodeId, b: NodeId) {
  const from = byId[a];
  const to = byId[b];
  const x1 = cx(from);
  const y1 = bottom(from);
  const x2 = cx(to);
  const y2 = to.y;
  const mid = y1 + (y2 - y1) / 2;
  if (Math.abs(x1 - x2) < 2) return `M${x1},${y1} L${x2},${y2}`;
  return `M${x1},${y1} L${x1},${mid} L${x2},${mid} L${x2},${y2}`;
}

type Edge = {
  from: NodeId;
  to: NodeId;
  label?: string;
  tone: "read" | "write";
  dashed?: boolean;
  /** Drawn struck through: a connection that deliberately does not exist. */
  blocked?: boolean;
};

const EDGES: Edge[] = [
  { from: "browser", to: "gate", tone: "read" },
  { from: "gate", to: "orchestrator", tone: "read" },
  { from: "orchestrator", to: "operations", label: "consult_operations", tone: "read" },
  { from: "orchestrator", to: "knowledge", label: "consult_knowledge", tone: "read" },
  { from: "orchestrator", to: "approval", label: "issue_refund", tone: "write" },
  { from: "operations", to: "database", tone: "read" },
  { from: "knowledge", to: "retrieval", tone: "read" },
  { from: "retrieval", to: "database", tone: "read" },
  { from: "approval", to: "audit", tone: "write" },
  { from: "operations", to: "audit", tone: "read", dashed: true },
  { from: "knowledge", to: "audit", tone: "read", dashed: true },
  // MCP federates the read tools straight to the data, bypassing the agents.
  { from: "mcpclient", to: "mcpendpoint", tone: "read" },
  { from: "mcpendpoint", to: "database", tone: "read", dashed: true },
  // The one connection that is deliberately absent.
  { from: "mcpendpoint", to: "approval", tone: "write", blocked: true },
];

type ToolPart = { type: string; toolCallId: string; state: string; output?: unknown };
const isToolPart = (p: { type: string }): p is ToolPart => p.type.startsWith("tool-");

/** Which nodes the most recent turn touched, and what each specialist ran. */
function readTrace(messages: UIMessage[]) {
  const active = new Set<NodeId>();
  const calls: Partial<Record<NodeId, { name: string; ms?: number; summary?: string }[]>> = {};

  const last = [...messages].reverse().find((m) => m.role === "assistant");
  if (!last) return { active, calls };

  active.add("browser");
  active.add("gate");
  active.add("orchestrator");

  for (const part of last.parts) {
    if (!isToolPart(part)) continue;
    const name = part.type.replace(/^tool-/, "");

    const target: NodeId | null =
      name === "consult_operations"
        ? "operations"
        : name === "consult_knowledge"
          ? "knowledge"
          : name === "issue_refund"
            ? "approval"
            : null;
    if (!target) continue;

    active.add(target);
    if (target === "knowledge") active.add("retrieval");
    if (target !== "approval") active.add("database");
    if (part.state === "output-available") {
      active.add("audit");
      if (target === "approval") active.add("database");
    }

    const nested = ((part.output as { parts?: ToolPart[] } | undefined)?.parts ?? []).filter(isToolPart);
    calls[target] = nested.map((n) => {
      const out = n.output as { summary?: string; ms?: number } | undefined;
      return { name: n.type.replace(/^tool-/, ""), ms: out?.ms, summary: out?.summary };
    });
    if (target === "approval") {
      const out = part.output as { summary?: string; ms?: number } | undefined;
      calls.approval = [{ name: "issue_refund", ms: out?.ms, summary: out?.summary }];
    }
  }

  return { active, calls };
}

export function Architecture({ messages }: { messages: UIMessage[] }) {
  const { t } = useLocale();
  const [hovered, setHovered] = useState<NodeId | null>(null);
  const { active, calls } = readTrace(messages);

  const copy = t.arch as Record<NodeId, { title: string; sub: string; detail: string }>;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="label mb-2">{t.archEyebrow}</p>
        <h2 className="max-w-xl text-[28px] font-semibold leading-[1.12] tracking-[-0.03em]">
          {t.archHeading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t.archIntro}</p>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-series-1" /> {t.archReadPath}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-write" /> {t.archWritePath}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-signal" /> {t.archActive}
          </span>
        </div>

        {/* The canvas is 1220 wide. Letting it shrink to a phone screen scales
            every node label down to something like three pixels, so below that
            it keeps its size and the diagram scrolls sideways instead. */}
        <div className="scroll-x mt-4 -mx-4 px-4">
          <div
            className="relative w-full min-w-[52rem]"
            style={{ aspectRatio: `${W} / ${H}` }}
          >
          {/* edge layer */}
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
            <defs>
              <marker id="arrow-read" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,1 L6,4 L0,7 Z" fill="var(--series-1)" />
              </marker>
              <marker id="arrow-write" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,1 L6,4 L0,7 Z" fill="var(--write)" />
              </marker>
            </defs>

            {EDGES.map((e, i) => {
              if (e.blocked) {
                const a = byId[e.from];
                const b = byId[e.to];
                const x1 = a.x;
                const y1 = a.y + a.h / 2;
                const x2 = b.x + b.w;
                const y2 = b.y + 18;
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                return (
                  <g key={i}>
                    <path
                      d={`M${x1},${y1} L${x2},${y2}`}
                      fill="none"
                      stroke="var(--axis)"
                      strokeWidth="1.25"
                      strokeDasharray="4 5"
                    />
                    <circle cx={mx} cy={my} r="9" fill="var(--background)" stroke="var(--write)" strokeWidth="1.5" />
                    <path
                      d={`M${mx - 3.5},${my - 3.5} L${mx + 3.5},${my + 3.5} M${mx + 3.5},${my - 3.5} L${mx - 3.5},${my + 3.5}`}
                      stroke="var(--write)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <text
                      x={mx}
                      y={my + 24}
                      textAnchor="middle"
                      className="font-mono"
                      fontSize="10"
                      fill="var(--write)"
                    >
                      {t.archMcpBlocked}
                    </text>
                  </g>
                );
              }

              const lit = active.has(e.from) && active.has(e.to);
              const stroke = e.tone === "write" ? "var(--write)" : "var(--series-1)";
              return (
                <g key={i}>
                  <path
                    d={link(e.from, e.to)}
                    fill="none"
                    stroke={lit ? stroke : "var(--axis)"}
                    strokeWidth={lit ? 2 : 1.25}
                    strokeDasharray={e.dashed ? "3 4" : undefined}
                    markerEnd={lit ? `url(#arrow-${e.tone})` : undefined}
                    opacity={lit ? 1 : 0.55}
                  />
                  {e.label && (
                    <text
                      x={cx(byId[e.from]) + (cx(byId[e.to]) - cx(byId[e.from])) * 0.5}
                      y={bottom(byId[e.from]) + 26}
                      textAnchor="middle"
                      className="font-mono"
                      fontSize="10"
                      fill={lit ? stroke : "var(--muted)"}
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* node layer */}
          {NODES.map((n) => {
            const lit = active.has(n.id);
            const ran = calls[n.id] ?? [];
            const isHovered = hovered === n.id;

            return (
              <div
                key={n.id}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                className={`absolute rounded-console border px-2.5 py-2 transition-colors ${
                  n.kind === "guard"
                    ? lit
                      ? "border-write bg-write-soft"
                      : "border-write/40 bg-surface"
                    : lit
                      ? "border-series-1 bg-surface"
                      : "border-border bg-surface"
                } ${isHovered ? "z-20 shadow-lg" : ""}`}
                style={{
                  left: `${(n.x / W) * 100}%`,
                  top: `${(n.y / H) * 100}%`,
                  width: `${(n.w / W) * 100}%`,
                  minHeight: `${(n.h / H) * 100}%`,
                }}
              >
                <div className="flex items-start gap-1.5">
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[12px] font-medium ${
                        n.kind === "guard" ? "text-write" : ""
                      }`}
                    >
                      {copy[n.id].title}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-muted">
                      {copy[n.id].sub}
                    </span>
                  </span>
                  {lit && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-signal" />}
                </div>

                {ran.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 border-t border-border pt-1.5">
                    {ran.slice(0, 4).map((c, i) => (
                      <li key={i} className="flex items-baseline gap-1.5">
                        <span className="min-w-0 flex-1 truncate font-mono text-[9px]">{c.name}</span>
                        {typeof c.ms === "number" && (
                          <span className="shrink-0 font-mono text-[9px] tnum text-muted">{c.ms}ms</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {isHovered && (
                  <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-console border border-border bg-surface px-2.5 py-2 text-[11px] leading-snug shadow-lg">
                    {copy[n.id].detail}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>

        <p className="mt-6 rounded-console border border-write/40 bg-write-soft px-3 py-2 text-[12px] leading-relaxed">
          {t.archWriteNote}
        </p>

        <RetrievalDiagram />
      </div>
    </div>
  );
}
