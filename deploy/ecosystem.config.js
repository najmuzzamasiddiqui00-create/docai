module.exports = {
  apps: [{
    name: 'docai',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    cwd: '/var/www/docai',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/docai/error.log',
    out_file: '/var/log/docai/out.log',
    log_file: '/var/log/docai/combined.log',
    time: true,
    // Graceful restart
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
  }]
};
