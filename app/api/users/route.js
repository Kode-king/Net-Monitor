import { withAdmin, ok, bad } from "@/lib/api";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  return withAdmin(() => {
    const users = db
      .prepare("SELECT id, username, role, created_at FROM users ORDER BY id")
      .all();
    return ok({ users });
  });
}

export async function POST(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    if (!b.username || !b.password) return bad("اسم المستخدم وكلمة المرور مطلوبان");
    const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(b.username);
    if (exists) return bad("اسم المستخدم مستخدم بالفعل");
    const info = db
      .prepare("INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)")
      .run(
        String(b.username).trim(),
        await hashPassword(b.password),
        b.role === "admin" ? "admin" : "viewer",
        Date.now()
      );
    return ok({ id: info.lastInsertRowid });
  });
}
