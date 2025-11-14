#!/bin/bash

# VNC Setup Script for Multi-Site WhatsApp Automation

echo "🖥️  Setting up VNC servers for multi-site WhatsApp automation..."

# Function to setup VNC for a site
setup_vnc() {
    local DISPLAY_NUM=$1
    local SITE_NAME=$2
    local VNC_PORT=$((5900 + DISPLAY_NUM))
    
    echo ""
    echo "🔧 Setting up VNC for $SITE_NAME (Display :$DISPLAY_NUM, Port $VNC_PORT)"
    
    # Kill existing VNC server if running
    if pgrep -f "Xvnc.*:$DISPLAY_NUM" > /dev/null; then
        echo "   🛑 Stopping existing VNC server on :$DISPLAY_NUM..."
        vncserver -kill :$DISPLAY_NUM || true
        sleep 2
    fi
    
    # Start VNC server
    echo "   🚀 Starting VNC server..."
    export DISPLAY=:$DISPLAY_NUM
    vncserver :$DISPLAY_NUM -geometry 1920x1080 -depth 24 -localhost no
    
    if [ $? -eq 0 ]; then
        echo "   ✅ VNC server started successfully!"
        echo "   🌐 Connect with: vncviewer localhost:$VNC_PORT"
        echo "   📱 Use this VNC to scan WhatsApp QR for $SITE_NAME"
    else
        echo "   ❌ Failed to start VNC server for $SITE_NAME"
        return 1
    fi
}

# Install VNC if not present
if ! command -v vncserver &> /dev/null; then
    echo "📦 Installing VNC server..."
    apt update && apt install -y tigervnc-standalone-server tigervnc-viewer
fi

# Setup VNC password if not set
if [ ! -f ~/.vnc/passwd ]; then
    echo "🔑 Setting up VNC password..."
    echo "Please enter VNC password (will be used for both sites):"
    vncpasswd
fi

# Setup VNC for both sites
setup_vnc 99 "Site A (درع العائلة)"
setup_vnc 98 "Site B (صندوق المجادي)"

echo ""
echo "🎉 VNC setup complete!"
echo "================================================================="
echo "📱 WhatsApp Setup Instructions:"
echo ""
echo "1️⃣  Site A (درع العائلة) - Phone: +96512345678"
echo "   • Connect: vncviewer localhost:5999"
echo "   • Start server: BRAND_NAME=siteA PORT=3002 node backend/server.js"
echo "   • Admin panel: http://localhost:3002"
echo ""
echo "2️⃣  Site B (صندوق المجادي) - Phone: +96587654321"
echo "   • Connect: vncviewer localhost:5998" 
echo "   • Start server: BRAND_NAME=siteB PORT=3003 node backend/server.js"
echo "   • Admin panel: http://localhost:3003"
echo ""
echo "🔧 Management Commands:"
echo "   • List VNC: ps aux | grep Xvnc"
echo "   • Kill VNC A: vncserver -kill :99"
echo "   • Kill VNC B: vncserver -kill :98"
echo "   • Kill All VNC: pkill Xvnc"
echo ""