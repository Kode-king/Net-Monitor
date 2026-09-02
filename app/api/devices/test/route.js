import { withAdmin, ok } from "@/lib/api";
import { testDevice } from "@/lib/snmp";
import { normalizeSnmp, validateSnmp } from "@/lib/snmp-config";

export async function POST(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    if (!b.host) return ok({ ok: false, error: "أدخل العنوان / IP أولًا" });
    const snmp = normalizeSnmp(b);
    const invalid = validateSnmp(snmp);
    if (invalid) return ok({ ok: false, error: invalid });
    const res = await testDevice({
      host: String(b.host).trim(),
      snmp_port: Number(b.snmp_port) || 161,
      ...snmp,
    });
    return ok(res);
  });
}
