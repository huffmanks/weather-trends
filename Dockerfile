# --- STAGE 0: Build Frontend ---
FROM node:24-alpine AS frontend-builder
RUN apk add --no-cache libc6-compat && apk upgrade --no-cache
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# --- STAGE 1: Runner ---
FROM alpine:3.23 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV DB_FILE_NAME=file:/app/data/weather-trends.db

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 wt \
    && mkdir -p /app/uploads /app/data \
    && chown -R wt:nodejs /app/uploads /app/data

COPY --from=frontend-builder /app/dist ./dist

COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/@libsql/client ./node_modules/@libsql/client

COPY --from=builder --chown=wt:nodejs /app/scripts/migrate.mjs ./migrate.mjs
COPY --from=builder --chown=wt:nodejs /app/db/migrations ./db/migrations

USER wt

EXPOSE ${APP_PORT}

CMD ["sh", "-c", "node migrate.mjs && exec node server.js"]