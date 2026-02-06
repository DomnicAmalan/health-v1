#!/bin/bash
# =============================================================================
# release.sh - Full release workflow for Health V1 monorepo
# =============================================================================
# Usage:
#   ./scripts/release.sh patch           # Release patch version
#   ./scripts/release.sh minor           # Release minor version
#   ./scripts/release.sh major           # Release major version
#   ./scripts/release.sh --dry-run patch # Preview changes without releasing
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION_FILE="$ROOT_DIR/VERSION"
CHANGELOG_FILE="$ROOT_DIR/CHANGELOG.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

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
    cat "$VERSION_FILE" | tr -d '[:space:]'
}

# Get commits since last tag
get_commits_since_tag() {
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [[ -n "$last_tag" ]]; then
        git log "$last_tag"..HEAD --pretty=format:"%s" --no-merges 2>/dev/null
    else
        git log --pretty=format:"%s" --no-merges -50 2>/dev/null
    fi
}

# Parse commits into categories
categorize_commits() {
    local commits="$1"
    local features=""
    local fixes=""
    local docs=""
    local refactor=""
    local perf=""
    local test=""
    local chore=""
    local security=""
    local other=""

    while IFS= read -r commit; do
        [[ -z "$commit" ]] && continue

        case "$commit" in
            feat*)
                features+="- ${commit#feat*: }"$'\n'
                ;;
            fix*)
                fixes+="- ${commit#fix*: }"$'\n'
                ;;
            docs*)
                docs+="- ${commit#docs*: }"$'\n'
                ;;
            refactor*)
                refactor+="- ${commit#refactor*: }"$'\n'
                ;;
            perf*)
                perf+="- ${commit#perf*: }"$'\n'
                ;;
            test*)
                test+="- ${commit#test*: }"$'\n'
                ;;
            chore*)
                chore+="- ${commit#chore*: }"$'\n'
                ;;
            security*)
                security+="- ${commit#security*: }"$'\n'
                ;;
            *)
                # Skip release commits and non-conventional commits
                if [[ ! "$commit" =~ ^(Merge|chore\(release\)) ]]; then
                    other+="- $commit"$'\n'
                fi
                ;;
        esac
    done <<< "$commits"

    # Build changelog section
    local changelog=""

    [[ -n "$features" ]] && changelog+=$'\n### Added\n'"$features"
    [[ -n "$fixes" ]] && changelog+=$'\n### Fixed\n'"$fixes"
    [[ -n "$security" ]] && changelog+=$'\n### Security\n'"$security"
    [[ -n "$perf" ]] && changelog+=$'\n### Performance\n'"$perf"
    [[ -n "$refactor" ]] && changelog+=$'\n### Changed\n'"$refactor"
    [[ -n "$docs" ]] && changelog+=$'\n### Documentation\n'"$docs"
    [[ -n "$test" ]] && changelog+=$'\n### Testing\n'"$test"
    [[ -n "$chore" ]] && changelog+=$'\n### Maintenance\n'"$chore"
    [[ -n "$other" ]] && changelog+=$'\n### Other\n'"$other"

    echo "$changelog"
}

# Generate changelog entry
generate_changelog_entry() {
    local version="$1"
    local date=$(date +%Y-%m-%d)
    local commits=$(get_commits_since_tag)
    local changes=$(categorize_commits "$commits")

    if [[ -z "$changes" ]]; then
        changes=$'\n### Changed\n- Version bump to '"$version"
    fi

    echo "## [$version] - $date"
    echo "$changes"
}

