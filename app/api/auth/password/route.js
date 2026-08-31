import { withUser, ok, bad } from "@/lib/api";
import db from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(req) {
  return withUser(async (session) => {
    const { current, next } = await req.json().catch(() => ({}));
    if (!next || String(next).length < 4)
      return bad("كلمة المرور الجديدة قصيرة جدًا (4 أحرف على الأقل)");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.uid);
    if (!user || !(await verifyPassword(current || "", user.password)))
      return bad("كلمة المرور الحالية غير صحيحة", 401);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
      await hashPassword(next),
      user.id
    );
    return ok({ ok: true });
  });
}
