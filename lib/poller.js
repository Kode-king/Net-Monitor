import db from "./db.js";
import { pollDevice } from "./snmp.js";
import { sendAlertEmail } from "./mailer.js";
import { maybeSendScheduledReport } from "./report.js";
import { decryptDeviceRow } from "./snmp-config.js";
import { pruneAudit } from "./audit.js";

const TICK_MS = 5000;
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || "14", 10);

// in-memory state (survives hot reload via globalThis)
const state = globalThis.__netMonitorPoller || {
  started: false,
  lastPoll: new Map(),   // deviceId -> ts(ms)
  inFlight: new Set(),   // deviceId
  condSince: new Map(),  // `${ruleId}:${deviceId}` -> ts(ms) when condition first became true
};
globalThis.__netMonitorPoller = state;

export function startPoller() {
  if (state.started) return;
  state.started = true;
  console.log("[poller] started");
  heartbeat();
  tick();
  setInterval(tick, TICK_MS);
  setInterval(cleanup, 60 * 60 * 1000);
  setInterval(() => maybeSendScheduledReport(), 5 * 60 * 1000);
  cleanup();
}

// The poller may run in a separate process (npm run poller) from the web
// server, so liveness is tracked via a DB heartbeat both sides can read.
const HEARTBEAT_STALE_MS = 20000;

