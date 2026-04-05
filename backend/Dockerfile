FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Only copy generated Prisma client; do not overwrite @prisma/* from npm — that breaks
# @prisma/engines/package.json (Invalid package config) when `npx prisma` runs in the container.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY start.sh ./

RUN apk add --no-cache bash
RUN npm install -g ts-node typescript

EXPOSE 3000
CMD ["sh", "start.sh"]
