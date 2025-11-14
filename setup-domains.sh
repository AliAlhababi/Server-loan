#!/bin/bash

# Domain Setup Script for Loan Management System
# Run with: sudo bash setup-domains.sh

echo "🚀 Setting up domains for Loan Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_step "1. Installing Nginx (if not installed)..."
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx
    print_status "Nginx installed successfully"
else
    print_status "Nginx is already installed"
fi

print_step "2. Installing Certbot for SSL certificates..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    print_status "Certbot installed successfully"
else
    print_status "Certbot is already installed"
fi

print_step "3. Copying Nginx configuration..."
cp /root/Loan-Management-System/nginx-config.conf /etc/nginx/sites-available/loan-management

# Ask user for their domain name
print_step "4. Domain configuration..."
echo -e "${YELLOW}Please enter your new Cloudflare domain (without www):${NC}"
read -p "Domain: " NEW_DOMAIN

if [ -z "$NEW_DOMAIN" ]; then
    print_error "Domain cannot be empty"
    exit 1
fi

print_status "Configuring domain: $NEW_DOMAIN"

# Replace placeholder with actual domain
# Domain is already configured as alkawtharb.com
print_status "Domain alkawtharb.com is already configured in nginx config"

print_step "5. Enabling the site..."
ln -sf /etc/nginx/sites-available/loan-management /etc/nginx/sites-enabled/

# Remove default nginx site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    print_status "Removed default Nginx site"
fi

print_step "6. Testing Nginx configuration..."
if nginx -t; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    exit 1
fi

print_step "7. Reloading Nginx..."
systemctl reload nginx
systemctl enable nginx

print_step "8. Starting both Node.js applications..."
cd /root/Loan-Management-System

# Function to start a site
start_site() {
    local site=$1
    local port=$2
    
    print_status "Starting $site on port $port..."
    
    # Check if PM2 is installed
    if command -v pm2 &> /dev/null; then
        # Use PM2 for production
        BRAND_NAME=$site pm2 start backend/server.js --name "loan-$site"
    else
        # Start with nohup as fallback
        BRAND_NAME=$site nohup node backend/server.js > logs/$site.log 2>&1 &
        echo $! > /tmp/loan-$site.pid
    fi
}

# Create logs directory
mkdir -p logs

# Start both sites
start_site "siteA" "3002"
start_site "siteB" "3003"

print_step "9. Setting up SSL certificates..."
echo -e "${YELLOW}Setting up SSL for $NEW_DOMAIN...${NC}"
certbot --nginx -d $NEW_DOMAIN -d www.$NEW_DOMAIN --non-interactive --agree-tos --email admin@$NEW_DOMAIN

echo -e "${YELLOW}Setting up SSL for al-almajadi.com...${NC}"
certbot --nginx -d al-almajadi.com -d www.al-almajadi.com --non-interactive --agree-tos --email admin@al-almajadi.com

print_step "10. Final checks..."

# Check if applications are running
sleep 5

if curl -f -s http://localhost:3002 > /dev/null; then
    print_status "Site A (درع العائلة) is running on port 3002"
else
    print_warning "Site A may not be running properly"
fi

if curl -f -s http://localhost:3003 > /dev/null; then
    print_status "Site B (صندوق المجادي) is running on port 3003"
else
    print_warning "Site B may not be running properly"
fi

# Display final information
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Your sites are now configured:${NC}"
echo -e "📱 Site A (درع العائلة): ${GREEN}https://$NEW_DOMAIN${NC}"
echo -e "📱 Site B (صندوق المجادي): ${GREEN}https://al-almajadi.com${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update your Cloudflare DNS:"
echo "   - A record: @ → Your server IP"
echo "   - CNAME: www → $NEW_DOMAIN"
echo ""
echo "2. Make sure both domains point to this server's IP address"
echo ""
echo "3. Test your sites after DNS propagation (may take up to 24 hours)"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "- Check site status: systemctl status nginx"
echo "- View logs: tail -f /var/log/nginx/access.log"
echo "- Restart Nginx: sudo systemctl restart nginx"
if command -v pm2 &> /dev/null; then
    echo "- Check apps: pm2 status"
    echo "- Restart apps: pm2 restart all"
fi
echo ""