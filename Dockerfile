# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-bookworm-slim

# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:${NODE_VERSION} AS deps

WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./

RUN --mount=type=cache,id=homecare-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

# ==========================================
# Stage 2: Build
# ==========================================
FROM deps AS builder

WORKDIR /app

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=secret,id=next_env,target=/app/.env.production.local,required=true \
    pnpm build

# ==========================================
# Stage 3: Production runtime
# ==========================================
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

RUN mkdir -p .next/cache && chown node:node .next .next/cache

USER node

EXPOSE 3000

CMD ["node", "server.js"]