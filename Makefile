.DEFAULT_GOAL := help
.PHONY: help dev docker-up docker-down clean logs install frontend-dev backend-dev

## help: Display available commands
help:
	@echo "StreamStock AI - Makefile Commands"
	@echo "======================================"
	@grep -E '^## [a-zA-Z_-]+:' $(MAKEFILE_LIST) | \
	sed 's/^## //' | \
	awk 'BEGIN {FS = ":"}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

## install: Install all dependencies
install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Frontend dependencies installed successfully!"

## dev: Start all services (Docker + Frontend + Backend)
dev: docker-up
	@echo "Starting development environment..."
	@echo "Kafka/Zookeeper running on Docker"
	@echo "Starting frontend on port 3000..."
	cd frontend && npm run dev

## frontend-dev: Start frontend only
frontend-dev:
	@echo "Starting Next.js frontend..."
	cd frontend && npm run dev

## backend-dev: Start backend services only (placeholder)
backend-dev:
	@echo "Backend services will be started here..."
	@echo "Node.js Kafka producers/consumers will run here"

## docker-up: Start Kafka and Zookeeper containers
docker-up:
	@echo "Starting Kafka and Zookeeper..."
	docker compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@docker ps | grep streamstock

## docker-down: Stop all Docker containers
docker-down:
	@echo "Stopping Docker containers..."
	docker compose down
	@echo "Containers stopped successfully!"

## logs: Show Docker container logs
logs:
	@echo "Showing logs from all containers..."
	docker compose logs -f

## logs-kafka: Show Kafka logs only
logs-kafka:
	@echo "Showing Kafka logs..."
	docker logs -f streamstock-kafka

## logs-zookeeper: Show Zookeeper logs only
logs-zookeeper:
	@echo "Showing Zookeeper logs..."
	docker logs -f streamstock-zookeeper

## clean: Remove Docker volumes and containers
clean: docker-down
	@echo "Cleaning up Docker volumes and containers..."
	docker compose down -v
	docker volume rm streamstock-ai_kafka-data streamstock-ai_zookeeper-data streamstock-ai_zookeeper-logs 2>/dev/null || true
	@echo "Cleanup completed!"

## build: Build frontend for production
build:
	@echo "Building frontend for production..."
	cd frontend && npm run build

## test: Run all tests
test:
	@echo "Running tests..."
	cd frontend && npm test

## reset: Full reset - stop containers, clean volumes, reinstall dependencies
reset: clean
	@echo "Performing full reset..."
	rm -rf frontend/node_modules frontend/.next
	$(MAKE) install
	@echo "Reset completed!"
