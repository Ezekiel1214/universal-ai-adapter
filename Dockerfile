FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/web ./web
COPY --from=builder /app/download ./download
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json

RUN apk add --no-cache curl

ENV NODE_ENV=production
EXPOSE 10000

CMD ["node", "server.js"]
