import { withUser, withAdmin, ok, badT } from "@/lib/api";
import db from "@/lib/db";

export async function GET() {
  return withUser(() => {
    const rules = db
      .prepare(
        `SELECT r.*, d.name AS device_name FROM alert_rules r
         LEFT JOIN devices d ON d.id = r.device_id ORDER BY r.id`
      )
      .all();
    return ok({ rules });
  });
}

const METRICS = ["cpu", "mem", "storage", "down"];
const OPS = [">", ">=", "<", "<=", "=="];
const sev = (s) => (s === "critical" ? "critical" : "warning");

export async function POST(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    if (!METRICS.includes(b.metric)) return badT(req, "srv.metricInvalid");
    const info = db
      .prepare(
        `INSERT INTO alert_rules (device_id, metric, operator, threshold, duration_s, enabled, severity, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        b.device_id ? Number(b.device_id) : null,
        b.metric,
        OPS.includes(b.operator) ? b.operator : ">",
        Number(b.threshold) || 0,
        Math.max(0, Number(b.duration_s) || 0),
        b.enabled === false ? 0 : 1,
        sev(b.severity),
        Date.now()
      );
    return ok({ id: info.lastInsertRowid });
  });
}
