#!/bin/bash
# =============================================================================
# bump-version.sh - Sync version from VERSION file to all packages
# =============================================================================
# Usage:
#   ./scripts/bump-version.sh              # Sync current VERSION to all packages
#   ./scripts/bump-version.sh patch        # Bump patch (1.2.0 -> 1.2.1)
#   ./scripts/bump-version.sh minor        # Bump minor (1.2.0 -> 1.3.0)
#   ./scripts/bump-version.sh major        # Bump major (1.2.0 -> 2.0.0)
#   ./scripts/bump-version.sh --check      # Verify all versions match (exit 1 if not)
#   ./scripts/bump-version.sh --dry-run    # Show what would change without modifying
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION_FILE="$ROOT_DIR/VERSION"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Files to update
PACKAGE_FILES=(
    "$ROOT_DIR/cli/package.json"
    "$ROOT_DIR/cli/packages/apps/admin/package.json"
    "$ROOT_DIR/cli/packages/apps/client-app/package.json"
    "$ROOT_DIR/cli/packages/apps/rustyvault-ui/package.json"
    "$ROOT_DIR/cli/packages/libs/shared/package.json"
    "$ROOT_DIR/cli/packages/libs/components/package.json"
)
CARGO_TOML="$ROOT_DIR/backend/Cargo.toml"
SONAR_PROPS="$ROOT_DIR/sonar-project.properties"

# =============================================================================
# Helper Functions
# =============================================================================

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

get_current_version() {
    if [[ -f "$VERSION_FILE" ]]; then
        cat "$VERSION_FILE" | tr -d '[:space:]'
    else
        echo ""
    fi
}

# Parse semver: returns array (major minor patch)
parse_version() {
    local version="$1"
    IFS='.' read -r -a parts <<< "$version"
    echo "${parts[@]}"
}

# Bump version based on type
bump_version() {
    local version="$1"
    local bump_type="$2"

    IFS='.' read -r major minor patch <<< "$version"

    case "$bump_type" in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            print_error "Unknown bump type: $bump_type"
            exit 1
            ;;
    esac

    echo "$major.$minor.$patch"
}

# Get version from package.json
get_package_version() {
    local file="$1"
    if [[ -f "$file" ]]; then
        grep -o '"version": *"[^"]*"' "$file" | head -1 | sed 's/.*": *"\([^"]*\)".*/\1/'
    else
        echo ""
    fi
}

# Get version from Cargo.toml workspace
get_cargo_version() {
    if [[ -f "$CARGO_TOML" ]]; then
        grep -A5 '\[workspace.package\]' "$CARGO_TOML" | grep 'version' | head -1 | sed 's/.*= *"\([^"]*\)".*/\1/'
    else
        echo ""
    fi
}

# Get version from sonar-project.properties
get_sonar_version() {
    if [[ -f "$SONAR_PROPS" ]]; then
        grep 'sonar.projectVersion' "$SONAR_PROPS" | sed 's/.*= *//'
    else
        echo ""
    fi
}

# Update package.json version
update_package_version() {
    local file="$1"
    local version="$2"
    local dry_run="$3"

    if [[ ! -f "$file" ]]; then
        print_warning "File not found: $file"
        return
    fi

    local current=$(get_package_version "$file")
    local relative_path="${file#$ROOT_DIR/}"

    if [[ "$current" == "$version" ]]; then
        print_info "$relative_path: already at $version"
    else
        if [[ "$dry_run" == "true" ]]; then
            print_info "$relative_path: $current -> $version (dry-run)"
        else
            # Use sed to update version in place
            if [[ "$(uname)" == "Darwin" ]]; then
                sed -i '' "s/\"version\": *\"[^\"]*\"/\"version\": \"$version\"/" "$file"
            else
                sed -i "s/\"version\": *\"[^\"]*\"/\"version\": \"$version\"/" "$file"
            fi
            print_success "$relative_path: $current -> $version"
        fi
    fi
}

# Update Cargo.toml workspace version
update_cargo_version() {
    local version="$1"
    local dry_run="$2"

    if [[ ! -f "$CARGO_TOML" ]]; then
        print_warning "Cargo.toml not found: $CARGO_TOML"
        return
    fi

    local current=$(get_cargo_version)

    if [[ "$current" == "$version" ]]; then
        print_info "backend/Cargo.toml: already at $version"
    else
        if [[ "$dry_run" == "true" ]]; then
            print_info "backend/Cargo.toml: $current -> $version (dry-run)"
        else
            # Update only the first 'version = ' line in [workspace.package] section
            # Use a more specific pattern to avoid matching rust-version
            if [[ "$(uname)" == "Darwin" ]]; then
                sed -i '' '/\[workspace.package\]/,/^\[/ s/^version = "[^"]*"/version = "'"$version"'"/' "$CARGO_TOML"
            else
                sed -i '/\[workspace.package\]/,/^\[/ s/^version = "[^"]*"/version = "'"$version"'"/' "$CARGO_TOML"
            fi
            print_success "backend/Cargo.toml: $current -> $version"
        fi
    fi
}

