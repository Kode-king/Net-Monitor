import { withAdmin, ok, badT } from "@/lib/api";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { isValidUsername, isStrongPassword } from "@/lib/validate";
import { auditReq } from "@/lib/audit";

export async function GET() {
  return withAdmin(() => {
    const users = db
      .prepare("SELECT id, username, role, created_at FROM users ORDER BY id")
      .all();
    return ok({ users });
  });
}

export async function POST(req) {
  return withAdmin(async (session) => {
    const b = await req.json().catch(() => ({}));
    if (!b.username || !b.password) return badT(req, "srv.userPassRequired");
    if (!isValidUsername(b.username)) return badT(req, "srv.usernameInvalid");
    if (!isStrongPassword(b.password)) return badT(req, "srv.pwShort");
    const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(b.username);
    if (exists) return badT(req, "srv.userExists");
    const role = b.role === "admin" ? "admin" : "viewer";
    const info = db
      .prepare("INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)")
      .run(String(b.username).trim(), await hashPassword(b.password), role, Date.now());
    auditReq(req, session, "user.create", `${b.username} (${role})`);
    return ok({ id: info.lastInsertRowid });
  });
}
