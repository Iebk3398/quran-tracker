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

# Stub minimal pour apps/web (workspace absent du container).
# npm a besoin que le répertoire existe pour créer le symlink node_modules.
# On n'utilise PAS npm ci (trop strict : échoue si package.json ≠ lockfile).
# npm install lit chaque package.json de workspace → stub sans deps
# → Next.js n'est PAS installé → image légère et build rapide.
RUN mkdir -p apps/web && \
    echo '{"name":"@quran-tracker/web","version":"0.1.0","private":true}' \
    > apps/web/package.json

# --ignore-scripts : évite les postinstall qui peuvent échouer sur Alpine
# (binaires natifs, scripts bash, etc.)
RUN npm install --ignore-scripts

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "--experimental-strip-types", "apps/api/src/index.ts"]
