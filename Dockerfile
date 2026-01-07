# =============================================================================
# Dockerfile - AI Docs (Astro + Node.js)
# =============================================================================
# Multi-stage build para optimizar el tamaño de la imagen

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar dependencias desde stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para build (se sobrescriben en runtime)
ARG DATABASE_URL
ARG BETTER_AUTH_URL
ARG BETTER_AUTH_SECRET

ENV DATABASE_URL=${DATABASE_URL}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}

# Build de la aplicación
RUN pnpm build

# Nota: El modelo de embeddings se descargará automáticamente en la primera petición
# y se cacheará en el volumen /app/.cache (persistente entre reinicios)

# -----------------------------------------------------------------------------
# Stage 3: Runner (Producción)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Instalar netcat para healthcheck y pnpm para migraciones
RUN apk add --no-cache netcat-openbsd
RUN corepack enable && corepack prepare pnpm@latest --activate

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astro

WORKDIR /app

# Copiar archivos necesarios para producción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/public ./public

# Script de entrada
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Crear directorios necesarios
RUN mkdir -p /app/uploads /app/.cache

# Cambiar propietario de archivos
RUN chown -R astro:nodejs /app /app/uploads /app/.cache

USER astro

# Puerto de la aplicación
EXPOSE 4321

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
