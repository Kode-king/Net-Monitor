"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { jsend } from "./api";

const empty = {
  name: "",
  host: "",
  type: "server",
  snmp_version: "2c",
  snmp_community: "public",
  snmp_port: 161,
  poll_interval: 30,
  enabled: true,
  location: "",
  notes: "",
};

export default function DeviceForm({ initial, id }) {
  const router = useRouter();
  const [f, setF] = useState({ ...empty, ...(initial || {}) });
  const [err, setErr] = useState("");
  const [test, setTest] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setF((s) => ({ ...s, [k]: v }));
  };

  async function runTest() {
    setTest({ loading: true });
    try {
      const r = await jsend("/api/devices/test", "POST", f);
      setTest(r);
    } catch (e) {
      setTest({ ok: false, error: e.message });
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (id) {
        await jsend(`/api/devices/${id}`, "PUT", f);
        router.push(`/devices/${id}`);
      } else {
        const r = await jsend("/api/devices", "POST", f);
        router.push(`/devices/${r.id}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4">
      {err && <div className="badge bg-rose-500/15 text-rose-400 w-full justify-center py-2">{err}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">الاسم</label>
          <input className="input" value={f.name} onChange={set("name")} required />
        </div>
        <div>
          <label className="label">العنوان / IP (host)</label>
          <input className="input" value={f.host} onChange={set("host")} required />
        </div>
        <div>
          <label className="label">النوع</label>
          <select className="input" value={f.type} onChange={set("type")}>
            <option value="server">سيرفر</option>
            <option value="switch">سويتش</option>
            <option value="router">راوتر</option>
          </select>
        </div>
        <div>
          <label className="label">الموقع (اختياري)</label>
          <input className="input" value={f.location || ""} onChange={set("location")} />
        </div>
        <div>
          <label className="label">إصدار SNMP</label>
          <select className="input" value={f.snmp_version} onChange={set("snmp_version")}>
            <option value="2c">v2c</option>
            <option value="1">v1</option>
          </select>
        </div>
        <div>
          <label className="label">Community String</label>
          <input className="input" value={f.snmp_community} onChange={set("snmp_community")} />
        </div>
        <div>
          <label className="label">منفذ SNMP</label>
          <input type="number" className="input" value={f.snmp_port} onChange={set("snmp_port")} />
        </div>
        <div>
          <label className="label">فترة الاستعلام (ثانية)</label>
          <input type="number" min={5} className="input" value={f.poll_interval} onChange={set("poll_interval")} />
        </div>
      </div>

      <div>
        <label className="label">ملاحظات</label>
        <textarea className="input" rows={2} value={f.notes || ""} onChange={set("notes")} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!f.enabled} onChange={set("enabled")} />
        مُفعّل (يتم استعلامه دوريًا)
      </label>

      {test && (
        <div
          className={`badge w-full justify-center py-2 ${
            test.loading
              ? "bg-panel2 text-muted"
              : test.ok
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-rose-500/15 text-rose-400"
          }`}
        >
          {test.loading
            ? "جارٍ الاختبار…"
            : test.ok
            ? `نجح الاتصال — ${test.sysName || ""} ${test.sysDescr ? "· " + test.sysDescr.slice(0, 60) : ""}`
            : `فشل: ${test.error}`}
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={runTest} className="btn-ghost">
          اختبار SNMP
        </button>
        <button className="btn-primary" disabled={busy}>
          {busy ? "جارٍ الحفظ…" : id ? "حفظ التعديلات" : "إضافة الجهاز"}
        </button>
      </div>
    </form>
  );
}
