import { withUser, ok, badT } from "@/lib/api";
import { getDevice } from "@/lib/queries";
import { pollDeviceNow } from "@/lib/poller";

export async function POST(req, { params }) {
  return withUser(async () => {
    const { id } = await params;
    const device = getDevice(Number(id));
    if (!device) return badT(req, "srv.notFound", 404);
    const r = await pollDeviceNow(device);
    return ok({ ok: true, reachable: r.reachable });
  });
}
