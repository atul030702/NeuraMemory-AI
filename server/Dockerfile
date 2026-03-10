# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Ensure we have the production node_modules
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Run as non-root user
USER node

# Standard entry point
CMD ["node", "dist/index.js"]
