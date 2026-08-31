import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { ensurePoller } from "./ensure-poller";
import { ensureSeed } from "./seed";

export async function withUser(handler) {
  ensureSeed();
  ensurePoller();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return await handler(session);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[api]", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function withAdmin(handler) {
  return withUser((session) => {
    if (session.role !== "admin")
      return NextResponse.json({ error: "Forbidden — يتطلب صلاحية admin" }, { status: 403 });
    return handler(session);
  });
}

export const ok = (data) => NextResponse.json(data);
export const bad = (msg, status = 400) => NextResponse.json({ error: msg }, { status });
