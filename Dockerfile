# ── Stage 1: Build Client (Svelte + Vite) ───────────
FROM oven/bun:1-alpine AS client-builder
WORKDIR /app/client

COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile

COPY client/ ./
RUN bun run build

# ── Stage 2: Install Server Dependencies ─────────────
FROM oven/bun:1-alpine AS server-deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

# ── Stage 3: Production Runner ───────────────────────
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3456 \
    DATABASE_PATH=/app/data/game.db

# Siapkan direktori data untuk persistensi SQLite
RUN mkdir -p /app/data && chown -R bun:bun /app

# Salin dependencies server dan build frontend
COPY --from=server-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=client-builder --chown=bun:bun /app/client/dist ./client/dist
COPY --chown=bun:bun package.json tsconfig.json ./
COPY --chown=bun:bun server/ ./server/

USER bun

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3456/api/health > /dev/null || exit 1

CMD ["bun", "run", "server/index.ts"]
