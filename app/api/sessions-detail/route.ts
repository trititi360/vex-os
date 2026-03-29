import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const OPENCLAW_JSON = join(HOME, '.openclaw', 'openclaw.json');

export interface SessionDetail {
  sessionKey: string;
  sessionId: string;
  agentId: string;
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
  title?: string;
  fullPrompt?: string;
  lastMessage?: string;
}

async function getAgentIds(): Promise<string[]> {
  try {
    const raw = await fs.readFile(OPENCLAW_JSON, 'utf-8');
    const config = JSON.parse(raw);
    return (config?.agents?.list ?? []).map((a: { id: string }) => a.id);
  } catch {
    return ['main', 'gary', 'vi'];
  }
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as Array<{ type: string; text?: string }>)
      .find((c) => c.type === 'text')?.text ?? '';
  }
  return '';
}

function cleanPrompt(raw: string): string {
  return raw
    .replace(/^\[.*?\]\s*/g, '')
    .replace(/^You are running as a subagent[^.]*\.\s*/i, '')
    .replace(/^Results auto-announce[^.]*\.\s*/i, '')
    .replace(/^\[Subagent Task\]:\s*/i, '')
    .replace(/^You are \w+, the [^.]+\.\s*/i, '')
    .trim();
}

async function readSessionMessages(
  sessionFile: string
): Promise<{ title?: string; fullPrompt?: string; lastMessage?: string }> {
  try {
    const content = await fs.readFile(sessionFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    let firstUserRaw: string | undefined;
    let lastMessage: string | undefined;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as Record<string, unknown>;
        const msg = (entry.message as Record<string, unknown> | undefined) ?? entry;
        const role = (msg.role ?? entry.role) as string | undefined;
        const msgContent = msg.content ?? entry.content;

        if (!firstUserRaw && role === 'user') {
          const text = extractText(msgContent).trim();
          if (text) firstUserRaw = text;
        }
        if (role === 'assistant') {
          const text = extractText(msgContent).trim();
          if (text) lastMessage = text.slice(0, 200);
        }
      } catch { /* skip malformed lines */ }
    }

    if (!firstUserRaw) return { lastMessage };

    const fullPrompt = cleanPrompt(firstUserRaw);
    const title = (fullPrompt.split('\n').find((l) => l.trim().length > 0) ?? fullPrompt).slice(0, 120);

    return { title, fullPrompt, lastMessage };
  } catch {
    return {};
  }
}

async function readAgentSessions(agentId: string): Promise<SessionDetail[]> {
  const sessionsPath = join(HOME, '.openclaw', 'agents', agentId, 'sessions', 'sessions.json');
  try {
    const raw = await fs.readFile(sessionsPath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, Record<string, unknown>>;

    const sessions: SessionDetail[] = await Promise.all(
      Object.entries(data).map(async ([key, s]) => {
        const sessionFile = s.sessionFile as string | undefined;
        let title: string | undefined;
        let fullPrompt: string | undefined;
        let lastMessage: string | undefined;
        if (sessionFile) {
          const msgs = await readSessionMessages(sessionFile);
          title = msgs.title;
          fullPrompt = msgs.fullPrompt;
          lastMessage = msgs.lastMessage;
        }
        return {
          sessionKey: key,
          sessionId: s.sessionId as string,
          agentId,
          status: (s.status as SessionDetail['status']) ?? 'idle',
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
          title,
          fullPrompt,
          lastMessage,
        };
      })
    );

    return sessions;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const agentIds = await getAgentIds();
    const allSessions: SessionDetail[] = [];
    for (const id of agentIds) {
      allSessions.push(...(await readAgentSessions(id)));
    }
    allSessions.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return NextResponse.json({ sessions: allSessions, total: allSessions.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
