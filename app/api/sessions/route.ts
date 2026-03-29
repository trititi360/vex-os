import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const OPENCLAW_JSON = join(HOME, '.openclaw', 'openclaw.json');

export interface SessionEntry {
  sessionKey: string;
  sessionId: string;
  status: 'running' | 'done' | 'idle' | 'error';
  model?: string;
  totalTokens: number;
  estimatedCostUsd?: number;
  updatedAt: number;
  startedAt?: number;
  compactionCount?: number;
  lastChannel?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheRead?: number;
}

export interface AgentSessions {
  agentId: string;
  sessions: SessionEntry[];
}

async function getAgentIds(): Promise<string[]> {
  const raw = await fs.readFile(OPENCLAW_JSON, 'utf-8');
  const config = JSON.parse(raw);
  return (config?.agents?.list ?? []).map((a: { id: string }) => a.id);
}

async function readAgentSessions(agentId: string): Promise<SessionEntry[]> {
  const sessionsPath = join(HOME, '.openclaw', 'agents', agentId, 'sessions', 'sessions.json');
  try {
    const raw = await fs.readFile(sessionsPath, 'utf-8');
    const data: Record<string, Record<string, unknown>> = JSON.parse(raw);

    return Object.entries(data).map(([key, s]) => ({
      sessionKey: key,
      sessionId: s.sessionId as string,
      status: (s.status as SessionEntry['status']) ?? 'idle',
      model: s.model as string | undefined,
      totalTokens: (s.totalTokens as number) ?? 0,
      estimatedCostUsd: s.estimatedCostUsd as number | undefined,
      updatedAt: s.updatedAt as number,
      startedAt: s.startedAt as number | undefined,
      compactionCount: s.compactionCount as number | undefined,
      lastChannel: s.lastChannel as string | undefined,
      inputTokens: s.inputTokens as number | undefined,
      outputTokens: s.outputTokens as number | undefined,
      cacheRead: s.cacheRead as number | undefined,
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const agentIds = await getAgentIds();

    const result: AgentSessions[] = await Promise.all(
      agentIds.map(async (id) => ({
        agentId: id,
        sessions: await readAgentSessions(id),
      }))
    );

    return NextResponse.json({ agents: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
