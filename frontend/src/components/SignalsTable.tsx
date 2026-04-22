"use client";

import { useState, useCallback } from "react";
import { EdgeResult, api } from "@/lib/api";

// ── Star icon ─────────────────────────────────────────────────
function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg
      viewBox="0 0 24 24"
      className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      className="w-3.5 h-3.5 fill-none stroke-zinc-300 dark:stroke-zinc-700"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function edgeColor(edge: number, signal: string): string {
  if (signal === "HOLD") return "text-zinc-400 dark:text-zinc-500";
  if (edge > 0.15) return "text-emerald-600 dark:text-emerald-400";
  if (edge > 0.05) return "text-green-600 dark:text-green-400";
  if (edge < -0.15) return "text-red-600 dark:text-red-400";
  if (edge < -0.05) return "text-rose-600 dark:text-rose-400";
  return "text-zinc-500 dark:text-zinc-400";
}

function signalBadge(signal: string) {
  if (signal === "BUY_YES") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
        BUY YES
      </span>
    );
  }
  if (signal === "BUY_NO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/25">
        BUY NO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
      HOLD
    </span>
  );
}

function confidenceLabel(c: string) {
  const colors =
    c === "high"
      ? "text-emerald-600 dark:text-emerald-400"
      : c === "medium"
      ? "text-amber-600 dark:text-amber-400"
      : "text-zinc-400 dark:text-zinc-500";
  return (
    <span className={`capitalize text-xs font-medium ${colors}`}>{c}</span>
  );
}

