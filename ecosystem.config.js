module.exports = {
  apps: [
    {
      name: "importexportsystem",
      cwd: __dirname,
      script: "scripts/start-production.mjs",
      instances: 1,
      autorestart: true,
      restart_delay: 5000,
      kill_timeout: 12000,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
