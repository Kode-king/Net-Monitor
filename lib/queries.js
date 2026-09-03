import db from "./db.js";

export function listDevicesWithStatus() {
  const devices = db.prepare("SELECT * FROM devices ORDER BY name").all();
  return devices.map((d) => {
    const last = db
      .prepare("SELECT * FROM samples WHERE device_id = ? ORDER BY ts DESC LIMIT 1")
      .get(d.id);
    const alerts = db
      .prepare("SELECT COUNT(*) c FROM alerts WHERE device_id = ? AND state = 'firing'")
      .get(d.id).c;
    return {
      ...d,
      last: last || null,
      mem_pct: last && last.mem_total ? (last.mem_used / last.mem_total) * 100 : null,
      firing_alerts: alerts,
      status: !last
        ? "unknown"
        : Date.now() / 1000 - last.ts > d.poll_interval * 3
        ? "stale"
        : last.reachable
        ? "up"
        : "down",
    };
  });
}

export function getDevice(id) {
  return db.prepare("SELECT * FROM devices WHERE id = ?").get(id);
}

export function deviceLatest(id) {
  const last = db
    .prepare("SELECT * FROM samples WHERE device_id = ? ORDER BY ts DESC LIMIT 1")
    .get(id);
  if (!last) return { last: null, storage: [], ifaces: [] };

  const storage = db
    .prepare("SELECT * FROM storage_samples WHERE device_id = ? AND ts = ? ORDER BY idx")
    .all(id, last.ts);

  const ifaces = db
    .prepare(
      `SELECT * FROM iface_samples WHERE device_id = ? AND ts = (
         SELECT MAX(ts) FROM iface_samples WHERE device_id = ?
       ) ORDER BY (COALESCE(in_bps,0) + COALESCE(out_bps,0)) DESC`
    )
    .all(id, id);

  return { last, storage, ifaces };
}

export function deviceSeries(id, sinceSeconds) {
  const from = Math.floor(Date.now() / 1000) - sinceSeconds;
  const rows = db
    .prepare(
      `SELECT ts, reachable, latency_ms, cpu, mem_used, mem_total
       FROM samples WHERE device_id = ? AND ts >= ? ORDER BY ts`
    )
    .all(id, from);
  return rows.map((r) => ({
    ts: r.ts,
    cpu: r.cpu,
    mem_pct: r.mem_total ? (r.mem_used / r.mem_total) * 100 : null,
    latency_ms: r.latency_ms,
    reachable: r.reachable,
  }));
}

export function ifaceSeries(id, ifIndex, sinceSeconds) {
  const from = Math.floor(Date.now() / 1000) - sinceSeconds;
  return db
    .prepare(
      `SELECT ts, in_bps, out_bps, oper_status FROM iface_samples
       WHERE device_id = ? AND if_index = ? AND ts >= ? ORDER BY ts`
    )
    .all(id, ifIndex, from);
}

export function storageSeries(id, sinceSeconds) {
  const from = Math.floor(Date.now() / 1000) - sinceSeconds;
  return db
    .prepare(
      `SELECT ts, idx, descr, used, total FROM storage_samples
       WHERE device_id = ? AND ts >= ? ORDER BY ts`
    )
    .all(id, from);
}

export function overview() {
  const devices = listDevicesWithStatus();
  return {
    total: devices.length,
    up: devices.filter((d) => d.status === "up").length,
    down: devices.filter((d) => d.status === "down").length,
    stale: devices.filter((d) => d.status === "stale" || d.status === "unknown").length,
    firing_alerts: db
      .prepare("SELECT COUNT(*) c FROM alerts WHERE state = 'firing'")
      .get().c,
    critical_alerts: db
      .prepare("SELECT COUNT(*) c FROM alerts WHERE state = 'firing' AND severity = 'critical'")
      .get().c,
    by_type: {
      server: devices.filter((d) => d.type === "server").length,
      switch: devices.filter((d) => d.type === "switch").length,
      router: devices.filter((d) => d.type === "router").length,
    },
    devices,
  };
}

export function listAlerts(state) {
  let sql = `SELECT a.*, d.name AS device_name, d.type AS device_type
             FROM alerts a JOIN devices d ON d.id = a.device_id`;
  const args = [];
  if (state && state !== "all") {
    sql += " WHERE a.state = ?";
    args.push(state);
  }
  sql += " ORDER BY a.started_at DESC LIMIT 300";
  return db.prepare(sql).all(...args);
}
