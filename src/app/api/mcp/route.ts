import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { createBusinessTools, createKnowledgeTools } from "@/lib/tools";

/**
 * Relay as an MCP server.
 *
 * Anything that speaks Model Context Protocol — Claude Desktop, Cursor, another
 * agent — can connect to this endpoint and use Relay's read tools directly
 * against the operational data. The same tools the specialists call, exposed to
 * whatever the client already works in.
 *
 * ── What is deliberately NOT here ──────────────────────────────────────────
 *
 * issue_refund is not exposed. The human approval gate lives in Relay's own
 * interface, so publishing the write tool over MCP would hand an external
 * client a way around it. Reads are safe to federate; the write is not, and it
 * stays where the gate is.
 *
 * This is the same reasoning that keeps the write off the specialists: the
 * boundary is enforced by what exists at each edge, not by configuration.
 */

const SESSION = "mcp";

// Read tools only. The write path is intentionally absent — see above.
const EXPOSED = { ...createBusinessTools(SESSION), ...createKnowledgeTools(SESSION) };

type ExposedTool = {
  description?: string;
  inputSchema?: z.ZodTypeAny;
  execute?: (input: unknown, options: unknown) => Promise<unknown>;
};

const handler = createMcpHandler(
  (server) => {
    for (const [name, definition] of Object.entries(EXPOSED)) {
      const tool = definition as unknown as ExposedTool;

      server.registerTool(
        name,
        {
          description: tool.description,
          inputSchema: (tool.inputSchema ?? z.object({})) as z.ZodObject<z.ZodRawShape>,
        },
        async (input: unknown) => {
          const result = (await tool.execute?.(input, {})) as
            | ({ summary?: string } & Record<string, unknown>)
            | undefined;

          // The summary line first so a client that only renders text still
          // gets something a human can read, then the full structured payload.
          return {
            content: [
              { type: "text" as const, text: result?.summary ?? "No result." },
              { type: "text" as const, text: JSON.stringify(result, null, 2) },
            ],
          };
        },
      );
    }
  },
  {
    instructions:
      "Relay exposes read access to Harbor & Pine's operational data: orders, shipments, customers, support tickets, an operational summary, and hybrid search over the company's policy documents. Every fact you report must come from a tool result — do not infer or invent order numbers, amounts or policy rules. Write actions are not available here by design; refunds require human approval inside Relay's own interface.",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
