#!/bin/bash
#===============================================================================
# DocAI Bootstrap Script
# This script downloads and runs the full deployment
# 
# Usage on fresh Ubuntu droplet:
#   curl -fsSL https://raw.githubusercontent.com/najmuzzamasiddiqui00-create/docai/main/deploy/bootstrap.sh | sudo bash
#===============================================================================

set -e

echo "🚀 DocAI Deployment Bootstrap"
echo "=============================="

# Download and run the full deploy script
curl -fsSL https://raw.githubusercontent.com/najmuzzamasiddiqui00-create/docai/main/deploy/deploy.sh | bash
