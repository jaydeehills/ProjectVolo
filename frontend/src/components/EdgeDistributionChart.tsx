"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { EdgeResult } from "@/lib/api";

interface EdgeDistributionChartProps {
  signals: EdgeResult[];
}

export default function EdgeDistributionChart({
  signals,
}: EdgeDistributionChartProps) {
  if (signals.length === 0) return null;

  // Build histogram buckets from -30% to +30% in 5% increments
  const buckets: { range: string; count: number; center: number }[] = [];
  for (let i = -30; i < 30; i += 5) {
    buckets.push({
      range: `${i > 0 ? "+" : ""}${i}%`,
      count: 0,
      center: i + 2.5,
    });
  }

  for (const s of signals) {
    const pct = s.edge * 100;
    const idx = Math.floor((pct + 30) / 5);
    const clamped = Math.max(0, Math.min(buckets.length - 1, idx));
    buckets[clamped].count++;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Edge Distribution
      </h3>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart
          data={buckets}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="range"
            tick={{ fontSize: 9, fill: "#52525b" }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "#52525b" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#a1a1aa",
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            formatter={(value) => [`${value} markets`, "Count"]}
          />
          <ReferenceLine x="0%" stroke="#3f3f46" strokeDasharray="3 3" />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {buckets.map((b, i) => (
              <Cell
                key={i}
                fill={
                  b.center > 0
                    ? "rgba(52, 211, 153, 0.5)"
                    : b.center < 0
                    ? "rgba(248, 113, 113, 0.4)"
                    : "rgba(113, 113, 122, 0.4)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
