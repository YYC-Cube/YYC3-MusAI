// ================================================================================
// YYC³ MusAI —— PM2 备选方案（不引入容器时使用）
// 用法：
//   pnpm --filter @yyc3/music-server build
//   pm2 start deploy/pm2/ecosystem.config.cjs --env production
//   pm2 save
// ================================================================================
module.exports = {
  apps: [
    {
      name: 'musai-server',
      cwd: __dirname + '/../../packages/music-server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        HOST: '0.0.0.0',
      },
      out_file: '/var/log/musai/server.out.log',
      error_file: '/var/log/musai/server.err.log',
    },
  ],
};
