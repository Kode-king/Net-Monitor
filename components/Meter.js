"use client";

export default function Meter({ label, value, sub }) {
  const v = value == null ? null : Math.max(0, Math.min(100, value));
  const color =
    v == null ? "#8a97ad" : v >= 90 ? "#f43f5e" : v >= 75 ? "#f59e0b" : "#34d399";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="text-ink">{v == null ? "—" : `${v.toFixed(1)}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-panel2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${v || 0}%`, background: color }}
        />
      </div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}
