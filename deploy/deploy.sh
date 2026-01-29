#!/bin/bash
# ===========================================
# Deploy Script for R66Slot
# Run this ON THE VPS to deploy or update
# Usage: ssh root@YOUR_VPS_IP 'bash -s' < deploy/deploy.sh
# Or run directly on the VPS: bash /var/www/r66slot/deploy/deploy.sh
# ===========================================

set -e

APP_DIR="/var/www/r66slot"
REPO_URL="https://github.com/r66imports/R66Slot.git"
BRANCH="master"

echo "========================================="
echo "  Deploying R66Slot"
echo "========================================="

# Clone or pull latest code
if [ -d "$APP_DIR/.git" ]; then
    echo "[1/5] Pulling latest code..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH
else
    echo "[1/5] Cloning repository..."
    git clone -b $BRANCH "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Check for .env.local
if [ ! -f "$APP_DIR/.env.local" ]; then
    echo ""
    echo "WARNING: .env.local not found!"
    echo "Create it before continuing:"
    echo "  nano $APP_DIR/.env.local"
    echo ""
    echo "Required variables (see .env.example):"
    echo "  - NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN"
    echo "  - NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN"
    echo "  - SHOPIFY_ADMIN_ACCESS_TOKEN"
    echo "  - NEXT_PUBLIC_SITE_URL=https://r66slot.co.za"
    echo "  - (and other variables from .env.example)"
    echo ""
    read -p "Press Enter after creating .env.local, or Ctrl+C to abort..."
fi

# Install dependencies
echo "[2/5] Installing dependencies..."
npm ci --production=false

# Build the application
echo "[3/5] Building application..."
npm run build

# Setup Nginx config (only on first deploy)
if [ ! -f /etc/nginx/sites-available/r66slot ]; then
    echo "[4/5] Setting up Nginx..."
    cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/r66slot
    ln -sf /etc/nginx/sites-available/r66slot /etc/nginx/sites-enabled/r66slot
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
else
    echo "[4/5] Nginx already configured, skipping..."
fi

# Start or restart with PM2
echo "[5/5] Starting application with PM2..."
cd "$APP_DIR"
pm2 delete r66slot 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "Your site should now be running at:"
echo "  http://r66slot.co.za"
echo ""
echo "To add SSL (HTTPS), run:"
echo "  certbot --nginx -d r66slot.co.za -d www.r66slot.co.za"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs r66slot    - View app logs"
echo "  pm2 restart r66slot - Restart app"
echo ""
