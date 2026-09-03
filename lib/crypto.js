// AES-256-GCM encryption for secrets at rest (SNMP community / v3 keys).
// Key = SECRET_KEY env (preferred) or derived from AUTH_SECRET. Values are stored
// as "enc:v1:<base64>"; anything without that prefix is treated as legacy plaintext,
// so existing rows keep working and get re-encrypted on next save.
import crypto from "node:crypto";

const PREFIX = "enc:v1:";

function key() {
  const raw = process.env.SECRET_KEY || process.env.AUTH_SECRET || "";
  if (!raw) return null;
  return crypto.createHash("sha256").update(String(raw)).digest(); // 32 bytes
}

export function encryptSecret(plain) {
  if (plain == null || plain === "") return plain ?? null;
  if (String(plain).startsWith(PREFIX)) return plain; // already encrypted
  const k = key();
  if (!k) return plain; // no key configured — store as-is
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(value) {
  if (value == null || !String(value).startsWith(PREFIX)) return value; // legacy plaintext
  const k = key();
  if (!k) return value;
  try {
    const buf = Buffer.from(String(value).slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return value;
  }
}

export function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}
