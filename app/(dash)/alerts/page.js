"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/components/api";
import { clockTime, relTime } from "@/lib/format";

const TABS = [
  { k: "firing", label: "نشطة" },
  { k: "resolved", label: "منتهية" },
  { k: "all", label: "الكل" },
];

const metricLabel = { cpu: "المعالج", mem: "الذاكرة", storage: "التخزين", down: "توقف الجهاز" };

export default function AlertsPage() {
  const [tab, setTab] = useState("firing");
  const { data } = useSWR(`/api/alerts?state=${tab}`, fetcher, { refreshInterval: 8000 });
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">التنبيهات</h1>

      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`btn ${tab === t.k ? "bg-sky-600 text-white" : "border border-line text-muted hover:bg-panel2"}`}
          >
            {t.label}
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
                  {a.state === "firing" ? "نشط" : "منتهي"}
                </span>
                <span className="badge bg-panel2 text-muted">{metricLabel[a.metric] || a.metric}</span>
                <Link href={`/devices/${a.device_id}`} className="text-sky-400 hover:underline font-medium">
                  {a.device_name}
                </Link>
              </div>
              <div className="text-sm mt-1">{a.message}</div>
            </div>
            <div className="text-xs text-muted text-left shrink-0">
              <div>بدأ: {clockTime(a.started_at)}</div>
              <div>{a.resolved_at ? `انتهى: ${clockTime(a.resolved_at)}` : relTime(a.started_at)}</div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="card text-center text-muted py-10">لا توجد تنبيهات في هذا التصنيف.</div>
        )}
      </div>
    </div>
  );
}
