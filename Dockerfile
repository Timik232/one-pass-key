# Stage 1: Build client SPA
FROM node:22-slim AS client-builder
WORKDIR /app

# Copy workspace root + lockfile for npm ci
COPY package-lock.json package.json tsconfig.base.json ./
# Copy client package.json first (for layer caching)
COPY client/package.json ./client/package.json
# npm ci from root installs all workspaces
RUN npm ci --workspace=client
# Copy client source and build
COPY client/ ./client/
WORKDIR /app/client
RUN npm run build

# Stage 2: Build server
FROM node:22-slim AS server-builder
WORKDIR /app

COPY package-lock.json package.json tsconfig.base.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace=server
COPY server/ ./server/
# Copy built client for TypeScript path references if needed
COPY --from=client-builder /app/client/dist ./client/dist
WORKDIR /app/server
RUN npm run build

# Stage 3: Production
FROM node:22-slim AS production
LABEL maintainer="one-pass-key"

RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -m appuser

WORKDIR /app

# Install production dependencies only
COPY package-lock.json package.json ./
COPY server/package.json ./server/package.json
RUN npm ci --omit=dev --workspace=server && npm cache clean --force

# Copy compiled server and built client
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist ./client/dist

RUN mkdir -p /data && chown appuser:appgroup /data

USER appuser
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/secrets.db
ENV NODE_OPTIONS=--max-old-space-size=256

CMD ["node", "/app/server/dist/index.js"]
