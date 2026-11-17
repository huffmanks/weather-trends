FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@12.21.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DB_FILE_NAME=file:/app/data/weather-trends.db

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 wt \
    && mkdir -p /app/data /app/assets/imports /app/assets/reports \
    && chown -R wt:nodejs /app/data /app/assets

COPY --from=builder --chown=wt:nodejs /app/.output ./.output
COPY --from=builder --chown=wt:nodejs /app/src/db/migrations ./db/migrations

USER wt

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]