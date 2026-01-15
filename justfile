# ------------------
# Kiến Quốc Ký Justfile
# ------------------

# -------
# Aliases
# -------

alias i := install
alias h := help
alias s := server
alias w := web
alias d := dev
alias b := build
alias t := test
alias c := clean

# ----------------
# Utility Commands
# ----------------

# List available commands
[group('meta')]
default:
  @just --list --unsorted

# List available commands
[group('meta')]
help:
  @just --list --unsorted

# ----------------
# Setup Commands
# ----------------

# Install all dependencies
[group('setup')]
install:
  bun install

# Update all dependencies
[group('setup')]
update:
  bun update

# -----------
# Development
# -----------

# Start the backend server (with hot reload)
[group('dev')]
server:
  cd apps/server && bun run dev

# Start the web frontend (with hot reload)
[group('dev')]
web:
  cd apps/web && bun run dev

# Start both server and web in parallel
[group('dev')]
dev:
  #!/usr/bin/env sh
  trap 'kill 0' EXIT
  just server &
  just web &
  wait

# -----
# Build
# -----

# Build the server for production
[group('build')]
build-server:
  cd apps/server && bun run build

# Build the web app for production
[group('build')]
build-web:
  cd apps/web && bun run build

# Build everything
[group('build')]
build: build-server build-web

# -------
# Testing
# -------

# Run all tests
[group('test')]
test:
  bun test

# Run server tests only
[group('test')]
test-server:
  cd apps/server && bun test

# Check TypeScript types
[group('test')]
typecheck:
  bun run typecheck

# -----------
# API Testing
# -----------

# Check server health
[group('api')]
health:
  curl -s http://localhost:3000/health | jq

# Create a test room
[group('api')]
create-room name="Teacher":
  curl -s -X POST http://localhost:3000/api/room/create \
    -H "Content-Type: application/json" \
    -d '{"hostName":"{{name}}"}' | jq

# Get room regions
[group('api')]
regions room:
  curl -s http://localhost:3000/api/room/{{room}}/regions | jq

# -------
# Cleanup
# -------

# Clean build artifacts and node_modules
[group('cleanup')]
clean:
  #!/usr/bin/env sh
  echo "Cleaning build artifacts..."
  rm -rf node_modules apps/*/node_modules packages/*/node_modules
  rm -rf apps/*/.svelte-kit apps/*/build apps/*/dist
  echo "Cleanup complete."

# Show project structure
[group('cleanup')]
tree:
  tree -I 'node_modules|.git|.svelte-kit|dist|build' -L 3
