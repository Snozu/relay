# Deploying Relay

Relay runs as two containers on a single VPS: the Next.js server and a
PostgreSQL 17 instance with pgvector. There is no queue, no worker and no cache
tier to operate — the whole system is `docker compose up`.

Routing and TLS are assumed to come from a Traefik instance already running on
the host, attached to a Docker network named `root_default`. Any other reverse
proxy works: drop the `labels:` block and publish port 3000 instead.

## First deployment

```bash
git clone https://github.com/Snozu/relay.git /var/www/relay
cd /var/www/relay/deploy
cp .env.example .env          # then edit it — POSTGRES_PASSWORD and the host
docker compose build          # ~5 min; downloads the embedding model into the image
docker compose up -d db
docker compose --profile seed run --rm seed   # schema + demo data
docker compose up -d app
```

`RELAY_HOST` is what Traefik routes; `RELAY_PUBLIC_URL` is the same host written
as a URL, and nothing in the application reads it at run time — it exists so the
deployment records its own address. Keep them consistent anyway.

## Model credentials

Visitors can always supply their own key in the settings panel; it stays in
their browser, travels as a request header, and reaches nothing but the provider
it belongs to.

What the deployment does when they *don't* is decided by `deploy/.env`. Leave
`DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` blank and the
console asks each visitor for a key — the deployment spends nothing. Set the one
matching `RELAY_PROVIDER` and anyone with the URL can run the demo on your
tokens:

```
RELAY_PROVIDER=openai
OPENAI_API_KEY=sk-proj-…
```

That is the right setting for a link shared with prospects, and it makes the URL
a spending endpoint. `RELAY_RATE_LIMIT_PER_MINUTE` throttles a single IP; it is
not a budget. Set a hard monthly cap on the provider account as well, and give
the deployment a key scoped to nothing else.

## Pointing a different domain at it

Change `RELAY_HOST` and `RELAY_PUBLIC_URL`, then `docker compose up -d app`. No
rebuild is involved: routing lives in the container's labels, not in the bundle.

DNS for the new host must already resolve to this server before Traefik will ask
for a certificate — a failed ACME attempt counts against an hourly limit. To keep
the old address answering while the new one propagates, set both in `.env`:

```
RELAY_RULE=Host(`new.example.com`) || Host(`old.example.com`)
```

## Updating

```bash
cd /var/www/relay && git pull
cd deploy && docker compose up -d --build app
```

The database survives; `pgdata` is a named volume. Reloading the demo data is
`docker compose --profile seed run --rm seed`, which resets nothing — it seeds
on top of the existing schema.

## Operational notes

- **Memory.** The embedder holds a ~450 MB model resident. The `app` service is
  capped at 2.5 GB and idles well below it; a host with less than 4 GB free will
  struggle.
- **First build** downloads the model, so it needs network access to Hugging
  Face. Every later start is offline.
- **Postgres is unreachable** from the host and the internet by design: it sits
  on an `internal: true` network with no published port. Reach it with
  `docker compose exec db psql -U relay -d relay`.
