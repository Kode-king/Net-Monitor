import { withUser, ok } from "@/lib/api";
import { listAlerts } from "@/lib/queries";

export async function GET(req) {
  return withUser(() => {
    const state = new URL(req.url).searchParams.get("state") || "firing";
    return ok({ alerts: listAlerts(state) });
  });
}
