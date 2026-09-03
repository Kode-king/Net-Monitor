"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher, jsend } from "./api";
import { useI18n } from "./I18nProvider";
import CriticalAlarm from "./CriticalAlarm";

const NAV = [
  { href: "/", key: "nav.home", icon: "▦" },
  { href: "/devices", key: "nav.devices", icon: "🖥" },
  { href: "/alerts", key: "nav.alerts", icon: "🔔" },
  { href: "/settings", key: "nav.settings", icon: "⚙" },
];

export default function Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const { data: me } = useSWR("/api/auth/me", fetcher);
  const { data: ov } = useSWR("/api/overview", fetcher, { refreshInterval: 10000 });

  const firing = ov?.firing_alerts || 0;
  const critical = ov?.critical_alerts || 0;
  const start = lang === "ar" ? "mr-auto" : "ml-auto";

  async function logout() {
    await jsend("/api/auth/logout", "POST");
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-e border-line bg-panel flex flex-col">
        <div className="p-4 border-b border-line flex items-start justify-between gap-2">
          <div>
            <div className="text-lg font-bold">{t("app.shortTitle")}</div>
            <div className="text-xs text-muted">{t("app.brandSub")}</div>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="btn border border-line text-muted hover:bg-panel2 px-2 py-1 text-xs"
            title={t("lang.switch")}
          >
            {t("lang.switch")}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-sky-600 text-white" : "text-muted hover:bg-panel2 hover:text-ink"
                }`}
              >
                <span>{n.icon}</span>
                <span>{t(n.key)}</span>
                {n.href === "/alerts" && firing > 0 && (
                  <span className={`${start} badge bg-rose-500/20 text-rose-400`}>{firing}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line text-xs text-muted">
          <div className="mb-2">
            {me?.user ? (
              <>
                <span className="text-ink">{me.user.username}</span>
                <span className="badge bg-panel2 text-muted mx-2">{me.user.role}</span>
              </>
            ) : (
              "…"
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className={ov?.poller ? "text-emerald-400" : "text-rose-400"}>
              ● {ov?.poller ? t("poller.running") : t("poller.stopped")}
            </span>
            <button onClick={logout} className="text-rose-400 hover:underline">
              {t("common.logout")}
            </button>
          </div>
        </div>
      </aside>
      <main className={`flex-1 min-w-0 p-6 ${critical > 0 ? "pb-24" : ""}`}>{children}</main>
      <CriticalAlarm count={critical} />
    </div>
  );
}
