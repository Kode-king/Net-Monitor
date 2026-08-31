import { withAdmin, ok } from "@/lib/api";
import { testDevice } from "@/lib/snmp";

export async function POST(req) {
  return withAdmin(async () => {
    const b = await req.json().catch(() => ({}));
    const res = await testDevice({
      host: b.host,
      snmp_version: b.snmp_version === "1" ? "1" : "2c",
      snmp_community: b.snmp_community || "public",
      snmp_port: Number(b.snmp_port) || 161,
    });
    return ok(res);
  });
}