# Update sonar-project.properties version
update_sonar_version() {
    local version="$1"
    local dry_run="$2"

    if [[ ! -f "$SONAR_PROPS" ]]; then
        print_warning "sonar-project.properties not found"
        return
    fi

    local current=$(get_sonar_version)

    if [[ "$current" == "$version" ]]; then
        print_info "sonar-project.properties: already at $version"
    else
        if [[ "$dry_run" == "true" ]]; then
            print_info "sonar-project.properties: $current -> $version (dry-run)"
        else
            if [[ "$(uname)" == "Darwin" ]]; then
                sed -i '' "s/sonar.projectVersion=.*/sonar.projectVersion=$version/" "$SONAR_PROPS"
            else
                sed -i "s/sonar.projectVersion=.*/sonar.projectVersion=$version/" "$SONAR_PROPS"
            fi
            print_success "sonar-project.properties: $current -> $version"
        fi
    fi
}

# Check if all versions match VERSION file
check_versions() {
    local expected=$(get_current_version)
    local all_match=true

    echo ""
    echo "Expected version: $expected"
    echo ""

    # Check package.json files
    for file in "${PACKAGE_FILES[@]}"; do
        local current=$(get_package_version "$file")
        local relative_path="${file#$ROOT_DIR/}"
        if [[ "$current" == "$expected" ]]; then
            print_success "$relative_path: $current"
        else
            print_error "$relative_path: $current (expected $expected)"
            all_match=false
        fi
    done

    # Check Cargo.toml
    local cargo_version=$(get_cargo_version)
    if [[ "$cargo_version" == "$expected" ]]; then
        print_success "backend/Cargo.toml: $cargo_version"
    else
        print_error "backend/Cargo.toml: $cargo_version (expected $expected)"
        all_match=false
    fi

    # Check sonar-project.properties
    local sonar_version=$(get_sonar_version)
    if [[ "$sonar_version" == "$expected" ]]; then
        print_success "sonar-project.properties: $sonar_version"
    else
        print_error "sonar-project.properties: $sonar_version (expected $expected)"
        all_match=false
    fi

    echo ""
    if [[ "$all_match" == "true" ]]; then
        print_success "All versions match!"
        return 0
    else
        print_error "Version mismatch detected. Run './scripts/bump-version.sh' to sync."
        return 1
    fi
}

# Sync all versions to VERSION file
sync_versions() {
    local version="$1"
    local dry_run="$2"

    echo ""
    echo "Syncing all packages to version: $version"
    echo ""

    # Update package.json files
    for file in "${PACKAGE_FILES[@]}"; do
        update_package_version "$file" "$version" "$dry_run"
    done

    # Update Cargo.toml
    update_cargo_version "$version" "$dry_run"

    # Update sonar-project.properties
    update_sonar_version "$version" "$dry_run"

    echo ""
    if [[ "$dry_run" == "true" ]]; then
        print_info "Dry run complete. No files were modified."
    else
        print_success "Version sync complete!"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    local action="${1:-sync}"
    local dry_run="false"

    # Parse flags
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                dry_run="true"
                shift
                ;;
            --check)
                action="check"
                shift
                ;;
            patch|minor|major)
                action="$1"
                shift
                ;;
            sync|"")
                action="sync"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [patch|minor|major|sync|--check] [--dry-run]"
                echo ""
                echo "Commands:"
                echo "  sync      Sync current VERSION to all packages (default)"
                echo "  patch     Bump patch version (1.2.0 -> 1.2.1)"
                echo "  minor     Bump minor version (1.2.0 -> 1.3.0)"
                echo "  major     Bump major version (1.2.0 -> 2.0.0)"
                echo "  --check   Verify all versions match VERSION file"
                echo ""
                echo "Options:"
                echo "  --dry-run   Show what would change without modifying files"
                echo "  --help      Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    # Ensure VERSION file exists
    if [[ ! -f "$VERSION_FILE" ]]; then
        print_error "VERSION file not found: $VERSION_FILE"
        print_info "Create it with: echo '1.0.0' > VERSION"
        exit 1
    fi

    local current_version=$(get_current_version)

    case "$action" in
        check)
            check_versions
            ;;
        sync)
            sync_versions "$current_version" "$dry_run"
            ;;
        patch|minor|major)
            local new_version=$(bump_version "$current_version" "$action")
            echo "Version bump: $current_version -> $new_version"

            if [[ "$dry_run" == "false" ]]; then
                echo "$new_version" > "$VERSION_FILE"
                print_success "Updated VERSION file"
            fi

            sync_versions "$new_version" "$dry_run"
            ;;
    esac
}

main "$@"
