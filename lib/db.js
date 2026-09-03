import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "net-monitor.db");

// Reuse a single connection across hot reloads in dev.
let db = globalThis.__netMonitorDb;

if (!db) {
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  migrate(db);
  globalThis.__netMonitorDb = db;
}

function migrate(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'viewer',
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      host           TEXT NOT NULL,
      type           TEXT NOT NULL DEFAULT 'server',
      snmp_version   TEXT NOT NULL DEFAULT '2c',
      snmp_community TEXT NOT NULL DEFAULT 'public',
      snmp_port      INTEGER NOT NULL DEFAULT 161,
      poll_interval  INTEGER NOT NULL DEFAULT 30,
      enabled        INTEGER NOT NULL DEFAULT 1,
      location       TEXT,
      notes          TEXT,
      created_at     INTEGER NOT NULL,
      -- SNMPv3 (used when snmp_version = '3')
      snmp_sec_level     TEXT NOT NULL DEFAULT 'authPriv',
      snmp_sec_name      TEXT,
      snmp_auth_protocol TEXT NOT NULL DEFAULT 'sha',
      snmp_auth_key      TEXT,
      snmp_priv_protocol TEXT NOT NULL DEFAULT 'aes',
      snmp_priv_key      TEXT,
      snmp_context       TEXT
    );

    CREATE TABLE IF NOT EXISTS samples (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id  INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      ts         INTEGER NOT NULL,
      reachable  INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER,
      cpu        REAL,
      mem_used   INTEGER,
      mem_total  INTEGER,
      uptime_s   INTEGER,
      sys_name   TEXT,
      sys_descr  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_samples_dev_ts ON samples(device_id, ts);

    CREATE TABLE IF NOT EXISTS storage_samples (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id  INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      ts         INTEGER NOT NULL,
      idx        INTEGER NOT NULL,
      descr      TEXT,
      used       INTEGER,
      total      INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_storage_dev_ts ON storage_samples(device_id, ts);

    CREATE TABLE IF NOT EXISTS iface_samples (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      ts          INTEGER NOT NULL,
      if_index    INTEGER NOT NULL,
      if_name     TEXT,
      oper_status INTEGER,
      speed_bps   INTEGER,
      in_bps      REAL,
      out_bps     REAL
    );
    CREATE INDEX IF NOT EXISTS idx_iface_dev_ts ON iface_samples(device_id, ts);

    CREATE TABLE IF NOT EXISTS alert_rules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id   INTEGER REFERENCES devices(id) ON DELETE CASCADE,
      metric      TEXT NOT NULL,
      operator    TEXT NOT NULL DEFAULT '>',
      threshold   REAL NOT NULL DEFAULT 90,
      duration_s  INTEGER NOT NULL DEFAULT 0,
      enabled     INTEGER NOT NULL DEFAULT 1,
      severity    TEXT NOT NULL DEFAULT 'warning',
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id   INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      rule_id     INTEGER REFERENCES alert_rules(id) ON DELETE SET NULL,
      metric      TEXT NOT NULL,
      message     TEXT NOT NULL,
      value       REAL,
      state       TEXT NOT NULL DEFAULT 'firing',
      severity    TEXT NOT NULL DEFAULT 'warning',
      started_at  INTEGER NOT NULL,
      resolved_at INTEGER,
      notified_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state, started_at);

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS iface_counters (
      device_id  INTEGER NOT NULL,
      if_index   INTEGER NOT NULL,
      ts         INTEGER NOT NULL,
      in_octets  INTEGER,
      out_octets INTEGER,
      PRIMARY KEY (device_id, if_index)
    );
  `);

  // Add columns introduced after the first release to already-existing DBs.
  addColumn(d, "devices", "snmp_sec_level", "TEXT NOT NULL DEFAULT 'authPriv'");
  addColumn(d, "devices", "snmp_sec_name", "TEXT");
  addColumn(d, "devices", "snmp_auth_protocol", "TEXT NOT NULL DEFAULT 'sha'");
  addColumn(d, "devices", "snmp_auth_key", "TEXT");
  addColumn(d, "devices", "snmp_priv_protocol", "TEXT NOT NULL DEFAULT 'aes'");
  addColumn(d, "devices", "snmp_priv_key", "TEXT");
  addColumn(d, "devices", "snmp_context", "TEXT");

  // Alert severity: 'warning' | 'critical'. Critical alerts trigger email + browser alarm.
  if (addColumn(d, "alert_rules", "severity", "TEXT NOT NULL DEFAULT 'warning'")) {
    // one-time: make "device down" critical when first migrating an existing DB
    d.exec("UPDATE alert_rules SET severity = 'critical' WHERE metric = 'down'");
  }
  addColumn(d, "alerts", "severity", "TEXT NOT NULL DEFAULT 'warning'");
  addColumn(d, "alerts", "notified_at", "INTEGER");
}

// Returns true if the column was just added.
function addColumn(d, table, column, definition) {
  const exists = d
    .prepare(`SELECT 1 FROM pragma_table_info(?) WHERE name = ?`)
    .get(table, column);
  if (exists) return false;
  d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
}

export default db;
