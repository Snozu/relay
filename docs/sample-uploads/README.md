# Sample documents for testing ingestion

Four files to drag into the **Knowledge** tab of the console, chosen to exercise a
different part of the pipeline each. Upload one, then ask the question next to it and
watch the Knowledge specialist in the activity panel.

| File | Format | Language | What it tests |
|---|---|---|---|
| `peak-season-shipping-addendum.txt` | plain text | English | Text parsing · exact dates and numbers via keyword retrieval |
| `guia-atencion-clientes-latam.md` | Markdown | **Spanish** | A Spanish source document · cross-language retrieval in reverse |
| `carrier-rate-card-2026.pdf` | **PDF** | English | PDF extraction · tabular figures |
| `politica-devoluciones-mayoreo.pdf` | **PDF** | **Spanish** | Spanish PDF · both at once |

Upload them with the `policy` or `carrier` category so they sit alongside the seeded
documents. Everything is fictional Harbor & Pine content and interlocks with the demo
dataset, so the agent can combine it with real orders.

---

## What to ask after each one

### `peak-season-shipping-addendum.txt`

- *"What is the cutoff to guarantee delivery by December 24 on a made-to-order item?"*
  → should find **December 5, 1:00 PM CT**, from a plain-text file.
- *"An order is 8 days late in December. Do we owe the customer anything?"*
  → tests whether it applies the **widened** peak tiers instead of the standard ones.
- *"What is the agent refund ceiling right now?"*
  → **$900** during peak, not the standard $600. Two documents now disagree, and the
  addendum says it supersedes. Watch whether the agent notices.

**This is the interesting test.** Uploading a document that contradicts an existing one
is exactly what happens at a real client. It should cite the addendum and say why.

### `guia-atencion-clientes-latam.md`

- *"What is the refund ceiling for an order going to Mexico?"*
  → **$400 USD**, answered in English from a Spanish document.
- *"¿Cuántos días de ventana de devolución tiene un cliente en Chile?"*
  → **60 días**, Spanish question, Spanish document.
- *"Is a package stuck in customs considered delayed?"*
  → **No** — it should say so and explain why.

### `carrier-rate-card-2026.pdf`

- *"What does UPS Ground cost to zone 7?"* → **$17.60**
- *"When should we route through USPS instead of UPS?"* → the routing guidance at the end.
- *"What is the residential surcharge?"* → **$5.30**

Exact figures out of a PDF table are where naive retrieval usually fails. This is the
keyword half of the hybrid search earning its place.

### `politica-devoluciones-mayoreo.pdf`

- *"¿Cuánto puede autorizar un agente en una devolución de mayoreo?"* → **$1,200**
- *"Do wholesale returns get cash back or credit?"* → credit note by default, cash only
  in two named cases.
- *"What is the restocking fee, and when does it not apply?"* → **15%**, waived for
  defects, wrong items and transit damage.

---

## The combined test

Once the peak season addendum is uploaded, ask:

> *"HP-1042 is damaged in transit. Is the refund within my approval limit?"*

The agent has to pull the order value from the operations specialist, then reconcile two
documents that state different ceilings. Whatever it answers, the activity panel shows
you exactly which passages it used to get there.

---

## Removing them again

Each document has a `remove` link in the library list. Removing one deletes its passages,
so retrieval stops using it immediately. `npm run db:seed:docs` resets the library back to
the three seeded policies.