# Update CHANGELOG.md
update_changelog() {
    local version="$1"
    local entry=$(generate_changelog_entry "$version")

    if [[ ! -f "$CHANGELOG_FILE" ]]; then
        print_warning "CHANGELOG.md not found, creating new one"
        cat > "$CHANGELOG_FILE" << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
    fi

    # Insert new entry after the header (after the first "---" or after intro text)
    local temp_file=$(mktemp)
    local header_lines=0
    local found_first_version=false

    while IFS= read -r line; do
        echo "$line" >> "$temp_file"
        ((header_lines++))

        # Stop after we find a line starting with "##" or after intro section
        if [[ "$line" =~ ^## ]]; then
            found_first_version=true
            break
        fi

        # If we've read the header and hit an empty line after content, insert here
        if [[ $header_lines -gt 5 && "$line" == "" ]]; then
            break
        fi
    done < "$CHANGELOG_FILE"

    # If we found a version header, we need to insert before it
    if [[ "$found_first_version" == "true" ]]; then
        # Rewrite: header up to (but not including) first version, then new entry, then rest
        head -n $((header_lines - 1)) "$CHANGELOG_FILE" > "$temp_file"
        echo "" >> "$temp_file"
        echo "$entry" >> "$temp_file"
        echo "" >> "$temp_file"
        tail -n +$header_lines "$CHANGELOG_FILE" >> "$temp_file"
    else
        # No existing versions, just append
        echo "" >> "$temp_file"
        echo "$entry" >> "$temp_file"
    fi

    mv "$temp_file" "$CHANGELOG_FILE"
}

# Pre-release checks
pre_release_checks() {
    print_header "Pre-Release Checks"

    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        print_warning "Uncommitted changes detected"
        git status --short
        echo ""
        read -p "Continue anyway? (y/N) " confirm
        [[ "$confirm" != "y" && "$confirm" != "Y" ]] && exit 1
    else
        print_success "Working directory clean"
    fi

    # Check current branch
    local branch=$(git branch --show-current)
    if [[ "$branch" != "main" && "$branch" != "master" && "$branch" != "develop" ]]; then
        print_warning "Not on main/master/develop branch (current: $branch)"
        read -p "Continue anyway? (y/N) " confirm
        [[ "$confirm" != "y" && "$confirm" != "Y" ]] && exit 1
    else
        print_success "On branch: $branch"
    fi

    # Check if VERSION file exists
    if [[ ! -f "$VERSION_FILE" ]]; then
        print_error "VERSION file not found"
        exit 1
    fi
    print_success "VERSION file exists"

    # Verify version sync
    print_info "Checking version sync..."
    if ! "$SCRIPT_DIR/bump-version.sh" --check > /dev/null 2>&1; then
        print_warning "Versions are out of sync"
        read -p "Sync versions before release? (Y/n) " confirm
        if [[ "$confirm" != "n" && "$confirm" != "N" ]]; then
            "$SCRIPT_DIR/bump-version.sh"
        fi
    else
        print_success "All versions in sync"
    fi
}

# =============================================================================
# Main Release Flow
# =============================================================================

do_release() {
    local bump_type="$1"
    local dry_run="$2"
    local current_version=$(get_current_version)

    # Calculate new version
    local new_version
    case "$bump_type" in
        patch)
            IFS='.' read -r major minor patch <<< "$current_version"
            new_version="$major.$minor.$((patch + 1))"
            ;;
        minor)
            IFS='.' read -r major minor patch <<< "$current_version"
            new_version="$major.$((minor + 1)).0"
            ;;
        major)
            IFS='.' read -r major minor patch <<< "$current_version"
            new_version="$((major + 1)).0.0"
            ;;
    esac

    print_header "Release: v$new_version"
    echo "Current version: $current_version"
    echo "New version:     $new_version"
    echo "Release type:    $bump_type"
    echo ""

    if [[ "$dry_run" == "true" ]]; then
        print_warning "DRY RUN - No changes will be made"
        echo ""
    fi

    # Step 1: Pre-release checks
    if [[ "$dry_run" == "false" ]]; then
        pre_release_checks
    fi

    # Step 2: Bump version
    print_header "Step 1: Bump Version"
    if [[ "$dry_run" == "true" ]]; then
        "$SCRIPT_DIR/bump-version.sh" "$bump_type" --dry-run
    else
        "$SCRIPT_DIR/bump-version.sh" "$bump_type"
    fi

    # Step 3: Update changelog
    print_header "Step 2: Update Changelog"
    if [[ "$dry_run" == "true" ]]; then
        print_info "Would generate changelog entry:"
        echo ""
        generate_changelog_entry "$new_version"
        echo ""
    else
        update_changelog "$new_version"
        print_success "Updated CHANGELOG.md"
    fi

    # Step 4: Create commit
    print_header "Step 3: Create Release Commit"
    if [[ "$dry_run" == "true" ]]; then
        print_info "Would create commit: chore(release): v$new_version"
    else
        git add -A
        git commit -m "chore(release): v$new_version

- Bump version to $new_version
- Update CHANGELOG.md
- Sync all package versions"
        print_success "Created release commit"
    fi

    # Step 5: Create tag
    print_header "Step 4: Create Git Tag"
    if [[ "$dry_run" == "true" ]]; then
        print_info "Would create tag: v$new_version"
    else
        git tag -a "v$new_version" -m "Release v$new_version"
        print_success "Created tag: v$new_version"
    fi

    # Summary
    print_header "Release Complete!"
    echo "Version: v$new_version"
    echo ""
    echo "Next steps:"
    echo "  1. Review the changes:"
    echo "     git log --oneline -5"
    echo "     git show v$new_version"
    echo ""
    echo "  2. Push to remote:"
    echo "     git push origin $(git branch --show-current)"
    echo "     git push origin v$new_version"
    echo ""
    echo "  3. GitHub will automatically create a release"
    echo ""

    if [[ "$dry_run" == "true" ]]; then
        print_warning "This was a dry run - no changes were made"
    fi
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    local bump_type=""
    local dry_run="false"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                dry_run="true"
                shift
                ;;
            patch|minor|major)
                bump_type="$1"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [--dry-run] <patch|minor|major>"
                echo ""
                echo "Release workflow:"
                echo "  1. Bump VERSION file"
                echo "  2. Sync all package versions"
                echo "  3. Generate CHANGELOG entry"
                echo "  4. Create release commit"
                echo "  5. Create git tag"
                echo ""
                echo "Options:"
                echo "  --dry-run   Preview changes without making them"
                echo "  --help      Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0 patch          # 1.2.0 -> 1.2.1"
                echo "  $0 minor          # 1.2.0 -> 1.3.0"
                echo "  $0 major          # 1.2.0 -> 2.0.0"
                echo "  $0 --dry-run minor"
                exit 0
                ;;
            *)
                print_error "Unknown argument: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Validate bump type
    if [[ -z "$bump_type" ]]; then
        print_error "Release type required: patch, minor, or major"
        echo "Use --help for usage information"
        exit 1
    fi

    # Run release
    do_release "$bump_type" "$dry_run"
}

cd "$ROOT_DIR"
main "$@"
