const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 503) {
      throw new Error("Backend unavailable (service not ready)");
    }
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface Market {
  market_id: string;
  question: string;
  category: string;
  event_title: string | null;
  yes_price: number;
  no_price: number;
  volume: number;
  close_date: string | null;
  url: string;
}

export interface EdgeResult {
  market_id: string;
  question: string;
  category: string;
  market_price: number;
  estimated_probability: number;
  edge: number;
  edge_percentage: number;
  confidence: string;
  signal: string;
  expected_value: number;
  reasoning: string;
  key_factors: string[];
  estimated_at: string;
}

export interface AgentLogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  details: Record<string, unknown> | null;
}

export interface EstimateResult {
  market_id: string;
  question: string;
  estimated_probability: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  key_factors: string[];
}

export const api = {
  getMarkets: () =>
    fetchAPI<{ markets: Market[] }>("/markets/"),

  getMarket: (id: string) => fetchAPI<Market>(`/markets/${id}`),

  scanEdges: () =>
    fetchAPI<{ edges: EdgeResult[] }>("/edge/scan"),

  getLogs: (limit = 100) =>
    fetchAPI<{ logs: AgentLogEntry[] }>(`/logs/?limit=${limit}`),

  estimate: (body: {
    market_id: string;
    question: string;
    category: string;
    context: string;
    force_refresh?: boolean;
  }) =>
    fetchAPI<EstimateResult>("/estimator/estimate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
