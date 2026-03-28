import { NextResponse } from "next/server";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

const LOG_TEMPLATES: Record<string, LogEntry[]> = {
  "agent-001": [
    { id: "l1", timestamp: "", level: "info", message: "Dispatched task batch #482 to DataProcessor" },
    { id: "l2", timestamp: "", level: "info", message: "Heartbeat OK — 5 agents alive" },
    { id: "l3", timestamp: "", level: "debug", message: "Queue depth: 3 pending tasks" },
  ],
  "agent-002": [
    { id: "l1", timestamp: "", level: "info", message: "Processing file chunk 7/12" },
    { id: "l2", timestamp: "", level: "warn", message: "Memory usage approaching threshold (512 MB)" },
    { id: "l3", timestamp: "", level: "info", message: "Completed transform pipeline in 342ms" },
  ],
  "agent-003": [
    { id: "l1", timestamp: "", level: "debug", message: "Watching /var/vexos/data — no changes" },
    { id: "l2", timestamp: "", level: "info", message: "Scan cycle complete" },
  ],
  "agent-004": [
    { id: "l1", timestamp: "", level: "error", message: "Connection timeout after 30s — retrying..." },
    { id: "l2", timestamp: "", level: "error", message: "Retry 1/3 failed: ECONNREFUSED 10.0.0.5:9200" },
    { id: "l3", timestamp: "", level: "error", message: "Max retries exceeded — agent halted" },
  ],
  "agent-005": [
    { id: "l1", timestamp: "", level: "info", message: "Routed 128 events to downstream handlers" },
    { id: "l2", timestamp: "", level: "debug", message: "Backpressure: 0 — channel clear" },
  ],
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const templates = LOG_TEMPLATES[id] ?? [];

  const logs: LogEntry[] = templates.map((entry, i) => ({
    ...entry,
    id: `${id}-log-${i}-${Date.now()}`,
    timestamp: new Date(Date.now() - (templates.length - i) * 4_000).toISOString(),
  }));

  return NextResponse.json({ logs, agentId: id });
}
