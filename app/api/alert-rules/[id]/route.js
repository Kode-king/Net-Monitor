import { withAdmin, ok } from "@/lib/api";
import db from "@/lib/db";

export async function PUT(req, { params }) {
  return withAdmin(async () => {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const cur = db.prepare("SELECT * FROM alert_rules WHERE id = ?").get(Number(id));
    if (!cur) return ok({ ok: false });
    db.prepare(
      `UPDATE alert_rules SET operator=?, threshold=?, duration_s=?, enabled=? WHERE id=?`
    ).run(
      b.operator ?? cur.operator,
      b.threshold != null ? Number(b.threshold) : cur.threshold,
      b.duration_s != null ? Number(b.duration_s) : cur.duration_s,
      b.enabled != null ? (b.enabled ? 1 : 0) : cur.enabled,
      Number(id)
    );
    return ok({ ok: true });
  });
}

export async function DELETE(_req, { params }) {
  return withAdmin(async () => {
    const { id } = await params;
    db.prepare("DELETE FROM alert_rules WHERE id = ?").run(Number(id));
    return ok({ ok: true });
  });
}
