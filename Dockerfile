# ---- deps: instala todas as dependências (inclusive dev) e compila módulos nativos ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: gera o Prisma Client e compila o TypeScript ----
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Chromium para os adapters de Amazon/Shopee (Playwright) + libs de sistema exigidas por ele.
RUN npx playwright install --with-deps chromium \
    && chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
