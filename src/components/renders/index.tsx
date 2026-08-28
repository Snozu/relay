"use client";

import { BarRows, Panel, StatTile, StatusBadge, TrendChart } from "@/components/renders/primitives";
import { useLocale } from "@/lib/locale";

/**
 * Generative UI.
 *
 * The agent does not describe an order in prose and hope the reader believes
 * it. Each tool result is rendered as the thing it actually is — a table, an
 * order record, a shipment track, a set of cited passages, a dashboard.
 *
 * This is the difference between a chat that talks about a business and a
 * console that operates one. The model chooses which tool to call; the frontend
 * owns how the result looks, so the output is always well-formed and on-brand
 * no matter what the model does.
 */

type Any = Record<string, unknown>;

export function ToolRender({ name, output }: { name: string; output: unknown }) {
  const { t } = useLocale();
  if (!output || typeof output !== "object") return null;
  const o = output as Any;

  switch (name) {
    case "find_delayed_orders":
      return <DelayedOrders rows={(o.orders as Any[]) ?? []} />;

    case "search_orders":
      return <OrderRows rows={(o.orders as Any[]) ?? []} />;

    case "get_order":
      return o.found ? <OrderCard order={o.order as Any} /> : null;

    case "track_shipment":
      return o.found ? <ShipmentTrack shipment={o.shipment as Any} /> : null;

    case "search_tickets":
      return <TicketRows rows={(o.tickets as Any[]) ?? []} />;

    case "get_customer":
      return o.found ? <CustomerCard customer={o.customer as Any} /> : null;

    case "search_knowledge":
      return o.found ? <Passages rows={(o.passages as Any[]) ?? []} /> : null;

    case "get_operations_summary":
      return <OpsDashboard data={o} labels={t} />;

    default:
      return null;
  }
}

/** True when this tool has a dedicated renderer, so the chip can stay collapsed. */
export const HAS_RENDER = new Set([
  "find_delayed_orders",
  "search_orders",
  "get_order",
  "track_shipment",
  "search_tickets",
  "get_customer",
  "search_knowledge",
  "get_operations_summary",
]);

// ── tables ─────────────────────────────────────────────────────────────────

/**
 * How many rows a table puts in the conversation.
 *
 * A tool that finds 25 delayed orders is doing its job; a chat bubble that
 * prints all 25 is not. The transcript stays readable and the full result is
 * one click away in the activity panel, which is where a long list belongs.
 */
const MAX_ROWS = 8;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="scroll-x my-2 rounded-console border border-border bg-surface">{children}</div>
  );
}

function MoreRows({ hidden }: { hidden: number }) {
  const { t } = useLocale();
  if (hidden <= 0) return null;
  return (
    <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted">
      {(t.moreRows as (n: number) => string)(hidden)}
    </div>
  );
}

