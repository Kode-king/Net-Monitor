"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, jsend } from "@/components/api";
import { useI18n } from "@/components/I18nProvider";

const METRIC_KEYS = { cpu: "metric.cpu.pct", mem: "metric.mem.pct", storage: "metric.storage.pct", down: "metric.down" };

export default function SettingsPage() {
  const { t } = useI18n();
  const { data: me } = useSWR("/api/auth/me", fetcher);
  const isAdmin = me?.user?.role === "admin";

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
      <PasswordSection />
      <RulesSection isAdmin={isAdmin} />
      {isAdmin && <UsersSection meId={me?.user?.username} />}
    </div>
  );
}

function PasswordSection() {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState(null);

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await jsend("/api/auth/password", "POST", { current, next });
      setMsg({ ok: true, text: t("settings.passwordChanged") });
      setCurrent("");
      setNext("");
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  }

  return (
    <form onSubmit={save} className="card space-y-3">
      <div className="font-semibold">{t("settings.changePassword")}</div>
      {msg && (
        <div className={`badge py-2 ${msg.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
          {msg.text}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">{t("settings.currentPassword")}</label>
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("settings.newPassword")}</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
      </div>
      <button className="btn-primary">{t("common.save")}</button>
    </form>
  );
}

function RulesSection({ isAdmin }) {
  const { t } = useI18n();
  const { data, mutate } = useSWR("/api/alert-rules", fetcher);
  const { data: dv } = useSWR("/api/devices", fetcher);
  const rules = data?.rules || [];
  const devices = dv?.devices || [];
  const [form, setForm] = useState({ metric: "cpu", operator: ">", threshold: 90, duration_s: 120, device_id: "" });

  const metricLabel = (m) => t(METRIC_KEYS[m] || m);

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
    if (!confirm(t("settings.rule.deleteConfirm"))) return;
    await jsend(`/api/alert-rules/${id}`, "DELETE");
    mutate();
  }

  return (
    <div className="card space-y-3">
      <div className="font-semibold">{t("settings.rules")}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted border-b border-line">
            <tr className="text-start">
              <th className="p-2 font-medium">{t("settings.rule.metric")}</th>
              <th className="p-2 font-medium">{t("settings.rule.device")}</th>
              <th className="p-2 font-medium">{t("settings.rule.condition")}</th>
              <th className="p-2 font-medium">{t("settings.rule.duration")}</th>
              <th className="p-2 font-medium">{t("settings.rule.enabled")}</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-line/40">
                <td className="p-2">{metricLabel(r.metric)}</td>
                <td className="p-2 text-muted">{r.device_name || t("common.allDevices")}</td>
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
                <td className="p-2 text-end">
                  {isAdmin && (
                    <button onClick={() => del(r.id)} className="text-rose-400 hover:underline text-xs">
                      {t("common.delete")}
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
            <label className="label">{t("settings.rule.metric")}</label>
            <select className="input" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
              {Object.keys(METRIC_KEYS).map((k) => (
                <option key={k} value={k}>{metricLabel(k)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("settings.rule.device")}</label>
            <select className="input" value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })}>
              <option value="">{t("common.allDevices")}</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {form.metric !== "down" && (
            <>
              <div>
                <label className="label">{t("settings.rule.operator")}</label>
                <select className="input" value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}>
                  {[">", ">=", "<", "<="].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t("settings.rule.threshold")}</label>
                <input type="number" className="input w-24" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label className="label">{t("settings.rule.durationS")}</label>
            <input type="number" className="input w-24" value={form.duration_s} onChange={(e) => setForm({ ...form, duration_s: e.target.value })} />
          </div>
          <button className="btn-primary">{t("settings.rule.add")}</button>
        </form>
      )}
    </div>
  );
}

function UsersSection({ meId }) {
  const { t } = useI18n();
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
    if (!confirm(t("settings.user.deleteConfirm"))) return;
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
      <div className="font-semibold">{t("settings.users")}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted border-b border-line">
            <tr className="text-start">
              <th className="p-2 font-medium">{t("settings.user.name")}</th>
              <th className="p-2 font-medium">{t("settings.user.role")}</th>
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
                <td className="p-2 text-end">
                  {u.username !== meId && (
                    <button onClick={() => del(u.id)} className="text-rose-400 hover:underline text-xs">{t("common.delete")}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <div>
          <label className="label">{t("settings.user.username")}</label>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label">{t("settings.user.password")}</label>
          <input type="text" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="label">{t("settings.user.role")}</label>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="viewer">viewer</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button className="btn-primary">{t("settings.user.add")}</button>
      </form>
    </div>
  );
}
