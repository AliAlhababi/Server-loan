module.exports = {
  apps: [
    {
      name: 'loan-system-daraa',
      script: 'backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        BRAND_NAME: 'siteA',
        PORT: 3002,
        DISPLAY: ':99'
      },
      env_production: {
        NODE_ENV: 'production',
        BRAND_NAME: 'siteA',
        PORT: 3002,
        DISPLAY: ':99'
      },
      // Logging
      log_file: './logs/daraa-combined.log',
      out_file: './logs/daraa-out.log',
      error_file: './logs/daraa-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 5,
      
      // Deployment info
      instance_var: 'INSTANCE_ID'
    },
    {
      name: 'loan-system-almijadi',
      script: 'backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        BRAND_NAME: 'siteB',
        PORT: 3003,
        DISPLAY: ':98'
      },
      env_production: {
        NODE_ENV: 'production',
        BRAND_NAME: 'siteB',
        PORT: 3003,
        DISPLAY: ':98'
      },
      // Logging
      log_file: './logs/aman-combined.log',
      out_file: './logs/aman-out.log',
      error_file: './logs/aman-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 5,
      
      // Deployment info
      instance_var: 'INSTANCE_ID'
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    daraa: {
      user: 'root',
      host: 'your-server-ip',
      ref: 'origin/brand-a',
      repo: 'https://github.com/AliAlhababi/Server-loan.git',
      path: '/var/www/loan-system-daraa',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --only loan-system-daraa',
      'pre-setup': ''
    },
    aman: {
      user: 'root',
      host: 'your-server-ip',
      ref: 'origin/brand-b',
      repo: 'https://github.com/AliAlhababi/Server-loan.git',
      path: '/var/www/loan-system-aman',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --only loan-system-aman',
      'pre-setup': ''
    }
  }
};