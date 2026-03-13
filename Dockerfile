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
COPY --from=builder /app/package.json ./

RUN apk add --no-cache curl

EXPOSE 3000

CMD ["node", "server.js"]
