"use client";

import { useState, useMemo } from "react";
import { Market } from "@/lib/api";

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

// ── Component ─────────────────────────────────────────────────
interface MarketBrowserProps {
  markets: Market[];
  loading: boolean;
}

export default function MarketBrowser({
  markets,
  loading,
}: MarketBrowserProps) {
  const [search, setSearch] = useState("");
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
      return { groups: buildGroups(markets), flatMatches: [], isSearching: false };
    }
    const flatMatches = markets.filter(
      (m) =>
        m.question.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.event_title ?? "").toLowerCase().includes(q)
    );
    return { groups: [], flatMatches, isSearching: true };
  }, [markets, search]);

  const eventCount = groups.length;
  const outcomeCount = markets.length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex flex-col h-full">
      {/* Header + search */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Markets
          </h2>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
            {isSearching
              ? `${flatMatches.length} / ${outcomeCount}`
              : `${eventCount} events · ${outcomeCount} outcomes`}
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-4 text-xs text-zinc-400 dark:text-zinc-600 animate-pulse">
            Loading markets...
          </div>
        ) : isSearching ? (
          /* ── Flat search results ── */
          flatMatches.length === 0 ? (
            <div className="p-4 text-xs text-zinc-400 dark:text-zinc-600">
              No markets match your search.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {flatMatches.map((m) => (
                <FlatRow key={m.market_id} market={m} />
              ))}
            </div>
          )
        ) : groups.length === 0 ? (
          <div className="p-4 text-xs text-zinc-400 dark:text-zinc-600">
            No markets available.
          </div>
        ) : (
          /* ── Grouped view ── */
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {groups.map((group) =>
              group.markets.length === 1 ? (
                <FlatRow key={group.url} market={group.markets[0]} />
              ) : (
                <GroupRow
                  key={group.url}
                  group={group}
                  isExpanded={expanded.has(group.url)}
                  onToggle={() => toggleExpanded(group.url)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Flat row (single-outcome binary market) ───────────────────
function FlatRow({ market: m }: { market: Market }) {
  return (
    <a
      href={m.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
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
  );
}

// ── Group row (multi-outcome event) ──────────────────────────
function GroupRow({
  group,
  isExpanded,
  onToggle,
}: {
  group: MarketGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      {/* Group header — click to expand/collapse */}
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

      {/* Expanded: individual outcomes */}
      {isExpanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20">
          {group.markets.map((m, i) => (
            <a
              key={m.market_id}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 pl-7 pr-3 py-2 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors ${
                i < group.markets.length - 1
                  ? "border-b border-zinc-100 dark:border-zinc-800/30"
                  : ""
              }`}
            >
              <p className="flex-1 text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug min-w-0 truncate">
                {m.question}
              </p>
              <span className="shrink-0 font-mono text-[11px] text-emerald-600 dark:text-emerald-500">
                {(m.yes_price * 100).toFixed(0)}¢
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
