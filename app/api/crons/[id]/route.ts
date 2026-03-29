import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const CRONS_FILE = join(HOME, '.openclaw', 'cron', 'jobs.json');

interface CronsFile {
  version: number;
  jobs: Array<{ id: string; enabled: boolean; updatedAtMs: number; [key: string]: unknown }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as { enabled?: boolean };

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    const raw = await fs.readFile(CRONS_FILE, 'utf-8');
    const data: CronsFile = JSON.parse(raw);

    const jobIdx = data.jobs.findIndex((j) => j.id === id);
    if (jobIdx === -1) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
    }

    data.jobs[jobIdx].enabled = body.enabled;
    data.jobs[jobIdx].updatedAtMs = Date.now();

    await fs.writeFile(CRONS_FILE, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, job: data.jobs[jobIdx] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
