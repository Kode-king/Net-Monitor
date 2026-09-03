import { withAdmin, ok, badT } from "@/lib/api";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { isStrongPassword } from "@/lib/validate";
import { auditReq } from "@/lib/audit";

export async function PUT(req, { params }) {
  return withAdmin(async (session) => {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(id));
    if (!user) return badT(req, "srv.notFound", 404);
    if (b.role) {
      const role = b.role === "admin" ? "admin" : "viewer";
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, Number(id));
      auditReq(req, session, "user.role", `${user.username} -> ${role}`);
    }
    if (b.password) {
      if (!isStrongPassword(b.password)) return badT(req, "srv.pwShort");
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
        await hashPassword(b.password),
        Number(id)
      );
      auditReq(req, session, "user.password.reset", user.username);
    }
    return ok({ ok: true });
  });
}

export async function DELETE(req, { params }) {
  return withAdmin(async (session) => {
    const { id } = await params;
    if (Number(id) === session.uid) return badT(req, "srv.cantDeleteSelf");
    const count = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'admin'").get().c;
    const target = db.prepare("SELECT role, username FROM users WHERE id = ?").get(Number(id));
    if (target?.role === "admin" && count <= 1) return badT(req, "srv.keepOneAdmin");
    db.prepare("DELETE FROM users WHERE id = ?").run(Number(id));
    auditReq(req, session, "user.delete", target?.username || String(id));
    return ok({ ok: true });
  });
}
