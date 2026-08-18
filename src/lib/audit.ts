import { db } from "@/lib/db";

/**
 * Every tool call is recorded: what was asked, what came back, how long it took.
 *
 * This is not logging for developers. It is the audit trail a client is shown
 * when they ask "how do I know what this thing did to my data?" — which is the
 * question that decides whether they let an agent near their systems.
 */
export async function withAudit<T extends { summary: string }>(
  sessionId: string,
  name: string,
  input: unknown,
  run: () => Promise<T>,
): Promise<T & { ms: number }> {
  const startedAt = Date.now();
  try {
    const result = await run();
    const ms = Date.now() - startedAt;
    void record(sessionId, name, input, result.summary, "ok", ms);
    // The elapsed time travels back to the UI. Showing real latency next to a
    // real tool call is what separates this from a chat that only looks smart.
    return { ...result, ms };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    void record(sessionId, name, input, message, "error", Date.now() - startedAt);
    throw error;
  }
}

async function record(
  sessionId: string,
  name: string,
  input: unknown,
  outputSummary: string,
  status: string,
  durationMs: number,
) {
  try {
    await db.toolCall.create({
      data: {
        sessionId,
        name,
        input: (input ?? {}) as object,
        outputSummary: outputSummary.slice(0, 500),
        status,
        durationMs,
      },
    });
  } catch {
    // The audit log must never break the conversation. If it fails, the tool
    // result still reaches the user; the gap shows up in the audit view.
  }
}
