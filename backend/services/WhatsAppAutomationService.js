const puppeteer = require('puppeteer');
const DatabaseService = require('./DatabaseService');
const brandConfig = require('../config/brandConfig');
const fs = require('fs');
const path = require('path');

class WhatsAppAutomationService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.currentSession = null;
        
        // Brand-specific configuration
        this.brandName = brandConfig.getBrandName();
        this.sessionPath = path.join(__dirname, `../data/whatsapp-session-${this.brandName}`);
        this.debuggingPort = this.getBrandDebuggingPort();
        this.displayPort = this.getBrandDisplay();
        this.whatsappConfig = brandConfig.getSection('whatsapp');
        
        this.detachedFrameCount = 0;
        this.maxDetachedFrameAttempts = 3;
        
        console.log(`🏢 WhatsApp Automation initialized for brand: ${this.brandName}`);
        console.log(`📁 Session path: ${this.sessionPath}`);
        console.log(`🔌 Debugging port: ${this.debuggingPort}`);
        console.log(`🖥️  Display port: ${this.displayPort}`);
        console.log(`📱 Business phone: ${this.whatsappConfig.phone}`);
    }

    // Get brand-specific debugging port
    getBrandDebuggingPort() {
        const brandPorts = {
            'siteA': 9222,
            'siteB': 9223,
            'default': 9222
        };
        return brandPorts[this.brandName] || brandPorts['default'];
    }

    // Get brand-specific display
    getBrandDisplay() {
        const brandDisplays = {
            'siteA': ':99',
            'siteB': ':98',
            'default': ':99'
        };
        return brandDisplays[this.brandName] || brandDisplays['default'];
    }

    // Initialize browser and WhatsApp Web
    async initializeBrowser() {
        try {
            console.log('🤖 Initializing headless browser for WhatsApp automation...');
            
            // Check if we already have a working browser
            if (this.browser && this.page) {
                try {
                    // Test if browser is still connected and has WhatsApp Web
                    const url = await this.page.url();
                    if (url.includes('web.whatsapp.com')) {
                        console.log('✅ Reusing existing browser with WhatsApp Web!');
                        const isLoggedIn = await this.checkIfLoggedIn();
                        return { success: true, message: 'Browser already ready', loggedIn: isLoggedIn };
                    }
                } catch (error) {
                    console.log('🔄 Existing browser not usable, will reconnect...');
                    this.browser = null;
                    this.page = null;
                }
            }
            
            // Don't close existing browser - try to reuse it
            console.log('🔍 Looking for existing browser to reuse...');
            
            // Set display environment variable for virtual display
            process.env.DISPLAY = ':99';
            
            // Clean up any existing singleton lock
            const singletonLockPath = path.join(this.sessionPath, 'SingletonLock');
            if (fs.existsSync(singletonLockPath)) {
                try {
                    fs.unlinkSync(singletonLockPath);
                    console.log('🧹 Removed existing singleton lock');
                } catch (error) {
                    console.warn('⚠️  Could not remove singleton lock:', error.message);
                }
            }
            
            // Ensure session directory exists
            if (!fs.existsSync(this.sessionPath)) {
                fs.mkdirSync(this.sessionPath, { recursive: true });
                console.log('📁 Created WhatsApp session directory:', this.sessionPath);
            }

            // Try to connect to existing browser with retry logic
            let connectionAttempts = 0;
            const maxAttempts = 5;
            
            while (connectionAttempts < maxAttempts) {
                try {
                    console.log(`🔍 Checking for existing browser instance on port ${this.debuggingPort}... (attempt ${connectionAttempts + 1}/${maxAttempts})`);
                    this.browser = await puppeteer.connect({
                        browserURL: `http://127.0.0.1:${this.debuggingPort}`
                    });
                    console.log(`✅ Connected to existing browser instance on port ${this.debuggingPort}!`);
                    break;
                } catch (connectError) {
                    connectionAttempts++;
                    if (connectionAttempts < maxAttempts) {
                        console.log(`⏳ Browser not ready yet, waiting 3 seconds... (${connectError.message})`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } else {
                        console.log('ℹ️  No existing browser found after retries, launching new instance...');
                    }
                }
            }
            
            if (!this.browser) {
                
                this.browser = await puppeteer.launch({
                    headless: false, // Use GUI mode with virtual display
                    userDataDir: this.sessionPath, // Persist WhatsApp Web session
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-extensions',
                        '--window-size=1920,1080',
                        `--display=${this.displayPort}`,
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-blink-features=AutomationControlled',
                        '--no-default-browser-check',
                        '--disable-default-apps',
                        '--allow-running-insecure-content',
                        '--enable-unsafe-swiftshader',
                        `--remote-debugging-port=${this.debuggingPort}`
                    ],
                    defaultViewport: { width: 1920, height: 1080 },
                    ignoreDefaultArgs: ['--enable-automation']
                });
            }

            // Wait for browser to be fully ready
            console.log('⏳ Waiting for browser to be fully ready...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Try to find existing WhatsApp Web tab with retries
            let whatsappPage = null;
            let tabAttempts = 0;
            const maxTabAttempts = 3;
            
            while (tabAttempts < maxTabAttempts && !whatsappPage) {
                try {
                    console.log(`🔍 Looking for WhatsApp Web tab... (attempt ${tabAttempts + 1}/${maxTabAttempts})`);
                    const pages = await this.browser.pages();
                    
                    // Look for existing WhatsApp Web tab
                    for (const page of pages) {
                        try {
                            const url = page.url();
                            if (url.includes('web.whatsapp.com')) {
                                whatsappPage = page;
                                console.log('✅ Found existing WhatsApp Web tab!');
                                break;
                            }
                        } catch (error) {
                            // Skip pages we can't access
                            continue;
                        }
                    }
                    
                    if (!whatsappPage && tabAttempts < maxTabAttempts - 1) {
                        console.log('⏳ WhatsApp tab not found, waiting 2 seconds...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    tabAttempts++;
                } catch (error) {
                    console.log(`⚠️ Error looking for tabs: ${error.message}`);
                    tabAttempts++;
                    if (tabAttempts < maxTabAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            
            if (whatsappPage) {
                // Use existing WhatsApp tab
                this.page = whatsappPage;
                
                // Bring the tab to front
                await this.page.bringToFront();
                console.log('📱 Using existing WhatsApp Web session...');
            } else {
                // Create new tab and navigate to WhatsApp Web
                this.page = await this.browser.newPage();
                
                // Set user agent to avoid detection
                await this.page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                );

                // Navigate to WhatsApp Web
                console.log('📱 Navigating to WhatsApp Web...');
                await this.page.goto('https://web.whatsapp.com', { 
                    waitUntil: 'networkidle2',
                    timeout: 60000 
                });
            }

            // Wait longer for the page to fully load and stabilize
            console.log('⏳ Waiting for WhatsApp Web to stabilize...');
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            // Check if already logged in by looking for chat interface (with retry)
            console.log('🔍 Checking login status...');
            let isLoggedIn = false;
            let loginCheckAttempts = 0;
            const maxLoginAttempts = 3;
            
            while (loginCheckAttempts < maxLoginAttempts) {
                try {
                    isLoggedIn = await this.checkIfLoggedIn();
                    if (isLoggedIn) {
                        console.log('✅ WhatsApp Web login confirmed!');
                        break;
                    } else if (loginCheckAttempts < maxLoginAttempts - 1) {
                        console.log(`⏳ Login check failed, waiting 3 seconds... (attempt ${loginCheckAttempts + 1}/${maxLoginAttempts})`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                } catch (error) {
                    console.log(`⚠️ Login check error: ${error.message}`);
                }
                loginCheckAttempts++;
            }
            
            if (isLoggedIn) {
                console.log('✅ Already logged in - session restored successfully!');
            } else {
                console.log('⚠️  QR code displayed - need to scan to login');
            }

            return { success: true, message: 'Browser initialized successfully', loggedIn: isLoggedIn };
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if WhatsApp Web is already logged in
    async checkIfLoggedIn() {
        try {
            // Handle frame detached by creating new page
            if (!this.page || this.page.isClosed()) {
                console.log('🔄 Page closed, need to reinitialize...');
                return false;
            }

            // Try to check page URL first (safer than DOM queries)
            const url = await this.page.url();
            if (!url.includes('web.whatsapp.com')) {
                console.log('🔄 Not on WhatsApp Web, navigation needed');
                return false;
            }

            // Use page evaluation to avoid frame detachment issues
            const isLoggedIn = await this.page.evaluate(() => {
                try {
                    // Check for multiple indicators of logged-in state
                    const indicators = [
                        '[data-testid="chat-list"]',
                        '[data-testid="chat-list-search"]', 
                        '#side',
                        '[data-testid="conversation-compose-box-input"]',
                        '._3WByx', // WhatsApp Web main container class
                        '[data-testid="compose-box"]'
                    ];
                    
                    return indicators.some(selector => {
                        const element = document.querySelector(selector);
                        return element && element.offsetParent !== null;
                    });
                } catch (evalError) {
                    return false;
                }
            });

            // Reset counter on successful check
            if (isLoggedIn) {
                this.detachedFrameCount = 0;
            }
            
            return isLoggedIn;
        } catch (error) {
            // Handle specific detached frame error
            if (error.message.includes('detached') || error.message.includes('Target closed')) {
                console.log('🔄 Frame detached, returning false to trigger reconnection');
                this.detachedFrameCount++;
                
                // If too many detached frames, restart browser
                if (this.detachedFrameCount >= this.maxDetachedFrameAttempts) {
                    console.log('⚠️ Too many detached frames, restarting browser...');
                    await this.restartBrowser();
                    this.detachedFrameCount = 0;
                }
                
                return false;
            }
            
            console.log('🔍 Session check error:', error.message);
            return false;
        }
    }

    // Restart browser when frames become too unstable
    async restartBrowser() {
        try {
            console.log('🔄 Restarting browser due to frame instability...');
            
            // Close existing browser
            if (this.browser) {
                try {
                    await this.browser.close();
                } catch (closeError) {
                    console.log('⚠️ Error closing browser:', closeError.message);
                }
                this.browser = null;
                this.page = null;
            }

            // Wait before restarting
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Reinitialize browser
            return await this.initializeBrowser();
        } catch (error) {
            console.error('❌ Error restarting browser:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Wait for WhatsApp Web to be ready (QR scan completed)
    async waitForWhatsAppReady(timeoutMs = 180000) {
        try {
            console.log('⏳ Waiting for WhatsApp Web to be ready...');
            
            // First check if already logged in
            if (await this.checkIfLoggedIn()) {
                console.log('✅ Already logged in - no QR scan needed!');
                return { success: true };
            }
            
            console.log('📱 Waiting for QR scan or login...');
            
            // Wait for main chat interface to load
            await this.page.waitForSelector('[data-testid="chat-list"]', { 
                timeout: timeoutMs 
            });
            
            console.log('✅ WhatsApp Web is ready for automation!');
            return { success: true };
        } catch (error) {
            console.error('❌ WhatsApp Web not ready:', error);
            return { success: false, error: 'WhatsApp Web login timeout or failed' };
        }
    }

    // Send a single WhatsApp message
    async sendMessage(phoneNumber, message, retries = 3) {
        try {
            // Clean and format phone number
            let cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
            if (!cleanPhone.startsWith('+')) {
                if (cleanPhone.startsWith('965')) {
                    cleanPhone = '+' + cleanPhone;
                } else {
                    cleanPhone = '+965' + cleanPhone;
                }
            }

            console.log(`📱 Sending message to ${cleanPhone}...`);

            // Navigate to chat with pre-filled message
            const chatUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
            await this.page.goto(chatUrl, { waitUntil: 'networkidle2' });

            // Wait for chat interface to load - multiple selectors as fallbacks
            let chatLoaded = false;
            const chatSelectors = [
                '[data-testid="conversation-compose-box-input"]',
                'div[contenteditable="true"][data-tab="10"]',
                'div[contenteditable="true"][spellcheck="true"]',
                'footer div[contenteditable="true"]',
                'div[role="textbox"]'
            ];
            
            for (let selector of chatSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 6000 });
                    console.log(`✅ Chat loaded with selector: ${selector}`);
                    chatLoaded = true;
                    break;
                } catch (error) {
                    console.log(`⏳ Trying next selector...`);
                    continue;
                }
            }
            
            if (!chatLoaded) {
                throw new Error('Could not find message input box with any selector');
            }

            // Optimized wait time for message to populate
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Find and click send button - multiple selectors as fallbacks
            let sendButton = null;
            const sendSelectors = [
                '[data-testid="send"]',
                'button[aria-label="Send"]',
                'button[aria-label="إرسال"]', // Arabic send button
                'span[data-icon="send"]',
                'button span[data-icon="send"]',
                'button[data-testid="compose-btn-send"]',
                'div[role="button"][data-testid="send"]',
                'div[role="button"] span[data-icon="send"]',
                'button._2Ujuu',
                'button._1U1xa',
                'div._3hV1n button',
                'div[title="Send"] button',
                'div[title="إرسال"] button',
                'button[data-tab="11"]',
                'div[data-testid="conversation-compose-box-send"]'
            ];
            
            for (let selector of sendSelectors) {
                try {
                    sendButton = await this.page.waitForSelector(selector, { timeout: 5000 });
                    if (sendButton) {
                        console.log(`✅ Send button found with selector: ${selector}`);
                        break;
                    }
                } catch (error) {
                    console.log(`⏳ Trying next send button selector...`);
                    continue;
                }
            }
            
            if (sendButton) {
                await sendButton.click();
                console.log(`✅ Message sent to ${cleanPhone}`);
                
                // Optimized wait between messages
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                return { success: true };
            } else {
                // Alternative: Try clicking via JavaScript evaluation
                console.log('🔍 Trying JavaScript click as fallback...');
                const jsClickSuccess = await this.page.evaluate(() => {
                    const selectors = [
                        '[data-testid="send"]',
                        'button[aria-label="Send"]',
                        'button[aria-label="إرسال"]',
                        'span[data-icon="send"]',
                        'button span[data-icon="send"]'
                    ];
                    
                    for (const selector of selectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            element.click();
                            return true;
                        }
                    }
                    return false;
                });
                
                if (jsClickSuccess) {
                    console.log(`✅ Message sent via JavaScript click to ${cleanPhone}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return { success: true };
                } else {
                    throw new Error('Send button not found');
                }
            }

        } catch (error) {
            console.error(`❌ Failed to send message to ${phoneNumber}:`, error);
            
            // Handle frame detached error by refreshing page
            if (error.message.includes('detached') || error.message.includes('Target closed')) {
                console.log('🔄 Frame detached, refreshing WhatsApp Web...');
                try {
                    await this.page.reload();
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (reloadError) {
                    console.log('⚠️ Could not reload page:', reloadError.message);
                }
            }
            
            if (retries > 0) {
                console.log(`🔄 Retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return this.sendMessage(phoneNumber, message, retries - 1);
            }
            
            return { success: false, error: error.message };
        }
    }

    // Process entire WhatsApp queue
    async processQueue() {
        try {
            if (this.isRunning) {
                return { success: false, error: 'Automation already running' };
            }

            this.isRunning = true;
            console.log('🚀 Starting WhatsApp queue processing...');

            // Get pending notifications
            const query = `
                SELECT id, user_id, phone_number, message, notification_type
                FROM whatsapp_queue 
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT 50
            `;
            
            const notifications = await DatabaseService.executeQuery(query);
            
            if (notifications.length === 0) {
                this.isRunning = false;
                return { success: true, message: 'No pending messages to send' };
            }

            console.log(`📋 Processing ${notifications.length} pending messages...`);

            let successful = 0;
            let failed = 0;

            for (const notification of notifications) {
                if (!this.isRunning) {
                    console.log('⏹️ Automation stopped by user');
                    break;
                }

                console.log(`📊 Progress: ${successful + failed + 1}/${notifications.length} - Processing...`);
                const result = await this.sendMessage(notification.phone_number, notification.message);
                
                if (result.success) {
                    // Mark as sent
                    await DatabaseService.update('whatsapp_queue', 
                        { status: 'sent', sent_at: new Date() }, 
                        { id: notification.id }
                    );
                    successful++;
                } else {
                    // Mark as failed
                    await DatabaseService.update('whatsapp_queue', 
                        { status: 'failed', failed_reason: result.error }, 
                        { id: notification.id }
                    );
                    failed++;
                }

                // Store session progress
                this.currentSession = {
                    total: notifications.length,
                    processed: successful + failed,
                    successful,
                    failed,
                    current: notification
                };
            }

            this.isRunning = false;
            console.log(`🏁 Automation completed: ${successful} sent, ${failed} failed`);
            
            return {
                success: true,
                results: {
                    total: notifications.length,
                    successful,
                    failed
                }
            };

        } catch (error) {
            this.isRunning = false;
            console.error('❌ Queue processing failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current automation status
    getStatus() {
        return {
            isRunning: this.isRunning,
            session: this.currentSession,
            browserReady: this.browser && this.page
        };
    }

    // Stop automation
    async stopAutomation() {
        this.isRunning = false;
        console.log('⏹️ WhatsApp automation stopped');
        return { success: true, message: 'Automation stopped' };
    }

    // Close browser
    async closeBrowser() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }
            console.log('🔒 Browser closed');
            return { success: true };
        } catch (error) {
            console.error('❌ Error closing browser:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if WhatsApp Web is authenticated
    async checkAuthentication() {
        try {
            if (!this.page) {
                return { authenticated: false, error: 'Browser not initialized' };
            }

            console.log('🔍 Checking WhatsApp Web authentication status...');

            // Multiple checks with different selectors for reliability
            let authChecks = 0;
            const maxChecks = 3;
            
            while (authChecks < maxChecks) {
                try {
                    // Check for QR code (not authenticated)
                    const qrCode = await this.page.$('[data-testid="qr-code"]');
                    if (qrCode) {
                        console.log('❌ QR code found - not authenticated');
                        return { authenticated: false, needsQR: true };
                    }

                    // Check for main chat interface (authenticated) - multiple selectors
                    const chatList = await this.page.$('[data-testid="chat-list"]');
                    const searchInput = await this.page.$('[data-testid="chat-list-search"]');
                    const sidebar = await this.page.$('#side');
                    
                    if (chatList || searchInput || sidebar) {
                        console.log('✅ WhatsApp Web authenticated - chat interface found');
                        return { authenticated: true };
                    }
                    
                    // Wait and try again
                    if (authChecks < maxChecks - 1) {
                        console.log(`⏳ Authentication check ${authChecks + 1}/${maxChecks} - waiting 2 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    authChecks++;
                } catch (checkError) {
                    console.log(`⚠️ Auth check error: ${checkError.message}`);
                    authChecks++;
                    if (authChecks < maxChecks) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            console.log('❓ Authentication status unclear - page still loading');
            return { authenticated: false, status: 'loading' };
        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            return { authenticated: false, error: error.message };
        }
    }
}

module.exports = WhatsAppAutomationService;