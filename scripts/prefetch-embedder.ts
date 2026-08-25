/**
 * Downloads the embedding model into the image at build time.
 *
 * The model is ~450 MB. Fetched lazily on the first question, it turns the
 * opening seconds of a demo into a blank screen; fetched here, the container
 * starts with it already on disk and never talks to Hugging Face at run time.
 *
 * Run from the repository root: `npx tsx scripts/prefetch-embedder.ts`
 */
import { EMBEDDING_MODEL, embedOne } from "../src/lib/embeddings";

async function main() {
  const started = Date.now();
  const vector = await embedOne("warm the embedder cache");
  console.log(
    `${EMBEDDING_MODEL}: ${vector.length} dimensions in ${Date.now() - started}ms`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
