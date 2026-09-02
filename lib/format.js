import { DEFAULT_LANG, translate } from "./i18n.js";

// The UI is single-locale at a time; I18nProvider pushes the active lang here so
// these helpers stay callable without threading `lang` through every call site.
let _lang = DEFAULT_LANG;
export function setFormatLang(l) {
  _lang = l || DEFAULT_LANG;
}
const tf = (key, vars) => translate(_lang, key, vars);
const localeTag = () => (_lang === "ar" ? "ar-EG" : "en-GB");

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
  const D = tf("fmt.dayShort");
  const H = tf("fmt.hourShort");
  const M = tf("fmt.minShort");
  if (d > 0) return `${d} ${D} ${h} ${H}`;
  if (h > 0) return `${h} ${H} ${m} ${M}`;
  return `${m} ${M}`;
}

export function relTime(tsSeconds) {
  if (!tsSeconds) return "—";
  const diff = Date.now() / 1000 - tsSeconds;
  let v;
  if (diff < 60) v = `${Math.round(diff)} ${tf("fmt.secShort")}`;
  else if (diff < 3600) v = `${Math.round(diff / 60)} ${tf("fmt.minShort")}`;
  else if (diff < 86400) v = `${Math.round(diff / 3600)} ${tf("fmt.hourShort")}`;
  else v = `${Math.round(diff / 86400)} ${tf("fmt.dayShort")}`;
  return tf("fmt.ago", { v });
}

export function clockTime(tsSeconds) {
  if (!tsSeconds) return "—";
  return new Date(tsSeconds * 1000).toLocaleString(localeTag(), {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export function chartTime(tsSeconds) {
  return new Date(tsSeconds * 1000).toLocaleTimeString(localeTag(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function chartDateTime(tsSeconds) {
  return new Date(tsSeconds * 1000).toLocaleString(localeTag());
}

// label maps that depend on the active language
export function typeLabelOf(type) {
  return tf(`type.${type}`);
}

const STATUS_CLS = {
  up: "bg-emerald-500/15 text-emerald-400",
  down: "bg-rose-500/15 text-rose-400",
  stale: "bg-amber-500/15 text-amber-400",
  unknown: "bg-slate-500/15 text-slate-400",
};

export function statusMetaOf(status) {
  return { label: tf(`status.${status}`), cls: STATUS_CLS[status] || STATUS_CLS.unknown };
}
