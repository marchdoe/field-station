.PHONY: dev dev-server dev-frontend build test lint generate generate-ts generate-check clean build-frontend build-server

# Start Go backend + Vite frontend (requires two terminals or a process manager)
dev:
	@echo "Run in separate terminals:"
	@echo "  make dev-server   (Go backend on :3457)"
	@echo "  make dev-frontend (Vite on :3456)"

dev-server:
	cd server && FIELD_STATION_DEV=1 go run -tags dev .

dev-frontend:
	npm run dev

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

# Regenerate code from openapi.yaml
generate:
	cd server && go run -tags dev github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen \
		--config api/oapi-codegen.yaml \
		../server/openapi.yaml

# Regenerate TypeScript types from openapi.yaml
generate-ts:
	npx openapi-typescript server/openapi.yaml -o src/lib/api-types.ts

# Verify generated files are up to date (for CI)
generate-check:
	@$(MAKE) generate
	@git diff --exit-code server/api/generated.go || (echo "generated.go is out of date — run make generate" && exit 1)

clean:
	rm -f field-station
	rm -rf server/dist
