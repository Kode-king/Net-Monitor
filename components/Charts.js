"use client";

import {
  AreaChart,
  Area,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { chartTime, chartDateTime } from "@/lib/format";
import { useI18n } from "./I18nProvider";

const fmtTime = (ts) => chartTime(ts);

export function PctAreaChart({ data, dataKey, color = "#38bdf8", height = 220, unit = "%" }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#26314a" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="ts" tickFormatter={fmtTime} stroke="#8a97ad" fontSize={11} minTickGap={40} />
        <YAxis stroke="#8a97ad" fontSize={11} domain={unit === "%" ? [0, 100] : ["auto", "auto"]} />
        <Tooltip
          contentStyle={{ background: "#131a26", border: "1px solid #26314a", borderRadius: 8 }}
          labelFormatter={(t) => chartDateTime(t)}
          formatter={(v) => [v == null ? "—" : `${Number(v).toFixed(1)}${unit}`, ""]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#g-${dataKey})`}
          connectNulls
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrafficChart({ data, height = 220 }) {
  const { t } = useI18n();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#26314a" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="ts" tickFormatter={fmtTime} stroke="#8a97ad" fontSize={11} minTickGap={40} />
        <YAxis
          stroke="#8a97ad"
          fontSize={11}
          tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
        />
        <Tooltip
          contentStyle={{ background: "#131a26", border: "1px solid #26314a", borderRadius: 8 }}
          labelFormatter={(t) => chartDateTime(t)}
          formatter={(v, n) => [
            v == null ? "—" : `${(v / 1e6).toFixed(2)} Mbps`,
            n === "in_bps" ? t("device.in") : t("device.out"),
          ]}
        />
        <Line type="monotone" dataKey="in_bps" stroke="#34d399" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        <Line type="monotone" dataKey="out_bps" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Spark({ data, dataKey, color = "#38bdf8" }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
