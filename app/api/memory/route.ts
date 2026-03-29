import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const WORKSPACE = join(HOME, '.openclaw', 'workspace');

export interface MemoryFile {
  filename: string;
  path: string;
  content: string;
  date: string | null;
  size: number;
}

async function readMemoryFile(filePath: string, filename: string): Promise<MemoryFile | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const stat = await fs.stat(filePath);
    // Try to extract date from filename like 2026-03-29.md
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return {
      filename,
      path: filePath,
      content,
      date: dateMatch ? dateMatch[1] : null,
      size: stat.size,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const files: MemoryFile[] = [];

    // Read MEMORY.md from workspace root if it exists
    const rootMemoryPath = join(WORKSPACE, 'MEMORY.md');
    const rootMemory = await readMemoryFile(rootMemoryPath, 'MEMORY.md');
    if (rootMemory) files.push(rootMemory);

    // Read memory/*.md files
    const memoryDir = join(WORKSPACE, 'memory');
    try {
      const entries = await fs.readdir(memoryDir);
      const mdFiles = entries
        .filter((f) => f.endsWith('.md'))
        .sort()
        .reverse(); // newest first

      for (const filename of mdFiles) {
        const filePath = join(memoryDir, filename);
        const file = await readMemoryFile(filePath, filename);
        if (file) files.push(file);
      }
    } catch {
      // memory dir doesn't exist — that's fine
    }

    return NextResponse.json({ files, total: files.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
