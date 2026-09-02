"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/components/api";
import Meter from "@/components/Meter";
import { useI18n } from "@/components/I18nProvider";
import { bytes, relTime, duration, typeLabelOf, statusMetaOf } from "@/lib/format";

function Stat({ label, value, tone = "" }) {
  return (
    <div className="card">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const { data, error } = useSWR("/api/overview", fetcher, { refreshInterval: 8000 });

  if (error) return <div className="card text-rose-400">{t("common.loadError", { msg: error.message })}</div>;
  if (!data) return <div className="text-muted">{t("common.loading")}</div>;

  const devices = data.devices || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("overview.title")}</h1>
        <Link href="/devices/new" className="btn-primary">{t("overview.addDevice")}</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label={t("overview.total")} value={data.total} />
        <Stat label={t("overview.up")} value={data.up} tone="text-emerald-400" />
        <Stat label={t("overview.down")} value={data.down} tone="text-rose-400" />
        <Stat label={t("overview.stale")} value={data.stale} tone="text-amber-400" />
        <Stat label={t("overview.firing")} value={data.firing_alerts} tone={data.firing_alerts ? "text-rose-400" : ""} />
      </div>

      {devices.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-muted mb-3">{t("overview.empty")}</div>
          <Link href="/devices/new" className="btn-primary">{t("overview.addFirst")}</Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((d) => {
            const sm = statusMetaOf(d.status);
            return (
              <Link key={d.id} href={`/devices/${d.id}`} className="card hover:border-sky-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-xs text-muted">
                      {typeLabelOf(d.type)} · {d.host}
                    </div>
                  </div>
                  <span className={`badge ${sm.cls}`}>{sm.label}</span>
                </div>

                <div className="mt-3 space-y-2">
                  <Meter label={t("device.cpu")} value={d.last?.cpu} />
                  <Meter
                    label={t("device.ram")}
                    value={d.mem_pct}
                    sub={
                      d.last?.mem_total
                        ? `${bytes(d.last.mem_used)} / ${bytes(d.last.mem_total)}`
                        : null
                    }
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                  <span>{t("overview.uptime", { v: duration(d.last?.uptime_s) })}</span>
                  <span>{t("overview.lastUpdate", { v: relTime(d.last?.ts) })}</span>
                  {d.firing_alerts > 0 && (
                    <span className="badge bg-rose-500/20 text-rose-400">
                      {t("overview.alertsCount", { n: d.firing_alerts })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
