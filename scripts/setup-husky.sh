#!/bin/bash

# Husky installation script
# Run this after cloning the repo

echo "🐶 Setting up Husky pre-commit hooks..."

# Install Husky
npx husky install

# Make pre-commit executable
chmod +x .husky/pre-commit

# Create Husky directory if it doesn't exist
mkdir -p .husky

# Configure git to use Husky
npx husky install

echo "✅ Husky configured!"
echo ""
echo "Pre-commit hooks will now:"
echo "  - Scan for secrets (GitLeaks)"
echo "  - Type check TypeScript"
echo "  - Run linter"
echo ""
echo "To skip hooks (NOT RECOMMENDED):"
echo "  git commit --no-verify"
