"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, jsend } from "@/components/api";

const metricLabel = { cpu: "المعالج %", mem: "الذاكرة %", storage: "التخزين %", down: "توقف الجهاز" };

export default function SettingsPage() {
  const { data: me } = useSWR("/api/auth/me", fetcher);
  const isAdmin = me?.user?.role === "admin";

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">الإعدادات</h1>
      <PasswordSection />
      <RulesSection isAdmin={isAdmin} />
      {isAdmin && <UsersSection meId={me?.user?.username} />}
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState(null);

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await jsend("/api/auth/password", "POST", { current, next });
      setMsg({ ok: true, text: "تم تغيير كلمة المرور" });
      setCurrent("");
      setNext("");
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  }

  return (
    <form onSubmit={save} className="card space-y-3">
      <div className="font-semibold">تغيير كلمة المرور</div>
      {msg && (
        <div className={`badge py-2 ${msg.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
          {msg.text}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">كلمة المرور الحالية</label>
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="label">كلمة المرور الجديدة</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
      </div>
      <button className="btn-primary">حفظ</button>
    </form>
  );
}

function RulesSection({ isAdmin }) {
  const { data, mutate } = useSWR("/api/alert-rules", fetcher);
  const { data: dv } = useSWR("/api/devices", fetcher);
  const rules = data?.rules || [];
  const devices = dv?.devices || [];
  const [form, setForm] = useState({ metric: "cpu", operator: ">", threshold: 90, duration_s: 120, device_id: "" });

  async function add(e) {
    e.preventDefault();
    try {
      await jsend("/api/alert-rules", "POST", { ...form, device_id: form.device_id || null });
      mutate();
    } catch (e) {
      alert(e.message);
    }
  }
  async function patch(id, body) {
    await jsend(`/api/alert-rules/${id}`, "PUT", body);
    mutate();
  }
  async function del(id) {
    if (!confirm("حذف القاعدة؟")) return;
    await jsend(`/api/alert-rules/${id}`, "DELETE");
    mutate();
  }

  return (
    <div className="card space-y-3">
      <div className="font-semibold">قواعد التنبيه</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted border-b border-line">
            <tr className="text-right">
              <th className="p-2 font-medium">المقياس</th>
              <th className="p-2 font-medium">الجهاز</th>
              <th className="p-2 font-medium">الشرط</th>
              <th className="p-2 font-medium">المدة</th>
              <th className="p-2 font-medium">مفعّل</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-line/40">
                <td className="p-2">{metricLabel[r.metric]}</td>
                <td className="p-2 text-muted">{r.device_name || "كل الأجهزة"}</td>
                <td className="p-2 font-mono">{r.metric === "down" ? "—" : `${r.operator} ${r.threshold}`}</td>
                <td className="p-2 text-muted">{r.duration_s}s</td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={!!r.enabled}
                    disabled={!isAdmin}
                    onChange={(e) => patch(r.id, { enabled: e.target.checked })}
                  />
                </td>
                <td className="p-2 text-left">
                  {isAdmin && (
                    <button onClick={() => del(r.id)} className="text-rose-400 hover:underline text-xs">
                      حذف
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <div>
            <label className="label">المقياس</label>
            <select className="input" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
              {Object.entries(metricLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">الجهاز</label>
            <select className="input" value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })}>
              <option value="">كل الأجهزة</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {form.metric !== "down" && (
            <>
              <div>
                <label className="label">المشغّل</label>
                <select className="input" value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}>
                  {[">", ">=", "<", "<="].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label">الحد %</label>
                <input type="number" className="input w-24" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label className="label">المدة (ث)</label>
            <input type="number" className="input w-24" value={form.duration_s} onChange={(e) => setForm({ ...form, duration_s: e.target.value })} />
          </div>
          <button className="btn-primary">إضافة قاعدة</button>
        </form>
      )}
    </div>
  );
}

function UsersSection({ meId }) {
  const { data, mutate } = useSWR("/api/users", fetcher);
  const users = data?.users || [];
  const [form, setForm] = useState({ username: "", password: "", role: "viewer" });

  async function add(e) {
    e.preventDefault();
    try {
      await jsend("/api/users", "POST", form);
      setForm({ username: "", password: "", role: "viewer" });
      mutate();
    } catch (e) {
      alert(e.message);
    }
  }
  async function del(id) {
    if (!confirm("حذف المستخدم؟")) return;
    try {
      await jsend(`/api/users/${id}`, "DELETE");
      mutate();
    } catch (e) {
      alert(e.message);
    }
  }
  async function setRole(id, role) {
    await jsend(`/api/users/${id}`, "PUT", { role });
    mutate();
  }

  return (
    <div className="card space-y-3">
      <div className="font-semibold">المستخدمون</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted border-b border-line">
            <tr className="text-right">
              <th className="p-2 font-medium">المستخدم</th>
              <th className="p-2 font-medium">الصلاحية</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/40">
                <td className="p-2">{u.username}</td>
                <td className="p-2">
                  <select
                    className="input w-32"
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value)}
                  >
                    <option value="viewer">viewer</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="p-2 text-left">
                  {u.username !== meId && (
                    <button onClick={() => del(u.id)} className="text-rose-400 hover:underline text-xs">حذف</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <div>
          <label className="label">اسم المستخدم</label>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label">كلمة المرور</label>
          <input type="text" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="label">الصلاحية</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="viewer">viewer</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button className="btn-primary">إضافة مستخدم</button>
      </form>
    </div>
  );
}
