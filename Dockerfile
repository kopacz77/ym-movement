# YM Movement Scheduler - Production Docker Configuration
# Multi-stage build for optimal production image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN corepack enable pnpm && pnpm build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    tini \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Set environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy necessary files from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/prisma ./prisma

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME "0.0.0.0"
ENV PORT 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use tini as init system and start the application
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]