# ------------------
# Kiến Quốc Ký Justfile
# ------------------

# -------
# Aliases
# -------

alias i := install
alias h := help
alias s := server
alias d := dev
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
  uv sync

# Install with dev dependencies
[group('setup')]
install-dev:
  uv sync --extra dev

# Add a new dependency
[group('setup')]
add *PACKAGES:
  uv add {{PACKAGES}}

# Remove a dependency
[group('setup')]
remove *PACKAGES:
  uv remove {{PACKAGES}}

# -----------
# Development
# -----------

# Start the backend server (with hot reload)
[group('dev')]
server:
  uv run fastapi dev backend/main.py

# Alias for server
[group('dev')]
dev:
  just server

# Start server on specific port
[group('dev')]
server-port PORT="8000":
  uv run fastapi dev backend/main.py --port {{PORT}}

# -----
# Production
# -----

# Run server in production mode
[group('prod')]
start:
  uv run fastapi run backend/main.py

# Run server in production mode on specific port
[group('prod')]
start-port PORT="8000":
  uv run fastapi run backend/main.py --port {{PORT}}

# -------
# Testing
# -------

# Run all tests
[group('test')]
test:
  uv run pytest -v

# Run tests with coverage
[group('test')]
test-cov:
  uv run pytest --cov=backend --cov-report=term-missing

# Run game simulation test (requires server running)
[group('test')]
test-game:
  uv run python scripts/test_game.py

# -------
# Linting
# -------

# Lint and format code
[group('lint')]
lint:
  uv run ruff check backend/ --fix
  uv run ruff format backend/

# Check only (no fixes)
[group('lint')]
lint-check:
  uv run ruff check backend/
  uv run ruff format backend/ --check

# Type check with ty
[group('lint')]
typecheck:
  uv run ty check backend/

# -----------
# API Testing
# -----------

# Check server health
[group('api')]
health:
  curl -s http://localhost:8000/health | jq

# Create a test room
[group('api')]
create-room name="Host":
  curl -s -X POST http://localhost:8000/api/rooms \
    -H "Content-Type: application/json" \
    -d '{"host_name":"{{name}}"}' | jq

# Get room info
[group('api')]
room CODE:
  curl -s http://localhost:8000/api/rooms/{{CODE}} | jq

# Get teams info
[group('api')]
teams CODE:
  curl -s http://localhost:8000/api/rooms/{{CODE}}/teams | jq

# -------
# Cleanup
# -------

# Clean cache files
[group('cleanup')]
clean:
  #!/usr/bin/env sh
  echo "Cleaning cache files..."
  find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
  echo "Cleanup complete."

# Show project structure
[group('cleanup')]
tree:
  tree -I '__pycache__|.git|.venv|.pytest_cache|.ruff_cache|monte-carlo-old' -L 3
