# =============================================================================
# DocAI Security Hardening Guide
# =============================================================================

## 1. ROTATE ALL LEAKED API KEYS IMMEDIATELY

If you've ever committed secrets to git, they are COMPROMISED. Rotate them now:

### Supabase
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Click "Generate new anon key" and "Generate new service role key"
3. Update .env.production with new keys

### Clerk
1. Go to https://dashboard.clerk.com/ → API Keys
2. Click "Rotate Secret Key"
3. Update CLERK_SECRET_KEY in .env.production

### Gemini
1. Go to https://aistudio.google.com/app/apikey
2. Delete old key, create new one
3. Update GEMINI_API_KEY

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Delete old key, create new one
3. Update OPENAI_API_KEY

### Razorpay
1. Go to https://dashboard.razorpay.com/app/keys
2. Regenerate keys (note: may affect live payments)
3. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET

---

## 2. BLOCK SECRETS FROM GIT HISTORY

Run this on your server to ensure .env files are never committed:

```bash
# Remove any cached .env files
git rm --cached .env* 2>/dev/null || true
git rm --cached .env.production 2>/dev/null || true
git rm --cached .env.local 2>/dev/null || true

# Commit the removal
git commit -m "chore: remove cached env files" || true
```

---

## 3. VERIFY .gitignore

Ensure these entries exist in .gitignore:

```
# Environment files - NEVER COMMIT
.env
.env.*
.env.local
.env.production
.env.production.local
!.env.example
!.env.production.template

# Private keys
*.pem
*.key
id_rsa*
```

---

## 4. SERVER-ONLY ENVIRONMENT VARIABLES

These variables should NEVER have NEXT_PUBLIC_ prefix:
- SUPABASE_SERVICE_ROLE_KEY
- CLERK_SECRET_KEY
- GEMINI_API_KEY
- OPENAI_API_KEY
- RAZORPAY_KEY_SECRET
- *_WEBHOOK_SECRET

Only these should be public:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- NEXT_PUBLIC_SITE_URL

---

## 5. FIREWALL SETUP (Already in deploy.sh)

```bash
# Reset and configure UFW
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable

# Verify
sudo ufw status
```

---

## 6. FAIL2BAN SETUP (Already in deploy.sh)

Configuration at /etc/fail2ban/jail.local:
- Bans IPs after 5 failed attempts
- 1 hour ban duration
- Protects SSH, NGINX auth

Check status:
```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

---

## 7. SSH HARDENING

Edit /etc/ssh/sshd_config:
```bash
# Disable password authentication
PasswordAuthentication no
PubkeyAuthentication yes

# Disable root login (after creating another sudo user)
# PermitRootLogin no

# Limit login attempts
MaxAuthTries 3
```

Then: `sudo systemctl restart sshd`

---

## 8. AUTOMATIC SECURITY UPDATES

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 9. FILE PERMISSIONS

```bash
# Environment file - owner read/write only
chmod 600 /var/www/docai/.env.production

# Application directory
chown -R www-data:www-data /var/www/docai

# Scripts should be executable
chmod +x /var/www/docai/deploy/*.sh
```

---

## 10. GITHUB SECRETS SETUP

Go to: https://github.com/najmuzzamasiddiqui00-create/docai/settings/secrets/actions

Add these secrets:
- DO_HOST (your droplet IP)
- DO_SSH_KEY (private key for SSH)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- GEMINI_API_KEY
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET

---

## 11. MONITORING

Check logs regularly:
```bash
# Application logs
pm2 logs docai

# NGINX access/error logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System auth logs
tail -f /var/log/auth.log

# Fail2ban logs
tail -f /var/log/fail2ban.log
```

---

## 12. BACKUP CHECKLIST

- [ ] Supabase: Enable point-in-time recovery
- [ ] Store backup of .env.production in password manager
- [ ] Document all API key locations
- [ ] Set calendar reminder to rotate keys quarterly
