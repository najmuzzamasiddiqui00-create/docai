# 🔐 Security Playbook

Complete security guide for DocAI application covering secret management, incident response, and security best practices.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Secret Rotation](#secret-rotation)
3. [Incident Response](#incident-response)
4. [Security Checklist](#security-checklist)
5. [Monitoring & Auditing](#monitoring--auditing)
6. [Development Guidelines](#development-guidelines)

---

## Environment Variables

### Required Server-Side Secrets

All secrets below should **NEVER** be exposed to client-side code:

| Variable | Service | Purpose | Rotation Frequency |
|----------|---------|---------|-------------------|
| `CLERK_SECRET_KEY` | Clerk Auth | Server-side auth | 90 days |
| `WEBHOOK_SECRET` | Clerk Webhooks | Verify webhooks | 90 days |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Admin operations | 90 days |
| `GEMINI_API_KEY` | Google AI | Document analysis | 90 days |
| `RAZORPAY_KEY_ID` | Razorpay | Payment processing | 180 days |
| `RAZORPAY_KEY_SECRET` | Razorpay | Payment auth | 180 days |

### Public Variables (Safe for Client)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client-side Clerk init |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS protected) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay checkout widget |
| `NEXT_PUBLIC_APP_URL` | App base URL |

### Environment Setup

1. **Local Development**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your development keys
   ```

2. **Staging/Production**
   - Use platform environment variables (Vercel, Railway, etc.)
   - Never commit `.env.local` or `.env.production`
   - Use CI/CD secrets management

---

## Secret Rotation

### When to Rotate

- **Immediately**: After suspected compromise or public exposure
- **Scheduled**: Every 90 days for critical secrets
- **After**: Team member departure with admin access

### Rotation Process

#### 1. Clerk API Keys

```bash
# 1. Generate new keys in Clerk Dashboard
#    https://dashboard.clerk.com → API Keys

# 2. Update environment variables
#    Vercel: Project Settings → Environment Variables
#    Local: .env.local

# 3. Test new keys
npm run dev
# Verify sign-in/sign-up works

# 4. Deploy
vercel --prod

# 5. Delete old keys in Clerk Dashboard
```

#### 2. Supabase Service Role Key

```bash
# 1. Generate new service role key
#    Supabase Dashboard → Settings → API

# 2. Update SUPABASE_SERVICE_ROLE_KEY in all environments

# 3. Test database operations
npm run dev
# Upload a document and verify processing

# 4. Revoke old key in Supabase Dashboard
```

#### 3. Gemini API Key

```bash
# 1. Create new API key
#    https://makersuite.google.com/app/apikey

# 2. Update GEMINI_API_KEY

# 3. Test document analysis
# Upload and process a test document

# 4. Delete old key in Google Cloud Console
```

#### 4. Razorpay Keys

```bash
# 1. Generate new keys
#    Razorpay Dashboard → Settings → API Keys

# 2. Update both:
#    - RAZORPAY_KEY_ID
#    - RAZORPAY_KEY_SECRET
#    - NEXT_PUBLIC_RAZORPAY_KEY_ID

# 3. Test payment flow in test mode

# 4. Deploy to production

# 5. Regenerate keys in Razorpay Dashboard
```

---

## Incident Response

### 🚨 Secret Exposed in Git History

**Immediate Actions:**

1. **Rotate ALL exposed secrets immediately**
   - Don't wait - assume compromise

2. **Remove from Git history**
   ```bash
   chmod +x scripts/remove-secret-history.sh
   ./scripts/remove-secret-history.sh
   ```

3. **Force push cleaned history**
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

4. **Notify team**
   - All developers must re-clone
   - Cannot pull/merge - must reset

5. **Verify removal**
   ```bash
   git log --all -- .env.local
   # Should return nothing
   
   gitleaks detect --source . --verbose
   # Should pass with no secrets found
   ```

### 🚨 Secret Leaked in Public Repo

**Critical Response:**

1. **Immediately rotate all secrets** (< 15 minutes)
2. **Make repo private** (if possible)
3. **Remove secret from history** (use BFG)
4. **Check for unauthorized access**:
   - Clerk: Review user activity logs
   - Supabase: Check recent queries/connections
   - Razorpay: Review transactions
   - Gemini: Check API usage logs
5. **Enable 2FA** on all service accounts
6. **Document incident** for compliance

### 🚨 Suspicious API Usage

1. **Check service logs**:
   - Clerk: User creation spike?
   - Supabase: Unusual query patterns?
   - Gemini: High token usage?
   - Razorpay: Unexpected transactions?

2. **Rate limit immediately**
   - Enable Vercel rate limiting
   - Add API middleware guards

3. **Rotate potentially compromised keys**

4. **Review recent commits** for injection vulnerabilities

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables (not code)
- [ ] No secrets in Git history
- [ ] GitLeaks scan passes
- [ ] npm audit passes (no high/critical)
- [ ] TypeScript types validate
- [ ] Build succeeds with dummy env vars
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] RLS policies active on Supabase
- [ ] Webhook signatures validated

### Post-Deployment

- [ ] Health check endpoint returns 200
- [ ] API routes require authentication
- [ ] Upload flow works end-to-end
- [ ] Payment processing functions
- [ ] Error messages don't leak secrets
- [ ] Logging doesn't include sensitive data
- [ ] Environment check endpoint returns healthy

### Monthly Audit

- [ ] Review Clerk user activity logs
- [ ] Check Supabase audit logs
- [ ] Review Gemini API usage
- [ ] Audit Razorpay transactions
- [ ] Run security scan: `npm audit`
- [ ] Run secret scan: `gitleaks detect`
- [ ] Review GitHub Actions logs
- [ ] Check for dependency updates

---

## Monitoring & Auditing

### Setup Monitoring

1. **Vercel Analytics**
   - Enable in Vercel dashboard
   - Monitor API response times
   - Track error rates

2. **Sentry (Optional)**
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Supabase Logs**
   - Monitor in Dashboard → Logs
   - Set up alerts for suspicious patterns

4. **Custom Audit Logs**
   - Already implemented in `lib/security.ts`
   - Review logs in production console

### Key Metrics to Monitor

- Authentication success/failure rate
- API error rates (>1% is concerning)
- Document processing failures
- Payment transaction anomalies
- Unusual API usage spikes
- Failed webhook deliveries

---

## Development Guidelines

### Never Commit

❌ **NEVER commit these files:**
- `.env.local`
- `.env.production`
- `.env.development.local`
- Any file containing actual API keys

### Always Use

✅ **Use these patterns:**

```typescript
// ✅ GOOD - Server-side only
import { ServerEnv } from '@/lib/safeEnv';

export async function POST(req: Request) {
  const apiKey = ServerEnv.geminiApiKey; // Runtime check
  // ...
}
```

```typescript
// ❌ BAD - Direct env access
const apiKey = process.env.GEMINI_API_KEY;
```

```typescript
// ❌ VERY BAD - Hardcoded secret
const apiKey = "AIzaSyDI-ojlTXldueEl9RWxezxHi2vqLU2DJlo";
```

### Code Review Checklist

- [ ] No secrets in code
- [ ] Server-side API calls use `ServerEnv`
- [ ] Error messages don't expose internals
- [ ] User input is sanitized
- [ ] Authentication checked before operations
- [ ] Database queries parameterized (no injection)
- [ ] File uploads validated (size, type)

---

## Testing Security

### Local Testing

```bash
# Run GitLeaks scan
gitleaks detect --source . --verbose --config .gitleaks.toml

# Check for hardcoded secrets
grep -r "AIza\|sk_test_\|rzp_live_" --include="*.ts" --include="*.tsx" app/ lib/

# Run security audit
npm audit

# Test with missing env vars
rm .env.local
npm run build
# Should succeed (build-phase guards)
```

### CI/CD Pipeline

GitHub Actions automatically:
- Scans for secrets on every push
- Runs npm audit
- Validates TypeScript
- Checks for hardcoded patterns

Review workflow runs: `https://github.com/YOUR_USERNAME/docai/actions`

---

## Emergency Contacts

### Service Support

- **Clerk**: support@clerk.dev
- **Supabase**: support@supabase.io  
- **Google Cloud**: Contact via Cloud Console
- **Razorpay**: support@razorpay.com

### Security Issues

If you discover a security vulnerability:

1. **DO NOT** create public GitHub issue
2. Email: security@yourdomain.com (set this up!)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#security)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [GitLeaks Documentation](https://github.com/gitleaks/gitleaks)

---

**Last Updated**: December 2025  
**Next Review**: March 2026
