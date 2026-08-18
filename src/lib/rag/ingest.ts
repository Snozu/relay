import { extractText, getDocumentProxy } from "unpdf";
import { db } from "@/lib/db";
import { embed, toVectorLiteral } from "@/lib/embeddings";
import { chunkText } from "@/lib/rag/chunk";

export const ACCEPTED_TYPES = ["application/pdf", "text/plain", "text/markdown"] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function extractDocumentText(file: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<string> {
  if (file.mimeType === "application/pdf" || file.filename.toLowerCase().endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(file.buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  return file.buffer.toString("utf8");
}

/**
 * Ingest one document: extract, chunk, embed, store.
 *
 * Chunks and their vectors land in the same Postgres the business data lives
 * in. One datastore to run, back up, and explain.
 */
export async function ingestDocument(input: {
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  text: string;
}) {
  const chunks = chunkText(input.text);

  if (chunks.length === 0) {
    throw new Error("No readable text found in this file.");
  }

  const document = await db.document.create({
    data: {
      title: input.title,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category: input.category,
      status: "processing",
    },
  });

  try {
    // Embed in batches so a large document does not build one giant tensor.
    const BATCH = 32;
    for (let start = 0; start < chunks.length; start += BATCH) {
      const slice = chunks.slice(start, start + BATCH);
      const vectors = await embed(slice);

      for (let i = 0; i < slice.length; i++) {
        // Raw SQL: Prisma has no native pgvector type.
        await db.$executeRaw`
          INSERT INTO "DocumentChunk" ("id", "documentId", "ordinal", "content", "charCount", "embedding")
          VALUES (
            gen_random_uuid()::text,
            ${document.id},
            ${start + i},
            ${slice[i]},
            ${slice[i].length},
            ${toVectorLiteral(vectors[i])}::vector
          )
        `;
      }
    }

    return await db.document.update({
      where: { id: document.id },
      data: { status: "ready", chunkCount: chunks.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    await db.document.update({
      where: { id: document.id },
      data: { status: "failed", error: message.slice(0, 300) },
    });
    throw error;
  }
}

export async function deleteDocument(id: string) {
  await db.document.delete({ where: { id } });
}
