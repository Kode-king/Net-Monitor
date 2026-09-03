import { withUser, withAdmin, ok, bad, badT, reqLang } from "@/lib/api";
import db from "@/lib/db";
import { listDevicesWithStatus } from "@/lib/queries";
import { normalizeSnmp, validateSnmp, encryptDeviceSecrets } from "@/lib/snmp-config";
import { isValidHost, clampText } from "@/lib/validate";
import { auditReq } from "@/lib/audit";

export async function GET() {
  return withUser(() => ok({ devices: listDevicesWithStatus() }));
}

const TYPES = ["server", "switch", "router"];

export async function POST(req) {
  return withAdmin(async (session) => {
    const b = await req.json().catch(() => ({}));
    if (!b.name || !b.host) return badT(req, "srv.deviceNameHostRequired");
    if (!isValidHost(b.host)) return badT(req, "srv.hostInvalid");
    const type = TYPES.includes(b.type) ? b.type : "server";
    const snmp = normalizeSnmp(b);
    const invalid = validateSnmp(snmp, reqLang(req));
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
        name: clampText(String(b.name).trim(), 120),
        host: String(b.host).trim().slice(0, 255),
        type,
        ...encryptDeviceSecrets(snmp),
        snmp_port: Number(b.snmp_port) || 161,
        poll_interval: Math.max(5, Number(b.poll_interval) || 30),
        enabled: b.enabled === false ? 0 : 1,
        location: clampText(b.location, 120),
        notes: clampText(b.notes, 2000),
        created_at: Date.now(),
      });
    auditReq(req, session, "device.create", `${b.name} (${b.host})`);
    return ok({ id: info.lastInsertRowid });
  });
}
