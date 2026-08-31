import { withUser, ok } from "@/lib/api";
import { deviceSeries, storageSeries, ifaceSeries, deviceLatest } from "@/lib/queries";

export async function GET(req, { params }) {
  return withUser(async () => {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const url = new URL(req.url);
    const range = Number(url.searchParams.get("range")) || 3600; // seconds
    const ifIndex = url.searchParams.get("if");

    const latest = deviceLatest(id);
    return ok({
      series: deviceSeries(id, range),
      storage: storageSeries(id, range),
      iface: ifIndex ? ifaceSeries(id, Number(ifIndex), range) : [],
      ifaces: latest.ifaces,
      storageLatest: latest.storage,
      last: latest.last,
    });
  });
}
