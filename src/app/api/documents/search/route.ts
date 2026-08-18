import { searchKnowledge } from "@/lib/rag/search";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Retrieval preview. Same function the agent's search_knowledge tool calls,
 * exposed on its own so retrieval can be inspected without a conversation in
 * the way. Useful when explaining what RAG actually does.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(`search:${ip}`, 20);
  if (!limit.ok) {
    return Response.json({ error: "Too many searches." }, { status: 429 });
  }

  const { query } = await req.json();
  if (typeof query !== "string" || query.trim().length < 3) {
    return Response.json({ passages: [], tookMs: 0 });
  }

  const started = Date.now();
  const passages = await searchKnowledge(query.trim(), 5);
  return Response.json({ passages, tookMs: Date.now() - started });
}
