import { withAdmin, ok, bad } from "@/lib/api";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function PUT(req, { params }) {
  return withAdmin(async () => {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(id));
    if (!user) return bad("غير موجود", 404);
    if (b.role) {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(
        b.role === "admin" ? "admin" : "viewer",
        Number(id)
      );
    }
    if (b.password) {
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
        await hashPassword(b.password),
        Number(id)
      );
    }
    return ok({ ok: true });
  });
}

export async function DELETE(_req, { params }) {
  return withAdmin(async (session) => {
    const { id } = await params;
    if (Number(id) === session.uid) return bad("لا يمكنك حذف حسابك الحالي");
    const count = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'admin'").get().c;
    const target = db.prepare("SELECT role FROM users WHERE id = ?").get(Number(id));
    if (target?.role === "admin" && count <= 1) return bad("يجب أن يبقى مدير واحد على الأقل");
    db.prepare("DELETE FROM users WHERE id = ?").run(Number(id));
    return ok({ ok: true });
  });
}
