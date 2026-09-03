// Scheduled status report (default: weekly) emailed to the notification recipients.
import db from "./db.js";
import { sendAlertEmail } from "./mailer.js";
import { translate } from "./i18n.js";

const META_DEFAULTS = {
  report_enabled: "0",
  report_dow: "0", // 0=Sunday .. 6=Saturday (server local time)
  report_hour: "8",
  report_period_days: "7",
  report_lang: "ar",
  report_last_sent: "",
};

function metaGet(key) {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key);
  return row?.value ?? META_DEFAULTS[key] ?? "";
}
function metaSet(key, value) {
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, String(value));
}

export function getReportConfig() {
  return {
    enabled: metaGet("report_enabled") === "1",
    dow: Number(metaGet("report_dow")),
    hour: Number(metaGet("report_hour")),
    periodDays: Number(metaGet("report_period_days")) || 7,
    lang: metaGet("report_lang") === "en" ? "en" : "ar",
    lastSent: Number(metaGet("report_last_sent")) || null,
  };
}

export function setReportConfig(p = {}) {
  if (p.enabled != null) metaSet("report_enabled", p.enabled ? "1" : "0");
  if (p.dow != null) metaSet("report_dow", Math.max(0, Math.min(6, Number(p.dow) || 0)));
  if (p.hour != null) metaSet("report_hour", Math.max(0, Math.min(23, Number(p.hour) || 0)));
  if (p.periodDays != null)
    metaSet("report_period_days", Math.max(1, Math.min(31, Number(p.periodDays) || 7)));
  if (p.lang != null) metaSet("report_lang", p.lang === "en" ? "en" : "ar");
  return getReportConfig();
}

const n1 = (v) => (v == null || !isFinite(v) ? "—" : Number(v).toFixed(1));
const n0 = (v) => (v == null || !isFinite(v) ? "—" : Math.round(v).toString());

function deviceRows(sinceSec) {
  const devices = db.prepare("SELECT * FROM devices ORDER BY name").all();
  return devices.map((d) => {
    const s = db
      .prepare(
        `SELECT COUNT(*) total, COALESCE(SUM(reachable),0) up,
                AVG(CASE WHEN reachable=1 THEN cpu END) avg_cpu,
                MAX(cpu) max_cpu,
                AVG(CASE WHEN reachable=1 AND mem_total>0 THEN 100.0*mem_used/mem_total END) avg_mem,
                MAX(CASE WHEN mem_total>0 THEN 100.0*mem_used/mem_total END) max_mem
         FROM samples WHERE device_id=? AND ts>=?`
      )
      .get(d.id, sinceSec);
    const st = db
      .prepare(
        `SELECT MAX(100.0*used/total) m FROM storage_samples WHERE device_id=? AND ts>=? AND total>0`
      )
      .get(d.id, sinceSec);
    const al = db
      .prepare(
        `SELECT COALESCE(SUM(severity='critical'),0) crit, COUNT(*) total
         FROM alerts WHERE device_id=? AND started_at>=?`
      )
      .get(d.id, sinceSec);
    const last = db
      .prepare("SELECT reachable, ts FROM samples WHERE device_id=? ORDER BY ts DESC LIMIT 1")
      .get(d.id);
    const availability = s.total ? (s.up / s.total) * 100 : null;
    const status = !last
      ? "unknown"
      : Date.now() / 1000 - last.ts > d.poll_interval * 3
      ? "stale"
      : last.reachable
      ? "up"
      : "down";
    return {
      name: d.name,
      host: d.host,
      type: d.type,
      availability,
      avgCpu: s.avg_cpu,
      maxCpu: s.max_cpu,
      avgMem: s.avg_mem,
      maxMem: s.max_mem,
      maxStorage: st?.m ?? null,
      alerts: al.total,
      critical: al.crit,
      status,
    };
  });
}

