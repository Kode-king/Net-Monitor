"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { jsend } from "@/components/api";
import { useI18n } from "@/components/I18nProvider";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, lang, setLang } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await jsend("/api/auth/login", "POST", { username, password });
      router.push(params.get("next") || "/");
      router.refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xl font-bold">{t("login.heading")}</div>
            <div className="text-sm text-muted">{t("login.subtitle")}</div>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="btn border border-line text-muted hover:bg-panel2 px-2 py-1 text-xs shrink-0"
          >
            {t("lang.switch")}
          </button>
        </div>
        {err && (
          <div className="badge bg-rose-500/15 text-rose-400 w-full justify-center py-2">{err}</div>
        )}
        <div>
          <label className="label">{t("login.username")}</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">{t("login.password")}</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? t("login.submitting") : t("login.submit")}
        </button>
        <div className="text-xs text-muted text-center">
          {t("login.defaultHint")} <span className="text-ink">admin / admin</span>
        </div>
      </form>
    </div>
  );
}
