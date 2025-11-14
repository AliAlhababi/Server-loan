#!/bin/bash

# Multi-Site WhatsApp Automation Startup Script
# This script starts both sites with their own Chrome instances

echo "🏗️  Starting Multi-Site Loan Management System with WhatsApp Automation"
echo "================================================================="

# Function to start a site
start_site() {
    local SITE_NAME=$1
    local PORT=$2
    local DEBUG_PORT=$3
    local DISPLAY_NUM=$4
    
    echo ""
    echo "🚀 Starting $SITE_NAME..."
    echo "   - Port: $PORT"
    echo "   - Chrome Debug Port: $DEBUG_PORT"
    echo "   - VNC Display: :$DISPLAY_NUM"
    
    # Set environment variables
    export BRAND_NAME=$SITE_NAME
    export PORT=$PORT
    export DISPLAY=:$DISPLAY_NUM
    
    # Start VNC server for this site if not running
    if ! pgrep -f "Xvnc.*:$DISPLAY_NUM" > /dev/null; then
        echo "   📺 Starting VNC server on :$DISPLAY_NUM..."
        vncserver :$DISPLAY_NUM -geometry 1920x1080 -depth 24 || true
    fi
    
    # Start the Node.js server in background
    echo "   🔄 Starting Node.js server..."
    cd /root/Loan-Management-System
    BRAND_NAME=$SITE_NAME PORT=$PORT DISPLAY=:$DISPLAY_NUM node backend/server.js > logs/${SITE_NAME}-server.log 2>&1 &
    local SERVER_PID=$!
    echo "   ✅ Server PID: $SERVER_PID"
    
    # Wait a moment for server to start
    sleep 3
    
    echo "   🌐 Access URLs:"
    echo "   - Website: http://localhost:$PORT"
    echo "   - VNC (for Chrome): vnc://localhost:$((5900 + DISPLAY_NUM))"
    echo "   - Chrome Debug: http://localhost:$DEBUG_PORT"
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Start Site A (درع العائلة)
start_site "siteA" 3002 9222 99

# Wait between starts
sleep 2

# Start Site B (صندوق المجادي)  
start_site "siteB" 3003 9223 98

echo ""
echo "🎉 Both sites are now running!"
echo "================================================================="
echo ""
echo "📱 WhatsApp Automation Setup:"
echo "1. Site A: Connect to VNC :99 (port 5999) and scan QR for +96512345678"
echo "2. Site B: Connect to VNC :98 (port 5998) and scan QR for +96587654321"
echo ""
echo "🌐 Access Sites:"
echo "• Site A (درع العائلة): http://localhost:3002"
echo "• Site B (صندوق المجادي): http://localhost:3003"
echo ""
echo "🔧 Monitoring:"
echo "• Site A logs: tail -f logs/siteA-server.log"
echo "• Site B logs: tail -f logs/siteB-server.log"
echo ""
echo "⏹️  To stop all sites: pkill -f 'node.*server.js'"
echo ""