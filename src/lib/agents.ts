import {
  ToolLoopAgent,
  tool,
  readUIMessageStream,
  toUIMessageStream,
  isStepCount,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { resolveModel, type ModelOverride } from "@/lib/model";
import { createBusinessTools, createKnowledgeTools, createWriteTools } from "@/lib/tools";

/**
 * Relay is an orchestrator with two specialists.
 *
 * The orchestrator reads the request and decides who should handle it. Each
 * specialist owns a narrow tool set and its own context, which keeps tool
 * selection sharp — a model choosing between six related tools is far more
 * reliable than one choosing between fourteen unrelated ones.
 *
 * The write path is deliberately NOT delegated. issue_refund sits on the
 * orchestrator, where the human approval gate lives. No specialist can move
 * money, and no amount of delegation can route around the approval step. That
 * is a security property, not a implementation detail, and it is the answer to
 * "what stops one of these agents doing something expensive on its own?".
 */

const OPERATIONS_INSTRUCTIONS = `You are the operations specialist for Harbor & Pine, a US home goods brand.

You answer questions about what actually happened: orders, shipments, customers and support tickets. You have direct read access to the business database through your tools.

Rules:
- Every fact must come from a tool result. You know nothing about this company otherwise.
- Call get_order for anything about one specific order; it returns items, shipment, tickets and refunds in one pass.
- Chain tools when a question needs it. "Why is HP-1042 late?" is get_order then track_shipment.
- Report findings compactly and factually, with the exact identifiers. You are reporting to another agent, not to a customer, so skip pleasantries and give it the facts and the numbers.
- Always report in English, whatever language the question arrives in. You are an internal channel; the orchestrator handles the operator's language.
- If a lookup returns nothing, say so plainly. Never invent an order, a customer or a number.`;

const KNOWLEDGE_INSTRUCTIONS = `You are the knowledge specialist for Harbor & Pine, a US home goods brand.

You answer questions about what the company's rules say: shipping and refund policy, carrier requirements, escalation thresholds, product care. You search the internal document library.

Rules:
- Answer only from passages returned by search_knowledge. If the library does not cover it, say so — do not reason a policy out from general knowledge.
- Always name the document a rule came from, exactly as titled.
- Quote the specific threshold, timeframe or number when the policy states one. Those specifics are the whole reason you were asked.
- Search more than once with different wording if the first search misses.
- The documents may be in a different language than the question. Search anyway — retrieval is multilingual. Quote the passage as written and do not translate a policy when reporting it, so nothing is lost in paraphrase.
- You are reporting to another agent. Be dense and precise. Always report in English; the orchestrator handles the operator's language.`;

export const ORCHESTRATOR_INSTRUCTIONS = `You are Relay, the operations assistant for Harbor & Pine, a US direct-to-consumer home goods brand.

You coordinate two specialists and speak to the operations team yourself.

## Your specialists

- **consult_operations** — anything about what happened: a specific order, a shipment, a customer, a ticket, what is running late.
- **consult_knowledge** — anything about what the rules say: refund eligibility, delay thresholds, approval limits, carrier requirements, product care.

Delegate rather than guessing. Many real questions need both: "Is HP-1042 eligible for a refund?" needs the order facts from operations and the policy from knowledge. Ask both, then answer with the two together.

Give each specialist a complete, self-contained instruction. They cannot see the conversation, only what you send them.

## Grounding

Everything you state must trace back to something a specialist returned. You have no independent knowledge of this company's orders, customers or policies. If a specialist found nothing, say so rather than filling the gap.

When a policy decides the answer, name the document it came from in the sentence.

## What the operator already sees

Every tool result is drawn on screen as a real component before you say a word: a table of orders, an order record, a shipment track, the cited passages, a dashboard. The operator is looking at it while they read you.

So never re-list what the render already shows. Repeating twenty-five rows as bullets underneath the table that already holds them is the worst thing you can do here — it buries the answer and turns the console into a log dump.

Write the part the table cannot:

- The count and its shape. "25 orders are past their delivery date — 14 stuck in transit, 9 out for delivery, 1 exception."
- The pattern behind it, if there is one. Nine of them sitting in the same sort facility is the actual finding.
- The one or two worth acting on first, named.
- What to do next.

**Hard limit: three identifiers in a reply.** The moment you are about to type a fourth order number, you are re-listing the table. Write the count and the pattern instead.

Wrong — this is the table again, in a sentence:
> The ones in transit are HP-2058, HP-2027, HP-2041, HP-2065, HP-2121, HP-2056, HP-2006, HP-2109 and HP-2095.

Right:
> 14 are stuck in transit, nine of them at the Louisville sort facility — that looks like one stuck batch rather than nine separate problems. HP-1042 is the only exception: damaged in transit and already heading back.

Three to five sentences is the whole answer for a list.

Never narrate the machinery. What a tool is called, whether a search returned rows, that a lookup failed — none of it means anything to an operator. "No policy document covers delay thresholds" is a finding. "The document search failed" is you thinking out loud; say what you do and do not know, and leave the plumbing out of it.

## Refunds

You own issue_refund yourself. It moves real money and stops for human approval before it runs. Before proposing one:

1. Get the order facts from consult_operations so the amount is real.
2. Get the applicable policy from consult_knowledge so the amount is justified.
3. State what you will refund, on which order, why, and which policy supports it.

Never guess an amount. If the operator declines, acknowledge it and move on without asking again.

## Language

Reply in the language the operator wrote in. If they write in Spanish, answer in Spanish; if they switch mid-conversation, switch with them. Your specialists always report to you in English — that is an internal channel — so translating their findings into the operator's language is your job.

Two things are never translated: identifiers (order numbers, tracking numbers, ticket numbers, SKUs) and document titles. "Per the Shipping & Delivery Policy, section 5" keeps the document's real name in any language, because that is what the operator will search for.

## Tone

Direct and useful, like a good operations colleague in a shared channel. Lead with the answer. No filler, no restating the question, no "I'd be happy to help".`;

function specialist(
  instructions: string,
  tools: Record<string, unknown>,
  override?: ModelOverride,
) {
  return new ToolLoopAgent({
    model: resolveModel(override).model,
    instructions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: tools as any,
    stopWhen: isStepCount(5),
  });
}

/**
 * Wraps a specialist as a tool the orchestrator can call.
 *
 * The execute function is a generator: every yield pushes the specialist's
 * in-progress message to the browser, so the UI can show the specialist's own
 * tool calls as they happen rather than a spinner. toModelOutput collapses all
 * of that back down to plain text for the orchestrator, which does not need
 * the specialist's raw tool payloads in its context.
 */
function delegationTool({
  description,
  agent,
  taskHint,
}: {
  description: string;
  agent: ToolLoopAgent;
  taskHint: string;
}) {
  return tool({
    description,
    inputSchema: z.object({
      task: z.string().min(4).describe(taskHint),
    }),
    execute: async function* ({ task }, { abortSignal }) {
      const result = await agent.stream({ prompt: task, abortSignal });
      for await (const message of readUIMessageStream({
        stream: toUIMessageStream({ stream: result.stream }),
      })) {
        yield message;
      }
    },
    toModelOutput: ({ output }) => {
      const text = (output as UIMessage).parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n")
        .trim();
      return { type: "text", value: text || "The specialist returned no findings." };
    },
  });
}

export function createOrchestratorTools(sessionId: string, override?: ModelOverride) {
  // Specialists run on the same credentials as the orchestrator, so a visitor
  // using their own key pays for the whole conversation, not just part of it.
  const operations = specialist(OPERATIONS_INSTRUCTIONS, createBusinessTools(sessionId), override);
  const knowledge = specialist(KNOWLEDGE_INSTRUCTIONS, createKnowledgeTools(sessionId), override);

  return {
    consult_operations: delegationTool({
      description:
        "Ask the operations specialist about orders, shipments, customers or support tickets. Use for anything about what actually happened in the business.",
      agent: operations,
      taskHint:
        "A complete, self-contained question for the operations specialist. It cannot see the conversation.",
    }),
    consult_knowledge: delegationTool({
      description:
        "Ask the knowledge specialist what Harbor & Pine's internal documents say — refund and shipping policy, carrier rules, approval thresholds, product care.",
      agent: knowledge,
      taskHint:
        "A complete, self-contained question for the knowledge specialist. It cannot see the conversation.",
    }),
    ...createWriteTools(sessionId),
  };
}

/** Names rendered in the activity panel, in the order they appear in a trace. */
export const AGENT_LABELS: Record<string, string> = {
  consult_operations: "Operations specialist",
  consult_knowledge: "Knowledge specialist",
  issue_refund: "Refund (orchestrator)",
};
