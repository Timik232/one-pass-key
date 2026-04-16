# Stage 1: Build client SPA
FROM node:22-slim AS client-builder
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY client/ ./client/
WORKDIR /app/client
RUN npm install
RUN npm run build

# Stage 2: Build server
FROM node:22-slim AS server-builder
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./client/dist
WORKDIR /app/server
RUN npm install
RUN npm run build

# Stage 3: Production
FROM node:22-slim AS production
WORKDIR /app
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -m appuser

WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist /app/client/dist

RUN mkdir -p /data && chown appuser:appgroup /data

USER appuser
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/secrets.db

CMD ["node", "/app/server/dist/index.js"]
