module.exports = {
  apps: [{
    name: 'jaya-erp-push',
    cwd: __dirname,
    script: 'scripts/push-worker.mjs',
    instances: 1,
    autorestart: true,
    restart_delay: 5000,
    env: { NODE_ENV: 'production' },
  }],
};
