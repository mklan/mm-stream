FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies including dev for build
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose default port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
