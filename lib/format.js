export function bytes(n) {
  if (n == null || !isFinite(n)) return "—";
  const u = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export function bps(n) {
  if (n == null || !isFinite(n)) return "—";
  const u = ["bps", "Kbps", "Mbps", "Gbps"];
  let i = 0;
  let v = n;
  while (v >= 1000 && i < u.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export function pct(n) {
  if (n == null || !isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function duration(seconds) {
  if (seconds == null) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} يوم ${h} س`;
  if (h > 0) return `${h} س ${m} د`;
  return `${m} د`;
}

export function relTime(tsSeconds) {
  if (!tsSeconds) return "—";
  const diff = Date.now() / 1000 - tsSeconds;
  if (diff < 60) return `منذ ${Math.round(diff)} ث`;
  if (diff < 3600) return `منذ ${Math.round(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.round(diff / 3600)} س`;
  return `منذ ${Math.round(diff / 86400)} يوم`;
}

export function clockTime(tsSeconds) {
  if (!tsSeconds) return "—";
  return new Date(tsSeconds * 1000).toLocaleString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export const typeLabel = {
  server: "سيرفر",
  switch: "سويتش",
  router: "راوتر",
};

export const statusMeta = {
  up: { label: "يعمل", cls: "bg-emerald-500/15 text-emerald-400" },
  down: { label: "متوقف", cls: "bg-rose-500/15 text-rose-400" },
  stale: { label: "بيانات قديمة", cls: "bg-amber-500/15 text-amber-400" },
  unknown: { label: "غير معروف", cls: "bg-slate-500/15 text-slate-400" },
};
