FROM node:24-slim

WORKDIR /app

# Copy package files and install all deps (needed for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Expose port
EXPOSE 3456

# Start Nitro server
CMD ["node", ".output/server/index.mjs"]
