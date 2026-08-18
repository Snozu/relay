/**
 * A public demo URL is effectively a public API key. This keeps one visitor
 * from burning the month's token budget in an afternoon.
 *
 * In-memory on purpose: one process, one demo, no Redis to explain. If Relay
 * ever runs more than one instance, this moves behind a shared store.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, perMinute: number) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= perMinute) {
    hits.set(key, recent);
    return { ok: false as const, retryAfterSeconds: Math.ceil((recent[0] + 60_000 - now) / 1000) };
  }

  recent.push(now);
  hits.set(key, recent);

  // Keep the map from growing without bound across a long-running process.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) if (v.every((t) => t <= windowStart)) hits.delete(k);
  }

  return { ok: true as const, remaining: perMinute - recent.length };
}
