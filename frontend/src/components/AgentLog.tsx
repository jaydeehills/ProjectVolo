"use client";

import { useEffect, useRef } from "react";
import { AgentLogEntry } from "@/lib/api";

const LEVEL_STYLES: Record<string, { color: string; bg: string }> = {
  info: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  analysis: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  signal: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  error: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
};

interface AgentLogProps {
  logs: AgentLogEntry[];
  loading: boolean;
}

export default function AgentLog({ logs, loading }: AgentLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Agent Log</h2>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {logs.length} entries
          </span>
        </div>
      </div>

      {/* Log feed */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-0.5 font-mono text-[11px] leading-relaxed">
        {loading && logs.length === 0 ? (
          <p className="text-zinc-400 dark:text-zinc-700 p-2 animate-pulse">Connecting...</p>
        ) : logs.length === 0 ? (
          <p className="text-zinc-400 dark:text-zinc-700 p-2">
            Waiting for agent activity...
          </p>
        ) : (
          logs.map((entry, i) => {
            const style = LEVEL_STYLES[entry.level] || LEVEL_STYLES.info;
            return (
              <div
                key={i}
                className={`flex gap-1.5 px-2 py-1 rounded ${style.bg}`}
              >
                <span className="text-zinc-400 dark:text-zinc-600 shrink-0 w-[60px]">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span className={`shrink-0 w-[52px] uppercase ${style.color}`}>
                  {entry.level}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500 shrink-0 w-[56px] truncate">
                  {entry.module}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 break-words min-w-0">
                  {entry.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
