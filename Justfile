# -------------------------
# Kiến Quốc Ký - Justfile
# -------------------------

# Paths
APP_DIR := "desktop/kien-quoc/app"
REQUIRED_CMDS := "bun firebase cargo"

# --------------
# Setup Commands
# --------------

# Default target
[group('meta')]
default: help doctor install

# -------
# Aliases
# -------

alias i := install
alias h := help
alias d := dev
alias b := build
alias dp := deploy
alias do := doctor
alias cl := clean
alias td := tauri-dev
alias tb := tauri-build
alias l := lint
alias tc := typecheck
alias pc := precommit

# ----------------
# Utility Commands
# ----------------

# List available commands
[group('meta')]
help:
  @just --list --unsorted

# Check availability of commands
[group('meta')]
doctor:
  #!/usr/bin/env sh
  CMDS="{{REQUIRED_CMDS}}"
  for cmd in $CMDS; do
    command -v "$cmd" >/dev/null 2>&1 || { echo "$cmd not installed"; exit 1; }
  done
  echo "All required commands: $(echo $CMDS | tr ' ' ',') are available."

# ---------------------
# Installation Commands
# ---------------------

# Install dependencies
[group('setup')]
install: doctor
  cd {{APP_DIR}} && bun install

# ------------
# Dev Commands
# ------------

# Start web development server
[group('dev')]
dev: install
  cd {{APP_DIR}} && bun dev

# Build web app for production
[group('dev')]
build: install
  cd {{APP_DIR}} && bun run build

# Run ESLint
[group('dev')]
lint: install
  cd {{APP_DIR}} && bun run lint:fix

# Run TypeScript type checking
[group('dev')]
typecheck: install
  cd {{APP_DIR}} && bun run typecheck

# Format code with prettier
[group('dev')]
format: install
  cd {{APP_DIR}} && bunx prettier --write 'src/**/*.{ts,tsx}'

# Run all checks before committing
[group('dev')]
precommit: format lint typecheck
  @echo "✅ All checks passed!"

# Build and deploy to Firebase Hosting
[group('dev')]
deploy: build
  cd desktop/kien-quoc && firebase deploy --only hosting

# -------------------
# Tauri Commands
# -------------------

# Run Tauri in dev mode (hot reload)
[group('tauri')]
tauri-dev: install
  cd {{APP_DIR}} && bun tauri dev

# Build Tauri desktop binaries
[group('tauri')]
tauri-build: install
  cd {{APP_DIR}} && bun tauri build

# -------
# Cleanup
# -------

# Clean up build artifacts
[group('cleanup')]
clean:
  #!/usr/bin/env sh
  echo "Cleaning build artifacts..."
  rm -rf {{APP_DIR}}/.output {{APP_DIR}}/.vinxi {{APP_DIR}}/src-tauri/target
  echo "Cleanup complete."

# Clean and rebuild everything
[group('cleanup')]
rebuild: clean build

# --------
# Releases
# --------

# Create a new release tag (triggers GitHub Actions build)
[group('release')]
release version:
  #!/usr/bin/env sh
  echo "Creating release v{{version}}..."
  git tag -a "v{{version}}" -m "Release v{{version}}"
  git push origin "v{{version}}"
  echo "Release v{{version}} created! GitHub Actions will build binaries."
  echo "Check: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
