import db from "./db.js";
import bcrypt from "bcryptjs";

let done = globalThis.__netMonitorSeeded || false;

export function ensureSeed() {
  if (done) return;
  done = true;
  globalThis.__netMonitorSeeded = true;

  const now = Date.now();

  const userCount = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync("admin", 10);
    db.prepare(
      "INSERT INTO users (username, password, role, created_at) VALUES (?, ?, 'admin', ?)"
    ).run("admin", hash, now);
    console.log("[seed] created default admin user  ->  admin / admin  (غيّر كلمة المرور فورًا)");
  }

  const ruleCount = db.prepare("SELECT COUNT(*) c FROM alert_rules").get().c;
  if (ruleCount === 0) {
    const ins = db.prepare(
      "INSERT INTO alert_rules (device_id, metric, operator, threshold, duration_s, enabled, severity, created_at) VALUES (NULL, ?, ?, ?, ?, 1, ?, ?)"
    );
    ins.run("down", ">", 0, 60, "critical", now);
    ins.run("cpu", ">", 95, 300, "critical", now);
    ins.run("mem", ">", 95, 300, "critical", now);
    ins.run("storage", ">", 95, 0, "critical", now);
    ins.run("cpu", ">", 90, 120, "warning", now);
    ins.run("mem", ">", 90, 120, "warning", now);
    ins.run("storage", ">", 90, 0, "warning", now);
    console.log("[seed] created default alert rules");
  }
}
