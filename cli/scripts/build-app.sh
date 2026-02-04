#!/usr/bin/env bash
# Helper script to build any app with dependencies
# Usage: ./scripts/build-app.sh <package-name>
# Example: ./scripts/build-app.sh lazarus-life-vault

set -e

if [ -z "$1" ]; then
  echo "Error: Package name required"
  echo "Usage: $0 <package-name>"
  exit 1
fi

PACKAGE_NAME="$1"

echo "Building shared libraries..."
bun run build:libs

echo "Building $PACKAGE_NAME..."
bun --filter="$PACKAGE_NAME" run build
