import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await execAsync(
      `openclaw agent -m "Agent ${id} encountered an error. Please analyze what went wrong and fix it automatically." --session-id ${id}`
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send fix command';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
