import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import db from "./db.js";

const COOKIE = "nm_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me"
);

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user) {
  const token = await new SignJWT({ uid: user.id, role: user.role, username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Over a plain-HTTP LAN deployment set COOKIE_SECURE=0 so the browser keeps the cookie.
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === "1"
      : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

// Token verification for middleware (Edge runtime — no db access)
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;

export function getUserByUsername(username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}

export async function requireUser() {
  const s = await getSession();
  if (!s) throw new Response("Unauthorized", { status: 401 });
  return s;
}

export async function requireAdmin() {
  const s = await requireUser();
  if (s.role !== "admin") throw new Response("Forbidden", { status: 403 });
  return s;
}
