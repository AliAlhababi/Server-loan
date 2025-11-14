#!/bin/bash

# Start VNC Display for WhatsApp Automation
# This script creates a virtual display that can be accessed remotely

# Kill any existing X processes
pkill -f Xvfb
pkill -f x11vnc
pkill -f xfce4-session

# Wait a moment
sleep 2

echo "🖥️ Starting virtual display for WhatsApp automation..."

# Start virtual framebuffer (virtual display)
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 -ac -nolisten tcp -dpi 96 &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 3

# Start XFCE desktop environment on the virtual display
DISPLAY=:99 xfce4-session &
XFCE_PID=$!

# Wait for XFCE to start
sleep 5

# Start VNC server (password: whatsapp123)
echo "🔑 Setting up VNC access (password: whatsapp123)..."
mkdir -p ~/.vnc
echo "whatsapp123" | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd

# Start x11vnc server
x11vnc -display :99 -forever -usepw -create -rfbauth ~/.vnc/passwd -rfbport 5900 -shared &
VNC_PID=$!

# Wait for VNC to start
sleep 3

echo "✅ Virtual display setup complete!"
echo "📱 VNC Access: vnc://YOUR_SERVER_IP:5900 (password: whatsapp123)"
echo "🖥️ Display: :99"
echo ""
echo "PIDs:"
echo "  Xvfb: $XVFB_PID"
echo "  XFCE: $XFCE_PID" 
echo "  VNC:  $VNC_PID"
echo ""
echo "To stop: pkill -f 'Xvfb|x11vnc|xfce4'"