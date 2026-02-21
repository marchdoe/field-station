# Stage 1: Build the Vite frontend
FROM node:24-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build the Go binary (with embedded frontend)
FROM golang:1.24-bookworm AS builder
WORKDIR /app
COPY --from=frontend /app /app
COPY server/go.mod server/go.sum ./server/
RUN cd server && go mod download
COPY server/ ./server/
RUN cd server && CGO_ENABLED=0 go build -ldflags="-s -w" -o /field-station .

# Stage 3: Minimal runtime image
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /field-station /field-station
EXPOSE 3457
ENTRYPOINT ["/field-station"]
