const path = require('path');
const fs = require('fs');

class BrandConfig {
  constructor() {
    this.config = null;
    this.brandName = null;
    this.loadBrandConfig();
  }

  loadBrandConfig() {
    // Detect brand from environment variable
    this.brandName = process.env.BRAND_NAME || 'siteA';
    
    console.log(`🏢 Loading brand configuration for: ${this.brandName}`);
    
    // Load environment file based on brand
    const envFile = path.join(__dirname, '..', `.env.${this.brandName}`);
    
    if (fs.existsSync(envFile)) {
      require('dotenv').config({ path: envFile });
      console.log(`✅ Loaded environment from: .env.${this.brandName}`);
    } else {
      console.warn(`⚠️  Environment file not found: .env.${this.brandName}, falling back to default .env`);
      require('dotenv').config();
    }

    // Build brand configuration
    this.config = this.buildBrandConfig();
  }

  buildBrandConfig() {
    return {
      // Brand Identity
      brand: {
        name: this.brandName,
        displayName: process.env.SITE_NAME || 'صندوق الكوثر',
        logoUrl: process.env.SITE_LOGO_URL || '/assets/logo-default.png',
        domain: process.env.SITE_DOMAIN || 'localhost',
        colors: {
          primary: process.env.PRIMARY_COLOR || '#667eea',
          secondary: process.env.SECONDARY_COLOR || '#764ba2',
          success: process.env.SUCCESS_COLOR || '#10b981',
          danger: process.env.DANGER_COLOR || '#ef4444',
          warning: process.env.WARNING_COLOR || '#f59e0b'
        }
      },

      // Database Configuration
      database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'loan_system',
        port: parseInt(process.env.DB_PORT) || 3306,
        charset: 'utf8mb4',
        timezone: '+00:00'
      },

      // Server Configuration
      server: {
        port: parseInt(process.env.PORT) || 3002,
        env: process.env.NODE_ENV || 'development'
      },

      // Email Configuration
      email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // Use TLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        from: {
          name: process.env.EMAIL_FROM_NAME || this.config?.brand?.displayName || 'صندوق الكوثر',
          address: process.env.EMAIL_FROM_ADDRESS
        }
      },

      // Feature Flags
      features: {
        familyDelegation: process.env.ENABLE_FAMILY_DELEGATION === 'true',
        advancedReports: process.env.ENABLE_ADVANCED_REPORTS === 'true',
        multiAdmin: process.env.ENABLE_MULTI_ADMIN === 'true'
      },

      // Security
      jwt: {
        secret: process.env.JWT_SECRET || 'default_jwt_secret_change_this'
      },

      // Email Templates Path
      templates: {
        emailPath: path.join(__dirname, '..', 'templates', 'email'),
        brandPath: path.join(__dirname, '..', 'templates', 'email', 'brands', this.brandName),
        sharedPath: path.join(__dirname, '..', 'templates', 'email', 'shared')
      }
    };
  }

  // Get brand configuration
  get() {
    if (!this.config) {
      this.loadBrandConfig();
    }
    return this.config;
  }

  // Get specific configuration section
  getSection(section) {
    return this.get()[section];
  }

  // Check if feature is enabled
  isFeatureEnabled(featureName) {
    return this.get().features[featureName] || false;
  }

  // Get brand name
  getBrandName() {
    return this.brandName;
  }

  // Get brand display name
  getBrandDisplayName() {
    return this.get().brand.displayName;
  }

  // Get brand colors for CSS
  getBrandColors() {
    return this.get().brand.colors;
  }

  // Get database configuration
  getDatabaseConfig() {
    return this.get().database;
  }

  // Get email configuration
  getEmailConfig() {
    return this.get().email;
  }

  // Reload configuration (useful for development)
  reload() {
    this.config = null;
    this.loadBrandConfig();
    console.log(`🔄 Brand configuration reloaded for: ${this.brandName}`);
  }
}

// Export singleton instance
module.exports = new BrandConfig();