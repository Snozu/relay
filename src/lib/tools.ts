import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { withAudit } from "@/lib/audit";
import { money, shortDate, daysBetween } from "@/lib/format";
import { searchKnowledge } from "@/lib/rag/search";

/**
 * Relay's tool layer.
 *
 * The rule the whole system rests on: the model never touches the database.
 * It calls a tool. The tool validates its input, runs one bounded query,
 * records what it did, and returns structured data plus a one-line summary.
 * The tool result is the only source of truth — the model is instructed not
 * to invent anything that did not come back from a tool.
 *
 * Seven tools read. One writes, and that one never runs without human approval.
 *
 * Six of the reads hit business tables. The seventh, search_knowledge, hits the
 * company's uploaded documents through hybrid retrieval — the agent answers
 * policy questions from the same conversation it answers order questions in.
 */

const ACTIVE_SHIPMENT_STATES = ["label_created", "in_transit", "out_for_delivery", "exception"];

export function createBusinessTools(sessionId: string) {
  return {
    // ── read ────────────────────────────────────────────────────────────────
    find_delayed_orders: tool({
      description:
        "List orders whose shipment is past its estimated delivery date and has not been delivered. Use this for questions like 'what is running late?' or 'which orders are delayed this week?'.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(25).default(10).describe("Maximum orders to return."),
      }),
      execute: async (input) =>
        withAudit(sessionId, "find_delayed_orders", input, async () => {
          const shipments = await db.shipment.findMany({
            where: {
              status: { in: ACTIVE_SHIPMENT_STATES },
              estimatedDelivery: { lt: new Date() },
            },
            include: { order: { include: { customer: true } } },
            orderBy: { estimatedDelivery: "asc" },
            take: input.limit,
          });

          const orders = shipments.map((s) => ({
            orderNumber: s.order.number,
            customer: s.order.customer.name,
            destination: `${s.order.customer.city}, ${s.order.customer.state}`,
            value: money(s.order.totalCents, s.order.currency),
            carrier: s.carrier,
            trackingNumber: s.trackingNumber,
            shipmentStatus: s.status,
            estimatedDelivery: shortDate(s.estimatedDelivery),
            daysLate: s.estimatedDelivery ? daysBetween(new Date(), s.estimatedDelivery) : null,
            lastEvent: s.lastEvent,
          }));

          return {
            summary: `${orders.length} order${orders.length === 1 ? "" : "s"} past their estimated delivery date`,
            count: orders.length,
            orders,
          };
        }),
    }),

    search_orders: tool({
      description:
        "Search orders by status, customer email, or how recently they were placed. Use when the question is about a group of orders rather than one specific order.",
      inputSchema: z.object({
        status: z
          .enum(["placed", "paid", "fulfilled", "delivered", "cancelled"])
          .optional()
          .describe("Filter by order status."),
        customerEmail: z.string().optional().describe("Exact customer email."),
        placedWithinDays: z
          .number()
          .int()
          .min(1)
          .max(90)
          .optional()
          .describe("Only orders placed within this many days."),
        limit: z.number().int().min(1).max(25).default(10),
      }),
      execute: async (input) =>
        withAudit(sessionId, "search_orders", input, async () => {
          const since = input.placedWithinDays
            ? new Date(Date.now() - input.placedWithinDays * 86_400_000)
            : undefined;

          const rows = await db.order.findMany({
            where: {
              status: input.status,
              customer: input.customerEmail ? { email: input.customerEmail } : undefined,
              placedAt: since ? { gte: since } : undefined,
            },
            include: { customer: true, shipment: true },
            orderBy: { placedAt: "desc" },
            take: input.limit,
          });

          const orders = rows.map((o) => ({
            orderNumber: o.number,
            customer: o.customer.name,
            status: o.status,
            channel: o.channel,
            value: money(o.totalCents, o.currency),
            placedAt: shortDate(o.placedAt),
            shipmentStatus: o.shipment?.status ?? null,
          }));

          return {
            summary: `${orders.length} order${orders.length === 1 ? "" : "s"} matched`,
            count: orders.length,
            orders,
          };
        }),
    }),

    get_order: tool({
      description:
        "Get the full detail of one order: line items, shipment, customer, support tickets and any refunds already issued. Use this before answering anything specific about a single order.",
      inputSchema: z.object({
        orderNumber: z.string().describe('Order number, for example "HP-1042".'),
      }),
      execute: async (input) =>
        withAudit(sessionId, "get_order", input, async () => {
          const order = await db.order.findUnique({
            where: { number: input.orderNumber.toUpperCase() },
            include: {
              customer: true,
              items: true,
              shipment: true,
              tickets: true,
              refunds: true,
            },
          });

          if (!order) {
            return { summary: `No order found with number ${input.orderNumber}`, found: false as const };
          }

          const refundedCents = order.refunds.reduce((s, r) => s + r.amountCents, 0);

          return {
            summary: `${order.number} — ${order.status}, ${money(order.totalCents, order.currency)}, ${order.customer.name}`,
            found: true as const,
            order: {
              orderNumber: order.number,
              status: order.status,
              channel: order.channel,
              placedAt: shortDate(order.placedAt),
              total: money(order.totalCents, order.currency),
              totalCents: order.totalCents,
              refundedTotal: money(refundedCents, order.currency),
              refundableCents: order.totalCents - refundedCents,
              customer: {
                name: order.customer.name,
                email: order.customer.email,
                phone: order.customer.phone,
                location: `${order.customer.city}, ${order.customer.state}`,
              },
              items: order.items.map((i) => ({
                sku: i.sku,
                name: i.name,
                quantity: i.quantity,
                unitPrice: money(i.unitPriceCents),
              })),
              shipment: order.shipment
                ? {
                    carrier: order.shipment.carrier,
                    trackingNumber: order.shipment.trackingNumber,
                    status: order.shipment.status,
                    shippedAt: shortDate(order.shipment.shippedAt),
                    estimatedDelivery: shortDate(order.shipment.estimatedDelivery),
                    deliveredAt: shortDate(order.shipment.deliveredAt),
                    lastEvent: order.shipment.lastEvent,
                  }
                : null,
              tickets: order.tickets.map((t) => ({
                number: t.number,
                subject: t.subject,
                status: t.status,
                priority: t.priority,
                openedAt: shortDate(t.openedAt),
              })),
              refunds: order.refunds.map((r) => ({
                amount: money(r.amountCents),
                reason: r.reason,
                issuedAt: shortDate(r.issuedAt),
                issuedBy: r.issuedBy,
              })),
            },
          };
        }),
    }),

    track_shipment: tool({
      description:
        "Look up a shipment by order number or tracking number and report where it is, whether it is late, and by how many days.",
      inputSchema: z.object({
        orderNumber: z.string().optional().describe('Order number, for example "HP-1042".'),
        trackingNumber: z.string().optional().describe("Carrier tracking number."),
      }),
      execute: async (input) =>
        withAudit(sessionId, "track_shipment", input, async () => {
          if (!input.orderNumber && !input.trackingNumber) {
            return { summary: "No order number or tracking number provided", found: false as const };
          }

          const shipment = await db.shipment.findFirst({
            where: input.trackingNumber
              ? { trackingNumber: input.trackingNumber }
              : { order: { number: input.orderNumber!.toUpperCase() } },
            include: { order: { include: { customer: true } } },
          });

          if (!shipment) {
            return { summary: "No shipment found", found: false as const };
          }

          const late =
            shipment.estimatedDelivery &&
            !shipment.deliveredAt &&
            shipment.estimatedDelivery < new Date();

          return {
            summary: late
              ? `${shipment.order.number} is ${daysBetween(new Date(), shipment.estimatedDelivery!)} days late (${shipment.status})`
              : `${shipment.order.number} is ${shipment.status}`,
            found: true as const,
            shipment: {
              orderNumber: shipment.order.number,
              customer: shipment.order.customer.name,
              destination: `${shipment.order.customer.city}, ${shipment.order.customer.state}`,
              carrier: shipment.carrier,
              trackingNumber: shipment.trackingNumber,
              status: shipment.status,
              isLate: Boolean(late),
              daysLate: late ? daysBetween(new Date(), shipment.estimatedDelivery!) : 0,
              shippedAt: shortDate(shipment.shippedAt),
              estimatedDelivery: shortDate(shipment.estimatedDelivery),
              deliveredAt: shortDate(shipment.deliveredAt),
              lastEvent: shipment.lastEvent,
              lastEventAt: shortDate(shipment.lastEventAt),
            },
          };
        }),
    }),

    search_tickets: tool({
      description:
        "Search customer support tickets by status, priority or category. Use for questions about complaints, open issues or what needs attention.",
      inputSchema: z.object({
        status: z.enum(["open", "pending", "resolved"]).optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        category: z.enum(["delivery", "damage", "refund", "product", "other"]).optional(),
        limit: z.number().int().min(1).max(25).default(10),
      }),
      execute: async (input) =>
        withAudit(sessionId, "search_tickets", input, async () => {
          const rows = await db.ticket.findMany({
            where: { status: input.status, priority: input.priority, category: input.category },
            include: { customer: true, order: true },
            orderBy: [{ priority: "asc" }, { openedAt: "desc" }],
            take: input.limit,
          });

          const tickets = rows.map((t) => ({
            number: t.number,
            subject: t.subject,
            category: t.category,
            priority: t.priority,
            status: t.status,
            customer: t.customer.name,
            orderNumber: t.order?.number ?? null,
            openedAt: shortDate(t.openedAt),
            body: t.body,
          }));

          return {
            summary: `${tickets.length} ticket${tickets.length === 1 ? "" : "s"} matched`,
            count: tickets.length,
            tickets,
          };
        }),
    }),

    get_customer: tool({
      description:
        "Look up one customer by email or name and return their contact details and order history.",
      inputSchema: z.object({
        email: z.string().optional().describe("Exact email address."),
        name: z.string().optional().describe("Full or partial name."),
      }),
      execute: async (input) =>
        withAudit(sessionId, "get_customer", input, async () => {
          if (!input.email && !input.name) {
            return { summary: "No email or name provided", found: false as const };
          }

          const customer = await db.customer.findFirst({
            where: input.email
              ? { email: input.email }
              : { name: { contains: input.name!, mode: "insensitive" } },
            include: {
              orders: { include: { shipment: true }, orderBy: { placedAt: "desc" }, take: 10 },
              tickets: { orderBy: { openedAt: "desc" }, take: 5 },
            },
          });

          if (!customer) {
            return { summary: "No customer found", found: false as const };
          }

          return {
            summary: `${customer.name} — ${customer.orders.length} recent orders, ${customer.tickets.length} tickets`,
            found: true as const,
            customer: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              location: `${customer.city}, ${customer.state}`,
              customerSince: shortDate(customer.createdAt),
              orders: customer.orders.map((o) => ({
                orderNumber: o.number,
                status: o.status,
                value: money(o.totalCents, o.currency),
                placedAt: shortDate(o.placedAt),
                shipmentStatus: o.shipment?.status ?? null,
              })),
              tickets: customer.tickets.map((t) => ({
                number: t.number,
                subject: t.subject,
                status: t.status,
                priority: t.priority,
              })),
            },
          };
        }),
    }),

    get_operations_summary: tool({
      description:
        "Get an overview of the whole operation right now: order counts by status, which carriers are running late, and the last 14 days of order and delay volume. Use this for 'how are we doing', 'give me an overview', 'show me the numbers', or any question about the shape of the business rather than one specific order.",
      inputSchema: z.object({
        days: z.number().int().min(7).max(60).default(14).describe("Days of history for the trend."),
      }),
      execute: async (input) =>
        withAudit(sessionId, "get_operations_summary", input, async () => {
          const since = new Date(Date.now() - input.days * 86_400_000);
          since.setHours(0, 0, 0, 0);

          const [byStatus, orders, shipments, openTickets, refunds] = await Promise.all([
            db.order.groupBy({ by: ["status"], _count: { _all: true } }),
            db.order.findMany({ where: { placedAt: { gte: since } }, select: { placedAt: true } }),
            db.shipment.findMany({
              where: { status: { in: ACTIVE_SHIPMENT_STATES }, estimatedDelivery: { lt: new Date() } },
              select: { carrier: true, estimatedDelivery: true, order: { select: { placedAt: true } } },
            }),
            db.ticket.count({ where: { status: { in: ["open", "pending"] } } }),
            db.refund.aggregate({ _sum: { amountCents: true }, _count: { _all: true } }),
          ]);

          // Status order follows the fulfilment pipeline, not alphabet or count,
          // so the chart reads left to right as the order actually moves.
          const PIPELINE = ["placed", "paid", "fulfilled", "delivered", "cancelled"];
          const statusBreakdown = PIPELINE.map((status) => ({
            status,
            count: byStatus.find((b) => b.status === status)?._count._all ?? 0,
          })).filter((s) => s.count > 0);

          const carriers = new Map<string, { count: number; totalDaysLate: number }>();
          for (const s of shipments) {
            const entry = carriers.get(s.carrier) ?? { count: 0, totalDaysLate: 0 };
            entry.count++;
            entry.totalDaysLate += s.estimatedDelivery
              ? daysBetween(new Date(), s.estimatedDelivery)
              : 0;
            carriers.set(s.carrier, entry);
          }
          const delaysByCarrier = [...carriers.entries()]
            .map(([carrier, v]) => ({
              carrier,
              count: v.count,
              avgDaysLate: Math.round((v.totalDaysLate / v.count) * 10) / 10,
            }))
            .sort((a, b) => b.count - a.count);

          const dayKey = (d: Date) => d.toISOString().slice(0, 10);
          const placedPerDay = new Map<string, number>();
          for (const o of orders) {
            placedPerDay.set(dayKey(o.placedAt), (placedPerDay.get(dayKey(o.placedAt)) ?? 0) + 1);
          }
          const delayedPerDay = new Map<string, number>();
          for (const s of shipments) {
            const k = dayKey(s.order.placedAt);
            if (new Date(k) >= since) delayedPerDay.set(k, (delayedPerDay.get(k) ?? 0) + 1);
          }

          const trend: { date: string; orders: number; delayed: number }[] = [];
          for (let i = input.days - 1; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86_400_000);
            const k = dayKey(d);
            trend.push({ date: k, orders: placedPerDay.get(k) ?? 0, delayed: delayedPerDay.get(k) ?? 0 });
          }

          const totalOrders = byStatus.reduce((s, b) => s + b._count._all, 0);

          return {
            summary: `${totalOrders} orders · ${shipments.length} running late · ${openTickets} open tickets`,
            headline: {
              totalOrders,
              delayed: shipments.length,
              openTickets,
              refundCount: refunds._count._all,
              refundTotal: money(refunds._sum.amountCents ?? 0),
            },
            statusBreakdown,
            delaysByCarrier,
            trend,
            days: input.days,
          };
        }),
    }),

  };
}

