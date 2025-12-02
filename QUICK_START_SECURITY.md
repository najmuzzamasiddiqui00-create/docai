# 🚀 Quick Start - Production Security System

## ⚡ 30-Second Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup pre-commit hooks
npm run security:setup

# 3. Copy environment template
cp .env.example .env.local
# Then fill in your actual secrets

# 4. Test everything
npm run security:audit
npm run build
```

## 🔍 Daily Commands

```bash
# Before committing
npm run security:scan

# Before deploying
npm run predeploy

# Check system health
curl http://localhost:3000/api/health
```

## 📚 Key Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment variables |
| `.env.local` | Your actual secrets (never commit!) |
| `lib/safeEnv.ts` | Safe environment access |
| `lib/supabaseAdmin.ts` | Centralized Supabase client |
| `lib/geminiClient.ts` | Centralized Gemini client |
| `docs/security-playbook.md` | Complete security guide |

## 🛡️ Security Checklist

- [ ] Husky installed (`npm install -D husky`)
- [ ] Pre-commit hooks active (`npm run security:setup`)
- [ ] GitLeaks installed (for local scanning)
- [ ] All env vars in `.env.local`
- [ ] `.env.local` in `.gitignore`
- [ ] Vercel env vars configured
- [ ] GitHub secrets set (if using workflows)

## 🚨 If You Accidentally Commit a Secret

```bash
# 1. Immediately rotate the secret (get new one)
# 2. Run the cleanup script
bash scripts/remove-secret-history.sh

# 3. Force push (⚠️ coordinate with team)
git push --force

# 4. Verify
npm run security:scan
```

## 💡 Code Examples

### Using Supabase Admin
```typescript
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabase = await getSupabaseAdmin();
const { data } = await supabase.from('users').select('*');
```

### Using Gemini AI
```typescript
import { analyzeWithGemini } from '@/lib/geminiClient';

const result = await analyzeWithGemini('Analyze this document...');
```

### Safe Env Access
```typescript
import { requireEnv, isBuildPhase } from '@/lib/safeEnv';

if (isBuildPhase()) {
  return Response.json({ message: 'Skip during build' });
}

const apiKey = requireEnv('GEMINI_API_KEY');
```

### Safe Error Responses
```typescript
import { safeErrorResponse } from '@/lib/security';

if (error) {
  return safeErrorResponse('Something went wrong', 500);
}
```

## 🔗 Quick Links

- [Full Security Guide](./docs/security-playbook.md)
- [Implementation Complete](./PRODUCTION_SECURITY_COMPLETE.md)
- [Environment Template](./.env.example)
- [README](./README.md)

## 📞 Help

**Issue:** Build fails with "missing environment variable"
**Solution:** Check `.env.local` has all variables from `.env.example`

**Issue:** Pre-commit hook fails
**Solution:** Fix the errors or use `git commit --no-verify` (not recommended)

**Issue:** GitLeaks not found
**Solution:** Install with `choco install gitleaks` (Windows)

**Issue:** Health check returns unhealthy
**Solution:** Check `/api/health` response for specific failing services

---

✅ **Your app is production-ready with enterprise-grade security!**
