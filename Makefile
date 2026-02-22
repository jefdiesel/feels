.PHONY: build run test clean deps docker-up docker-down migrate migrate-down

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOMOD=$(GOCMD) mod
BINARY_NAME=feels-server
MAIN_PATH=./cmd/server

# Build the application
build:
	$(GOBUILD) -o bin/$(BINARY_NAME) $(MAIN_PATH)

# Run the application
run:
	$(GOCMD) run $(MAIN_PATH)

# Run with hot reload (requires air: go install github.com/air-verse/air@latest)
dev:
	air

# Run tests
test:
	$(GOTEST) -v ./...

# Run tests with coverage
test-coverage:
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

# Download dependencies
deps:
	$(GOMOD) download
	$(GOMOD) tidy

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

# Start Docker services
docker-up:
	docker-compose up -d

# Stop Docker services
docker-down:
	docker-compose down

# Stop Docker services and remove volumes
docker-clean:
	docker-compose down -v

# Run migrations (requires golang-migrate)
migrate:
	migrate -path migrations -database "postgres://feels:feels@localhost:5432/feels?sslmode=disable" up

# Rollback last migration
migrate-down:
	migrate -path migrations -database "postgres://feels:feels@localhost:5432/feels?sslmode=disable" down 1

# Create a new migration (usage: make migration name=create_users)
migration:
	migrate create -ext sql -dir migrations -seq $(name)

# Lint (requires golangci-lint)
lint:
	golangci-lint run

# Format code
fmt:
	$(GOCMD) fmt ./...

# Generate OpenAPI docs (requires oapi-codegen)
generate:
	oapi-codegen -package api -generate types,server api/openapi.yaml > internal/api/openapi.gen.go

# All-in-one setup for new developers
setup: deps docker-up
	@echo "Waiting for services to be ready..."
	@sleep 5
	@make migrate
	@echo "Setup complete! Run 'make run' to start the server."