export function createKnowledgeTools(sessionId: string) {
  return {
    search_knowledge: tool({
      description:
        "Search Harbor & Pine's internal documents — shipping and refund policies, carrier rules, product care guides — and return the passages that answer a question. Use this for any question about what the company's rules, policies or procedures say, as opposed to what a specific order did.",
      inputSchema: z.object({
        query: z.string().min(3).describe("The question or topic to look up, in natural language."),
        limit: z.number().int().min(1).max(8).default(5).describe("How many passages to return."),
      }),
      execute: async (input) =>
        withAudit(sessionId, "search_knowledge", input, async () => {
          const passages = await searchKnowledge(input.query, input.limit);

          if (passages.length === 0) {
            return {
              summary: "No matching passages in the document library",
              found: false as const,
              passages: [],
            };
          }

          const sources = [...new Set(passages.map((p) => p.documentTitle))];

          return {
            summary: `${passages.length} passage${passages.length === 1 ? "" : "s"} from ${sources.length} document${sources.length === 1 ? "" : "s"}: ${sources.join(", ")}`,
            found: true as const,
            passages: passages.map((p) => ({
              source: p.documentTitle,
              category: p.category,
              section: `chunk ${p.ordinal + 1}`,
              matchedBy: p.matchedBy.join(" + "),
              text: p.content,
            })),
          };
        }),
    }),

  };
}

