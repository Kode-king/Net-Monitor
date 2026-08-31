"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { jsend } from "@/components/api";

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
        <div>
          <div className="text-xl font-bold">مراقبة الشبكة والسيرفرات</div>
          <div className="text-sm text-muted">سجّل الدخول للمتابعة</div>
        </div>
        {err && (
          <div className="badge bg-rose-500/15 text-rose-400 w-full justify-center py-2">{err}</div>
        )}
        <div>
          <label className="label">اسم المستخدم</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">كلمة المرور</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "جارٍ الدخول…" : "دخول"}
        </button>
        <div className="text-xs text-muted text-center">
          الحساب الافتراضي: <span className="text-ink">admin / admin</span>
        </div>
      </form>
    </div>
  );
}
