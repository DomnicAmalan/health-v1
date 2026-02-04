#!/usr/bin/env bash
# Helper script to run dev command for any app
# Usage: ./scripts/dev-app.sh <package-name>
# Example: ./scripts/dev-app.sh lazarus-life-vault

set -e

if [ -z "$1" ]; then
  echo "Error: Package name required"
  echo "Usage: $0 <package-name>"
  exit 1
fi

PACKAGE_NAME="$1"

echo "Building shared libraries..."
bun run build:libs

echo "Starting $PACKAGE_NAME in dev mode..."
bun --filter="$PACKAGE_NAME" run dev
