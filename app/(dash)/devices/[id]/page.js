"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher, jsend } from "@/components/api";
import { PctAreaChart, TrafficChart } from "@/components/Charts";
import Meter from "@/components/Meter";
import { useI18n } from "@/components/I18nProvider";
import { bytes, bps, pct, duration, relTime, typeLabelOf, statusMetaOf } from "@/lib/format";

const RANGES = [
  { s: 3600, key: "range.hour" },
  { s: 21600, key: "range.6h" },
  { s: 86400, key: "range.day" },
  { s: 604800, key: "range.week" },
];

export default function DeviceDetail({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const [range, setRange] = useState(3600);
  const [ifIndex, setIfIndex] = useState(null);
  const [polling, setPolling] = useState(false);

  const { data: dev } = useSWR(`/api/devices/${id}`, fetcher, { refreshInterval: 15000 });
  const { data: m, mutate } = useSWR(
    `/api/devices/${id}/metrics?range=${range}${ifIndex ? `&if=${ifIndex}` : ""}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  if (!dev) return <div className="text-muted">{t("common.loading")}</div>;
  const d = dev.device;
  const last = m?.last || dev.last;
  const status = !last
    ? "unknown"
    : Date.now() / 1000 - last.ts > d.poll_interval * 3
    ? "stale"
    : last.reachable
    ? "up"
    : "down";
  const sm = statusMetaOf(status);
  const memPct = last?.mem_total ? (last.mem_used / last.mem_total) * 100 : null;

  async function pollNow() {
    setPolling(true);
    try {
      await jsend(`/api/devices/${id}/poll`, "POST");
      await mutate();
    } catch (e) {
      alert(e.message);
    } finally {
      setPolling(false);
    }
  }

  async function remove() {
    if (!confirm(t("device.deleteConfirm", { name: d.name }))) return;
    try {
      await jsend(`/api/devices/${id}`, "DELETE");
      router.push("/devices");
    } catch (e) {
      alert(e.message);
    }
  }

  const ifaces = m?.ifaces || dev.ifaces || [];
  const storage = m?.storageLatest || dev.storage || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/devices" className="text-muted hover:text-ink">{t("nav.devices")}</Link>
            <span className="text-muted">/</span>
            <h1 className="text-2xl font-bold">{d.name}</h1>
            <span className={`badge ${sm.cls}`}>{sm.label}</span>
          </div>
          <div className="text-sm text-muted mt-1">
            {typeLabelOf(d.type)} · <span className="font-mono">{d.host}:{d.snmp_port}</span> · SNMP v{d.snmp_version}
            {d.location ? ` · ${d.location}` : ""}
          </div>
          {last?.sys_descr && (
            <div className="text-xs text-muted mt-1 max-w-3xl">{last.sys_descr}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={pollNow} className="btn-ghost" disabled={polling}>
            {polling ? "…" : t("device.pollNow")}
          </button>
          <Link href={`/devices/${id}/edit`} className="btn-ghost">{t("common.edit")}</Link>
          <button onClick={remove} className="btn-danger">{t("common.delete")}</button>
        </div>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-xs text-muted">{t("device.cpu")}</div>
          <div className="text-2xl font-bold">{pct(last?.cpu)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t("device.ram")}</div>
          <div className="text-2xl font-bold">{pct(memPct)}</div>
          <div className="text-[11px] text-muted">
            {last?.mem_total ? `${bytes(last.mem_used)} / ${bytes(last.mem_total)}` : "—"}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t("device.uptime")}</div>
          <div className="text-2xl font-bold">{duration(last?.uptime_s)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t("device.latency")}</div>
          <div className="text-2xl font-bold">{last?.latency_ms != null ? `${last.latency_ms} ms` : "—"}</div>
          <div className="text-[11px] text-muted">{t("overview.lastUpdate", { v: relTime(last?.ts) })}</div>
        </div>
      </div>

      {/* range selector */}
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r.s}
            onClick={() => setRange(r.s)}
            className={`btn ${range === r.s ? "bg-sky-600 text-white" : "border border-line text-muted hover:bg-panel2"}`}
          >
            {t(r.key)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="font-semibold mb-2">{t("device.cpuUsage")}</div>
          <PctAreaChart data={m?.series || []} dataKey="cpu" color="#38bdf8" />
        </div>
        <div className="card">
          <div className="font-semibold mb-2">{t("device.memUsage")}</div>
          <PctAreaChart data={m?.series || []} dataKey="mem_pct" color="#a78bfa" />
        </div>
      </div>

      {/* storage */}
      <div className="card">
        <div className="font-semibold mb-3">{t("device.storage")}</div>
        {storage.length === 0 ? (
          <div className="text-muted text-sm">{t("device.storageEmpty")}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {storage.map((s) => (
              <Meter
                key={s.idx}
                label={s.descr}
                value={s.total ? (s.used / s.total) * 100 : null}
                sub={`${bytes(s.used)} / ${bytes(s.total)}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* interfaces */}
      <div className="card">
        <div className="font-semibold mb-3">{t("device.ifaces")}</div>
        {ifaces.length === 0 ? (
          <div className="text-muted text-sm">{t("device.ifacesEmpty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted border-b border-line">
                <tr className="text-start">
                  <th className="p-2 font-medium">{t("device.iface")}</th>
                  <th className="p-2 font-medium">{t("device.status")}</th>
                  <th className="p-2 font-medium">{t("device.in")}</th>
                  <th className="p-2 font-medium">{t("device.out")}</th>
                  <th className="p-2 font-medium">{t("device.speed")}</th>
                  <th className="p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {ifaces.map((i) => (
                  <tr key={i.if_index} className="border-b border-line/40">
                    <td className="p-2 font-mono text-xs">{i.if_name}</td>
                    <td className="p-2">
                      <span className={`badge ${i.oper_status === 1 ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"}`}>
                        {i.oper_status === 1 ? "up" : "down"}
                      </span>
                    </td>
                    <td className="p-2 text-emerald-400">{bps(i.in_bps)}</td>
                    <td className="p-2 text-amber-400">{bps(i.out_bps)}</td>
                    <td className="p-2 text-muted">{i.speed_bps ? bps(i.speed_bps) : "—"}</td>
                    <td className="p-2">
                      <button
                        onClick={() => setIfIndex(ifIndex === i.if_index ? null : i.if_index)}
                        className="text-sky-400 hover:underline text-xs"
                      >
                        {ifIndex === i.if_index ? t("device.hideChart") : t("device.showChart")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ifIndex && (
          <div className="mt-4">
            <div className="text-sm text-muted mb-2">
              {t("device.ifaceTraffic", { name: ifaces.find((x) => x.if_index === ifIndex)?.if_name || "" })}
            </div>
            <TrafficChart data={m?.iface || []} />
          </div>
        )}
      </div>

      {d.notes && (
        <div className="card">
          <div className="font-semibold mb-1">{t("device.notes")}</div>
          <div className="text-sm text-muted whitespace-pre-wrap">{d.notes}</div>
        </div>
      )}
    </div>
  );
}
