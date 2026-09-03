import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export async function POST(req) {
  const s = await getSession();
  await destroySession();
  audit("logout", { actor: s?.username || null, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}
