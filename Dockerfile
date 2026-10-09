# Image production Pohon Baik (Next.js standalone + Payload). Dipakai Dokploy (Build Type: Dockerfile).
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Nilai sementara agar build tidak gagal; nilai sebenarnya diberikan saat runtime oleh Dokploy.
# Batas memori 3 GB agar build aman di VPS kecil (Dokploy membangun image di server).
RUN PAYLOAD_SECRET=build-only-placeholder DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    NODE_OPTIONS="--no-deprecation --max-old-space-size=3072" npx next build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/app/media
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Folder unggahan media: jadikan volume di Dokploy agar tidak hilang saat redeploy.
RUN mkdir -p /app/media && chown nextjs:nodejs /app/media
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
# Migrasi database dijalankan otomatis saat aplikasi pertama kali terhubung (prodMigrations).
CMD ["node", "server.js"]
