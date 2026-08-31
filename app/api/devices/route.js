import { withUser, withAdmin, ok, bad } from "@/lib/api";
import db from "@/lib/db";
import { listDevicesWithStatus } from "@/lib/queries";

export async function GET() {
  return withUser(() => ok({ devices: listDevicesWithStatus() }));
}

const TYPES = ["server", "switch", "router"];

export async function POST(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    if (!b.name || !b.host) return bad("الاسم والعنوان (host) مطلوبان");
    const type = TYPES.includes(b.type) ? b.type : "server";
    const info = db
      .prepare(
        `INSERT INTO devices (name, host, type, snmp_version, snmp_community, snmp_port, poll_interval, enabled, location, notes, created_at)
         VALUES (@name, @host, @type, @snmp_version, @snmp_community, @snmp_port, @poll_interval, @enabled, @location, @notes, @created_at)`
      )
      .run({
        name: String(b.name).trim(),
        host: String(b.host).trim(),
        type,
        snmp_version: b.snmp_version === "1" ? "1" : "2c",
        snmp_community: b.snmp_community || "public",
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
