import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  isStepCount,
  type UIMessage,
} from "ai";
import { missingKey, overrideFromHeaders } from "@/lib/model";
import { createOrchestratorTools, ORCHESTRATOR_INSTRUCTIONS } from "@/lib/agents";
import { resolveModel } from "@/lib/model";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  // A visitor may supply their own key from the console's settings panel. It is
  // used for this request only and never stored, logged or audited.
  const override = overrideFromHeaders(req.headers);

  const missing = missingKey(override);
  if (missing) {
    return Response.json(
      {
        // The hosted demo carries no provider credentials of its own: every
        // visitor spends their own tokens. Locally it is a setup step.
        error:
          process.env.NODE_ENV === "production"
            ? `This deployment holds no model key. Open Settings and add your own ${missing.replace("_API_KEY", "").toLowerCase()} key — it stays in your browser and is used for your requests only.`
            : `${missing} is not set. Copy .env.example to .env and add your key.`,
      },
      { status: 500 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local";

  const limit = rateLimit(ip, Number(process.env.RELAY_RATE_LIMIT_PER_MINUTE ?? 12));
  if (!limit.ok) {
    return Response.json(
      { error: `Rate limit reached. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const { id, messages }: { id?: string; messages: UIMessage[] } = await req.json();
  const sessionId = id ?? "anonymous";

  const result = streamText({
    model: resolveModel(override).model,
    system: ORCHESTRATOR_INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
    tools: createOrchestratorTools(sessionId, override),
    // The orchestrator consults both specialists, then answers. Bounding the
    // loop keeps a bad turn from spending real money.
    stopWhen: isStepCount(8),
    // The only write in the system. It executes on the server, but only after
    // a human presses approve in the UI.
    toolApproval: { issue_refund: "user-approval" },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
