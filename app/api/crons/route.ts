import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const CRONS_FILE = join(HOME, '.openclaw', 'cron', 'jobs.json');

export interface CronJob {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: {
    kind: string;
    expr?: string;
    tz?: string;
  };
  sessionTarget?: string;
  wakeMode?: string;
  payload?: {
    kind: string;
    message?: string;
    timeoutSeconds?: number;
  };
  delivery?: {
    mode: string;
    channel?: string;
  };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
  };
}

interface CronsFile {
  version: number;
  jobs: CronJob[];
}

async function readCrons(): Promise<CronsFile> {
  const raw = await fs.readFile(CRONS_FILE, 'utf-8');
  return JSON.parse(raw) as CronsFile;
}

async function writeCrons(data: CronsFile): Promise<void> {
  await fs.writeFile(CRONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const data = await readCrons();
    return NextResponse.json({ crons: data.jobs, total: data.jobs.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
