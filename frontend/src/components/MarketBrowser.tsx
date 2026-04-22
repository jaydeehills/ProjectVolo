"use client";

import { useState, useMemo, useCallback } from "react";
import { Market, EdgeResult, api, EstimateResult } from "@/lib/api";
import { WatchlistEntry, marketToEntry } from "@/lib/useWatchlist";

// ── Icons ─────────────────────────────────────────────────────

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
      className="w-3.5 h-3.5 fill-none stroke-zinc-400 dark:stroke-zinc-600"
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

// ── Helpers ──────────────────────────────────────────────────

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return "";
  const days = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return "closing";
  return `${days}d`;
}

function signalPill(signal: string) {
  if (signal === "BUY_YES")
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
        BUY YES
      </span>
    );
  if (signal === "BUY_NO")
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/25">
        BUY NO
      </span>
    );
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
      HOLD
    </span>
  );
}

// ── Grouping ─────────────────────────────────────────────────

type MarketGroup = {
  url: string;
  eventTitle: string;
  category: string;
  volume: number;
  closeDate: string | null;
  markets: Market[];
};

function buildGroups(markets: Market[]): MarketGroup[] {
  const map = new Map<string, MarketGroup>();
  for (const m of markets) {
    if (!map.has(m.url)) {
      map.set(m.url, {
        url: m.url,
        eventTitle: m.event_title || m.question,
        category: m.category,
        volume: m.volume,
        closeDate: m.close_date,
        markets: [],
      });
    }
    map.get(m.url)!.markets.push(m);
  }
  return Array.from(map.values());
}

// ── Watchlist tab ─────────────────────────────────────────────

type EstimateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: EstimateResult }
  | { status: "error"; message: string };

