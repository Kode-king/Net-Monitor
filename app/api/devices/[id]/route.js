import { withUser, withAdmin, ok, bad } from "@/lib/api";
import db from "@/lib/db";
import { getDevice, deviceLatest } from "@/lib/queries";
import { normalizeSnmp, validateSnmp } from "@/lib/snmp-config";

export async function GET(_req, { params }) {
  return withUser(async () => {
    const { id } = await params;
    const device = getDevice(Number(id));
    if (!device) return bad("غير موجود", 404);
    return ok({ device, ...deviceLatest(Number(id)) });
  });
}

const FIELDS = [
  "name", "host", "type", "snmp_version", "snmp_community", "snmp_port",
  "snmp_sec_level", "snmp_sec_name", "snmp_auth_protocol", "snmp_auth_key",
  "snmp_priv_protocol", "snmp_priv_key", "snmp_context",
  "poll_interval", "enabled", "location", "notes",
];

export async function PUT(req, { params }) {
  return withAdmin(async () => {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const device = getDevice(id);
    if (!device) return bad("غير موجود", 404);
    const b = await req.json().catch(() => ({}));
    const next = { ...device };
    for (const f of FIELDS) if (f in b) next[f] = b[f];
    const snmp = normalizeSnmp(next);
    const invalid = validateSnmp(snmp);
    if (invalid) return bad(invalid);
    next.enabled = next.enabled ? 1 : 0;
    next.snmp_port = Number(next.snmp_port) || 161;
    next.poll_interval = Math.max(5, Number(next.poll_interval) || 30);
    db.prepare(
      `UPDATE devices SET name=@name, host=@host, type=@type, snmp_version=@snmp_version,
         snmp_community=@snmp_community, snmp_port=@snmp_port,
         snmp_sec_level=@snmp_sec_level, snmp_sec_name=@snmp_sec_name,
         snmp_auth_protocol=@snmp_auth_protocol, snmp_auth_key=@snmp_auth_key,
         snmp_priv_protocol=@snmp_priv_protocol, snmp_priv_key=@snmp_priv_key,
         snmp_context=@snmp_context, poll_interval=@poll_interval,
         enabled=@enabled, location=@location, notes=@notes WHERE id=@id`
    ).run({
      id,
      name: next.name,
      host: next.host,
      type: next.type,
      ...snmp,
      snmp_port: next.snmp_port,
      poll_interval: next.poll_interval,
      enabled: next.enabled,
      location: next.location || null,
      notes: next.notes || null,
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_req, { params }) {
  return withAdmin(async () => {
    const { id } = await params;
    db.prepare("DELETE FROM devices WHERE id = ?").run(Number(id));
    return ok({ ok: true });
  });
}
