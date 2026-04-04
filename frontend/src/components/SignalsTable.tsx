"use client";

import { useState } from "react";
import { EdgeResult } from "@/lib/api";

function edgeColor(edge: number, signal: string): string {
  if (signal === "HOLD") return "text-zinc-500";
  if (edge > 0.15) return "text-emerald-400";
  if (edge > 0.05) return "text-green-400";
  if (edge < -0.15) return "text-red-400";
  if (edge < -0.05) return "text-rose-400";
  return "text-zinc-400";
}

function signalBadge(signal: string) {
  if (signal === "BUY_YES") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        BUY YES
      </span>
    );
  }
  if (signal === "BUY_NO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
        BUY NO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-500 border border-zinc-700">
      HOLD
    </span>
  );
}

function confidenceBadge(c: string) {
  const colors =
    c === "high"
      ? "text-emerald-400"
      : c === "medium"
      ? "text-amber-400"
      : "text-zinc-500";
  return (
    <span className={`capitalize text-xs font-medium ${colors}`}>{c}</span>
  );
}

function edgeBar(edge: number) {
  const pct = Math.min(Math.abs(edge) * 100, 30);
  const width = `${(pct / 30) * 100}%`;
  const color = edge > 0 ? "bg-emerald-500/40" : "bg-red-500/40";
  return (
    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width }} />
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

interface SignalsTableProps {
  signals: EdgeResult[];
  loading: boolean;
}

export default function SignalsTable({ signals, loading }: SignalsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"edge" | "ev" | "confidence">("ev");

  const sorted = [...signals].sort((a, b) => {
    if (sortKey === "edge") return Math.abs(b.edge) - Math.abs(a.edge);
    if (sortKey === "ev") return b.expected_value - a.expected_value;
    const confOrder = { high: 3, medium: 2, low: 1 };
    return (
      (confOrder[b.confidence as keyof typeof confOrder] || 0) -
      (confOrder[a.confidence as keyof typeof confOrder] || 0)
    );
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">
          Signal Board
          {signals.length > 0 && (
            <span className="ml-2 text-zinc-500 font-normal">
              {signals.filter((s) => s.signal !== "HOLD").length} active /{" "}
              {signals.length} total
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-zinc-600 mr-1">Sort:</span>
          {(["ev", "edge", "confidence"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-2 py-0.5 rounded ${
                sortKey === key
                  ? "bg-zinc-700 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {key === "ev" ? "EV" : key === "edge" ? "Edge" : "Conf"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
              <th className="text-left py-2 px-4 font-medium">Market</th>
              <th className="text-left py-2 px-2 font-medium w-20">Cat</th>
              <th className="text-right py-2 px-2 font-medium w-14">Mkt</th>
              <th className="text-right py-2 px-2 font-medium w-14">
                AI Est
              </th>
              <th className="text-right py-2 px-2 font-medium w-24">Edge</th>
              <th className="text-center py-2 px-2 font-medium w-20">
                Signal
              </th>
              <th className="text-center py-2 px-2 font-medium w-14">Conf</th>
              <th className="text-right py-2 px-2 font-medium w-14">EV</th>
              <th className="text-right py-2 px-2 font-medium w-16">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && signals.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-600">
                  <div className="animate-pulse">Scanning markets...</div>
                </td>
              </tr>
            ) : signals.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-600">
                  No signals yet. Start the backend to begin scanning.
                </td>
              </tr>
            ) : (
              sorted.map((s) => {
                const isExpanded = expandedId === s.market_id;
                return (
                  <tr
                    key={s.market_id}
                    className="group border-b border-zinc-800/50 last:border-0"
                  >
                    <td colSpan={9} className="p-0">
                      {/* Main row */}
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : s.market_id)
                        }
                        className="w-full text-left flex items-center hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 py-2.5 px-4">
                          <p className="text-zinc-200 truncate leading-tight text-[13px]">
                            {s.question}
                          </p>
                        </div>
                        <div className="w-20 shrink-0 py-2.5 px-2 text-zinc-500 truncate text-[11px]">
                          {s.category}
                        </div>
                        <div className="w-14 shrink-0 py-2.5 px-2 text-right font-mono text-zinc-300">
                          {(s.market_price * 100).toFixed(0)}¢
                        </div>
                        <div className="w-14 shrink-0 py-2.5 px-2 text-right font-mono text-blue-400">
                          {(s.estimated_probability * 100).toFixed(0)}¢
                        </div>
                        <div className="w-24 shrink-0 py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {edgeBar(s.edge)}
                            <span
                              className={`font-mono font-semibold ${edgeColor(
                                s.edge,
                                s.signal
                              )}`}
                            >
                              {s.edge > 0 ? "+" : ""}
                              {(s.edge * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-20 shrink-0 py-2.5 px-2 text-center">
                          {signalBadge(s.signal)}
                        </div>
                        <div className="w-14 shrink-0 py-2.5 px-2 text-center">
                          {confidenceBadge(s.confidence)}
                        </div>
                        <div className="w-14 shrink-0 py-2.5 px-2 text-right font-mono text-amber-400">
                          {s.expected_value.toFixed(3)}
                        </div>
                        <div className="w-16 shrink-0 py-2.5 px-2 text-right text-[11px] text-zinc-600">
                          {formatTime(s.estimated_at)}
                        </div>
                      </button>

                      {/* Expanded reasoning */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-zinc-800/30 border-t border-zinc-800/50">
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
                            <span className="text-zinc-500 font-medium">
                              AI Reasoning:{" "}
                            </span>
                            {s.reasoning}
                          </p>
                          <div className="flex gap-4 mt-2 text-[11px] text-zinc-600">
                            <span>
                              Market:{" "}
                              <span className="text-zinc-400 font-mono">
                                {(s.market_price * 100).toFixed(1)}%
                              </span>
                            </span>
                            <span>
                              AI:{" "}
                              <span className="text-zinc-400 font-mono">
                                {(s.estimated_probability * 100).toFixed(1)}%
                              </span>
                            </span>
                            <span>
                              Edge:{" "}
                              <span className="text-zinc-400 font-mono">
                                {s.edge_percentage.toFixed(1)}%
                              </span>
                            </span>
                            <span>ID: {s.market_id.slice(0, 12)}...</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
