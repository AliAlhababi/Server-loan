# Multi-Site WhatsApp Automation Setup

## Overview

The system now supports **two separate Chrome instances** for WhatsApp automation:

- **Site A (درع العائلة)**: Uses WhatsApp number `+96512345678` on Chrome debug port `9222`
- **Site B (صندوق المجادي)**: Uses WhatsApp number `+96587654321` on Chrome debug port `9223`

## Architecture

Each site runs with:
- ✅ **Separate Chrome session directories** (`whatsapp-session-siteA` vs `whatsapp-session-siteB`)
- ✅ **Different debugging ports** (9222 vs 9223) 
- ✅ **Different VNC displays** (:99 vs :98)
- ✅ **Brand-specific WhatsApp numbers** and business names
- ✅ **Independent automation instances**

## Configuration Files

### Site A (.env.siteA)
```bash
WHATSAPP_PHONE=+96512345678
WHATSAPP_BUSINESS_NAME=درع العائلة
```

### Site B (.env.siteB)  
```bash
WHATSAPP_PHONE=+96587654321
WHATSAPP_BUSINESS_NAME=صندوق المجادي
```

## How It Works

### 1. Brand-Specific Service Instances
```javascript
// Each site gets its own WhatsApp automation instance
const automationInstances = new Map();
function getAutomationInstance() {
    const brandName = brandConfig.getBrandName();
    if (!automationInstances.has(brandName)) {
        automationInstances.set(brandName, new WhatsAppAutomationService());
    }
    return automationInstances.get(brandName);
}
```

### 2. Separate Chrome Processes
- **Site A**: Chrome on port 9222 with session in `data/whatsapp-session-siteA/`
- **Site B**: Chrome on port 9223 with session in `data/whatsapp-session-siteB/`

### 3. VNC Display Separation
- **Site A**: VNC display `:99` (access via port 5999)
- **Site B**: VNC display `:98` (access via port 5998)

## Quick Start

### Option 1: Manual Start
```bash
# Terminal 1 - Site A
export BRAND_NAME=siteA
export PORT=3002
export DISPLAY=:99
vncserver :99 -geometry 1920x1080
node backend/server.js

# Terminal 2 - Site B  
export BRAND_NAME=siteB
export PORT=3003
export DISPLAY=:98
vncserver :98 -geometry 1920x1080
node backend/server.js
```

### Option 2: Automated Script
```bash
./start-multi-site.sh
```

## WhatsApp Setup Process

### For Site A (درع العائلة):
1. Connect to VNC: `vnc://localhost:5999`
2. Open admin panel: `http://localhost:3002`
3. Go to WhatsApp Queue Management
4. Click "Initialize Browser" 
5. Scan QR code with WhatsApp number `+96512345678`

### For Site B (صندوق المجادي):
1. Connect to VNC: `vnc://localhost:5998` 
2. Open admin panel: `http://localhost:3003`
3. Go to WhatsApp Queue Management
4. Click "Initialize Browser"
5. Scan QR code with WhatsApp number `+96587654321`

## Monitoring

### Check Running Processes
```bash
# See both Chrome instances
ps aux | grep chrome

# See both Node.js servers
ps aux | grep "node.*server"

# Check VNC servers
ps aux | grep vnc
```

### Debug Information
```bash
# Site A Chrome debug interface
curl http://localhost:9222/json/version

# Site B Chrome debug interface  
curl http://localhost:9223/json/version
```

### Logs
```bash
# Site A logs
tail -f logs/siteA-server.log

# Site B logs
tail -f logs/siteB-server.log
```

## API Endpoints

Each site has its own WhatsApp configuration endpoint:

### Site A: `GET /admin/whatsapp/config`
```json
{
  "success": true,
  "data": {
    "businessPhone": "+96512345678",
    "businessName": "درع العائلة", 
    "brandName": "درع العائلة"
  }
}
```

### Site B: `GET /admin/whatsapp/config`
```json
{
  "success": true,
  "data": {
    "businessPhone": "+96587654321",
    "businessName": "صندوق المجادي",
    "brandName": "صندوق المجادي"
  }
}
```

## Troubleshooting

### Chrome Instance Conflicts
If Chrome instances conflict:
```bash
# Kill all Chrome processes
pkill -f chrome

# Clear session locks
rm -f backend/data/whatsapp-session-*/SingletonLock

# Restart with clean sessions
./start-multi-site.sh
```

### VNC Issues
```bash
# Kill VNC servers
vncserver -kill :99
vncserver -kill :98

# Restart VNC
vncserver :99 -geometry 1920x1080
vncserver :98 -geometry 1920x1080
```

### Port Conflicts
If ports are in use:
```bash
# Check what's using the ports
netstat -tulpn | grep -E "3002|3003|9222|9223"

# Kill specific processes
sudo fuser -k 3002/tcp
sudo fuser -k 3003/tcp
```

## Benefits

✅ **Isolated WhatsApp Sessions**: Each site maintains its own WhatsApp Web session
✅ **No Cross-Contamination**: Messages from Site A won't interfere with Site B  
✅ **Scalable Architecture**: Easy to add more sites (siteC, siteD, etc.)
✅ **Brand-Specific Messages**: Each site uses its own business name and phone number
✅ **Independent Operation**: One site can be down while the other continues working
✅ **Separate Automation Queues**: Each site processes its own notification queue

## Security Notes

- Each site has its own database and user base
- WhatsApp sessions are completely isolated
- No shared authentication or session data
- Each Chrome instance runs in its own sandbox
- VNC servers can be password protected for added security

---

**Status**: ✅ **Fully Implemented & Ready for Production**