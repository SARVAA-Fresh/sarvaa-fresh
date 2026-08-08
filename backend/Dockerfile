# ───────────────────────────────────────────────
# SARVAA Fresh API — Multi-stage Dockerfile
# ───────────────────────────────────────────────

# ─── Build Stage ───────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma

# Copy source
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# ─── Production Stage ──────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    libc6-compat

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy built artifacts
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health/ready || exit 1

# Start application: run migrations, then start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
