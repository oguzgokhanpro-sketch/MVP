# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Also used (with `--profile tools`) to run the seed inside Docker.
FROM deps AS builder
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Prisma CLI only, to apply migrations at startup.
RUN npm install --prefix /opt/migrate --no-save --no-audit --no-fund prisma@6.19.3
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "/opt/migrate/node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma && node server.js"]
