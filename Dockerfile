# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (needs dev deps for TypeScript)
COPY package*.json ./
RUN npm i

# Copy source and compile to dist/
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only prod deps
COPY package*.json ./
RUN npm i --omit=dev

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5001

# Set default port via environment variable (can be overridden)
ENV PORT=5001

# Run the HTTP server
CMD ["node", "dist/scripts/start-http-server.js"]
