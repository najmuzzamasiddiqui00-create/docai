#!/bin/bash
#===============================================================================
# DocAI Bootstrap Script - Secure Fetch and Verify
# This script downloads, verifies, and runs the full deployment
# 
# Usage on fresh Ubuntu droplet:
#   curl -fsSL https://raw.githubusercontent.com/najmuzzamasiddiqui00-create/docai/main/deploy/bootstrap.sh -o bootstrap.sh
#   chmod +x bootstrap.sh
#   sudo ./bootstrap.sh
#
# DO NOT pipe directly to bash - always download and inspect first!
#===============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[BOOTSTRAP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

#===============================================================================
# CONFIGURATION
#===============================================================================
DEPLOY_SCRIPT_URL="https://raw.githubusercontent.com/najmuzzamasiddiqui00-create/docai/main/deploy/deploy.sh"
CHECKSUM_URL="https://raw.githubusercontent.com/najmuzzamasiddiqui00-create/docai/main/deploy/deploy.sh.sha256"
TEMP_DIR=$(mktemp -d)
DEPLOY_SCRIPT="${TEMP_DIR}/deploy.sh"
CHECKSUM_FILE="${TEMP_DIR}/deploy.sh.sha256"

# Cleanup on exit
cleanup() {
    rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

#===============================================================================
# MAIN
#===============================================================================
echo ""
echo "🚀 DocAI Deployment Bootstrap"
echo "=============================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

log "Creating secure temp directory: ${TEMP_DIR}"

# Download the deploy script (do NOT execute yet)
log "Downloading deploy.sh..."
if ! curl -fsSL "${DEPLOY_SCRIPT_URL}" -o "${DEPLOY_SCRIPT}"; then
    error "Failed to download deploy.sh"
fi

# Try to download checksum file (optional - may not exist yet)
log "Attempting to download checksum file..."
if curl -fsSL "${CHECKSUM_URL}" -o "${CHECKSUM_FILE}" 2>/dev/null; then
    # Checksum file exists - verify integrity
    log "Verifying SHA256 checksum..."
    
    EXPECTED_CHECKSUM=$(cat "${CHECKSUM_FILE}" | awk '{print $1}')
    ACTUAL_CHECKSUM=$(sha256sum "${DEPLOY_SCRIPT}" | awk '{print $1}')
    
    if [[ "${EXPECTED_CHECKSUM}" != "${ACTUAL_CHECKSUM}" ]]; then
        error "Checksum verification FAILED!
Expected: ${EXPECTED_CHECKSUM}
Actual:   ${ACTUAL_CHECKSUM}

The deploy script may have been tampered with. Aborting."
    fi
    
    log "✅ Checksum verified successfully"
else
    # No checksum file - warn but allow (first-time setup)
    warn "No checksum file found at ${CHECKSUM_URL}"
    warn "Skipping verification (generate checksum after first deploy)"
    echo ""
    echo "To generate checksum, run on a trusted machine:"
    echo "  sha256sum deploy/deploy.sh > deploy/deploy.sh.sha256"
    echo "  git add deploy/deploy.sh.sha256 && git commit -m 'Add deploy script checksum'"
    echo ""
    
    # Prompt for confirmation in interactive mode
    if [[ -t 0 ]]; then
        read -p "Continue without verification? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Aborted by user"
        fi
    else
        warn "Non-interactive mode - proceeding without verification"
    fi
fi

# Make executable and run
log "Executing verified deploy script..."
chmod +x "${DEPLOY_SCRIPT}"
exec "${DEPLOY_SCRIPT}"
