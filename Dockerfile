# Build stage
FROM node:20-bullseye-slim AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-bullseye-slim AS production

WORKDIR /usr/src/app

# Install MongoDB Shell and curl, then clean up
RUN apt-get update && apt-get install -y \
    curl \
    libsnappy-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/healthz || exit 1

EXPOSE 3000

# Explicitly use start command for production
CMD ["npm", "run", "start"]

# Development stage
FROM node:20-bullseye-slim AS development

WORKDIR /usr/src/app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm install

# Install ts-node-dev globally
RUN npm install -g ts-node-dev

# Copy source code
COPY . .

# Set development environment
ENV NODE_ENV=development

# Run in development mode
CMD ["npm", "run", "dev"]