function edgeBar(edge: number) {
  const pct = Math.min(Math.abs(edge) * 100, 30);
  const width = `${(pct / 30) * 100}%`;
  const color = edge > 0 ? "bg-emerald-500/40" : "bg-red-500/40";
  return (
    <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
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

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

// ── Confidence meter ──────────────────────────────────────────────

function ConfidenceMeter({ confidence }: { confidence: string }) {
  const levels = { low: 1, medium: 2, high: 3 } as const;
  const filled = levels[confidence as keyof typeof levels] ?? 1;

  const barColor =
    confidence === "high"
      ? "bg-emerald-500"
      : confidence === "medium"
      ? "bg-amber-500"
      : "bg-zinc-400";

  const labelColor =
    confidence === "high"
      ? "text-emerald-600 dark:text-emerald-400"
      : confidence === "medium"
      ? "text-amber-600 dark:text-amber-400"
      : "text-zinc-500 dark:text-zinc-400";

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-2 rounded-sm transition-all ${
              level <= filled
                ? `${barColor} ${level === 1 ? "w-5" : level === 2 ? "w-7" : "w-9"}`
                : "bg-zinc-200 dark:bg-zinc-700 " +
                  (level === 1 ? "w-5" : level === 2 ? "w-7" : "w-9")
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-semibold capitalize ${labelColor}`}>
        {confidence} confidence
      </span>
    </div>
  );
}

// ── Probability comparison bar ────────────────────────────────────

function ProbabilityCompare({
  market,
  ai,
  edge,
  signal,
}: {
  market: number;
  ai: number;
  edge: number;
  signal: string;
}) {
  const mktPct = Math.round(market * 100);
  const aiPct = Math.round(ai * 100);
  const edgeSign = edge > 0 ? "+" : "";
  const edgeColor =
    signal === "HOLD"
      ? "text-zinc-400 dark:text-zinc-500"
      : edge > 0.05
      ? "text-emerald-600 dark:text-emerald-400"
      : edge < -0.05
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-500 dark:text-zinc-400";

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Market price */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
          Market Price
        </p>
        <p className="text-xl font-bold font-mono text-zinc-700 dark:text-zinc-200">
          {mktPct}%
        </p>
        <div className="mt-1.5 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-400 dark:bg-zinc-500 rounded-full"
            style={{ width: `${mktPct}%` }}
          />
        </div>
      </div>

      {/* AI estimate */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 rounded-md px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-1">
          AI Estimate
        </p>
        <p className="text-xl font-bold font-mono text-blue-700 dark:text-blue-300">
          {aiPct}%
        </p>
        <div className="mt-1.5 h-1 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${aiPct}%` }}
          />
        </div>
      </div>

      {/* Edge */}
      <div
        className={`rounded-md px-3 py-2.5 border ${
          signal === "HOLD"
            ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
            : edge > 0
            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25"
            : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
          Edge
        </p>
        <p className={`text-xl font-bold font-mono ${edgeColor}`}>
          {edgeSign}
          {(edge * 100).toFixed(1)}%
        </p>
        <div className="mt-1.5 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              edge > 0 ? "bg-emerald-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(Math.abs(edge) * 500, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Expanded research report panel ───────────────────────────────

interface ReportPanelProps {
  signal: EdgeResult;
  onReanalyze: (marketId: string) => void;
  reanalyzing: boolean;
}

function ReportPanel({ signal: s, onReanalyze, reanalyzing }: ReportPanelProps) {
  return (
    <div className="px-4 pt-3 pb-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-700/60">
      {/* Report header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-blue-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Research Report
          </span>
        </div>
        {signalBadge(s.signal)}
      </div>

      {/* Probability comparison */}
      <ProbabilityCompare
        market={s.market_price}
        ai={s.estimated_probability}
        edge={s.edge}
        signal={s.signal}
      />

      {/* Confidence meter */}
      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          Confidence
        </p>
        <ConfidenceMeter confidence={s.confidence} />
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-200 dark:border-zinc-700/60 my-4" />

      {/* AI Reasoning */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
          AI Reasoning
        </p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {s.reasoning}
        </p>
      </div>

      {/* Key Factors */}
      {s.key_factors && s.key_factors.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
            Key Factors
          </p>
          <ul className="space-y-2">
            {s.key_factors.map((factor, i) => (
              <li key={i} className="flex gap-2.5 items-start">
                <span className="shrink-0 mt-px w-4 h-4 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug">
                  {factor}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer row: timestamp + re-analyze */}
      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
        <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
          <span className="text-zinc-300 dark:text-zinc-600">Estimated</span>{" "}
          {formatTimestamp(s.estimated_at)}
          <span className="mx-2 text-zinc-200 dark:text-zinc-700">·</span>
          <span className="font-mono text-[10px]">
            {s.market_id.slice(0, 16)}…
          </span>
        </div>
        <button
          onClick={() => onReanalyze(s.market_id)}
          disabled={reanalyzing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border transition-colors
            bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600
            text-zinc-600 dark:text-zinc-300
            hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {reanalyzing ? (
            <>
              <svg
                className="w-3 h-3 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                />
              </svg>
              Analyzing…
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Re-analyze
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

interface SignalsTableProps {
  signals: EdgeResult[];
  loading: boolean;
  watchedIds: Set<string>;
  onToggleStar: (signal: EdgeResult) => void;
}

export default function SignalsTable({
  signals,
  loading,
  watchedIds,
  onToggleStar,
}: SignalsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"edge" | "ev" | "confidence">("ev");
  // Map of market_id -> updated signal after re-analyze
  const [overrides, setOverrides] = useState<Record<string, EdgeResult>>({});
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);

  const sorted = [...signals].sort((a, b) => {
    if (sortKey === "edge") return Math.abs(b.edge) - Math.abs(a.edge);
    if (sortKey === "ev") return b.expected_value - a.expected_value;
    const confOrder = { high: 3, medium: 2, low: 1 };
    return (
      (confOrder[b.confidence as keyof typeof confOrder] || 0) -
      (confOrder[a.confidence as keyof typeof confOrder] || 0)
    );
  });

  const handleReanalyze = useCallback(
    async (marketId: string) => {
      const base = overrides[marketId] ?? signals.find((s) => s.market_id === marketId);
      if (!base || reanalyzing) return;
      setReanalyzing(marketId);
      try {
        const fresh = await api.estimate({
          market_id: marketId,
          question: base.question,
          category: base.category,
          context: "",
          force_refresh: true,
        });
        // Merge the new estimate fields back into an EdgeResult shape.
        // Market price and edge aren't recalculated here — only the
        // AI estimate fields update. The next polling cycle recalculates everything.
        setOverrides((prev) => ({
          ...prev,
          [marketId]: {
            ...base,
            estimated_probability: fresh.estimated_probability,
            confidence: fresh.confidence,
            reasoning: fresh.reasoning,
            key_factors: fresh.key_factors,
            edge: fresh.estimated_probability - base.market_price,
            edge_percentage: (fresh.estimated_probability - base.market_price) * 100,
            estimated_at: new Date().toISOString(),
          },
        }));
      } catch (err) {
        console.error("Re-analyze failed:", err);
      } finally {
        setReanalyzing(null);
      }
    },
    [signals, overrides, reanalyzing]
  );

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Research Alerts
          {signals.length > 0 && (
            <span className="ml-2 text-zinc-400 dark:text-zinc-500 font-normal">
              {signals.filter((s) => s.signal !== "HOLD").length} active /{" "}
              {signals.length} covered
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-zinc-400 dark:text-zinc-600 mr-1">Sort:</span>
          {(["ev", "edge", "confidence"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-2 py-0.5 rounded ${
                sortKey === key
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
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
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <th className="text-left py-2 px-4 font-medium">Market</th>
              <th className="text-left py-2 px-2 font-medium w-20">Cat</th>
              <th className="text-right py-2 px-2 font-medium w-14">Mkt</th>
              <th className="text-right py-2 px-2 font-medium w-14">AI Est</th>
              <th className="text-right py-2 px-2 font-medium w-24">Edge</th>
              <th className="text-center py-2 px-2 font-medium w-20">Alert</th>
              <th className="text-center py-2 px-2 font-medium w-14">Conf</th>
              <th className="text-right py-2 px-2 font-medium w-14">EV</th>
              <th className="text-right py-2 px-2 font-medium w-16">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && signals.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-12 text-center text-zinc-400 dark:text-zinc-600"
                >
                  <div className="animate-pulse">Loading market data...</div>
                </td>
              </tr>
            ) : signals.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-12 text-center text-zinc-400 dark:text-zinc-600"
                >
                  No research alerts found. Start the backend to begin analysis.
                </td>
              </tr>
            ) : (
              sorted.map((raw) => {
                // Prefer locally overridden data (after re-analyze)
                const s = overrides[raw.market_id] ?? raw;
                const isExpanded = expandedId === s.market_id;
                const isReanalyzing = reanalyzing === s.market_id;

                return (
                  <tr
                    key={s.market_id}
                    className="group border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                  >
                    <td colSpan={9} className="p-0">
                      {/* Main row */}
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : s.market_id)
                        }
                        className="w-full text-left flex items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 py-2.5 px-4 flex items-center gap-2">
                          {/* Star toggle — stopPropagation so it doesn't expand the row */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStar(raw);
                            }}
                            title={
                              watchedIds.has(s.market_id)
                                ? "Remove from watchlist"
                                : "Add to watchlist"
                            }
                            className="shrink-0 hover:scale-110 transition-transform"
                          >
                            <StarIcon filled={watchedIds.has(s.market_id)} />
                          </button>
                          <svg
                            className={`w-3 h-3 shrink-0 text-zinc-300 dark:text-zinc-600 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          <p className="text-zinc-800 dark:text-zinc-200 truncate leading-tight text-[13px]">
                            {s.question}
                          </p>
                        </div>
                        <div className="w-20 shrink-0 py-2.5 px-2 text-zinc-400 dark:text-zinc-500 truncate text-[11px]">
                          {s.category}
                        </div>
                        <div className="w-14 shrink-0 py-2.5 px-2 text-right font-mono text-zinc-600 dark:text-zinc-300">
                          {(s.market_price * 100).toFixed(0)}¢
                        </div>
                        <div className="w-14 shrink-0 py-2.5 px-2 text-right font-mono text-blue-600 dark:text-blue-400">
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
                          {confidenceLabel(s.confidence)}
                        </div>
                        <div className="w-14 shrink-0 py-2.5 px-2 text-right font-mono text-amber-600 dark:text-amber-400">
                          {s.expected_value.toFixed(3)}
                        </div>
                        <div className="w-16 shrink-0 py-2.5 px-2 text-right text-[11px] text-zinc-400 dark:text-zinc-600">
                          {formatTime(s.estimated_at)}
                        </div>
                      </button>

                      {/* Expanded research report */}
                      {isExpanded && (
                        <ReportPanel
                          signal={s}
                          onReanalyze={handleReanalyze}
                          reanalyzing={isReanalyzing}
                        />
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
