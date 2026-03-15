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

# Stubs minimaux pour les workspaces absents du container.
# npm ci exige que TOUS les workspaces déclarés dans le lockfile existent
# en tant que répertoires — sinon il lève ENOENT et avorte.
# On crée des package.json SANS dépendances pour éviter d'installer
# tout Next.js (28 deps) dans une image qui n'en a pas besoin.
RUN mkdir -p apps/web && \
    echo '{"name":"@quran-tracker/web","version":"0.1.0","private":true}' \
    > apps/web/package.json

# Install deps (node:22-alpine >= 22.12, satisfait les peerDeps Prisma de better-auth)
RUN npm ci

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "--experimental-strip-types", "apps/api/src/index.ts"]
