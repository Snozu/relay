"use client";

/**
 * Chart and table primitives.
 *
 * Hand-built SVG rather than a charting library: three chart shapes do not
 * justify a dependency, and inline SVG inherits the console's theme tokens for
 * free, so light and dark are correct without a second palette to maintain.
 *
 * Series colours come from --series-1 / --series-2, which are validated for
 * colourblind separation against both surfaces. Never substitute by eye.
 */

export function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-console border border-border bg-surface px-3 py-2.5">
      <h4 className="text-[12px] font-medium">{title}</h4>
      {caption && <p className="mt-0.5 text-[11px] leading-snug text-muted">{caption}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: "write" }) {
  return (
    <div className="rounded-console border border-border bg-surface px-3 py-2">
      <div className={`font-mono text-lg tnum ${tone === "write" ? "text-write" : ""}`}>{value}</div>
      <div className="label mt-0.5">{label}</div>
    </div>
  );
}

/**
 * Horizontal bars. One hue, because each bar is directly labelled — categorical
 * colour would encode nothing the label does not already say.
 */
export function BarRows({
  rows,
  suffix,
}: {
  rows: { label: string; value: number; note?: string }[];
  suffix?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2">
          <span className="truncate text-[11px] text-muted">{r.label}</span>
          <span className="h-3.5 rounded-[3px] bg-surface-muted">
            <span
              className="block h-full rounded-[3px] bg-series-1"
              style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }}
            />
          </span>
          <span className="font-mono text-[11px] tnum">
            {r.value}
            {suffix ?? ""}
            {r.note && <span className="ml-1 text-muted">{r.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Two-series area chart over time. Legend is always present because there is
 * more than one series, so identity is never carried by colour alone.
 */
export function TrendChart({
  points,
  labels,
}: {
  points: { date: string; orders: number; delayed: number }[];
  labels: { a: string; b: string };
}) {
  const W = 320;
  const H = 84;
  const PAD = 4;
  const max = Math.max(...points.flatMap((p) => [p.orders, p.delayed]), 1);
  const step = (W - PAD * 2) / Math.max(points.length - 1, 1);

  const path = (key: "orders" | "delayed") =>
    points
      .map((p, i) => {
        const x = PAD + i * step;
        const y = H - PAD - (p[key] / max) * (H - PAD * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const area = (key: "orders" | "delayed") =>
    `${path(key)} L${(PAD + (points.length - 1) * step).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;

  const first = points[0]?.date.slice(5);
  const last = points.at(-1)?.date.slice(5);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Orders and delays over time">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--axis)" strokeWidth="1" />
        <path d={area("orders")} fill="var(--series-1)" opacity="0.14" />
        <path d={path("orders")} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />
        <path d={area("delayed")} fill="var(--series-2)" opacity="0.14" />
        <path d={path("delayed")} fill="none" stroke="var(--series-2)" strokeWidth="2" strokeLinejoin="round" />
      </svg>

      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-series-1" />
          {labels.a}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-series-2" />
          {labels.b}
        </span>
        <span className="ml-auto font-mono">
          {first} → {last}
        </span>
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  delivered: "border-signal/40 bg-signal-soft text-signal",
  fulfilled: "border-accent/40 bg-accent-soft text-accent",
  paid: "border-accent/40 bg-accent-soft text-accent",
  in_transit: "border-accent/40 bg-accent-soft text-accent",
  out_for_delivery: "border-accent/40 bg-accent-soft text-accent",
  placed: "border-border bg-surface-muted text-muted",
  label_created: "border-border bg-surface-muted text-muted",
  cancelled: "border-border bg-surface-muted text-muted",
  resolved: "border-signal/40 bg-signal-soft text-signal",
  exception: "border-write/40 bg-write-soft text-write",
  returned: "border-write/40 bg-write-soft text-write",
  urgent: "border-write/40 bg-write-soft text-write",
  high: "border-write/40 bg-write-soft text-write",
  open: "border-write/40 bg-write-soft text-write",
};

/** Status colour is reserved and always ships with its label, never colour alone. */
export function StatusBadge({ value }: { value: string }) {
  const tone = STATUS_TONE[value] ?? "border-border bg-surface-muted text-muted";
  return (
    <span className={`whitespace-nowrap rounded border px-1.5 py-px font-mono text-[10px] ${tone}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}
