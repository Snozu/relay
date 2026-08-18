import { db } from "@/lib/db";
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  extractDocumentText,
  ingestDocument,
} from "@/lib/rag/ingest";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

export async function GET() {
  const documents = await db.document.findMany({ orderBy: { uploadedAt: "desc" } });
  return Response.json({ documents });
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local";

  // Ingestion is the most expensive thing a visitor can trigger, so it gets a
  // tighter limit than the chat.
  const limit = rateLimit(`upload:${ip}`, 4);
  if (!limit.ok) {
    return Response.json(
      { error: `Too many uploads. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const category = String(form.get("category") ?? "other");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file was uploaded." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `File is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.` },
      { status: 400 },
    );
  }

  const looksAccepted =
    ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number]) ||
    /\.(pdf|txt|md)$/i.test(file.name);

  if (!looksAccepted) {
    return Response.json(
      { error: "Only PDF, plain text and Markdown files are accepted." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractDocumentText({
      buffer,
      mimeType: file.type,
      filename: file.name,
    });

    const document = await ingestDocument({
      title: file.name.replace(/\.(pdf|txt|md)$/i, ""),
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category,
      text,
    });

    return Response.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return Response.json({ error: "No document id." }, { status: 400 });
  await db.document.delete({ where: { id } });
  return Response.json({ ok: true });
}
