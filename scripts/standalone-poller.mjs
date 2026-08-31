// Standalone SNMP poller — run this in production instead of RUN_POLLER_IN_APP.
//   node scripts/standalone-poller.mjs
import fs from "node:fs";
import path from "node:path";

// minimal .env / .env.local loader (no dependency)
for (const file of [".env", ".env.local"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = (m[2] || "").trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

const { ensureSeed } = await import("../lib/seed.js");
const { startPoller } = await import("../lib/poller.js");

ensureSeed();
startPoller();
console.log("[standalone] poller running. Ctrl+C to stop.");
