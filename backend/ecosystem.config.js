/**
 * Configuração PM2 para Produção
 * 
 * Uso:
 * 1. npm run build
 * 2. pm2 start ecosystem.config.js
 * 3. pm2 save
 * 4. pm2 startup (para iniciar com o sistema)
 */

module.exports = {
  apps: [
    // API Principal
    {
      name: 'playcoretv-api',
      script: './dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },

    // Sincronização M3U Agendada
    {
      name: 'm3u-sync-scheduler',
      script: './dist/scripts/schedule-sync.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 3 * * *', // Todo dia às 3h da manhã
      autorestart: false, // Não reiniciar automaticamente (cron cuida disso)
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/sync-error.log',
      out_file: './logs/sync-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
