#!/bin/bash
# ===========================================
# VPS Initial Setup Script for R66Slot
# Run this ONCE on a fresh Hostinger VPS
# Usage: ssh root@YOUR_VPS_IP 'bash -s' < setup-vps.sh
# ===========================================

set -e

echo "========================================="
echo "  R66Slot VPS Setup"
echo "========================================="

# Update system
echo "[1/7] Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Node.js 20 LTS
echo "[2/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install PM2
echo "[3/7] Installing PM2..."
npm install -g pm2

# Install Nginx
echo "[4/7] Installing Nginx..."
apt-get install -y nginx

# Install Certbot for SSL
echo "[5/7] Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Install Git
echo "[6/7] Installing Git..."
apt-get install -y git

# Create app directory
echo "[7/7] Setting up app directory..."
mkdir -p /var/www/r66slot

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx

# Setup firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "========================================="
echo "  VPS Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Run the deploy script: bash deploy/deploy.sh"
echo "  2. Set up your .env.local on the server"
echo "  3. Configure Nginx with the provided config"
echo ""
