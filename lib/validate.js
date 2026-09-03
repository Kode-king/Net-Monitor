// Small input validators shared by the API routes.

export function isStrongPassword(pw) {
  const s = String(pw || "");
  return s.length >= 12 && /[A-Za-z]/.test(s) && /[0-9]/.test(s);
}

export function isValidUsername(u) {
  return /^[A-Za-z0-9._-]{3,32}$/.test(String(u || ""));
}

// hostname or IPv4/IPv6 literal, no scheme, no path
export function isValidHost(h) {
  const s = String(h || "").trim();
  if (!s || s.length > 255) return false;
  if (/^[0-9.]+$/.test(s)) return /^(\d{1,3}\.){3}\d{1,3}$/.test(s);
  if (s.includes(":")) return /^[0-9a-fA-F:]+$/.test(s); // rough IPv6
  return /^(?=.{1,253}$)([A-Za-z0-9](-?[A-Za-z0-9])*)(\.[A-Za-z0-9](-?[A-Za-z0-9])*)*$/.test(s);
}

export function clampText(v, max = 500) {
  if (v == null) return null;
  return String(v).slice(0, max);
}
