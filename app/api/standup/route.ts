import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const STANDUPS_DIR = path.join(os.homedir(), '.openclaw', 'workspace', 'standups');

// In-memory job tracking — persists within a single dev server process
interface JobState {
  startedAt: number;
  status: 'running' | 'done' | 'error';
}

const runningJobs = new Map<string, JobState>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('job');

  // Job status query
  if (jobId) {
    const job = runningJobs.get(jobId);
    if (!job) return NextResponse.json({ status: 'unknown' });
    return NextResponse.json({ status: job.status, startedAt: job.startedAt });
  }

  // List all standups
  try {
    await fs.mkdir(STANDUPS_DIR, { recursive: true });
    const files = await fs.readdir(STANDUPS_DIR);
    const mdFiles = files.filter((f) => f.endsWith('.md')).sort().reverse();

    const standups = await Promise.all(
      mdFiles.map(async (filename) => {
        const date = filename.replace('.md', '');
        const filePath = path.join(STANDUPS_DIR, filename);
        let preview = '';
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const firstMeaningful = content
            .split('\n')
            .find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('>') && l.trim() !== '---') ?? '';
          preview = firstMeaningful.slice(0, 120);
        } catch { /* skip unreadable files */ }
        return { date, filename, preview };
      })
    );

    return NextResponse.json({ standups });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  const jobId = `standup-${Date.now()}`;
  runningJobs.set(jobId, { startedAt: Date.now(), status: 'running' });

  const scriptPath = path.join(process.cwd(), 'scripts', 'run-standup.ts');

  const child = spawn('npx', ['tsx', scriptPath], {
    stdio: 'pipe',
  });

  child.on('close', (code) => {
    const existing = runningJobs.get(jobId);
    runningJobs.set(jobId, {
      startedAt: existing?.startedAt ?? Date.now(),
      status: code === 0 ? 'done' : 'error',
    });
  });

  child.on('error', () => {
    const existing = runningJobs.get(jobId);
    runningJobs.set(jobId, {
      startedAt: existing?.startedAt ?? Date.now(),
      status: 'error',
    });
  });

  return NextResponse.json({ ok: true, jobId });
}
