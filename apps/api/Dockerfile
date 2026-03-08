# ─── Runtime (--experimental-strip-types, pas de build step) ──────────────────
FROM node:22-alpine

WORKDIR /app

# Copy monorepo structure
COPY package*.json ./
COPY .npmrc ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install deps (node:22-alpine >= 22.12, satisfait les peerDeps Prisma de better-auth)
RUN npm ci

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "--experimental-strip-types", "apps/api/src/index.ts"]
