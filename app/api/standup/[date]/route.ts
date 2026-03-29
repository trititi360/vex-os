import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const STANDUPS_DIR = path.join(os.homedir(), '.openclaw', 'workspace', 'standups');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  // Guard against path traversal — dates must be YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  const filePath = path.join(STANDUPS_DIR, `${date}.md`);

  try {
    const content = await fs.readFile(filePath, 'utf8');

    // Parse into per-agent sections
    const messages: Array<{ agentId: string; text: string }> = [];
    const agentSectionRegex = /^## Agent: (\w+)/gm;
    const sections = content.split(/^---$/m).map((s) => s.trim()).filter(Boolean);

    for (const section of sections) {
      const match = /^## Agent: (\w+)/m.exec(section);
      if (match) {
        const agentId = match[1];
        const text = section
          .replace(/^## Agent:.*$/m, '')
          .replace(/^\s*⚠?\s*/, '')
          .trim();
        if (text) messages.push({ agentId, text });
      }
    }
    void agentSectionRegex;

    return NextResponse.json({ date, content, messages });
  } catch {
    return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
  }
}
