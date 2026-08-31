import { NextResponse } from "next/server";
import { getUserByUsername, verifyPassword, createSession } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export async function POST(req) {
  ensureSeed();
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password)
    return NextResponse.json({ error: "أدخل اسم المستخدم وكلمة المرور" }, { status: 400 });

  const user = getUserByUsername(String(username).trim());
  if (!user || !(await verifyPassword(password, user.password)))
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });

  await createSession(user);
  return NextResponse.json({ ok: true, role: user.role, username: user.username });
}