export function buildReport(periodDays, lang = "ar") {
  const days = Math.max(1, Number(periodDays) || 7);
  const sinceSec = Math.floor(Date.now() / 1000) - days * 86400;
  const rows = deviceRows(sinceSec);
  const t = (k, v) => translate(lang, k, v);
  const fmtDate = (d) =>
    d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const from = fmtDate(new Date(sinceSec * 1000));
  const to = fmtDate(new Date());

  const up = rows.filter((r) => r.status === "up").length;
  const down = rows.filter((r) => r.status === "down").length;
  const totalAlerts = rows.reduce((a, r) => a + r.alerts, 0);
  const totalCrit = rows.reduce((a, r) => a + r.critical, 0);

  const subject = `[net-monitor] ${t("report.subject")} — ${from} → ${to}`;

  // plain text
  const lines = [];
  lines.push(`${t("report.title")}  (${from} → ${to})`);
  lines.push("");
  lines.push(
    `${t("report.devices")}: ${rows.length}   ${t("status.up")}: ${up}   ${t("status.down")}: ${down}`
  );
  lines.push(`${t("report.alertsInPeriod")}: ${totalAlerts} (${t("severity.critical")}: ${totalCrit})`);
  lines.push("");
  const H = [
    t("devices.name"),
    t("report.availability"),
    "CPU avg/max",
    "RAM% avg/max",
    t("report.storageMax"),
    t("devices.alerts"),
    t("devices.status"),
  ];
  lines.push(H.join(" | "));
  for (const r of rows) {
    lines.push(
      [
        `${r.name} (${r.host})`,
        `${n0(r.availability)}%`,
        `${n1(r.avgCpu)} / ${n1(r.maxCpu)}`,
        `${n0(r.avgMem)} / ${n0(r.maxMem)}`,
        `${n0(r.maxStorage)}%`,
        `${r.alerts}${r.critical ? ` (${r.critical}!)` : ""}`,
        t(`status.${r.status}`),
      ].join(" | ")
    );
  }
  const text = lines.join("\n");

  // html
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const th = (s) => `<th style="text-align:start;padding:6px 10px;border-bottom:2px solid #ccc">${esc(s)}</th>`;
  const td = (s, extra = "") =>
    `<td style="padding:6px 10px;border-bottom:1px solid #eee;${extra}">${esc(s)}</td>`;
  const statusColor = { up: "#15803d", down: "#b91c1c", stale: "#b45309", unknown: "#64748b" };
  const body = rows
    .map(
      (r) => `<tr>
      ${td(`${r.name}`)}${td(r.host, "font-family:monospace;color:#555")}
      ${td(`${n0(r.availability)}%`)}
      ${td(`${n1(r.avgCpu)} / ${n1(r.maxCpu)}`)}
      ${td(`${n0(r.avgMem)} / ${n0(r.maxMem)}`)}
      ${td(`${n0(r.maxStorage)}%`, r.maxStorage >= 90 ? "color:#b91c1c;font-weight:bold" : "")}
      ${td(`${r.alerts}${r.critical ? ` (${r.critical}!)` : ""}`, r.critical ? "color:#b91c1c;font-weight:bold" : "")}
      ${td(t(`status.${r.status}`), `color:${statusColor[r.status]};font-weight:bold`)}
    </tr>`
    )
    .join("");
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;color:#111" dir="${lang === "ar" ? "rtl" : "ltr"}">
    <h2 style="margin:0 0 4px">${esc(t("report.title"))}</h2>
    <div style="color:#555;margin-bottom:12px">${from} → ${to}</div>
    <p>${esc(t("report.devices"))}: <b>${rows.length}</b> &nbsp;·&nbsp;
       ${esc(t("status.up"))}: <b style="color:#15803d">${up}</b> &nbsp;·&nbsp;
       ${esc(t("status.down"))}: <b style="color:#b91c1c">${down}</b> &nbsp;·&nbsp;
       ${esc(t("report.alertsInPeriod"))}: <b>${totalAlerts}</b> (${esc(t("severity.critical"))}: <b>${totalCrit}</b>)</p>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead><tr>${[
        t("devices.name"),
        t("devices.host"),
        t("report.availability"),
        "CPU avg/max",
        "RAM% avg/max",
        t("report.storageMax"),
        t("devices.alerts"),
        t("devices.status"),
      ].map(th).join("")}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;

  return { subject, text, html };
}

export async function sendReportNow() {
  const { periodDays, lang } = getReportConfig();
  const { subject, text, html } = buildReport(periodDays, lang);
  const res = await sendAlertEmail({ subject, text, html });
  if (res?.sent) metaSet("report_last_sent", Date.now());
  return res;
}

// Called on an interval by the poller.
export async function maybeSendScheduledReport() {
  const cfg = getReportConfig();
  if (!cfg.enabled) return;
  const now = new Date();
  if (now.getDay() !== cfg.dow || now.getHours() < cfg.hour) return;
  // don't send twice in the same window
  if (cfg.lastSent && Date.now() - cfg.lastSent < 6 * 24 * 3600 * 1000) return;
  try {
    const res = await sendReportNow();
    console.log(
      res?.sent ? "[report] weekly report sent" : `[report] not sent: ${res?.reason}`
    );
  } catch (e) {
    console.error("[report] error:", e?.message || e);
  }
}
