import { withUser, ok } from "@/lib/api";
import { overview } from "@/lib/queries";
import { isPollerRunning } from "@/lib/poller";

export async function GET() {
  return withUser(() => ok({ ...overview(), poller: isPollerRunning() }));
}
