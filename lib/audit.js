import db from "./db.js";

const RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS) || 180;

export function clientIp(req) {
  try {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    return req.headers.get("x-real-ip") || "";
  } catch {
    return "";
  }
}

export function audit(action, { actor = null, ip = "", detail = "" } = {}) {
  try {
    db.prepare(
      "INSERT INTO audit_log (ts, actor, ip, action, detail) VALUES (?, ?, ?, ?, ?)"
    ).run(Date.now(), actor, ip, action, typeof detail === "string" ? detail : JSON.stringify(detail));
  } catch (e) {
    console.error("[audit] write failed:", e?.message || e);
  }
}

// Convenience for API routes: pull actor + ip from the request/session.
export function auditReq(req, session, action, detail = "") {
  audit(action, { actor: session?.username || null, ip: clientIp(req), detail });
}

export function listAudit(limit = 200) {
  return db
    .prepare("SELECT id, ts, actor, ip, action, detail FROM audit_log ORDER BY ts DESC LIMIT ?")
    .all(Math.min(1000, Math.max(1, limit)));
}

export function pruneAudit() {
  const cutoff = Date.now() - RETENTION_DAYS * 86400_000;
  try {
    db.prepare("DELETE FROM audit_log WHERE ts < ?").run(cutoff);
  } catch {}
}
