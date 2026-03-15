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
# Stubs pour les workspaces absents du container (apps/web, packages/ui)
# npm ci exige que TOUS les workspace packages du lockfile soient présents
# (même ceux non utilisés par l'API) pour créer les symlinks node_modules.
COPY apps/web/package.json ./apps/web/package.json

# Install deps (node:22-alpine >= 22.12, satisfait les peerDeps Prisma de better-auth)
RUN npm ci

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "--experimental-strip-types", "apps/api/src/index.ts"]
