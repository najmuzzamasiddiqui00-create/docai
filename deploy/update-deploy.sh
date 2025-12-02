#!/bin/bash
#===============================================================================
# DocAI - Update Deployment Script
# Run this after code changes or to redeploy
#===============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

APP_DIR="/var/www/docai"
cd "$APP_DIR"

log "========================================="
log "DocAI Update Deployment"
log "========================================="

# Check for .env.production
if [ ! -f ".env.production" ]; then
    error ".env.production not found! Create it first with: nano .env.production"
fi

# Check if env file has empty values
# Check if env file has empty values
EMPTY_VARS=0
while IFS='=' read -r key value; do
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue
    # Check if value is empty
    if [[ -z $value ]]; then
        warn "Empty value for: $key"
        EMPTY_VARS=$((EMPTY_VARS + 1))
    fi
done < .env.production

if [ $EMPTY_VARS -gt 0 ]; then
    error "Found $EMPTY_VARS empty environment variables. Fill them in first!"
fi

log "Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main
git clean -fd

log "Commit: $(git log -1 --format='%h %s')"

log "Installing dependencies..."
npm ci --production=false

log "Building application..."
npm run build

if [ $? -ne 0 ]; then
    error "Build failed! Check the error above."
fi

log "Reloading PM2 (zero-downtime)..."
pm2 reload ecosystem.config.js --env production

log "Waiting for application to start..."
sleep 5

# Health check with retries
MAX_RETRIES=6
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "Waiting for app... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

echo ""
log "========================================="
if [ "$HTTP_STATUS" = "200" ]; then
    log "✅ DEPLOYMENT SUCCESSFUL!"
    log "========================================="
    log "Health check: HTTP 200 OK"
    log "Site: https://docai.ifbd.info"
else
    warn "⚠️  DEPLOYMENT COMPLETED WITH WARNINGS"
    log "========================================="
    warn "Health check returned: HTTP $HTTP_STATUS"
    log ""
    log "Check logs with: pm2 logs docai --lines 50"
fi
echo ""

# Show PM2 status
pm2 list
