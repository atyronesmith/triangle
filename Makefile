.DEFAULT_GOAL := help
.PHONY: help dev debug build preview clean install

help: ## Show this help message
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

dev: node_modules ## Start Vite dev server with hot reload (localhost only)
	pnpm dev

debug: node_modules ## Start dev server on localhost:5173 with verbose debug logs
	@echo "Dev server starting on http://localhost:5173/"
	pnpm dev -- --port 5173 --strictPort --debug

build: node_modules ## Production build to dist/
	pnpm build

preview: dist ## Preview the production build
	pnpm preview

install: ## Install dependencies
	pnpm install

clean: ## Remove build artifacts and node_modules
	rm -rf dist node_modules

node_modules:
	pnpm install

dist: node_modules
	pnpm build
