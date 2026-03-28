import { useState, useEffect, useRef, useCallback } from "react";
import type { LogEntry } from "@/app/api/agents/logs/[id]/route";

export interface UseAgentLogsResult {
  logs: LogEntry[];
  loading: boolean;
}

const POLL_INTERVAL_MS = 3_000;

export function useAgentLogs(id: string | null): UseAgentLogsResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async (agentId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/agents/logs/${agentId}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;

      const data = await res.json();
      setLogs(data.logs);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchLogs(id);

    intervalRef.current = setInterval(() => fetchLogs(id), POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [id, fetchLogs]);

  return { logs, loading };
}
