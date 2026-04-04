"use client";

import { useState, useMemo } from "react";
import { Market } from "@/lib/api";

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

interface MarketBrowserProps {
  markets: Market[];
  loading: boolean;
}

export default function MarketBrowser({
  markets,
  loading,
}: MarketBrowserProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return markets;
    const q = search.toLowerCase();
    return markets.filter(
      (m) =>
        m.question.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [markets, search]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-full">
      {/* Header + search */}
      <div className="px-3 pt-3 pb-2 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Markets</h2>
          <span className="text-[11px] text-zinc-600">
            {filtered.length}
            {search && ` / ${markets.length}`}
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-4 text-xs text-zinc-600 animate-pulse">
            Loading markets...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-xs text-zinc-600">
            {search ? "No markets match your search." : "No markets available."}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {filtered.map((m) => (
              <a
                key={m.market_id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 hover:bg-zinc-800/50 transition-colors"
              >
                <p className="text-xs text-zinc-200 leading-snug line-clamp-2">
                  {m.question}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500">
                  <span className="text-zinc-600">{m.category}</span>
                  <span className="text-zinc-700">|</span>
                  <span>
                    Yes{" "}
                    <span className="font-mono text-emerald-500">
                      {(m.yes_price * 100).toFixed(0)}¢
                    </span>
                  </span>
                  <span className="ml-auto font-mono">
                    {formatVolume(m.volume)}
                  </span>
                  <span className="text-zinc-600">{daysUntil(m.close_date)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
