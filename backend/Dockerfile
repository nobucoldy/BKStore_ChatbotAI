# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build TypeScript
COPY . .
RUN npm run build
RUN cp -f src/db/schema.sql dist/db/schema.sql || true

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Copy knowledge base, database schema and data directory
COPY --from=builder /app/src/data/knowledge ./src/data/knowledge
COPY --from=builder /app/src/db/schema.sql ./src/db/schema.sql
COPY --from=builder /app/data ./data

EXPOSE 5000

CMD ["node", "dist/server.js"]
