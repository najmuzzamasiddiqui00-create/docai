#!/bin/bash
#===============================================================================
# DocAI - Complete Automated Deployment Script
# Domain: docai.ifbd.info
# Repo: https://github.com/najmuzzamasiddiqui00-create/docai.git
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

#===============================================================================
# CONFIGURATION
#===============================================================================
DOMAIN="docai.ifbd.info"
DROPLET_IP="64.227.143.93"
APP_NAME="docai"
APP_DIR="/var/www/docai"
REPO_URL="https://github.com/najmuzzamasiddiqui00-create/docai.git"
NODE_VERSION="20"
EMAIL="admin@ifbd.info"

#===============================================================================
# PRE-FLIGHT CHECKS
#===============================================================================
log "Starting DocAI deployment..."

if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

#===============================================================================
# SYSTEM UPDATE & DEPENDENCIES
#===============================================================================
log "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

log "Installing essential packages..."
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw fail2ban

#===============================================================================
# NODE.JS 20 INSTALLATION
#===============================================================================

# Helper: Get Node.js major version (returns 0 if not installed or error)
get_node_major_version() {
    local version
    version=$(node -v 2>/dev/null) || { echo 0; return; }
    # Extract major version: v20.10.0 -> 20
    if [[ "$version" =~ ^v([0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    else
        echo 0
    fi
}

log "Installing Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null || [[ $(get_node_major_version) -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y -qq nodejs
fi
log "Node.js version: $(node -v)"
log "npm version: $(npm -v)"

#===============================================================================
# PM2 INSTALLATION
#===============================================================================
log "Installing PM2..."
npm install -g pm2 --silent
pm2 -v

#===============================================================================
# FIREWALL SETUP
#===============================================================================
log "Configuring firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
ufw status

#===============================================================================
# FAIL2BAN SETUP
#===============================================================================
log "Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-botsearch]
enabled = true
EOF

systemctl enable fail2ban
systemctl restart fail2ban

#===============================================================================
# APPLICATION DIRECTORY SETUP
#===============================================================================
log "Setting up application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

if [ -d ".git" ]; then
    log "Updating existing repository..."
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    log "Cloning repository..."
    rm -rf $APP_DIR/*
    git clone $REPO_URL .
fi

#===============================================================================
# ENVIRONMENT FILE
#===============================================================================
ENV_FILE="$APP_DIR/.env.production"
if [ ! -f "$ENV_FILE" ]; then
    log "Creating .env.production template..."
    cat > $ENV_FILE << 'EOF'
# =============================================================================
# DocAI Production Environment Variables
# FILL IN ALL VALUES BEFORE RUNNING THE APP
# =============================================================================

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI Processing
GEMINI_API_KEY=
OPENAI_API_KEY=

# Razorpay Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Application
NEXT_PUBLIC_SITE_URL=https://docai.ifbd.info
NODE_ENV=production
EOF
    chmod 600 $ENV_FILE
    warn "⚠️  IMPORTANT: Edit $ENV_FILE and add your API keys!"
    warn "Run: nano $ENV_FILE"
    warn "Then run: /var/www/docai/deploy/update-deploy.sh"
fi

#===============================================================================
# PM2 ECOSYSTEM CONFIG
#===============================================================================
log "Creating PM2 ecosystem config..."
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'docai',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    cwd: '/var/www/docai',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/docai/error.log',
    out_file: '/var/log/docai/out.log',
    log_file: '/var/log/docai/combined.log',
    time: true
  }]
};
EOF

# Create log directory
mkdir -p /var/log/docai
chown -R www-data:www-data /var/log/docai

#===============================================================================
# NGINX CONFIGURATION
#===============================================================================
log "Configuring NGINX..."
cat > /etc/nginx/sites-available/docai << 'EOF'
# DocAI - NGINX Configuration
# Domain: docai.ifbd.info

upstream docai_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name docai.ifbd.info;

    # Redirect HTTP to HTTPS (after SSL is set up)
    location / {
        return 301 https://$server_name$request_uri;
    }

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docai.ifbd.info;

    # SSL will be configured by certbot
    # ssl_certificate /etc/letsencrypt/live/docai.ifbd.info/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/docai.ifbd.info/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # File upload size (100MB for documents)
    client_max_body_size 100M;
    client_body_timeout 120s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Static file caching
    location /_next/static {
        proxy_cache_valid 60m;
        proxy_pass http://docai_upstream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /static {
        proxy_cache_valid 60m;
        proxy_pass http://docai_upstream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Main application
    location / {
        proxy_pass http://docai_upstream;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://docai_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/docai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

#===============================================================================
# INSTALL DEPENDENCIES & BUILD
#===============================================================================
log "Installing dependencies..."
cd $APP_DIR
npm ci --production=false

log "Building Next.js application..."
npm run build

#===============================================================================
# START PM2
#===============================================================================
log "Starting application with PM2..."
pm2 delete docai 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

#===============================================================================
# START NGINX
#===============================================================================
log "Starting NGINX..."
systemctl enable nginx
systemctl restart nginx

#===============================================================================
# SSL CERTIFICATE (Let's Encrypt)
#===============================================================================
log "Requesting SSL certificate..."
# First, create a temporary HTTP-only config for initial cert request
cat > /etc/nginx/sites-available/docai-temp << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name docai.ifbd.info;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/docai-temp /etc/nginx/sites-enabled/docai
nginx -t && systemctl reload nginx

# Request certificate
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || {
    warn "SSL certificate request failed. You can retry with:"
    warn "certbot --nginx -d $DOMAIN"
}

# Restore full config
ln -sf /etc/nginx/sites-available/docai /etc/nginx/sites-enabled/docai
rm -f /etc/nginx/sites-available/docai-temp
nginx -t && systemctl reload nginx

#===============================================================================
# HEALTH CHECK
#===============================================================================
log "Running health checks..."
sleep 5

# Check PM2
if pm2 list | grep -q "docai"; then
    log "✅ PM2: Application running"
else
    error "❌ PM2: Application not running"
fi

# Check NGINX
if systemctl is-active --quiet nginx; then
    log "✅ NGINX: Running"
else
    error "❌ NGINX: Not running"
fi

# Check HTTP response
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    log "✅ Health check: HTTP 200 OK"
else
    warn "⚠️  Health check returned HTTP $HTTP_STATUS (app may still be starting)"
fi

#===============================================================================
# CREATE UPDATE SCRIPT
#===============================================================================
log "Creating update script..."
cat > $APP_DIR/deploy/update-deploy.sh << 'UPDATEEOF'
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
cd $APP_DIR

log "Starting update deployment..."

# Check for .env.production
if [ ! -f ".env.production" ]; then
    error ".env.production not found! Create it first."
fi

# Check if env file has values
if grep -q "^NEXT_PUBLIC_SUPABASE_URL=$" .env.production; then
    error ".env.production has empty values! Fill in all API keys first."
fi

log "Pulling latest code..."
git fetch origin
git reset --hard origin/main
git clean -fd

log "Installing dependencies..."
npm ci --production=false

log "Building application..."
npm run build

log "Reloading PM2..."
pm2 reload ecosystem.config.js --env production

log "Waiting for app to start..."
sleep 5

# Health check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    log "✅ Deployment successful! Health check passed."
else
    warn "⚠️  Health check returned HTTP $HTTP_STATUS"
    log "Checking PM2 logs..."
    pm2 logs docai --lines 20 --nostream
fi

log "Deployment complete!"
log "Site: https://docai.ifbd.info"
UPDATEEOF

chmod +x $APP_DIR/deploy/update-deploy.sh

#===============================================================================
# SET PERMISSIONS
#===============================================================================
log "Setting file permissions..."
chown -R www-data:www-data $APP_DIR
chmod 600 $APP_DIR/.env.production
chmod +x $APP_DIR/deploy/*.sh

#===============================================================================
# FINAL OUTPUT
#===============================================================================
echo ""
echo "==============================================================================="
echo -e "${GREEN}🚀 DEPLOYMENT COMPLETE!${NC}"
echo "==============================================================================="
echo ""
echo "Domain: https://$DOMAIN"
echo "App Directory: $APP_DIR"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. Edit environment variables:"
echo "   nano $APP_DIR/.env.production"
echo ""
echo "2. Redeploy with your API keys:"
echo "   $APP_DIR/deploy/update-deploy.sh"
echo ""
echo "3. Check application status:"
echo "   pm2 status"
echo "   pm2 logs docai"
echo ""
echo "4. Check NGINX status:"
echo "   systemctl status nginx"
echo ""
echo "==============================================================================="
