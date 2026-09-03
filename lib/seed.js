import db from "./db.js";
import bcrypt from "bcryptjs";

let done = globalThis.__netMonitorSeeded || false;

function securityChecks() {
  const s = process.env.AUTH_SECRET || "";
  if (!s || s === "dev-secret-change-me" || s.length < 32) {
    console.warn(
      "[security] AUTH_SECRET is missing/weak — set a long random value in .env.local before production"
    );
  }
  if (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE == null) {
    console.warn(
      "[security] COOKIE_SECURE is unset — set COOKIE_SECURE=1 when serving over HTTPS (recommended), or 0 for plain-HTTP LAN"
    );
  }
  try {
    const admin = db.prepare("SELECT password FROM users WHERE username = 'admin'").get();
    if (admin && bcrypt.compareSync("admin", admin.password)) {
      console.warn("[security] default admin password is still 'admin' — change it now");
    }
  } catch {}
}

export function ensureSeed() {
  if (done) return;
  done = true;
  globalThis.__netMonitorSeeded = true;
  securityChecks();

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
