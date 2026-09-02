"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { jsend } from "./api";
import { useI18n } from "./I18nProvider";

const empty = {
  name: "",
  host: "",
  type: "server",
  snmp_version: "2c",
  snmp_community: "public",
  snmp_port: 161,
  snmp_sec_level: "authPriv",
  snmp_sec_name: "",
  snmp_auth_protocol: "sha",
  snmp_auth_key: "",
  snmp_priv_protocol: "aes",
  snmp_priv_key: "",
  snmp_context: "",
  poll_interval: 30,
  enabled: true,
  location: "",
  notes: "",
};

const AUTH_PROTOCOLS = ["md5", "sha", "sha224", "sha256", "sha384", "sha512"];
const PRIV_PROTOCOLS = ["des", "aes", "aes256b", "aes256r"];

export default function DeviceForm({ initial, id }) {
  const router = useRouter();
  const { t } = useI18n();
  // drop null/undefined from the loaded device so inputs stay controlled
  const clean = Object.fromEntries(
    Object.entries(initial || {}).filter(([, v]) => v != null)
  );
  const [f, setF] = useState({ ...empty, ...clean });
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
          <label className="label">{t("form.name")}</label>
          <input className="input" value={f.name} onChange={set("name")} required />
        </div>
        <div>
          <label className="label">{t("form.host")}</label>
          <input className="input" value={f.host} onChange={set("host")} required />
        </div>
        <div>
          <label className="label">{t("form.type")}</label>
          <select className="input" value={f.type} onChange={set("type")}>
            <option value="server">{t("type.server")}</option>
            <option value="switch">{t("type.switch")}</option>
            <option value="router">{t("type.router")}</option>
          </select>
        </div>
        <div>
          <label className="label">{t("form.location")}</label>
          <input className="input" value={f.location || ""} onChange={set("location")} />
        </div>
        <div>
          <label className="label">{t("form.snmpVersion")}</label>
          <select className="input" value={f.snmp_version} onChange={set("snmp_version")}>
            <option value="2c">v2c</option>
            <option value="1">v1</option>
            <option value="3">v3</option>
          </select>
        </div>
        {f.snmp_version !== "3" && (
          <div>
            <label className="label">{t("form.community")}</label>
            <input className="input" value={f.snmp_community} onChange={set("snmp_community")} />
          </div>
        )}
        <div>
          <label className="label">{t("form.snmpPort")}</label>
          <input type="number" className="input" value={f.snmp_port} onChange={set("snmp_port")} />
        </div>
        <div>
          <label className="label">{t("form.pollInterval")}</label>
          <input type="number" min={5} className="input" value={f.poll_interval} onChange={set("poll_interval")} />
        </div>
      </div>

      {f.snmp_version === "3" && (
        <div className="rounded-lg border border-white/10 p-4 space-y-4">
          <div className="text-sm font-semibold text-muted">{t("form.v3Section")}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t("form.secName")}</label>
              <input className="input" value={f.snmp_sec_name} onChange={set("snmp_sec_name")} autoComplete="off" />
            </div>
            <div>
              <label className="label">{t("form.secLevel")}</label>
              <select className="input" value={f.snmp_sec_level} onChange={set("snmp_sec_level")}>
                <option value="noAuthNoPriv">{t("form.secLevel.noAuthNoPriv")}</option>
                <option value="authNoPriv">{t("form.secLevel.authNoPriv")}</option>
                <option value="authPriv">{t("form.secLevel.authPriv")}</option>
              </select>
            </div>
            {f.snmp_sec_level !== "noAuthNoPriv" && (
              <>
                <div>
                  <label className="label">{t("form.authProtocol")}</label>
                  <select className="input" value={f.snmp_auth_protocol} onChange={set("snmp_auth_protocol")}>
                    {AUTH_PROTOCOLS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t("form.authKey")}</label>
                  <input type="password" className="input" value={f.snmp_auth_key} onChange={set("snmp_auth_key")} autoComplete="new-password" />
                </div>
              </>
            )}
            {f.snmp_sec_level === "authPriv" && (
              <>
                <div>
                  <label className="label">{t("form.privProtocol")}</label>
                  <select className="input" value={f.snmp_priv_protocol} onChange={set("snmp_priv_protocol")}>
                    {PRIV_PROTOCOLS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t("form.privKey")}</label>
                  <input type="password" className="input" value={f.snmp_priv_key} onChange={set("snmp_priv_key")} autoComplete="new-password" />
                </div>
              </>
            )}
            <div>
              <label className="label">{t("form.context")}</label>
              <input className="input" value={f.snmp_context} onChange={set("snmp_context")} />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="label">{t("form.notes")}</label>
        <textarea className="input" rows={2} value={f.notes || ""} onChange={set("notes")} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!f.enabled} onChange={set("enabled")} />
        {t("form.pollingEnabled")}
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
            ? t("form.testing")
            : test.ok
            ? t("form.testOk", {
                name: test.sysName || "",
                descr: test.sysDescr ? "· " + test.sysDescr.slice(0, 60) : "",
              })
            : t("form.testFail", { error: test.error })}
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={runTest} className="btn-ghost">
          {t("form.testSnmp")}
        </button>
        <button className="btn-primary" disabled={busy}>
          {busy ? t("common.saving") : id ? t("form.saveChanges") : t("form.addDevice")}
        </button>
      </div>
    </form>
  );
}
