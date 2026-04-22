"use client";

import { useState } from "react";
import { api, EstimateResult } from "@/lib/api";

// ── URL / question parser ─────────────────────────────────────
function parseInput(raw: string): { question: string; marketId: string } {
  const trimmed = raw.trim();

  // Detect a Polymarket URL and derive a readable question from its slug
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("polymarket.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      // /event/{event-slug}/{market-slug} or /event/{slug}
      const slug = parts[parts.length - 1] ?? "";
      const question =
        slug
          .replace(/-/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase())
          .replace(/\?$/, "") + "?";
      return {
        question,
        marketId: `manual-${slug.slice(0, 100)}`,
      };
    }
  } catch {
    // not a URL — fall through
  }

  // Plain question text — derive a stable ID from the text
  const marketId =
    "manual-" +
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);

  return { question: trimmed, marketId };
}

// ── Sub-components ────────────────────────────────────────────
function ConfidencePill({
  confidence,
}: {
  confidence: "low" | "medium" | "high";
}) {
  const styles: Record<string, string> = {
    high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    medium:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
    low: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize ${styles[confidence]}`}
    >
      {confidence} confidence
    </span>
  );
}

function ProbabilityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 65
      ? "bg-emerald-500"
      : pct >= 35
      ? "bg-blue-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 w-14 text-right tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

function LoadingSkeleton({ question }: { question: string }) {
  return (
    <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg p-4 space-y-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
        <span className="animate-pulse">Estimating: </span>
        <span className="text-zinc-700 dark:text-zinc-300">{question}</span>
      </p>
      {/* fake bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-blue-400/30 rounded-full animate-pulse" />
        </div>
        <div className="w-14 h-6 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
      {/* fake text lines */}
      <div className="space-y-2">
        {[1, 5 / 6, 4 / 6].map((w, i) => (
          <div
            key={i}
            className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"
            style={{ width: `${w * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function AnalyzeMarket() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [resolvedQuestion, setResolvedQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const { question, marketId } = parseInput(trimmed);

    setResolvedQuestion(question);
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await api.estimate({
        market_id: marketId,
        question,
        category: "",
        context: "",
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Estimation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Analyze a Market
        </h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Paste a Polymarket URL or type any yes/no question to get an AI
          probability estimate.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 pb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Will the Fed cut rates before July 2026? — or paste a polymarket.com URL"
            disabled={loading}
            className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 text-white text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="px-4 pb-4">
          <LoadingSkeleton question={resolvedQuestion} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="px-4 pb-4">
          <div className="border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2.5">
            <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="px-4 pb-4">
          <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg p-4 space-y-4">
            {/* Question + bar */}
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
                {resolvedQuestion}
              </p>
              <ProbabilityBar value={result.estimated_probability} />
              <div className="flex items-center gap-2.5">
                <ConfidencePill confidence={result.confidence} />
                <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                  {Math.round(result.estimated_probability * 100)}% probability
                  of YES
                </span>
              </div>
            </div>

            {/* Reasoning */}
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                Reasoning
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {result.reasoning}
              </p>
            </div>

            {/* Key factors */}
            {result.key_factors.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  Key Factors
                </p>
                <ul className="space-y-1.5">
                  {result.key_factors.map((f, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-400 leading-snug"
                    >
                      <span className="text-zinc-300 dark:text-zinc-600 shrink-0 mt-px">
                        •
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
