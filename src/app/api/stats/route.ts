import { db } from "@/lib/db";
import { activeProvider } from "@/lib/model";
import { defaultModelFor } from "@/lib/providers";

/** Everything the console header and the Data tab need, in one round trip. */
export async function GET() {
  const [orders, customers, tickets, shipments, refunds, documents, chunks, toolCalls, delayed] =
    await Promise.all([
      db.order.count(),
      db.customer.count(),
      db.ticket.count(),
      db.shipment.count(),
      db.refund.count(),
      db.document.count(),
      db.documentChunk.count(),
      db.toolCall.count(),
      db.shipment.count({
        where: {
          status: { in: ["label_created", "in_transit", "out_for_delivery", "exception"] },
          estimatedDelivery: { lt: new Date() },
        },
      }),
    ]);

  const latency = await db.toolCall.aggregate({ _avg: { durationMs: true } });

  return Response.json({
    provider: activeProvider(),
    model: process.env.RELAY_MODEL || defaultModelFor(activeProvider()),
    business: { orders, customers, tickets, shipments, refunds, delayed },
    knowledge: { documents, chunks },
    activity: { toolCalls, avgMs: Math.round(latency._avg.durationMs ?? 0) },
  });
}
