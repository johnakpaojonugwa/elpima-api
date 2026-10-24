# ==========================================
# Elpima Surgicals Limited — Production Dockerfile
# Multi-stage optimized Node.js Alpine container
# ==========================================

# ------------------------------------------
# Stage 1: Dependency resolution & compilation
# ------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Install openssl for Prisma engines
RUN apk add --no-cache openssl libc6-compat

# Install package dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client for Linux
RUN npx prisma generate

# ------------------------------------------
# Stage 2: Production runner
# ------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling (PID 1) and openssl for Prisma runtime
RUN apk add --no-cache dumb-init openssl

ENV NODE_ENV=production
ENV PORT=5000

# Create application directory and assign permissions to non-root node user
RUN mkdir -p /app/uploads && chown -R node:node /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy application source code
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node server.js ./
COPY --chown=node:node openapi.json ./
COPY --chown=node:node src ./src

# Switch to unprivileged user
USER node

# Expose default HTTP port
EXPOSE 5000

# Container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-5000}/health || exit 1

# Start container via dumb-init to forward termination signals gracefully
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
