/**
 * Chunking splits a document into pieces small enough to embed and specific
 * enough to cite. Paragraph boundaries first, hard character limit second,
 * with an overlap so a sentence spanning two chunks is not lost to both.
 */
const TARGET_CHARS = 1_000;
const OVERLAP_CHARS = 150;

export function chunkText(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];

  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    // A single oversized paragraph gets split on sentence boundaries.
    if (paragraph.length > TARGET_CHARS) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      for (const sentence of paragraph.match(/[^.!?]+[.!?]+|\S+$/g) ?? [paragraph]) {
        if (current.length + sentence.length > TARGET_CHARS && current) {
          chunks.push(current.trim());
          current = current.slice(-OVERLAP_CHARS);
        }
        current += sentence;
      }
      continue;
    }

    if (current.length + paragraph.length > TARGET_CHARS && current) {
      chunks.push(current.trim());
      current = current.slice(-OVERLAP_CHARS) + "\n\n";
    }
    current += paragraph + "\n\n";
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 40);
}
