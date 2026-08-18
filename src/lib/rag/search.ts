import { db } from "@/lib/db";
import { embedOne, toVectorLiteral } from "@/lib/embeddings";

/**
 * Hybrid retrieval: vector similarity and Postgres full-text, fused.
 *
 * Vector search finds passages that mean the same thing in different words.
 * Full-text search finds exact terms — an SKU, a carrier name, a policy number
 * — which embeddings routinely miss. Neither alone is good enough on a real
 * document set, so Relay runs both and merges them with Reciprocal Rank
 * Fusion: a passage ranked well by either method rises, and one ranked well by
 * both rises further.
 *
 * RRF needs no score calibration between the two systems, which is exactly why
 * it is used here instead of a weighted blend of incomparable scores.
 */
const RRF_K = 60;
const CANDIDATES = 20;

export type Passage = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  category: string;
  ordinal: number;
  content: string;
  score: number;
  matchedBy: ("semantic" | "keyword")[];
};

type Row = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  category: string;
  ordinal: number;
  content: string;
};

export async function searchKnowledge(query: string, limit = 5): Promise<Passage[]> {
  const total = await db.documentChunk.count();
  if (total === 0) return [];

  const vector = toVectorLiteral(await embedOne(query));

  const [semantic, keyword] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT c."id"        AS "chunkId",
             c."documentId",
             d."title"     AS "documentTitle",
             d."category",
             c."ordinal",
             c."content"
      FROM "DocumentChunk" c
      JOIN "Document" d ON d."id" = c."documentId"
      WHERE c."embedding" IS NOT NULL
      ORDER BY c."embedding" <=> ${vector}::vector
      LIMIT ${CANDIDATES}
    `,
    db.$queryRaw<Row[]>`
      SELECT c."id"        AS "chunkId",
             c."documentId",
             d."title"     AS "documentTitle",
             d."category",
             c."ordinal",
             c."content"
      FROM "DocumentChunk" c
      JOIN "Document" d ON d."id" = c."documentId"
      WHERE to_tsvector('english', c."content") @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(to_tsvector('english', c."content"), plainto_tsquery('english', ${query})) DESC
      LIMIT ${CANDIDATES}
    `,
  ]);

  const fused = new Map<string, Passage>();

  const fuse = (rows: Row[], label: "semantic" | "keyword") => {
    rows.forEach((row, rank) => {
      const contribution = 1 / (RRF_K + rank + 1);
      const existing = fused.get(row.chunkId);
      if (existing) {
        existing.score += contribution;
        existing.matchedBy.push(label);
      } else {
        fused.set(row.chunkId, { ...row, score: contribution, matchedBy: [label] });
      }
    });
  };

  fuse(semantic, "semantic");
  fuse(keyword, "keyword");

  return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