export function createWriteTools(sessionId: string) {
  return {
    // ── write — never runs without human approval ───────────────────────────
    issue_refund: tool({
      description:
        "Issue a refund against an order. This moves money and cannot be undone from here. Always call get_order first so the amount and the reason are grounded in real order data.",
      inputSchema: z.object({
        orderNumber: z.string().describe('Order number, for example "HP-1042".'),
        amountUsd: z.number().positive().describe("Refund amount in US dollars."),
        reason: z.string().min(4).describe("Why this refund is being issued, in one sentence."),
      }),
      execute: async (input) =>
        withAudit(sessionId, "issue_refund", input, async () => {
          const order = await db.order.findUnique({
            where: { number: input.orderNumber.toUpperCase() },
            include: { refunds: true, customer: true },
          });

          if (!order) {
            return { summary: `No order found with number ${input.orderNumber}`, ok: false as const };
          }

          const amountCents = Math.round(input.amountUsd * 100);
          const alreadyRefunded = order.refunds.reduce((s, r) => s + r.amountCents, 0);

          if (amountCents + alreadyRefunded > order.totalCents) {
            return {
              summary: `Refund refused — ${money(amountCents)} would exceed the order total of ${money(order.totalCents)}`,
              ok: false as const,
              reason: "Refund exceeds the remaining refundable amount on this order.",
              orderTotal: money(order.totalCents),
              alreadyRefunded: money(alreadyRefunded),
            };
          }

          // Deterministic key: approving the same refund twice is a no-op
          // rather than a second payout.
          const idempotencyKey = `${order.number}:${amountCents}:${input.reason.trim().toLowerCase()}`;

          const existing = await db.refund.findUnique({ where: { idempotencyKey } });
          if (existing) {
            return {
              summary: `This exact refund was already issued on ${shortDate(existing.issuedAt)} — no second payout`,
              ok: true as const,
              duplicate: true as const,
              refund: { amount: money(existing.amountCents), issuedAt: shortDate(existing.issuedAt) },
            };
          }

          const refund = await db.refund.create({
            data: {
              orderId: order.id,
              amountCents,
              reason: input.reason,
              issuedBy: "Relay agent — approved by demo operator",
              idempotencyKey,
            },
          });

          return {
            summary: `Refunded ${money(amountCents)} on ${order.number} to ${order.customer.name}`,
            ok: true as const,
            duplicate: false as const,
            refund: {
              orderNumber: order.number,
              customer: order.customer.name,
              amount: money(refund.amountCents),
              reason: refund.reason,
              issuedAt: shortDate(refund.issuedAt),
              remainingRefundable: money(order.totalCents - alreadyRefunded - amountCents),
            },
          };
        }),
    }),
  };
}

export type BusinessTools = ReturnType<typeof createBusinessTools>;
