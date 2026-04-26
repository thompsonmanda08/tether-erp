# Production Dockerfile for Frontend using Bun
# Base stage with Bun
FROM oven/bun:1-alpine AS base

# Install OpenSSL and other dependencies
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Dependencies stage
FROM base AS deps

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Builder stage
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
ENV NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=$NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY

ARG NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
ENV NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=$NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT

ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Skip API calls during build if needed
ENV NEXT_PUBLIC_SKIP_BUILD_STATIC_CHECK=true

# Build the application
RUN bun run build

# Debug: Verify build output
RUN echo "Build completed. Checking output..." && \
    ls -la .next/ && \
    ls -la .next/standalone/ || echo "No standalone directory found"

# Production runner stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Install OpenSSL
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy Next.js standalone build output
# The standalone output includes all necessary files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Debug: Verify copied files
RUN echo "Files copied to runner stage:" && \
    ls -la /app/ && \
    ls -la /app/.next/ || echo "No .next directory"

# Set proper ownership
USER root
RUN chown -R nextjs:nodejs /app
USER nextjs

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use exec form to ensure proper signal handling
CMD ["bun", "run", "server.js"]
