import { withAdmin, ok } from "@/lib/api";
import { listAudit } from "@/lib/audit";

export async function GET(req) {
  return withAdmin(() => {
    const n = Number(new URL(req.url).searchParams.get("limit")) || 200;
    return ok({ entries: listAudit(n) });
  });
}
