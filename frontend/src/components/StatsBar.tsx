"use client";

import { EdgeResult, Market } from "@/lib/api";

interface StatsBarProps {
  markets: Market[];
  signals: EdgeResult[];
  lastUpdated: Date | null;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500 truncate">
        {label}
      </p>
      <p className="text-xl font-semibold text-zinc-100 font-mono mt-0.5">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{sub}</p>
      )}
    </div>
  );
}

export default function StatsBar({
  markets,
  signals,
  lastUpdated,
}: StatsBarProps) {
  const activeSignals = signals.filter((s) => s.signal !== "HOLD");
  const avgEdge =
    activeSignals.length > 0
      ? activeSignals.reduce((sum, s) => sum + Math.abs(s.edge), 0) /
        activeSignals.length
      : 0;
  const buyYes = activeSignals.filter((s) => s.signal === "BUY_YES").length;
  const buyNo = activeSignals.filter((s) => s.signal === "BUY_NO").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Markets Tracked"
        value={markets.length.toString()}
        sub={`vol > $10k, closes > 7d`}
      />
      <StatCard
        label="Active Signals"
        value={activeSignals.length.toString()}
        sub={`${buyYes} buy yes / ${buyNo} buy no`}
      />
      <StatCard
        label="Avg Edge (Active)"
        value={avgEdge > 0 ? `${(avgEdge * 100).toFixed(1)}%` : "--"}
        sub={avgEdge > 0.1 ? "strong" : avgEdge > 0.05 ? "moderate" : "thin"}
      />
      <StatCard
        label="Last Scan"
        value={
          lastUpdated
            ? lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "--:--"
        }
        sub="polls every 30s"
      />
    </div>
  );
}
