// Lazily starts the in-app poller on the first authenticated API request
// (only when RUN_POLLER_IN_APP=1). In production run `npm run poller` instead.
let attempted = false;

export async function ensurePoller() {
  if (attempted) return;
  attempted = true;
  if (process.env.RUN_POLLER_IN_APP !== "1") return;
  try {
    const { startPoller } = await import("./poller.js");
    startPoller();
  } catch (e) {
    console.error("[ensure-poller] failed to start:", e?.message || e);
  }
}
