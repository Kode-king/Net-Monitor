import { withUser, withAdmin, ok, bad, badT, reqLang } from "@/lib/api";
import db from "@/lib/db";
import { getDevice, deviceLatest } from "@/lib/queries";
import { normalizeSnmp, validateSnmp, encryptDeviceSecrets } from "@/lib/snmp-config";
import { isValidHost, clampText } from "@/lib/validate";
import { auditReq } from "@/lib/audit";

export async function GET(req, { params }) {
  return withUser(async () => {
    const { id } = await params;
    const device = getDevice(Number(id));
    if (!device) return badT(req, "srv.notFound", 404);
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
  return withAdmin(async (session) => {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const device = getDevice(id);
    if (!device) return badT(req, "srv.notFound", 404);
    const b = await req.json().catch(() => ({}));
    const next = { ...device };
    for (const f of FIELDS) if (f in b) next[f] = b[f];
    if ("host" in b && !isValidHost(next.host)) return badT(req, "srv.hostInvalid");
    const snmp = normalizeSnmp(next);
    const invalid = validateSnmp(snmp, reqLang(req));
    if (invalid) return bad(invalid);
    next.enabled = next.enabled ? 1 : 0;
    next.snmp_port = Number(next.snmp_port) || 161;
    next.poll_interval = Math.max(5, Number(next.poll_interval) || 30);
    next.name = clampText(String(next.name || "").trim(), 120);
    next.host = String(next.host || "").trim().slice(0, 255);
    next.location = clampText(next.location, 120);
    next.notes = clampText(next.notes, 2000);
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
      ...encryptDeviceSecrets(snmp),
      snmp_port: next.snmp_port,
      poll_interval: next.poll_interval,
      enabled: next.enabled,
      location: next.location || null,
      notes: next.notes || null,
    });
    auditReq(req, session, "device.update", `${next.name} (${next.host})`);
    return ok({ ok: true });
  });
}

export async function DELETE(req, { params }) {
  return withAdmin(async (session) => {
    const { id } = await params;
    const dev = db.prepare("SELECT name FROM devices WHERE id = ?").get(Number(id));
    db.prepare("DELETE FROM devices WHERE id = ?").run(Number(id));
    auditReq(req, session, "device.delete", dev?.name || String(id));
    return ok({ ok: true });
  });
}
