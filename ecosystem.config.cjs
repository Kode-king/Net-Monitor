// PM2 — run the web UI and the SNMP poller as always-on services.
// تشغيل الواجهة والـ poller كخدمتين تعملان باستمرار.
//
//   npm run build
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   # auto-start on boot (Windows): npm i -g pm2-windows-startup && pm2-startup install
//
const path = require("path");
const NEXT_BIN = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

module.exports = {
  apps: [
    {
      name: "net-monitor-web",
      script: NEXT_BIN,
      args: "start -p 4000 -H 0.0.0.0",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      time: true,
    },
    {
      name: "net-monitor-poller",
      script: path.join(__dirname, "scripts", "standalone-poller.mjs"),
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      time: true,
    },
  ],
};