function WatchlistTab({
  entries,
  signals,
  onRemove,
}: {
  entries: WatchlistEntry[];
  signals: EdgeResult[];
  onRemove: (id: string) => void;
}) {
  const [estimates, setEstimates] = useState<Record<string, EstimateState>>({});

  const signalsByMarketId = useMemo(
    () => new Map(signals.map((s) => [s.market_id, s])),
    [signals]
  );

  const analyze = useCallback(
    async (entry: WatchlistEntry, forceRefresh = false) => {
      setEstimates((prev) => ({
        ...prev,
        [entry.market_id]: { status: "loading" },
      }));
      try {
        const result = await api.estimate({
          market_id: entry.market_id,
          question: entry.question,
          category: entry.category,
          context: "",
          force_refresh: forceRefresh,
        });
        setEstimates((prev) => ({
          ...prev,
          [entry.market_id]: { status: "done", result },
        }));
      } catch (err) {
        setEstimates((prev) => ({
          ...prev,
          [entry.market_id]: {
            status: "error",
            message:
              err instanceof Error ? err.message : "Estimation failed.",
          },
        }));
      }
    },
    []
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
        <svg
          viewBox="0 0 24 24"
          className="w-8 h-8 stroke-zinc-300 dark:stroke-zinc-700 fill-none mb-3"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          No watchlisted markets
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1 leading-snug">
          Click the ☆ on any market to add it here and get on-demand estimates.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
      {entries.map((entry) => {
        const liveSignal = signalsByMarketId.get(entry.market_id);
        const est = estimates[entry.market_id] ?? { status: "idle" };

        return (
          <div key={entry.market_id} className="px-3 py-3">
            {/* Row: question + remove button */}
            <div className="flex items-start gap-2 mb-2">
              <p className="flex-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-2 min-w-0">
                {entry.question}
              </p>
              <button
                onClick={() => onRemove(entry.market_id)}
                title="Remove from watchlist"
                className="shrink-0 mt-px p-0.5 rounded text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mb-2.5 text-[11px] text-zinc-500">
              <span className="text-zinc-400 dark:text-zinc-600 truncate max-w-[70px]">
                {entry.category}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>
                Yes{" "}
                <span className="font-mono text-emerald-600 dark:text-emerald-500">
                  {(entry.yes_price * 100).toFixed(0)}¢
                </span>
              </span>
              <span className="font-mono text-zinc-500">
                {formatVolume(entry.volume)}
              </span>
              {entry.close_date && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <span className="text-zinc-400 dark:text-zinc-600">
                    {daysUntil(entry.close_date)}
                  </span>
                </>
              )}
              {liveSignal && (
                <span className="ml-auto shrink-0">
                  {signalPill(liveSignal.signal)}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Analyze button */}
              <button
                onClick={() => analyze(entry, est.status === "done")}
                disabled={est.status === "loading"}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border
                  bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400
                  border-blue-200 dark:border-blue-500/25
                  hover:bg-blue-100 dark:hover:bg-blue-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {est.status === "loading" ? (
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
                ) : est.status === "done" ? (
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
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Analyze
                  </>
                )}
              </button>

              {/* Polymarket link */}
              {entry.url && (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border
                    bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400
                    border-zinc-200 dark:border-zinc-700
                    hover:bg-zinc-50 dark:hover:bg-zinc-800
                    transition-colors"
                >
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
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Polymarket
                </a>
              )}
            </div>

            {/* Estimate result */}
            {est.status === "done" && (
              <div className="mt-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md p-2.5 space-y-2">
                {/* Probability + confidence */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300">
                      {Math.round(est.result.estimated_probability * 100)}%
                    </span>
                    <span className="text-[10px] text-zinc-400">YES</span>
                  </div>
                  <ConfidenceBadge confidence={est.result.confidence} />
                </div>
                {/* Mini bar */}
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      est.result.estimated_probability >= 0.65
                        ? "bg-emerald-500"
                        : est.result.estimated_probability >= 0.35
                        ? "bg-blue-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${est.result.estimated_probability * 100}%`,
                    }}
                  />
                </div>
                {/* Reasoning */}
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                  {est.result.reasoning}
                </p>
                {/* Key factors */}
                {est.result.key_factors.length > 0 && (
                  <ul className="space-y-1">
                    {est.result.key_factors.map((f, i) => (
                      <li
                        key={i}
                        className="flex gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-500 leading-snug"
                      >
                        <span className="shrink-0 text-zinc-300 dark:text-zinc-600 mt-px">
                          •
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Error state */}
            {est.status === "error" && (
              <div className="mt-2 px-2 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded text-[11px] text-red-600 dark:text-red-400">
                {est.message}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
    low: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize ${
        styles[confidence] ?? styles.low
      }`}
    >
      {confidence} conf
    </span>
  );
}

// ── All-markets tab ───────────────────────────────────────────

interface AllMarketsTabProps {
  markets: Market[];
  loading: boolean;
  watchedIds: Set<string>;
  onToggle: (market: Market) => void;
  search: string;
}

function AllMarketsTab({
  markets,
  loading,
  watchedIds,
  onToggle,
  search,
}: AllMarketsTabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(url: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  const { groups, flatMatches, isSearching } = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return {
        groups: buildGroups(markets),
        flatMatches: [] as Market[],
        isSearching: false,
      };
    }
    const flatMatches = markets.filter(
      (m) =>
        m.question.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.event_title ?? "").toLowerCase().includes(q)
    );
    return { groups: [], flatMatches, isSearching: true };
  }, [markets, search]);

  if (loading) {
    return (
      <div className="p-4 text-xs text-zinc-400 dark:text-zinc-600 animate-pulse">
        Loading markets...
      </div>
    );
  }

  if (isSearching) {
    if (flatMatches.length === 0) {
      return (
        <div className="p-4 text-xs text-zinc-400 dark:text-zinc-600">
          No markets match your search.
        </div>
      );
    }
    return (
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {flatMatches.map((m) => (
          <FlatRow
            key={m.market_id}
            market={m}
            watched={watchedIds.has(m.market_id)}
            onToggleStar={onToggle}
          />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-4 text-xs text-zinc-400 dark:text-zinc-600">
        No markets available.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
      {groups.map((group) =>
        group.markets.length === 1 ? (
          <FlatRow
            key={group.url}
            market={group.markets[0]}
            watched={watchedIds.has(group.markets[0].market_id)}
            onToggleStar={onToggle}
          />
        ) : (
          <GroupRow
            key={group.url}
            group={group}
            isExpanded={expanded.has(group.url)}
            onToggle={() => toggleExpanded(group.url)}
            watchedIds={watchedIds}
            onToggleStar={onToggle}
          />
        )
      )}
    </div>
  );
}

// ── Flat row ──────────────────────────────────────────────────

function FlatRow({
  market: m,
  watched,
  onToggleStar,
}: {
  market: Market;
  watched: boolean;
  onToggleStar: (m: Market) => void;
}) {
  return (
    <div className="relative group/row flex items-stretch hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      {/* Star button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleStar(m);
        }}
        title={watched ? "Remove from watchlist" : "Add to watchlist"}
        className="shrink-0 flex items-center px-2 text-zinc-300 dark:text-zinc-700 hover:text-amber-400 transition-colors"
      >
        <StarIcon filled={watched} />
      </button>

      {/* Market link */}
      <a
        href={m.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 py-2.5 pr-3"
      >
        <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-2">
          {m.question}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500">
          <span className="text-zinc-400 dark:text-zinc-600">{m.category}</span>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <span>
            Yes{" "}
            <span className="font-mono text-emerald-600 dark:text-emerald-500">
              {(m.yes_price * 100).toFixed(0)}¢
            </span>
          </span>
          <span className="ml-auto font-mono">{formatVolume(m.volume)}</span>
          <span className="text-zinc-400 dark:text-zinc-600">
            {daysUntil(m.close_date)}
          </span>
        </div>
      </a>
    </div>
  );
}

// ── Group row ─────────────────────────────────────────────────

function GroupRow({
  group,
  isExpanded,
  onToggle,
  watchedIds,
  onToggleStar,
}: {
  group: MarketGroup;
  isExpanded: boolean;
  onToggle: () => void;
  watchedIds: Set<string>;
  onToggleStar: (m: Market) => void;
}) {
  return (
    <div>
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-start gap-2"
      >
        <span className="mt-[3px] shrink-0 text-zinc-400 dark:text-zinc-600 text-[9px] leading-none">
          {isExpanded ? "▾" : "▸"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-snug truncate">
            {group.eventTitle}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            <span className="text-zinc-400 dark:text-zinc-600">
              {group.category}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="text-blue-600 dark:text-blue-400">
              {group.markets.length} outcomes
            </span>
            <span className="ml-auto font-mono text-zinc-500">
              {formatVolume(group.volume)}
            </span>
            <span className="text-zinc-400 dark:text-zinc-600">
              {daysUntil(group.closeDate)}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded outcomes */}
      {isExpanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20">
          {group.markets.map((m, i) => (
            <div
              key={m.market_id}
              className={`flex items-center gap-1 pl-5 pr-3 py-2 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors ${
                i < group.markets.length - 1
                  ? "border-b border-zinc-100 dark:border-zinc-800/30"
                  : ""
              }`}
            >
              {/* Star for each outcome */}
              <button
                onClick={() => onToggleStar(m)}
                title={
                  watchedIds.has(m.market_id)
                    ? "Remove from watchlist"
                    : "Add to watchlist"
                }
                className="shrink-0 text-zinc-300 dark:text-zinc-700 hover:text-amber-400 transition-colors p-0.5"
              >
                <StarIcon filled={watchedIds.has(m.market_id)} />
              </button>

              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 min-w-0"
              >
                <p className="flex-1 text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug min-w-0 truncate">
                  {m.question}
                </p>
                <span className="shrink-0 font-mono text-[11px] text-emerald-600 dark:text-emerald-500">
                  {(m.yes_price * 100).toFixed(0)}¢
                </span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

interface MarketBrowserProps {
  markets: Market[];
  signals: EdgeResult[];
  loading: boolean;
  watchedIds: Set<string>;
  watchlistEntries: WatchlistEntry[];
  onToggle: (market: Market) => void;
  onRemove: (id: string) => void;
}

export default function MarketBrowser({
  markets,
  signals,
  loading,
  watchedIds,
  watchlistEntries,
  onToggle,
  onRemove,
}: MarketBrowserProps) {
  const [tab, setTab] = useState<"all" | "watchlist">("all");
  const [search, setSearch] = useState("");

  const eventCount = useMemo(
    () => new Set(markets.map((m) => m.url)).size,
    [markets]
  );

  const watchlistCount = watchlistEntries.length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex flex-col h-full">
      {/* Tab bar */}
      <div className="px-3 pt-3 pb-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Markets
          </h2>
          {tab === "all" && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
              {eventCount} events · {markets.length} outcomes
            </span>
          )}
        </div>
        <div className="flex gap-0.5 -mb-px">
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-t border-b-2 transition-colors ${
              tab === "all"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTab("watchlist")}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-t border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === "watchlist"
                ? "border-amber-400 text-amber-600 dark:text-amber-400"
                : "border-transparent text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
            }`}
          >
            <StarIcon filled={watchlistCount > 0} />
            Watchlist
            {watchlistCount > 0 && (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  tab === "watchlist"
                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                }`}
              >
                {watchlistCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search (All tab only) */}
      {tab === "all" && (
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/50">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === "all" ? (
          <AllMarketsTab
            markets={markets}
            loading={loading}
            watchedIds={watchedIds}
            onToggle={onToggle}
            search={search}
          />
        ) : (
          <WatchlistTab
            entries={watchlistEntries}
            signals={signals}
            onRemove={onRemove}
          />
        )}
      </div>
    </div>
  );
}