function heartbeat() {
  try {
    db.prepare(
      "INSERT INTO meta (key, value) VALUES ('poller_heartbeat', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(String(Date.now()));
  } catch {}
}

export function isPollerRunning() {
  if (state.started) return true;
  try {
    const row = db.prepare("SELECT value FROM meta WHERE key = 'poller_heartbeat'").get();
    return !!row && Date.now() - Number(row.value) < HEARTBEAT_STALE_MS;
  } catch {
    return false;
  }
}

function tick() {
  heartbeat();
  let devices;
  try {
    devices = db.prepare("SELECT * FROM devices WHERE enabled = 1").all().map(decryptDeviceRow);
  } catch (e) {
    console.error("[poller] db error", e.message);
    return;
  }
  const now = Date.now();
  for (const d of devices) {
    const interval = (d.poll_interval || 30) * 1000;
    const last = state.lastPoll.get(d.id) || 0;
    if (now - last < interval) continue;
    if (state.inFlight.has(d.id)) continue;
    state.inFlight.add(d.id);
    state.lastPoll.set(d.id, now);
    runOne(d).finally(() => state.inFlight.delete(d.id));
  }
}

export async function pollDeviceNow(device) {
  return runOne(device);
}

async function runOne(device) {
  const ts = Math.floor(Date.now() / 1000);
  let r;
  try {
    r = await pollDevice(device);
  } catch (e) {
    r = { reachable: false };
  }

  try {
    db.prepare(
      `INSERT INTO samples (device_id, ts, reachable, latency_ms, cpu, mem_used, mem_total, uptime_s, sys_name, sys_descr)
       VALUES (@device_id, @ts, @reachable, @latency_ms, @cpu, @mem_used, @mem_total, @uptime_s, @sys_name, @sys_descr)`
    ).run({
      device_id: device.id,
      ts,
      reachable: r.reachable ? 1 : 0,
      latency_ms: r.latency_ms ?? null,
      cpu: r.cpu ?? null,
      mem_used: r.mem_used ?? null,
      mem_total: r.mem_total ?? null,
      uptime_s: r.uptime_s ?? null,
      sys_name: r.sys_name ?? null,
      sys_descr: r.sys_descr ?? null,
    });

    for (const s of r.storage || []) {
      db.prepare(
        `INSERT INTO storage_samples (device_id, ts, idx, descr, used, total)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(device.id, ts, s.idx, s.descr, s.used, s.total);
    }

    for (const i of r.ifaces || []) {
      const prev = db
        .prepare("SELECT * FROM iface_counters WHERE device_id = ? AND if_index = ?")
        .get(device.id, i.if_index);
      let inBps = null;
      let outBps = null;
      if (prev && i.in_octets != null && i.out_octets != null) {
        const dt = ts - prev.ts;
        if (dt > 0) {
          const di = i.in_octets - prev.in_octets;
          const do_ = i.out_octets - prev.out_octets;
          if (di >= 0) inBps = (di * 8) / dt;
          if (do_ >= 0) outBps = (do_ * 8) / dt;
        }
      }
      db.prepare(
        `INSERT INTO iface_samples (device_id, ts, if_index, if_name, oper_status, speed_bps, in_bps, out_bps)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(device.id, ts, i.if_index, i.if_name, i.oper_status, i.speed_bps, inBps, outBps);

      if (i.in_octets != null) {
        db.prepare(
          `INSERT INTO iface_counters (device_id, if_index, ts, in_octets, out_octets)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(device_id, if_index) DO UPDATE SET ts=excluded.ts, in_octets=excluded.in_octets, out_octets=excluded.out_octets`
        ).run(device.id, i.if_index, ts, i.in_octets, i.out_octets);
      }
    }

    evaluateAlerts(device, r, ts);
  } catch (e) {
    console.error(`[poller] store error for ${device.name}:`, e.message);
  }

  return r;
}

function memPct(r) {
  if (!r.mem_total) return null;
  return (r.mem_used / r.mem_total) * 100;
}

function maxStoragePct(r) {
  let m = null;
  for (const s of r.storage || []) {
    if (s.total > 0) {
      const p = (s.used / s.total) * 100;
      if (m == null || p > m) m = p;
    }
  }
  return m;
}

function evaluateAlerts(device, r, ts) {
  const rules = db
    .prepare(
      "SELECT * FROM alert_rules WHERE enabled = 1 AND (device_id IS NULL OR device_id = ?)"
    )
    .all(device.id);

  const nowMs = Date.now();

  for (const rule of rules) {
    let value = null;
    let conditionMet = false;
    let label = "";

    if (rule.metric === "down") {
      conditionMet = !r.reachable;
      value = r.reachable ? 1 : 0;
      label = "الجهاز غير مستجيب (SNMP down)";
    } else {
      if (rule.metric === "cpu") value = r.cpu;
      else if (rule.metric === "mem") value = memPct(r);
      else if (rule.metric === "storage") value = maxStoragePct(r);
      if (value == null) continue;
      conditionMet = compare(value, rule.operator, rule.threshold);
      label = `${rule.metric.toUpperCase()} ${rule.operator} ${rule.threshold}% (القيمة ${value.toFixed(1)}%)`;
    }

    const key = `${rule.id}:${device.id}`;
    const existing = db
      .prepare(
        "SELECT * FROM alerts WHERE device_id = ? AND rule_id = ? AND state = 'firing' ORDER BY started_at DESC LIMIT 1"
      )
      .get(device.id, rule.id);

    if (conditionMet) {
      const since = state.condSince.get(key) || nowMs;
      state.condSince.set(key, since);
      const held = (nowMs - since) / 1000;
      if (held >= (rule.duration_s || 0) && !existing) {
        const severity = rule.severity === "critical" ? "critical" : "warning";
        const message = `${device.name}: ${label}`;
        const info = db
          .prepare(
            `INSERT INTO alerts (device_id, rule_id, metric, message, value, state, severity, started_at)
             VALUES (?, ?, ?, ?, ?, 'firing', ?, ?)`
          )
          .run(device.id, rule.id, rule.metric, message, value, severity, ts);
        console.log(`[alert] FIRING (${severity}) ${device.name} ${label}`);
        if (severity === "critical") {
          notifyCritical(Number(info.lastInsertRowid), device, message);
        }
      }
    } else {
      state.condSince.delete(key);
      if (existing) {
        db.prepare("UPDATE alerts SET state = 'resolved', resolved_at = ? WHERE id = ?").run(ts, existing.id);
        console.log(`[alert] RESOLVED ${device.name} ${rule.metric}`);
      }
    }
  }
}

// Fire-and-forget email for a critical alert; records notified_at on success.
function notifyCritical(alertId, device, message) {
  const when = new Date().toLocaleString("sv-SE");
  const body =
    `تنبيه حرج / CRITICAL ALERT\n\n` +
    `${message}\n\n` +
    `الجهاز / Device: ${device.name} (${device.host})\n` +
    `الوقت / Time: ${when}\n`;
  sendAlertEmail({ subject: `[net-monitor] CRITICAL — ${device.name}`, text: body })
    .then((res) => {
      if (res?.sent) {
        db.prepare("UPDATE alerts SET notified_at = ? WHERE id = ?").run(Date.now(), alertId);
      }
    })
    .catch((e) => console.error("[alert] email error:", e?.message || e));
}

function compare(v, op, t) {
  switch (op) {
    case ">": return v > t;
    case ">=": return v >= t;
    case "<": return v < t;
    case "<=": return v <= t;
    case "==": return v === t;
    default: return false;
  }
}

function cleanup() {
  const cutoff = Math.floor(Date.now() / 1000) - RETENTION_DAYS * 86400;
  try {
    db.prepare("DELETE FROM samples WHERE ts < ?").run(cutoff);
    db.prepare("DELETE FROM storage_samples WHERE ts < ?").run(cutoff);
    db.prepare("DELETE FROM iface_samples WHERE ts < ?").run(cutoff);
    db.prepare("DELETE FROM alerts WHERE state = 'resolved' AND resolved_at < ?").run(cutoff);
  } catch (e) {
    console.error("[poller] cleanup error", e.message);
  }
  pruneAudit();
}
