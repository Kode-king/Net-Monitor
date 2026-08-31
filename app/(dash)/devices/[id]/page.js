"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher, jsend } from "@/components/api";
import { PctAreaChart, TrafficChart } from "@/components/Charts";
import Meter from "@/components/Meter";
import { bytes, bps, pct, duration, relTime, clockTime, typeLabel, statusMeta } from "@/lib/format";

const RANGES = [
  { s: 3600, label: "ساعة" },
  { s: 21600, label: "6 ساعات" },
  { s: 86400, label: "يوم" },
  { s: 604800, label: "أسبوع" },
];

export default function DeviceDetail({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [range, setRange] = useState(3600);
  const [ifIndex, setIfIndex] = useState(null);
  const [polling, setPolling] = useState(false);

  const { data: dev } = useSWR(`/api/devices/${id}`, fetcher, { refreshInterval: 15000 });
  const { data: m, mutate } = useSWR(
    `/api/devices/${id}/metrics?range=${range}${ifIndex ? `&if=${ifIndex}` : ""}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  if (!dev) return <div className="text-muted">جارٍ التحميل…</div>;
  const d = dev.device;
  const last = m?.last || dev.last;
  const status = !last
    ? "unknown"
    : Date.now() / 1000 - last.ts > d.poll_interval * 3
    ? "stale"
    : last.reachable
    ? "up"
    : "down";
  const sm = statusMeta[status];
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
    if (!confirm(`حذف الجهاز "${d.name}" وكل بياناته؟`)) return;
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
            <Link href="/devices" className="text-muted hover:text-ink">الأجهزة</Link>
            <span className="text-muted">/</span>
            <h1 className="text-2xl font-bold">{d.name}</h1>
            <span className={`badge ${sm.cls}`}>{sm.label}</span>
          </div>
          <div className="text-sm text-muted mt-1">
            {typeLabel[d.type]} · <span className="font-mono">{d.host}:{d.snmp_port}</span> · SNMP v{d.snmp_version}
            {d.location ? ` · ${d.location}` : ""}
          </div>
          {last?.sys_descr && (
            <div className="text-xs text-muted mt-1 max-w-3xl">{last.sys_descr}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={pollNow} className="btn-ghost" disabled={polling}>
            {polling ? "…" : "استعلام الآن"}
          </button>
          <Link href={`/devices/${id}/edit`} className="btn-ghost">تعديل</Link>
          <button onClick={remove} className="btn-danger">حذف</button>
        </div>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-xs text-muted">المعالج CPU</div>
          <div className="text-2xl font-bold">{pct(last?.cpu)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">الذاكرة RAM</div>
          <div className="text-2xl font-bold">{pct(memPct)}</div>
          <div className="text-[11px] text-muted">
            {last?.mem_total ? `${bytes(last.mem_used)} / ${bytes(last.mem_total)}` : "—"}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">مدة التشغيل</div>
          <div className="text-2xl font-bold">{duration(last?.uptime_s)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">زمن الاستجابة</div>
          <div className="text-2xl font-bold">{last?.latency_ms != null ? `${last.latency_ms} ms` : "—"}</div>
          <div className="text-[11px] text-muted">آخر تحديث {relTime(last?.ts)}</div>
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
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="font-semibold mb-2">استهلاك المعالج %</div>
          <PctAreaChart data={m?.series || []} dataKey="cpu" color="#38bdf8" />
        </div>
        <div className="card">
          <div className="font-semibold mb-2">استهلاك الذاكرة %</div>
          <PctAreaChart data={m?.series || []} dataKey="mem_pct" color="#a78bfa" />
        </div>
      </div>

      {/* storage */}
      <div className="card">
        <div className="font-semibold mb-3">أقسام التخزين</div>
        {storage.length === 0 ? (
          <div className="text-muted text-sm">لا توجد بيانات تخزين (قد لا يدعمها الجهاز عبر SNMP).</div>
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
        <div className="font-semibold mb-3">واجهات الشبكة</div>
        {ifaces.length === 0 ? (
          <div className="text-muted text-sm">لا توجد بيانات واجهات بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted border-b border-line">
                <tr className="text-right">
                  <th className="p-2 font-medium">الواجهة</th>
                  <th className="p-2 font-medium">الحالة</th>
                  <th className="p-2 font-medium">وارد</th>
                  <th className="p-2 font-medium">صادر</th>
                  <th className="p-2 font-medium">السرعة</th>
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
                        {ifIndex === i.if_index ? "إخفاء الرسم" : "عرض الرسم"}
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
              حركة الواجهة {ifaces.find((x) => x.if_index === ifIndex)?.if_name}
            </div>
            <TrafficChart data={m?.iface || []} />
          </div>
        )}
      </div>

      {d.notes && (
        <div className="card">
          <div className="font-semibold mb-1">ملاحظات</div>
          <div className="text-sm text-muted whitespace-pre-wrap">{d.notes}</div>
        </div>
      )}
    </div>
  );
}
