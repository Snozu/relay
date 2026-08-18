/**
 * Loads Harbor & Pine's policy documents into the knowledge base.
 *
 * Split from the business seed because it loads the embedding model, which
 * takes a few seconds on first run. Everything else seeds instantly.
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

try {
  process.loadEnvFile();
} catch {
  // Ambient environment.
}

const DIR = join(process.cwd(), "prisma", "documents");

const CATEGORIES: Record<string, string> = {
  "shipping-and-delivery-policy.md": "policy",
  "refund-and-returns-policy.md": "policy",
  "carrier-claims-guide.md": "carrier",
};

const TITLES: Record<string, string> = {
  "shipping-and-delivery-policy.md": "Shipping & Delivery Policy",
  "refund-and-returns-policy.md": "Refund & Returns Policy",
  "carrier-claims-guide.md": "Carrier Claims & Escalation Guide",
};

async function main() {
  const { db } = await import("../src/lib/db");
  const { ingestDocument } = await import("../src/lib/rag/ingest");

  console.log("Resetting document library…");
  await db.document.deleteMany();

  const files = (await readdir(DIR)).filter((f) => f.endsWith(".md"));

  for (const filename of files) {
    const text = await readFile(join(DIR, filename), "utf8");
    const started = Date.now();

    const doc = await ingestDocument({
      title: TITLES[filename] ?? filename.replace(/\.md$/, ""),
      filename,
      mimeType: "text/markdown",
      sizeBytes: Buffer.byteLength(text),
      category: CATEGORIES[filename] ?? "other",
      text,
    });

    console.log(`  ${doc.title} — ${doc.chunkCount} chunks in ${Date.now() - started}ms`);
  }

  console.log("Done.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
