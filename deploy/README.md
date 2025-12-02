# DocAI Deployment Kit

Complete automated deployment for DigitalOcean Ubuntu droplets.

## 📁 Files in this directory

| File | Description |
|------|-------------|
| `deploy.sh` | Full initial deployment script |
| `update-deploy.sh` | Update/redeploy after code changes |
| `bootstrap.sh` | One-liner bootstrap for fresh droplets |
| `ecosystem.config.js` | PM2 configuration |
| `nginx-docai.conf` | NGINX reverse proxy config |
| `.env.production.template` | Environment variables template |
| `SECURITY_HARDENING.md` | Security best practices |

## 🚀 One-Line Deployment

On a **fresh Ubuntu 22.04 DigitalOcean droplet**, run:

```bash
curl -fsSL https://raw.githubusercontent.com/najmuzzamasiddiqui00-create/docai/main/deploy/deploy.sh | sudo bash
```

## 📋 What the deployment does

1. ✅ Updates system packages
2. ✅ Installs Node.js 20, git, nginx, certbot, pm2
3. ✅ Configures UFW firewall (22, 80, 443)
4. ✅ Sets up Fail2Ban for brute-force protection
5. ✅ Clones the repository to `/var/www/docai`
6. ✅ Creates `.env.production` template
7. ✅ Installs dependencies and builds the app
8. ✅ Configures PM2 for process management
9. ✅ Sets up NGINX reverse proxy
10. ✅ Requests SSL certificate from Let's Encrypt

## ⚠️ After Deployment

1. **Edit environment variables:**
   ```bash
   nano /var/www/docai/.env.production
   ```

2. **Redeploy with your API keys:**
   ```bash
   /var/www/docai/deploy/update-deploy.sh
   ```

3. **Verify it's running:**
   ```bash
   pm2 status
   curl https://docai.ifbd.info/api/health
   ```

## 🔄 Updating the Application

After pushing changes to GitHub:

```bash
cd /var/www/docai
./deploy/update-deploy.sh
```

Or let GitHub Actions do it automatically (requires SSH key setup).

## 🔒 Security Checklist

- [ ] Rotate all API keys if they were ever in git
- [ ] Set up GitHub Secrets for CI/CD
- [ ] Review `SECURITY_HARDENING.md`
- [ ] Enable Supabase RLS policies
- [ ] Set up monitoring/alerts

## 📊 Useful Commands

```bash
# Application status
pm2 status
pm2 logs docai
pm2 monit

# Restart application
pm2 restart docai

# NGINX
sudo systemctl status nginx
sudo nginx -t
sudo systemctl reload nginx

# SSL certificate renewal (auto via certbot)
sudo certbot renew --dry-run

# Firewall
sudo ufw status

# Fail2ban
sudo fail2ban-client status sshd
```

## 🌐 Domain Setup

**Droplet IP:** `64.227.143.93`

Point your domain's DNS A record to your droplet's IP:

```
Type: A
Name: docai (or @ for root)
Value: 64.227.143.93
TTL: 300
```
