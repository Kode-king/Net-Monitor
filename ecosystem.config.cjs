// PM2 — تشغيل الواجهة والـ poller كخدمتين تعملان باستمرار.
//   npm run build
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup   (لتشغيلها تلقائيًا مع إقلاع الجهاز)
module.exports = {
  apps: [
    {
      name: "net-monitor-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4000 -H 0.0.0.0",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
    },
    {
      name: "net-monitor-poller",
      script: "scripts/standalone-poller.mjs",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
    },
  ],
};
