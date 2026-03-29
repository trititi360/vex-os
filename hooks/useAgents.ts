import { useState, useEffect, useCallback, useRef } from "react";

interface AgentFile {
  name: string;
  path: string;
  content: string;
  lastModified: string;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  workspace: string;
  files: AgentFile[];
  isLoading: boolean;
  error?: string;
}

export type ConnectionStatus = "connecting" | "live" | "offline";

export interface UseAgentsResult {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  status: ConnectionStatus;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 2_000;
const MAX_FAILURES = 3;

export function useAgents(): UseAgentsResult {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const failureCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAgents = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agents", { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setAgents(data.agents);
      setLastUpdated(new Date());
      setError(null);
      failureCount.current = 0;
      setStatus("live");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;

      failureCount.current += 1;
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);

      if (failureCount.current >= MAX_FAILURES) {
        setStatus("offline");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    fetchAgents();

    intervalRef.current = setInterval(fetchAgents, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [fetchAgents]);

  return { agents, loading, error, lastUpdated, status, refresh };
}
