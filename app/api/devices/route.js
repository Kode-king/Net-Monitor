import { withUser, withAdmin, ok, bad } from "@/lib/api";
import db from "@/lib/db";
import { listDevicesWithStatus } from "@/lib/queries";
import { normalizeSnmp, validateSnmp } from "@/lib/snmp-config";

export async function GET() {
  return withUser(() => ok({ devices: listDevicesWithStatus() }));
}

const TYPES = ["server", "switch", "router"];

export async function POST(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    if (!b.name || !b.host) return bad("الاسم والعنوان (host) مطلوبان");
    const type = TYPES.includes(b.type) ? b.type : "server";
    const snmp = normalizeSnmp(b);
    const invalid = validateSnmp(snmp);
    if (invalid) return bad(invalid);
    const info = db
      .prepare(
        `INSERT INTO devices (name, host, type, snmp_version, snmp_community, snmp_port,
           snmp_sec_level, snmp_sec_name, snmp_auth_protocol, snmp_auth_key,
           snmp_priv_protocol, snmp_priv_key, snmp_context,
           poll_interval, enabled, location, notes, created_at)
         VALUES (@name, @host, @type, @snmp_version, @snmp_community, @snmp_port,
           @snmp_sec_level, @snmp_sec_name, @snmp_auth_protocol, @snmp_auth_key,
           @snmp_priv_protocol, @snmp_priv_key, @snmp_context,
           @poll_interval, @enabled, @location, @notes, @created_at)`
      )
      .run({
        name: String(b.name).trim(),
        host: String(b.host).trim(),
        type,
        ...snmp,
        snmp_port: Number(b.snmp_port) || 161,
        poll_interval: Math.max(5, Number(b.poll_interval) || 30),
        enabled: b.enabled === false ? 0 : 1,
        location: b.location || null,
        notes: b.notes || null,
        created_at: Date.now(),
      });
    return ok({ id: info.lastInsertRowid });
  });
}
