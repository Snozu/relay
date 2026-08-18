/**
 * Relay demo dataset — Harbor & Pine, a fictional US home-goods brand.
 *
 * Deterministic on purpose: the same seed always produces the same orders,
 * delays and tickets, so the demo script behaves identically on every call.
 * Dates are generated relative to "now" so the data never looks stale.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try {
  process.loadEnvFile();
} catch {
  // Ambient environment (CI, container, VPS).
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ── deterministic randomness ────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260817);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const NOW = new Date();
const daysAgo = (d: number, hour = 10) => {
  const x = new Date(NOW);
  x.setDate(x.getDate() - d);
  x.setHours(hour, int(0, 59), 0, 0);
  return x;
};
const daysFromNow = (d: number) => daysAgo(-d, 17);

// ── reference data ──────────────────────────────────────────────────────────
const FIRST = ["Sarah","Michael","Jessica","David","Emily","James","Ashley","Robert","Amanda","Christopher","Melissa","Daniel","Nicole","Matthew","Stephanie","Andrew","Rachel","Joshua","Laura","Brandon","Megan","Justin","Katherine","Ryan","Hannah","Kevin","Olivia","Eric","Danielle","Tyler","Rebecca","Aaron","Natalie","Jonathan","Christina","Nathan","Vanessa","Adam","Priya","Marcus"] as const;
const LAST = ["Mitchell","Reyes","Donovan","Whitaker","Alvarez","Brennan","Castillo","Hollis","Nakamura","Okafor","Pruitt","Sandoval","Thornton","Vaughn","Weaver","Ellison","Farrow","Gallagher","Hastings","Ibarra","Kowalski","Lindqvist","Moreau","Novak","Oyelaran","Patel","Quintero","Rosenthal","Stafford","Tremblay"] as const;
const CITIES = [["Austin","TX"],["Denver","CO"],["Portland","OR"],["Nashville","TN"],["Charlotte","NC"],["Minneapolis","MN"],["Boston","MA"],["Phoenix","AZ"],["Seattle","WA"],["Atlanta","GA"],["Chicago","IL"],["San Diego","CA"],["Columbus","OH"],["Kansas City","MO"],["Salt Lake City","UT"],["Raleigh","NC"],["Providence","RI"],["Boise","ID"]] as const;

const CATALOG = [
  { sku: "HP-LIN-001", name: "Stonewashed Linen Duvet Cover — Queen", price: 24900 },
  { sku: "HP-LIN-002", name: "Stonewashed Linen Sheet Set — King", price: 31900 },
  { sku: "HP-TWL-014", name: "Turkish Cotton Bath Towel Set (4)", price: 11800 },
  { sku: "HP-CER-031", name: "Hand-Thrown Stoneware Dinner Set (8pc)", price: 28500 },
  { sku: "HP-CER-032", name: "Speckled Ceramic Mug — Set of 4", price: 6400 },
  { sku: "HP-RUG-007", name: "Handwoven Jute Rug 5x8", price: 41900 },
  { sku: "HP-LGT-022", name: "Brass Arc Floor Lamp", price: 35900 },
  { sku: "HP-CND-005", name: "Cedar & Fig Soy Candle", price: 3800 },
  { sku: "HP-STG-018", name: "Solid Oak Storage Bench", price: 52900 },
  { sku: "HP-KIT-009", name: "Acacia Wood Serving Board", price: 8900 },
] as const;

const CARRIERS = ["UPS", "FedEx", "USPS"] as const;
const CHANNELS = ["web", "web", "web", "amazon", "retail"] as const;

async function main() {
  console.log("Resetting Relay demo data…");
  await prisma.toolCall.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  // ── customers ─────────────────────────────────────────────────────────────
  const customers = [];
  const usedEmails = new Set<string>();
  for (let i = 0; i < 42; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    let email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
    let n = 2;
    while (usedEmails.has(email)) email = `${first.toLowerCase()}.${last.toLowerCase()}${n++}@example.com`;
    usedEmails.add(email);
    const [city, state] = pick(CITIES);
    customers.push(
      await prisma.customer.create({
        data: {
          name: `${first} ${last}`,
          email,
          phone: `+1 ${int(200, 989)} ${int(200, 999)} ${String(int(0, 9999)).padStart(4, "0")}`,
          city,
          state,
          createdAt: daysAgo(int(30, 700)),
        },
      }),
    );
  }
  console.log(`  ${customers.length} customers`);

  // ── orders, items, shipments ──────────────────────────────────────────────
  // Starts at 2000 so the hero order HP-1042 below never collides.
  let orderSeq = 2000;
  let ticketSeq = 3300;
  let delayedCount = 0;
  const orders = [];

  for (let i = 0; i < 186; i++) {
    const customer = pick(customers);
    const placedDaysAgo = int(0, 58);
    const placedAt = daysAgo(placedDaysAgo);
    const itemCount = int(1, 3);
    const chosen: (typeof CATALOG)[number][] = [];
    for (let k = 0; k < itemCount; k++) {
      const p = pick(CATALOG);
      if (!chosen.find((c) => c.sku === p.sku)) chosen.push(p);
    }
    const items = chosen.map((p) => ({
      sku: p.sku,
      name: p.name,
      quantity: int(1, 2),
      unitPriceCents: p.price,
    }));
    const totalCents = items.reduce((s, it) => s + it.quantity * it.unitPriceCents, 0);

    // Status follows age: recent orders are still moving, older ones landed.
    let status: string;
    if (placedDaysAgo < 2) status = rand() < 0.4 ? "placed" : "paid";
    else if (placedDaysAgo < 5) status = rand() < 0.5 ? "paid" : "fulfilled";
    else if (placedDaysAgo < 14) status = "fulfilled";
    else status = rand() < 0.06 ? "cancelled" : "delivered";

    const order = await prisma.order.create({
      data: {
        number: `HP-${++orderSeq}`,
        customerId: customer.id,
        status,
        channel: pick(CHANNELS),
        totalCents,
        placedAt,
        items: { create: items },
      },
    });
    orders.push({ order, customer, placedDaysAgo });

    if (status === "placed" || status === "cancelled") continue;

    // Shipment
    const shippedAt = daysAgo(Math.max(0, placedDaysAgo - int(1, 2)));
    const transitDays = int(3, 6);
    const estimatedDelivery = new Date(shippedAt);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + transitDays);

    let shipStatus: string;
    let deliveredAt: Date | null = null;
    let lastEvent: string;

    const overdue = estimatedDelivery < NOW;
    const roll = rand();

    if (status === "delivered") {
      shipStatus = "delivered";
      deliveredAt = new Date(estimatedDelivery);
      deliveredAt.setDate(deliveredAt.getDate() + (rand() < 0.2 ? 2 : 0));
      lastEvent = `Delivered, left at front door — ${customer.city}, ${customer.state}`;
    } else if (overdue && roll < 0.8 && delayedCount < 9) {
      // The delay cases the demo is built around.
      delayedCount++;
      shipStatus = roll < 0.2 ? "exception" : "in_transit";
      lastEvent =
        shipStatus === "exception"
          ? `Delivery exception — address could not be accessed, ${customer.city}, ${customer.state}`
          : `In transit, delayed at ${pick(["Memphis, TN", "Louisville, KY", "Ontario, CA", "Newark, NJ"])} sort facility`;
    } else if (roll < 0.75) {
      shipStatus = "in_transit";
      lastEvent = `Departed ${pick(["Memphis, TN", "Louisville, KY", "Ontario, CA"])} facility`;
    } else {
      shipStatus = "out_for_delivery";
      lastEvent = `Out for delivery — ${customer.city}, ${customer.state}`;
    }

    await prisma.shipment.create({
      data: {
        orderId: order.id,
        carrier: pick(CARRIERS),
        trackingNumber: `1Z${String(int(100000, 999999))}${String(int(1000000, 9999999))}`,
        status: shipStatus,
        shippedAt,
        estimatedDelivery,
        deliveredAt,
        lastEvent,
        lastEventAt: daysAgo(int(0, 3), int(6, 20)),
      },
    });
  }
  console.log(`  ${orders.length} orders (${delayedCount} running late)`);

  // ── tickets ───────────────────────────────────────────────────────────────
  const SUBJECTS = [
    ["Where is my order?", "delivery", "Tracking hasn't moved in four days and no one has contacted me. Can you tell me what is going on?"],
    ["Package arrived damaged", "damage", "The box was crushed on one corner and one of the mugs inside is chipped. Photos attached."],
    ["Wrong item received", "product", "I ordered the King sheet set and received a Queen duvet cover instead."],
    ["Requesting a refund", "refund", "This is well past the delivery date I was given at checkout. I'd like my money back."],
    ["Can I change the shipping address?", "delivery", "I moved last week and the order is going to my old address."],
    ["Item is out of stock but was charged", "product", "My card was charged but the confirmation says the item is backordered."],
  ] as const;

  let ticketCount = 0;
  for (const { order, customer, placedDaysAgo } of orders) {
    if (rand() > 0.16) continue;
    const [subject, category, body] = pick(SUBJECTS);
    const openedAt = daysAgo(Math.max(0, placedDaysAgo - int(2, 5)));
    const resolved = rand() < 0.45;
    await prisma.ticket.create({
      data: {
        number: `T-${++ticketSeq}`,
        orderId: order.id,
        customerId: customer.id,
        subject,
        body,
        category,
        priority: category === "refund" ? "high" : pick(["low", "normal", "normal", "high"]),
        status: resolved ? "resolved" : pick(["open", "open", "pending"]),
        openedAt,
        resolvedAt: resolved ? daysAgo(Math.max(0, placedDaysAgo - int(0, 2))) : null,
      },
    });
    ticketCount++;
  }
  console.log(`  ${ticketCount} tickets`);

  // ── the hero case: a reliable, self-contained story for the demo script ───
  const heroCustomer = await prisma.customer.create({
    data: {
      name: "Danielle Okafor",
      email: "danielle.okafor@example.com",
      phone: "+1 512 448 2201",
      city: "Austin",
      state: "TX",
      createdAt: daysAgo(410),
    },
  });

  const heroOrder = await prisma.order.create({
    data: {
      number: "HP-1042",
      customerId: heroCustomer.id,
      status: "fulfilled",
      channel: "web",
      totalCents: 41900 + 11800,
      placedAt: daysAgo(11),
      items: {
        create: [
          { sku: "HP-RUG-007", name: "Handwoven Jute Rug 5x8", quantity: 1, unitPriceCents: 41900 },
          { sku: "HP-TWL-014", name: "Turkish Cotton Bath Towel Set (4)", quantity: 1, unitPriceCents: 11800 },
        ],
      },
    },
  });

  await prisma.shipment.create({
    data: {
      orderId: heroOrder.id,
      carrier: "UPS",
      trackingNumber: "1Z994847X2201883",
      status: "exception",
      shippedAt: daysAgo(9),
      estimatedDelivery: daysAgo(4),
      lastEvent: "Delivery exception — package damaged in transit, returning to sender",
      lastEventAt: daysAgo(2, 14),
    },
  });

  await prisma.ticket.create({
    data: {
      number: "T-3390",
      orderId: heroOrder.id,
      customerId: heroCustomer.id,
      subject: "Rug never arrived and tracking says damaged",
      body: "I ordered the jute rug for a room I'm finishing this weekend. Tracking now says the package was damaged and is going back to you. Nobody told me. I need this resolved today.",
      category: "delivery",
      priority: "urgent",
      status: "open",
      openedAt: daysAgo(1, 9),
    },
  });

  console.log("  hero case: HP-1042 / T-3390 / Danielle Okafor");
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
