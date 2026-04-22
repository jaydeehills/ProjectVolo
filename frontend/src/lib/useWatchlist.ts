"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Market } from "./api";

const STORAGE_KEY = "volo_watchlist_v1";

// Stored shape — a snapshot of market data at the time of starring.
// syncMarkets() keeps yes_price and volume fresh from live data.
export interface WatchlistEntry {
  market_id: string;
  question: string;
  url: string;
  yes_price: number;
  category: string;
  event_title: string | null;
  close_date: string | null;
  volume: number;
}

export function marketToEntry(m: Market): WatchlistEntry {
  return {
    market_id: m.market_id,
    question: m.question,
    url: m.url,
    yes_price: m.yes_price,
    category: m.category,
    event_title: m.event_title,
    close_date: m.close_date,
    volume: m.volume,
  };
}

function readStorage(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchlistEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: WatchlistEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function useWatchlist() {
  // Initialise from localStorage synchronously (avoids a flash of empty list)
  const [entries, setEntries] = useState<WatchlistEntry[]>(readStorage);

  // Re-read on first client render to handle SSR hydration mismatches
  useEffect(() => {
    setEntries(readStorage());
  }, []);

  const watchedIds = useMemo(
    () => new Set(entries.map((e) => e.market_id)),
    [entries]
  );

  const isWatched = useCallback(
    (id: string) => watchedIds.has(id),
    [watchedIds]
  );

  /** Add or remove a market from the watchlist. */
  const toggle = useCallback((entry: WatchlistEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.market_id === entry.market_id);
      const next = exists
        ? prev.filter((e) => e.market_id !== entry.market_id)
        : [...prev, entry];
      writeStorage(next);
      return next;
    });
  }, []);

  /** Explicitly remove by market_id (used by the × button). */
  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.market_id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  /**
   * Called whenever fresh market data arrives from the polling loop.
   * Updates yes_price, volume, and url in stored entries without
   * removing any entry that might have temporarily dropped out of the scan.
   */
  const syncMarkets = useCallback((markets: Market[]) => {
    const byId = new Map(markets.map((m) => [m.market_id, m]));
    setEntries((prev) => {
      let dirty = false;
      const next = prev.map((e) => {
        const live = byId.get(e.market_id);
        if (!live) return e;
        // Only rebuild object if something actually changed
        if (
          live.yes_price === e.yes_price &&
          live.volume === e.volume &&
          (live.url === e.url || !live.url)
        ) {
          return e;
        }
        dirty = true;
        return {
          ...e,
          yes_price: live.yes_price,
          volume: live.volume,
          url: live.url || e.url,
        };
      });
      if (dirty) writeStorage(next);
      return dirty ? next : prev;
    });
  }, []);

  return { entries, watchedIds, isWatched, toggle, remove, syncMarkets };
}
