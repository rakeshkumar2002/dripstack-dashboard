# syntax=docker/dockerfile:1.7
#
# The API origin is injected at RUN time (DASHBOARD_API_URL -> app/layout.tsx ->
# window.__DRIPSTACK_CONFIG__), not baked in at build time, so this image is
# environment-agnostic: build once, deploy anywhere.

# ─── deps ────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm install --frozen-lockfile

# ─── builder ─────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time fallback only — the runtime injection above is what actually gets
# used. Leave this at the localhost default to keep the image portable.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# NOTE: app/layout.tsx uses next/font/google, so `next build` fetches Space
# Grotesk / Hanken Grotesk / JetBrains Mono from fonts.googleapis.com. THIS STAGE
# REQUIRES OUTBOUND NETWORK. On an air-gapped builder, vendor the WOFF2 files and
# switch to next/font/local instead.
RUN pnpm build

# ─── runtime ─────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Next's standalone server binds process.env.HOSTNAME, which defaults to
    # localhost in some base images -- the container would then listen on
    # loopback only and every proxied request would time out.
    HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

# .next/standalone contains neither .next/static nor public/. Without static the
# page renders unstyled with 404s on every chunk; without public/ the docs site
# at /docs silently 404s.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
