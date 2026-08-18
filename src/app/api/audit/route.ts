import { db } from "@/lib/db";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");

  const calls = await db.toolCall.findMany({
    where: sessionId ? { sessionId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return Response.json({
    calls: calls.map((c) => ({
      id: c.id,
      name: c.name,
      input: c.input,
      outputSummary: c.outputSummary,
      status: c.status,
      durationMs: c.durationMs,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
