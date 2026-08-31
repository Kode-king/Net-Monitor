import fs from "node:fs";
import path from "node:path";

for (const file of [".env", ".env.local"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!m) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = (m[2] || "").trim().replace(/^["']|["']$/g, "");
  }
}

const { ensureSeed } = await import("../lib/seed.js");
ensureSeed();
console.log("[seed] done");
