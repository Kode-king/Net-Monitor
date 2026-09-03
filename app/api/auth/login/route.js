import { NextResponse } from "next/server";
import { getUserByUsername, verifyPassword, createSession } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";
import { reqLang } from "@/lib/api";
import { translate } from "@/lib/i18n";
import { rateLimit, rateLimitReset } from "@/lib/ratelimit";
import { audit, clientIp } from "@/lib/audit";

export async function POST(req) {
  ensureSeed();
  const lang = reqLang(req);
  const ip = clientIp(req) || "unknown";
  const { username, password } = await req.json().catch(() => ({}));

  if (!username || !password)
    return NextResponse.json({ error: translate(lang, "srv.loginRequired") }, { status: 400 });

  // throttle by IP and by username; 8 tries / minute then a 15-minute lockout
  const uname = String(username).trim().toLowerCase();
  for (const key of [`login:ip:${ip}`, `login:user:${uname}`]) {
    const rl = rateLimit(key, { max: 8, windowMs: 60_000, lockoutMs: 15 * 60_000 });
    if (!rl.ok) {
      audit("login.throttled", { actor: uname, ip });
      return NextResponse.json(
        { error: translate(lang, "srv.tooManyAttempts") },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }
  }

  const user = getUserByUsername(String(username).trim());
  if (!user || !(await verifyPassword(password, user.password))) {
    audit("login.fail", { actor: String(username).trim(), ip });
    return NextResponse.json({ error: translate(lang, "srv.loginBad") }, { status: 401 });
  }

  rateLimitReset(`login:ip:${ip}`);
  rateLimitReset(`login:user:${uname}`);
  await createSession(user);
  audit("login.ok", { actor: user.username, ip });
  return NextResponse.json({ ok: true, role: user.role, username: user.username });
}
