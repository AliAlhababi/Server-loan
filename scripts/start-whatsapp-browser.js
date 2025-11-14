#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');

async function startWhatsAppBrowser() {
    const sessionPath = path.join(__dirname, '../backend/data/whatsapp-session');
    
    console.log('🚀 Starting persistent WhatsApp Web browser...');
    console.log('📁 Session directory:', sessionPath);
    
    // Set display for VNC
    process.env.DISPLAY = ':99';
    
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: sessionPath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--window-size=1920,1080',
            '--display=:99',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-blink-features=AutomationControlled',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--allow-running-insecure-content',
            '--enable-unsafe-swiftshader',
            '--remote-debugging-port=9222',
            '--disable-session-crashed-bubble',
            '--disable-infobars'
        ],
        defaultViewport: { width: 1920, height: 1080 },
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Navigate to WhatsApp Web
    console.log('📱 Opening WhatsApp Web...');
    await page.goto('https://web.whatsapp.com', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
    });

    console.log('✅ WhatsApp Web opened successfully!');
    console.log('🔍 Remote debugging available at: http://localhost:9222');
    console.log('👁️  View in VNC at: your-server:5900');
    console.log('📝 If you see a QR code, scan it once to login');
    console.log('🔄 This browser will stay open for automation use');
    console.log('⏹️  Press Ctrl+C to stop');

    // Keep the browser running
    process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping WhatsApp browser...');
        await browser.close();
        process.exit(0);
    });

    // Keep the script running
    setInterval(() => {
        // Heartbeat to keep the process alive
    }, 10000);
}

startWhatsAppBrowser().catch(console.error);