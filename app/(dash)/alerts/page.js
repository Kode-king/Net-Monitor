"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/components/api";
import { useI18n } from "@/components/I18nProvider";
import { clockTime, relTime } from "@/lib/format";

const TABS = [
  { k: "firing", key: "alerts.tab.firing" },
  { k: "resolved", key: "alerts.tab.resolved" },
  { k: "all", key: "alerts.tab.all" },
];

export default function AlertsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("firing");
  const { data } = useSWR(`/api/alerts?state=${tab}`, fetcher, { refreshInterval: 8000 });
  const alerts = data?.alerts || [];

  const metricLabel = (m) =>
    ({ cpu: t("metric.cpu"), mem: t("metric.mem"), storage: t("metric.storage"), down: t("metric.down") }[m] || m);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("alerts.title")}</h1>

      <div className="flex gap-1">
        {TABS.map((tb) => (
          <button
            key={tb.k}
            onClick={() => setTab(tb.k)}
            className={`btn ${tab === tb.k ? "bg-sky-600 text-white" : "border border-line text-muted hover:bg-panel2"}`}
          >
            {t(tb.key)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="card flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`badge ${
                    a.state === "firing" ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  {a.state === "firing" ? t("alerts.state.firing") : t("alerts.state.resolved")}
                </span>
                <span className="badge bg-panel2 text-muted">{metricLabel(a.metric)}</span>
                <Link href={`/devices/${a.device_id}`} className="text-sky-400 hover:underline font-medium">
                  {a.device_name}
                </Link>
              </div>
              <div className="text-sm mt-1">{a.message}</div>
            </div>
            <div className="text-xs text-muted text-end shrink-0">
              <div>{t("alerts.started", { t: clockTime(a.started_at) })}</div>
              <div>{a.resolved_at ? t("alerts.ended", { t: clockTime(a.resolved_at) }) : relTime(a.started_at)}</div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="card text-center text-muted py-10">{t("alerts.empty")}</div>
        )}
      </div>
    </div>
  );
}
