import { NextResponse } from "next/server";
import { getUserByUsername, verifyPassword, createSession } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";
import { reqLang } from "@/lib/api";
import { translate } from "@/lib/i18n";

export async function POST(req) {
  ensureSeed();
  const lang = reqLang(req);
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password)
    return NextResponse.json({ error: translate(lang, "srv.loginRequired") }, { status: 400 });

  const user = getUserByUsername(String(username).trim());
  if (!user || !(await verifyPassword(password, user.password)))
    return NextResponse.json({ error: translate(lang, "srv.loginBad") }, { status: 401 });

  await createSession(user);
  return NextResponse.json({ ok: true, role: user.role, username: user.username });
}
