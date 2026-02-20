.PHONY: dev build test lint generate generate-check clean build-frontend build-server

# Start Go backend + Vite frontend (requires two terminals or a process manager)
# For now, document each individually
dev:
	@echo "Run in two terminals:"
	@echo "  Terminal 1: cd server && go run ."
	@echo "  Terminal 2: npm run dev"

# Build single binary (embeds Vite dist)
build: build-frontend build-server

build-frontend:
	npm run build

build-server:
	cd server && go build -o ../field-station .

# Run all tests
test:
	npm test
	cd server && go test ./...

# Lint everything
lint:
	npm run check
	cd server && go vet ./...

# Regenerate code from openapi.yaml (will be wired up in Task 2.1)
generate:
	@echo "openapi.yaml not yet written — run after Task 2.1"

# Verify generated files are up to date (for CI)
generate-check: generate

clean:
	rm -f field-station
	rm -rf dist
