"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/components/api";
import { pct, bytes, relTime, typeLabel, statusMeta } from "@/lib/format";

export default function DevicesPage() {
  const { data } = useSWR("/api/devices", fetcher, { refreshInterval: 8000 });
  const devices = data?.devices || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الأجهزة ({devices.length})</h1>
        <Link href="/devices/new" className="btn-primary">+ إضافة جهاز</Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-muted border-b border-line">
            <tr className="text-right">
              <th className="p-3 font-medium">الاسم</th>
              <th className="p-3 font-medium">النوع</th>
              <th className="p-3 font-medium">العنوان</th>
              <th className="p-3 font-medium">الحالة</th>
              <th className="p-3 font-medium">CPU</th>
              <th className="p-3 font-medium">RAM</th>
              <th className="p-3 font-medium">آخر تحديث</th>
              <th className="p-3 font-medium">تنبيهات</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const sm = statusMeta[d.status];
              return (
                <tr key={d.id} className="border-b border-line/50 hover:bg-panel2">
                  <td className="p-3">
                    <Link href={`/devices/${d.id}`} className="text-sky-400 hover:underline">
                      {d.name}
                    </Link>
                  </td>
                  <td className="p-3 text-muted">{typeLabel[d.type]}</td>
                  <td className="p-3 text-muted font-mono text-xs">{d.host}</td>
                  <td className="p-3"><span className={`badge ${sm.cls}`}>{sm.label}</span></td>
                  <td className="p-3">{pct(d.last?.cpu)}</td>
                  <td className="p-3">
                    {pct(d.mem_pct)}
                    {d.last?.mem_total ? (
                      <span className="text-muted text-xs"> ({bytes(d.last.mem_total)})</span>
                    ) : null}
                  </td>
                  <td className="p-3 text-muted text-xs">{relTime(d.last?.ts)}</td>
                  <td className="p-3">
                    {d.firing_alerts > 0 ? (
                      <span className="badge bg-rose-500/20 text-rose-400">{d.firing_alerts}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {devices.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">
                  لا توجد أجهزة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
