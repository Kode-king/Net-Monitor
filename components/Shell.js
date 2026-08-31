"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher, jsend } from "./api";

const NAV = [
  { href: "/", label: "الرئيسية", icon: "▦" },
  { href: "/devices", label: "الأجهزة", icon: "🖥" },
  { href: "/alerts", label: "التنبيهات", icon: "🔔" },
  { href: "/settings", label: "الإعدادات", icon: "⚙" },
];

export default function Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useSWR("/api/auth/me", fetcher);
  const { data: ov } = useSWR("/api/overview", fetcher, { refreshInterval: 10000 });

  const firing = ov?.firing_alerts || 0;

  async function logout() {
    await jsend("/api/auth/logout", "POST");
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-l border-line bg-panel flex flex-col">
        <div className="p-4 border-b border-line">
          <div className="text-lg font-bold">مراقبة الشبكة</div>
          <div className="text-xs text-muted">SNMP Monitoring</div>
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
                <span>{n.label}</span>
                {n.href === "/alerts" && firing > 0 && (
                  <span className="ml-auto badge bg-rose-500/20 text-rose-400">{firing}</span>
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
                <span className="badge bg-panel2 text-muted mr-2">{me.user.role}</span>
              </>
            ) : (
              "…"
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className={ov?.poller ? "text-emerald-400" : "text-rose-400"}>
              ● poller {ov?.poller ? "يعمل" : "متوقف"}
            </span>
            <button onClick={logout} className="text-rose-400 hover:underline">
              خروج
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