function DelayedOrders({ rows }: { rows: Any[] }) {
  if (rows.length === 0) return null;
  const shown = rows.slice(0, MAX_ROWS);
  return (
    <Shell>
      <table className="w-full min-w-[34rem] text-left text-[12px]">
        <thead className="label border-b border-border">
          <tr>
            <th className="px-3 py-1.5 font-normal">Order</th>
            <th className="px-3 py-1.5 font-normal">Customer</th>
            <th className="px-3 py-1.5 font-normal">Carrier</th>
            <th className="px-3 py-1.5 font-normal">Status</th>
            <th className="px-3 py-1.5 text-right font-normal">Late</th>
            <th className="px-3 py-1.5 text-right font-normal">Value</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={String(r.orderNumber)} className="border-b border-border/50 last:border-0">
              <td className="whitespace-nowrap px-3 py-1.5 font-mono">{String(r.orderNumber)}</td>
              <td className="px-3 py-1.5">
                {/* The name gives way before the row does: one line per order,
                    always, so the eye can run down the column. */}
                <div className="flex max-w-[11rem] items-baseline gap-1.5">
                  <span className="truncate">{String(r.customer)}</span>
                  <span className="shrink-0 truncate whitespace-nowrap text-muted">
                    {String(r.destination)}
                  </span>
                </div>
              </td>
              <td className="px-3 py-1.5 font-mono text-muted">{String(r.carrier)}</td>
              <td className="px-3 py-1.5">
                <StatusBadge value={String(r.shipmentStatus)} />
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono tnum text-write">
                {String(r.daysLate)}d
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono tnum">
                {String(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <MoreRows hidden={rows.length - shown.length} />
    </Shell>
  );
}

function OrderRows({ rows }: { rows: Any[] }) {
  if (rows.length === 0) return null;
  const shown = rows.slice(0, MAX_ROWS);
  return (
    <Shell>
      <table className="w-full min-w-[30rem] text-left text-[12px]">
        <thead className="label border-b border-border">
          <tr>
            <th className="px-3 py-1.5 font-normal">Order</th>
            <th className="px-3 py-1.5 font-normal">Customer</th>
            <th className="px-3 py-1.5 font-normal">Status</th>
            <th className="px-3 py-1.5 font-normal">Placed</th>
            <th className="px-3 py-1.5 text-right font-normal">Value</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={String(r.orderNumber)} className="border-b border-border/50 last:border-0">
              <td className="whitespace-nowrap px-3 py-1.5 font-mono">{String(r.orderNumber)}</td>
              <td className="px-3 py-1.5">
                <span className="block max-w-[11rem] truncate">{String(r.customer)}</span>
              </td>
              <td className="px-3 py-1.5">
                <StatusBadge value={String(r.status)} />
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-muted">{String(r.placedAt)}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono tnum">
                {String(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <MoreRows hidden={rows.length - shown.length} />
    </Shell>
  );
}

function TicketRows({ rows }: { rows: Any[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="my-2 space-y-1.5">
      {rows.slice(0, MAX_ROWS).map((r) => (
        <li key={String(r.number)} className="rounded-console border border-border bg-surface px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px]">{String(r.number)}</span>
            <StatusBadge value={String(r.priority)} />
            <StatusBadge value={String(r.status)} />
            {r.orderNumber ? (
              <span className="font-mono text-[11px] text-muted">{String(r.orderNumber)}</span>
            ) : null}
            <span className="ml-auto text-[11px] text-muted">{String(r.openedAt)}</span>
          </div>
          <p className="mt-1 text-[13px] font-medium">{String(r.subject)}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{String(r.body)}</p>
        </li>
      ))}
    </ul>
  );
}

// ── records ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Any }) {
  const customer = order.customer as Any;
  const shipment = order.shipment as Any | null;
  const items = (order.items as Any[]) ?? [];
  const tickets = (order.tickets as Any[]) ?? [];
  const refunds = (order.refunds as Any[]) ?? [];

  return (
    <div className="my-2 overflow-hidden rounded-console border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-[13px] font-medium">{String(order.orderNumber)}</span>
        <StatusBadge value={String(order.status)} />
        <span className="ml-auto font-mono text-[13px] tnum">{String(order.total)}</span>
      </div>

      <div className="grid gap-x-4 gap-y-1 border-b border-border px-3 py-2 text-[12px] sm:grid-cols-2">
        <div>
          <div className="font-medium">{String(customer.name)}</div>
          <div className="text-muted">{String(customer.location)}</div>
          <div className="font-mono text-[11px] text-muted">{String(customer.email)}</div>
        </div>
        <div className="text-muted sm:text-right">
          <div>placed {String(order.placedAt)}</div>
          <div className="font-mono text-[11px]">{String(order.channel)}</div>
        </div>
      </div>

      <ul className="border-b border-border px-3 py-2 text-[12px]">
        {items.map((i, n) => (
          <li key={n} className="flex items-baseline gap-2 py-0.5">
            <span className="font-mono text-[11px] text-muted">{String(i.sku)}</span>
            <span className="min-w-0 flex-1 truncate">{String(i.name)}</span>
            <span className="text-muted">×{String(i.quantity)}</span>
            <span className="font-mono tnum">{String(i.unitPrice)}</span>
          </li>
        ))}
      </ul>

      {shipment && (
        <div className="border-b border-border px-3 py-2">
          <ShipmentTrack shipment={{ ...shipment, orderNumber: order.orderNumber }} bare />
        </div>
      )}

      {tickets.length > 0 && (
        <div className="border-b border-border px-3 py-2 text-[12px]">
          {tickets.map((t, n) => (
            <div key={n} className="flex flex-wrap items-center gap-2 py-0.5">
              <span className="font-mono text-[11px]">{String(t.number)}</span>
              <StatusBadge value={String(t.priority)} />
              <StatusBadge value={String(t.status)} />
              <span className="min-w-0 flex-1 truncate">{String(t.subject)}</span>
            </div>
          ))}
        </div>
      )}

      {refunds.length > 0 && (
        <div className="bg-write-soft px-3 py-2 text-[12px]">
          {refunds.map((r, n) => (
            <div key={n} className="flex items-baseline gap-2">
              <span className="label !text-write">refunded</span>
              <span className="font-mono tnum text-write">{String(r.amount)}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{String(r.reason)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TRACK_STAGES = ["label_created", "in_transit", "out_for_delivery", "delivered"];

function ShipmentTrack({ shipment, bare }: { shipment: Any; bare?: boolean }) {
  const status = String(shipment.status);
  const failed = status === "exception" || status === "returned";
  const reached = failed ? 1 : Math.max(TRACK_STAGES.indexOf(status), 0);

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="font-mono text-[11px] text-muted">{String(shipment.carrier)}</span>
        <span className="font-mono text-[11px]">{String(shipment.trackingNumber)}</span>
        <StatusBadge value={status} />
        {shipment.isLate ? (
          <span className="font-mono text-[11px] tnum text-write">{String(shipment.daysLate)}d late</span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-1">
        {TRACK_STAGES.map((stage, i) => (
          <span key={stage} className="flex flex-1 items-center gap-1">
            <span
              className={`h-1 flex-1 rounded-full ${
                failed && i > 0
                  ? "bg-border"
                  : i <= reached
                    ? failed
                      ? "bg-write"
                      : "bg-series-1"
                    : "bg-border"
              }`}
            />
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{String(shipment.shippedAt ?? "—")}</span>
        <span>{failed ? "stopped" : String(shipment.deliveredAt ?? shipment.estimatedDelivery ?? "—")}</span>
      </div>

      {shipment.lastEvent ? (
        <p className={`mt-1.5 text-[12px] ${failed ? "text-write" : "text-muted"}`}>
          {String(shipment.lastEvent)}
        </p>
      ) : null}
    </>
  );

  if (bare) return body;
  return <div className="my-2 rounded-console border border-border bg-surface px-3 py-2">{body}</div>;
}

function CustomerCard({ customer }: { customer: Any }) {
  const orders = (customer.orders as Any[]) ?? [];
  return (
    <div className="my-2 overflow-hidden rounded-console border border-border bg-surface">
      <div className="border-b border-border px-3 py-2">
        <div className="text-[13px] font-medium">{String(customer.name)}</div>
        <div className="text-[12px] text-muted">
          {String(customer.location)} · <span className="font-mono">{String(customer.email)}</span>
        </div>
      </div>
      <table className="w-full text-left text-[12px]">
        <tbody>
          {orders.map((o) => (
            <tr key={String(o.orderNumber)} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-1.5 font-mono">{String(o.orderNumber)}</td>
              <td className="px-3 py-1.5">
                <StatusBadge value={String(o.status)} />
              </td>
              <td className="px-3 py-1.5 text-muted">{String(o.placedAt)}</td>
              <td className="px-3 py-1.5 text-right font-mono tnum">{String(o.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How many cited passages belong in the conversation. */
const MAX_PASSAGES = 3;

/**
 * A chunk is cut to fit an embedding window, not to read well.
 *
 * It routinely opens halfway through a word — "r than a carrier incident" —
 * and carries the markdown scaffolding of the document it came from. Quoting
 * that verbatim in front of a prospect makes the retrieval look broken when it
 * is in fact working. Trim to the nearest whole word at both ends and drop the
 * heading marks; the passage is evidence the answer is grounded, not the
 * document itself.
 */
function passageExcerpt(raw: string): string {
  let text = raw.replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim();

  if (!/^[\p{Lu}\d"'¿¡(-]/u.test(text)) {
    const space = text.indexOf(" ");
    if (space > 0) text = text.slice(space + 1);
  }

  if (text.length > 220) text = text.slice(0, 220).replace(/\s+\S*$/, "") + "…";
  return text;
}

function MorePassages({ hidden }: { hidden: number }) {
  const { t } = useLocale();
  return (
    <li className="px-3 text-[11px] text-muted">{(t.moreRows as (n: number) => string)(hidden)}</li>
  );
}

function Passages({ rows }: { rows: Any[] }) {
  if (rows.length === 0) return null;
  const shown = rows.slice(0, MAX_PASSAGES);
  return (
    <ul className="my-2 space-y-1.5">
      {shown.map((p, i) => (
        <li key={i} className="rounded-console border-l-2 border-signal bg-surface px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium">{String(p.source)}</span>
            <span className="font-mono text-[10px] text-muted">{String(p.section)}</span>
            <span className="ml-auto rounded border border-signal/40 bg-signal-soft px-1 py-px font-mono text-[9px] text-signal">
              {String(p.matchedBy)}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-muted">{passageExcerpt(String(p.text))}</p>
        </li>
      ))}
      {rows.length > shown.length && <MorePassages hidden={rows.length - shown.length} />}
    </ul>
  );
}

// ── dashboard ──────────────────────────────────────────────────────────────

function OpsDashboard({ data, labels }: { data: Any; labels: Any }) {
  const headline = data.headline as Any;
  const statuses = (data.statusBreakdown as Any[]) ?? [];
  const carriers = (data.delaysByCarrier as Any[]) ?? [];
  const trend = (data.trend as { date: string; orders: number; delayed: number }[]) ?? [];

  return (
    <div className="my-2 space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label={String(labels.statOrders)} value={Number(headline.totalOrders)} />
        <StatTile label={String(labels.statDelayed)} value={Number(headline.delayed)} tone="write" />
        <StatTile label={String(labels.statTickets)} value={Number(headline.openTickets)} />
        <StatTile label={String(labels.statRefunds)} value={String(headline.refundTotal)} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Panel title={String(labels.chartStatus)}>
          <BarRows rows={statuses.map((s) => ({ label: String(s.status), value: Number(s.count) }))} />
        </Panel>

        <Panel title={String(labels.chartCarrier)}>
          {carriers.length === 0 ? (
            <p className="text-[11px] text-muted">—</p>
          ) : (
            <BarRows
              rows={carriers.map((c) => ({
                label: String(c.carrier),
                value: Number(c.count),
                note: `avg ${c.avgDaysLate}d`,
              }))}
            />
          )}
        </Panel>
      </div>

      <Panel title={String(labels.chartTrend)}>
        <TrendChart
          points={trend}
          labels={{ a: String(labels.seriesOrders), b: String(labels.seriesDelayed) }}
        />
      </Panel>
    </div>
  );
}
