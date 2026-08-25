# syntax=docker/dockerfile:1
#
# Relay in production: one Node process, one Postgres, nothing else.
#
# Debian rather than Alpine on purpose. The embedder runs on onnxruntime-node,
# which ships glibc binaries only; on musl it fails at load time, not at build.

ARG NODE_IMAGE=node:22-bookworm-slim

# ── deps ──────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# prisma.config.ts resolves DATABASE_URL when the CLI loads it, and `prisma
# generate` runs on postinstall. Generation never opens a connection, so a
# placeholder is enough here; compose supplies the real URL at run time.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
# postinstall runs `prisma generate`, so the schema has to be present already.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
COPY --from=deps /app/node_modules ./node_modules

# Pull the ~450 MB embedding model into the image before the source arrives, so
# the download survives in the layer cache across ordinary code changes. Left to
# the first request it would turn the opening seconds of a demo into a blank
# screen, and it would make the container depend on Hugging Face being up.
COPY package.json tsconfig.json ./
COPY scripts/prefetch-embedder.ts ./scripts/
COPY src/lib/embeddings.ts ./src/lib/
RUN npx tsx scripts/prefetch-embedder.ts

COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at build time. It cannot come
# from the runtime environment, which is why it is a build argument.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# The generated client lands in src/generated, which is gitignored and so is
# never part of the build context. Generate it here rather than hoping a
# stale copy came along.
RUN npx prisma generate

RUN npm run build

# ── tooling ───────────────────────────────────────────────────────────────────
# Schema push and seeding. Full node_modules, so it carries prisma and tsx,
# which the runtime image deliberately does not. Run as a one-off, never as a
# long-lived service.
FROM builder AS tooling
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npx tsx prisma/seed-documents.ts"]

# ── runner ────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs relay

# `output: "standalone"` traces exactly the files the server needs.
COPY --from=builder --chown=relay:nodejs /app/.next/standalone ./
COPY --from=builder --chown=relay:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=relay:nodejs /app/public ./public

# The embedder is marked external, so tracing takes the package but not the
# model weights sitting in its .cache directory. Copy the package whole,
# together with the ONNX runtime it loads at run time.
COPY --from=builder --chown=relay:nodejs /app/node_modules/@huggingface/transformers ./node_modules/@huggingface/transformers
COPY --from=builder --chown=relay:nodejs /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=builder --chown=relay:nodejs /app/node_modules/onnxruntime-common ./node_modules/onnxruntime-common

USER relay
EXPOSE 3000
CMD ["node", "server.js"]
