#!/bin/bash

# Script to remove secrets from Git history
# ⚠️ WARNING: This rewrites Git history. Use with caution!
# ⚠️ Coordinate with team before running on shared branches

set -e

echo "🔐 Git Secret History Cleanup Script"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will rewrite Git history!"
echo "⚠️  All team members will need to re-clone or reset their local repos."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Choose cleanup method:"
echo "1. BFG Repo-Cleaner (recommended, faster)"
echo "2. git-filter-repo (more control)"
echo "3. git filter-branch (fallback, slowest)"
read -p "Enter choice (1-3): " method

case $method in
  1)
    echo ""
    echo "Using BFG Repo-Cleaner..."
    echo ""
    
    # Check if BFG is installed
    if ! command -v bfg &> /dev/null; then
      echo "Installing BFG Repo-Cleaner..."
      # macOS
      if command -v brew &> /dev/null; then
        brew install bfg
      else
        echo "Please install BFG manually: https://rtyley.github.io/bfg-repo-cleaner/"
        exit 1
      fi
    fi
    
    # Create patterns file
    cat > secrets-to-remove.txt << EOF
AIza[0-9A-Za-z_-]{35}
sk_test_[a-zA-Z0-9]{40,}
sk_live_[a-zA-Z0-9]{40,}
rzp_test_[a-zA-Z0-9]{14}
rzp_live_[a-zA-Z0-9]{14}
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+
EOF
    
    # Run BFG
    bfg --replace-text secrets-to-remove.txt
    
    # Cleanup
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    
    rm secrets-to-remove.txt
    ;;
    
  2)
    echo ""
    echo "Using git-filter-repo..."
    echo ""
    
    # Check if git-filter-repo is installed
    if ! command -v git-filter-repo &> /dev/null; then
      echo "Installing git-filter-repo..."
      pip3 install git-filter-repo
    fi
    
    # Remove .env.local from history
    git-filter-repo --path .env.local --invert-paths --force
    
    # Remove files with secrets
    git-filter-repo --path-regex '.*\.(key|pem|p12|pfx)' --invert-paths --force
    ;;
    
  3)
    echo ""
    echo "Using git filter-branch..."
    echo ""
    
    # Remove .env.local from all history
    git filter-branch --force --index-filter \
      'git rm --cached --ignore-unmatch .env.local' \
      --prune-empty --tag-name-filter cat -- --all
    
    # Cleanup
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    ;;
    
  *)
    echo "Invalid choice. Aborted."
    exit 1
    ;;
esac

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Verify history is clean: git log --all -- .env.local"
echo "2. Force push to remote: git push origin --force --all"
echo "3. Notify team to re-clone or fetch + reset --hard"
echo "4. Rotate all exposed secrets immediately!"
echo ""
echo "📝 Secrets to rotate:"
echo "  - Clerk API keys"
echo "  - Supabase service role key"
echo "  - Gemini API key"
echo "  - Razorpay keys"
echo "  - Webhook secrets"
