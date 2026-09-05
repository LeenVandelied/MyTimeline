# =============================================================
# Frontend Next.js 15 — build multi-stage standalone (#37)
# =============================================================

# ---- Stage deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_API_URL est BAKÉ au build (variable publique lue côté navigateur,
# cf. src/services/apiClient.ts). En dev-compose, le navigateur (hôte) appelle le
# backend directement -> valeur joignable depuis l'HÔTE (http://localhost:8080/api),
# PAS le nom de service compose (inaccessible depuis le navigateur).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Stage runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Utilisateur non-root.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Sortie standalone : serveur Node minimal + assets. `public` et `.next/static`
# ne sont PAS inclus dans standalone -> copiés explicitement.
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
