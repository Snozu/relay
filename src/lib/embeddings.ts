import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Embeddings run locally, inside the Node process. No API key, no per-token
 * cost, and the contents of an uploaded document never leave the server.
 *
 * The model is multilingual on purpose. An English-only embedder scores a
 * Spanish question against an English policy passage at 0.18 — barely above
 * the 0.02 it gives unrelated text, which means cross-language retrieval
 * silently returns noise. paraphrase-multilingual-MiniLM-L12-v2 scores the
 * same pair at 0.43. It is larger and slower to load, and it is the difference
 * between the feature working and only appearing to work.
 *
 * Still 384 dimensions, so the pgvector column is unchanged.
 *
 * The model loads once per process and then embeds a batch in single-digit
 * milliseconds. Re-run `npm run db:seed:docs` after changing it: vectors from
 * two different models are not comparable.
 */
export const EMBEDDING_DIMENSIONS = 384;
export const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  extractorPromise ??= pipeline("feature-extraction", EMBEDDING_MODEL);
  return extractorPromise;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text]);
  return vector;
}

/** pgvector accepts a bracketed literal: [0.1,0.2,...] */
export function toVectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}
