# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Runner (Production)
FROM node:20-alpine AS runner

# Install production dependencies
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/dist ./dist

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Generate Prisma Client for the production node_modules
RUN npx prisma generate

# Create uploads directory and set permissions
RUN mkdir -p uploads/products && \
    chown -R node:node /app

# Use non-root user
USER node

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
