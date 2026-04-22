"use client";

import { useCallback, useEffect } from "react";
import { api, EdgeResult, Market } from "@/lib/api";
import { usePolling } from "@/lib/hooks";
import { useWatchlist, marketToEntry, WatchlistEntry } from "@/lib/useWatchlist";
import StatsBar from "@/components/StatsBar";
import SignalsTable from "@/components/SignalsTable";
import MarketBrowser from "@/components/MarketBrowser";
import AgentLog from "@/components/AgentLog";
import EdgeDistributionChart from "@/components/EdgeDistributionChart";
import ThemeToggle from "@/components/ThemeToggle";
import AnalyzeMarket from "@/components/AnalyzeMarket";

const SIGNAL_POLL_MS = 30_000;
const MARKET_POLL_MS = 60_000;
const LOG_POLL_MS = 5_000;

export default function Home() {
  // ── Data polling ──────────────────────────────────────────
  const fetchSignals = useCallback(
    () => api.scanEdges().then((d) => d.edges),
    []
  );
  const fetchMarkets = useCallback(
    () => api.getMarkets().then((d) => d.markets),
    []
  );
  const fetchLogs = useCallback(
    () => api.getLogs(100).then((d) => d.logs),
    []
  );

  const {
    data: signals,
    loading: signalsLoading,
    error: signalsError,
    lastUpdated,
  } = usePolling(fetchSignals, SIGNAL_POLL_MS);

  const {
    data: markets,
    loading: marketsLoading,
    error: marketsError,
  } = usePolling(fetchMarkets, MARKET_POLL_MS);

  const { data: logs, loading: logsLoading } = usePolling(
    fetchLogs,
    LOG_POLL_MS
  );

  // ── Watchlist ─────────────────────────────────────────────
  const { entries: watchlistEntries, watchedIds, toggle, remove, syncMarkets } =
    useWatchlist();

  // Keep stored prices/volumes fresh whenever live market data arrives
  useEffect(() => {
    if (markets) syncMarkets(markets);
  }, [markets, syncMarkets]);

  /**
   * Toggle from the Market Browser (has full Market data).
   */
  const toggleFromMarket = useCallback(
    (market: Market) => toggle(marketToEntry(market)),
    [toggle]
  );

  /**
   * Toggle from the Signal Board (EdgeResult, may not be in markets list
   * if it came from a cached estimate of a below-filter market).
   * Enriches with full Market data when available.
   */
  const toggleFromSignal = useCallback(
    (signal: EdgeResult) => {
      const fullMarket = (markets ?? []).find(
        (m) => m.market_id === signal.market_id
      );
      const entry: WatchlistEntry = fullMarket
        ? marketToEntry(fullMarket)
        : {
            market_id: signal.market_id,
            question: signal.question,
            url: "",
            yes_price: signal.market_price,
            category: signal.category,
            event_title: null,
            close_date: null,
            volume: 0,
          };
      toggle(entry);
    },
    [markets, toggle]
  );

  // ── Derived state ─────────────────────────────────────────
  const connectionError = signalsError || marketsError;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              V
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                Volo
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-600">
                Prediction Market Research
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connectionError ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
                Backend Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                Research Mode
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Connection error banner */}
      {connectionError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2">
          <p className="max-w-[1600px] mx-auto text-xs text-red-700 dark:text-red-400">
            Unable to reach the backend: {connectionError}.{" "}
            Make sure the API server is running on port 8000.
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 space-y-4">
        {/* Stats bar */}
        <StatsBar
          markets={markets || []}
          signals={signals || []}
          lastUpdated={lastUpdated}
        />

        {/* Three-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 items-start">
          {/* Left sidebar — Market Browser */}
          <div className="h-[400px] lg:h-[calc(100vh-220px)] lg:sticky lg:top-[60px]">
            <MarketBrowser
              markets={markets || []}
              signals={signals || []}
              loading={marketsLoading}
              watchedIds={watchedIds}
              watchlistEntries={watchlistEntries}
              onToggle={toggleFromMarket}
              onRemove={remove}
            />
          </div>

          {/* Center — Analyze Market + Signals Table + Chart */}
          <div className="space-y-4 min-w-0">
            <AnalyzeMarket />
            <SignalsTable
              signals={signals || []}
              loading={signalsLoading}
              watchedIds={watchedIds}
              onToggleStar={toggleFromSignal}
            />
            <EdgeDistributionChart signals={signals || []} />
          </div>

          {/* Right sidebar — Activity Log */}
          <div className="h-[300px] lg:h-[calc(100vh-220px)] lg:sticky lg:top-[60px]">
            <AgentLog logs={logs || []} loading={logsLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
