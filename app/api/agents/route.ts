import { NextResponse } from "next/server";

export type AgentStatus = "running" | "idle" | "error" | "stopped";

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  uptime: number;
  cpu: number;
  memory: number;
  tasks: number;
  lastSeen: string;
}

const AGENTS: Agent[] = [
  {
    id: "agent-001",
    name: "Orchestrator",
    status: "running",
    uptime: 99.8,
    cpu: 12,
    memory: 340,
    tasks: 5,
    lastSeen: new Date().toISOString(),
  },
  {
    id: "agent-002",
    name: "DataProcessor",
    status: "running",
    uptime: 97.2,
    cpu: 34,
    memory: 512,
    tasks: 12,
    lastSeen: new Date().toISOString(),
  },
  {
    id: "agent-003",
    name: "FileWatcher",
    status: "idle",
    uptime: 100,
    cpu: 1,
    memory: 128,
    tasks: 0,
    lastSeen: new Date().toISOString(),
  },
  {
    id: "agent-004",
    name: "NetworkMonitor",
    status: "error",
    uptime: 72.4,
    cpu: 0,
    memory: 64,
    tasks: 0,
    lastSeen: new Date(Date.now() - 30_000).toISOString(),
  },
  {
    id: "agent-005",
    name: "EventRouter",
    status: "running",
    uptime: 99.1,
    cpu: 8,
    memory: 256,
    tasks: 3,
    lastSeen: new Date().toISOString(),
  },
];

export async function GET() {
  // Simulate slight CPU variance on each poll
  const agents = AGENTS.map((a) => ({
    ...a,
    cpu:
      a.status === "running"
        ? Math.max(1, a.cpu + Math.floor(Math.random() * 6 - 3))
        : a.cpu,
    lastSeen:
      a.status !== "error" ? new Date().toISOString() : a.lastSeen,
  }));

  return NextResponse.json({ agents, timestamp: new Date().toISOString() });
}
