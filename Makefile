.PHONY: dev build preview clean install

# Local development with hot reload
dev: node_modules
	pnpm dev

# Production build to dist/
build: node_modules
	pnpm build

# Preview the production build
preview: dist
	pnpm preview

# Install dependencies
install:
	pnpm install

# Remove build artifacts
clean:
	rm -rf dist node_modules

node_modules:
	pnpm install

dist: node_modules
	pnpm build
