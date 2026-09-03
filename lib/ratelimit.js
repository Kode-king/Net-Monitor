// In-memory fixed-window + lockout limiter. Fine for a single-process deployment
// (PM2 fork mode). Not shared across instances — don't run the web app clustered
// without swapping this for a shared store.

const buckets = globalThis.__nmRateBuckets || new Map();
globalThis.__nmRateBuckets = buckets;

// Returns { ok, retryAfter } — retryAfter in seconds when blocked.
export function rateLimit(key, { max = 5, windowMs = 60_000, lockoutMs = 15 * 60_000 } = {}) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { count: 0, resetAt: now + windowMs, lockedUntil: 0 };
    buckets.set(key, b);
  }
  if (b.lockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  if (now > b.resetAt) {
    b.count = 0;
    b.resetAt = now + windowMs;
  }
  b.count++;
  if (b.count > max) {
    b.lockedUntil = now + lockoutMs;
    return { ok: false, retryAfter: Math.ceil(lockoutMs / 1000) };
  }
  return { ok: true };
}

// Call after a successful auth to clear the counter for that key.
export function rateLimitReset(key) {
  buckets.delete(key);
}

// Occasionally drop stale buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.lockedUntil < now && b.resetAt < now) buckets.delete(k);
  }
}, 5 * 60_000).unref?.();
