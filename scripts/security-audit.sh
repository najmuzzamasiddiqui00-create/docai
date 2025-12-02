#!/bin/bash

# Security audit script
# Run before deployment or as part of CI/CD

echo "🔒 Running Security Audit..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Check for .env.local in git
echo "1️⃣  Checking if .env.local is tracked..."
if git ls-files | grep -q "\.env\.local"; then
  echo -e "${RED}❌ .env.local is tracked in git!${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ .env.local not tracked${NC}"
fi

# 2. Check .gitignore
echo ""
echo "2️⃣  Verifying .gitignore..."
if grep -q "\.env\.local" .gitignore; then
  echo -e "${GREEN}✅ .env.local in .gitignore${NC}"
else
  echo -e "${RED}❌ .env.local missing from .gitignore!${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 3. Run GitLeaks if available
echo ""
echo "3️⃣  Running GitLeaks scan..."
if command -v gitleaks &> /dev/null; then
  if gitleaks detect --source . --config .gitleaks.toml --verbose --redact; then
    echo -e "${GREEN}✅ No secrets detected${NC}"
  else
    echo -e "${RED}❌ Secrets detected!${NC}"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${YELLOW}⚠️  GitLeaks not installed. Install: brew install gitleaks${NC}"
fi

# 4. Check for hardcoded secrets
echo ""
echo "4️⃣  Scanning for hardcoded secrets..."
PATTERNS="AIza[0-9A-Za-z_-]{35}|sk_test_|sk_live_|rzp_live_|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"

if grep -r -E "$PATTERNS" --include="*.ts" --include="*.tsx" --include="*.js" app/ lib/ components/ 2>/dev/null; then
  echo -e "${RED}❌ Potential hardcoded secrets found!${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No hardcoded secrets detected${NC}"
fi

# 5. npm audit
echo ""
echo "5️⃣  Running npm audit..."
if npm audit --audit-level=high --production 2>&1 | grep -q "found 0 vulnerabilities"; then
  echo -e "${GREEN}✅ No high-severity vulnerabilities${NC}"
else
  echo -e "${YELLOW}⚠️  Vulnerabilities found. Run: npm audit${NC}"
fi

# 6. Check TypeScript
echo ""
echo "6️⃣  Type checking..."
if npx tsc --noEmit; then
  echo -e "${GREEN}✅ TypeScript types valid${NC}"
else
  echo -e "${RED}❌ TypeScript errors found!${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 7. Verify security files exist
echo ""
echo "7️⃣  Checking security files..."
REQUIRED_FILES=(
  ".gitleaks.toml"
  "lib/safeEnv.ts"
  "lib/security.ts"
  "docs/security-playbook.md"
  ".env.example"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ $file exists${NC}"
  else
    echo -e "${RED}❌ $file missing!${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

# Summary
echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Security audit passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Security audit failed with $ERRORS error(s)${NC}"
  exit 1
fi
