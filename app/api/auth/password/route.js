import { withUser, ok, badT } from "@/lib/api";
import db from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(req) {
  return withUser(async (session) => {
    const { current, next } = await req.json().catch(() => ({}));
    if (!next || String(next).length < 4)
      return badT(req, "srv.pwShort");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.uid);
    if (!user || !(await verifyPassword(current || "", user.password)))
      return badT(req, "srv.pwCurrentWrong", 401);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
      await hashPassword(next),
      user.id
    );
    return ok({ ok: true });
  });
}
