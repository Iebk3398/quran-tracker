# ─── Runtime (pas de build step — --experimental-strip-types) ─────────────────
FROM node:22-alpine

WORKDIR /app

# Copy monorepo structure
COPY package*.json ./
COPY .npmrc ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install deps (--omit=optional évite Prisma qui est peer dep optionnel de better-auth)
RUN npm ci --omit=optional

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "--experimental-strip-types", "apps/api/src/index.ts"]
