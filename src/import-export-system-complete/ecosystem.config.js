/**
 * PM2 Ecosystem Configuration
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 logs
 *   pm2 monit
 */

module.exports = {
  apps: [
    // ═══════════════════════════════════════════════════════════════════════
    // Import Worker
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'import-worker',
      script: './dist/workers/import-worker.js',
      instances: 2, // Запустить 2 инстанса
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
      },
      env_development: {
        NODE_ENV: 'development',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
      },
      error_file: './logs/import-worker-error.log',
      out_file: './logs/import-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // Export Worker
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'export-worker',
      script: './dist/workers/export-worker.js',
      instances: 2, // Запустить 2 инстанса
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
      },
      env_development: {
        NODE_ENV: 'development',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
      },
      error_file: './logs/export-worker-error.log',
      out_file: './logs/export-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // Cleanup Job (Optional)
    // Очищает старые задачи каждый день в 3:00 AM
    // ═══════════════════════════════════════════════════════════════════════
    {
      name: 'cleanup-job',
      script: './dist/jobs/cleanup-old-jobs.js',
      cron_restart: '0 3 * * *', // Каждый день в 3:00 AM
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        DAYS_TO_KEEP: '7',
      },
      error_file: './logs/cleanup-error.log',
      out_file: './logs/cleanup-out.log',
    },
  ],
};
