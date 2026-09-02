import { withAdmin, ok, reqLang } from "@/lib/api";
import { testDevice } from "@/lib/snmp";
import { normalizeSnmp, validateSnmp } from "@/lib/snmp-config";
import { translate } from "@/lib/i18n";

export async function POST(req) {
  return withAdmin(async () => {
    const lang = reqLang(req);
    const b = await req.json().catch(() => ({}));
    if (!b.host) return ok({ ok: false, error: translate(lang, "srv.testHostFirst") });
    const snmp = normalizeSnmp(b);
    const invalid = validateSnmp(snmp, lang);
    if (invalid) return ok({ ok: false, error: invalid });
    const res = await testDevice({
      host: String(b.host).trim(),
      snmp_port: Number(b.snmp_port) || 161,
      ...snmp,
    });
    return ok(res);
  });
}
