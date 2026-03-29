import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentFile {
  name: string;
  path: string;
  content: string;
  lastModified: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  workspace: string;
  role?: string;
  model?: string;
}

export interface Agent extends AgentConfig {
  files: AgentFile[];
  isLoading: boolean;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOME = homedir();
const OPENCLAW_JSON = join(HOME, '.openclaw', 'openclaw.json');

const ALLOWED_FILES = [
  'SOUL.md',
  'IDENTITY.md',
  'USER.md',
  'AGENTS.md',
  'TOOLS.md',
  'HEARTBEAT.md',
  'BOOTSTRAP.md',
  'MEMORY.md',
];

// ─── Read openclaw.json and extract agent configs ─────────────────────────────

async function getAgentsFromConfig(): Promise<AgentConfig[]> {
  const raw = await fs.readFile(OPENCLAW_JSON, 'utf-8');
  const config = JSON.parse(raw);

  const defaults = config?.agents?.defaults ?? {};
  const list: Array<Record<string, unknown>> = config?.agents?.list ?? [];

  return list.map((entry) => {
    const id = entry.id as string;
    const identity = (entry.identity ?? {}) as Record<string, string>;
    const workspace = (entry.workspace as string) ?? join(HOME, '.openclaw', id === 'main' ? 'workspace' : `workspace-${id}`);

    return {
      id,
      name: identity.name ?? String(entry.name ?? id),
      emoji: identity.emoji ?? '🤖',
      workspace,
      role: identity.theme ?? '',
      model: (entry.model as string) ?? (defaults?.model?.primary as string) ?? '',
    };
  });
}

// ─── Read files from a workspace ─────────────────────────────────────────────

async function readAgentFiles(workspace: string): Promise<AgentFile[]> {
  const files: AgentFile[] = [];

  for (const fileName of ALLOWED_FILES) {
    try {
      const filePath = join(workspace, fileName);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({
        name: fileName,
        path: filePath,
        content,
        lastModified: stats.mtime.toISOString(),
      });
    } catch {
      // File doesn't exist, skip it
    }
  }

  return files;
}

// ─── GET /api/agents ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const agentConfigs = await getAgentsFromConfig();

    const agents = await Promise.all(
      agentConfigs.map(async (cfg) => {
        try {
          const files = await readAgentFiles(cfg.workspace);
          return { ...cfg, files, isLoading: false };
        } catch (error) {
          return {
            ...cfg,
            files: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ─── POST /api/agents ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, fileName, content } = body;

    if (!agentId || !fileName || content === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, fileName, content' },
        { status: 400 }
      );
    }

    if (!ALLOWED_FILES.includes(fileName)) {
      return NextResponse.json(
        { error: `Invalid file name: ${fileName}` },
        { status: 400 }
      );
    }

    // Find the agent in openclaw.json
    const agentConfigs = await getAgentsFromConfig();
    const agent = agentConfigs.find((a) => a.id === agentId);
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    try {
      await fs.access(agent.workspace);
    } catch {
      return NextResponse.json(
        { error: `Workspace directory does not exist: ${agent.workspace}` },
        { status: 500 }
      );
    }

    const filePath = join(agent.workspace, fileName);
    await fs.writeFile(filePath, content, 'utf-8');

    const stats = await fs.stat(filePath);

    return NextResponse.json({
      success: true,
      file: {
        name: fileName,
        path: filePath,
        content,
        lastModified: stats.mtime.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
